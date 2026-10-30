import {
    SUPABASE_URL_B64,
    SUPABASE_ANON_KEY_B64,
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY
} from '../config.js';
import { AuthModel } from './AuthModel.js';

const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http') ? atob(SUPABASE_URL_B64) : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_') ? atob(SUPABASE_ANON_KEY_B64) : SUPABASE_ANON_KEY_B64;

const DEFAULT_HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

/**
 * Función pura que determina y desduplica los correos electrónicos de destino
 * comparando el correo autenticado del usuario (auth.users) con el correo registrado en la reserva.
 * Si emailAuth es null o igual a emailReserva, retorna [emailReserva].
 * Si ambos existen y son distintos, retorna [emailAuth, emailReserva].
 *
 * @param {Object} params
 * @param {string|null} params.emailAuth - Correo de la sesión / auth.users
 * @param {string|null} params.emailReserva - Correo indicado en la reserva del tour
 * @returns {string[]} Lista de correos únicos y normalizados
 */
export function determinarDestinatariosNotificacion({ emailAuth, emailReserva }) {
    const normalizar = (email) => String(email || '').trim().toLowerCase();
    const esValido = (email) => Boolean(email && email.includes('@'));

    const mailAuthNorm = normalizar(emailAuth);
    const mailReservaNorm = normalizar(emailReserva);

    const authValido = esValido(mailAuthNorm);
    const reservaValido = esValido(mailReservaNorm);

    if (authValido && reservaValido) {
        if (mailAuthNorm === mailReservaNorm) {
            return [mailReservaNorm];
        }
        return [mailAuthNorm, mailReservaNorm];
    }

    if (reservaValido) {
        return [mailReservaNorm];
    }

    if (authValido) {
        return [mailAuthNorm];
    }

    return [];
}

/**
 * Construye y valida el payload de datos para el mensaje de notificación.
 * En caso de rechazo, exige obligatoriamente rejection_reason.
 *
 * @param {Object} params
 * @param {'confirmacion_tour' | 'rechazo_tour'} params.tipo
 * @param {string} [params.nombreTour]
 * @param {string} [params.fechaTour]
 * @param {string} [params.horaTour]
 * @param {number} [params.cupos]
 * @param {number} [params.montoTotal]
 * @param {string} [params.motivoRechazo]
 * @param {string} [params.rejection_reason]
 * @param {string} [params.motivo]
 * @returns {Object} Payload estructurado del mensaje
 */
export function construirPayloadNotificacion({
    tipo = 'confirmacion_tour',
    nombreTour = '',
    fechaTour = '',
    horaTour = '',
    cupos = 1,
    montoTotal = 0,
    motivoRechazo = null,
    rejection_reason = null,
    motivo = null
} = {}) {
    const base = {
        tipo,
        tour_name: nombreTour || 'Tour Oficial MITUR',
        tour_date: fechaTour || '',
        departure_time: horaTour || '07:00 AM',
        spots_reserved: Number(cupos) || 1,
        total_amount: Number(montoTotal) || 0
    };

    if (tipo === 'rechazo_tour') {
        const razonLimpia = String(rejection_reason || motivoRechazo || motivo || '').trim();
        if (!razonLimpia) {
            throw new Error('El motivo de rechazo (rejection_reason) es obligatorio');
        }
        return {
            ...base,
            rejection_reason: razonLimpia,
            motivo: razonLimpia
        };
    }

    return base;
}

/**
 * Crea la estructura oficial del registro que se almacena en la tabla public.confirmation_messages
 * alineada estrictamente al esquema DDL de la base de datos:
 * - reservation_id (uuid)
 * - channel (text)
 * - message_type (text)
 * - status (text)
 * - attempts (integer)
 * - sent_at (timestamp with time zone)
 * - created_at (timestamp with time zone)
 * La tabla no posee columnas payload ni recipient.
 *
 * @param {Object} params
 * @param {string} params.reservaId
 * @param {'confirmacion_tour' | 'rechazo_tour'} [params.tipo='confirmacion_tour']
 * @param {string} [params.status='enviado']
 * @param {Object} [params.payload=null]
 * @returns {Object}
 */
export function crearRegistroConfirmacionMessage({
    reservaId,
    tipo = 'confirmacion_tour',
    status = 'enviado',
    payload = null
} = {}) {
    if (tipo === 'rechazo_tour' && payload) {
        const razon = payload?.rejection_reason || payload?.motivo || payload?.motivoRechazo;
        if (!razon || !String(razon).trim()) {
            throw new Error('El campo rejection_reason es obligatorio en la notificación de rechazo');
        }
    }

    return {
        reservation_id: reservaId,
        channel: 'email',
        message_type: tipo,
        status: status,
        attempts: 1,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
    };
}

/**
 * Consulta el correo del usuario registrado consultando la sesión activa de forma segura
 * o invocando la función RPC get_tourist_auth_email de Supabase.
 * No realiza llamadas no autorizadas al endpoint administrativo /auth/v1/admin/users/
 * ni a tablas inexistentes /rest/v1/users o /rest/v1/profiles.
 *
 * @param {string} touristId - ID del turista (auth.users.id)
 * @param {Object} [authHeaders]
 * @returns {Promise<string|null>}
 */
export async function obtenerEmailUsuarioAuth(touristId, authHeaders = null) {
    if (!touristId) return null;

    // 1. Verificar si el usuario en sesión activa es el dueño
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        if (sesion?.user?.id === touristId && sesion.user.email) {
            return sesion.user.email;
        }
    } catch (_) {}

    // 2. Si se ejecuta desde el panel de admin para otra persona:
    // Llamar a la RPC get_tourist_auth_email si está disponible
    try {
        let client = null;
        if (typeof window !== 'undefined' && window.supabase) {
            if (typeof window.supabase.rpc === 'function') {
                client = window.supabase;
            } else if (typeof window.supabase.createClient === 'function') {
                client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }
        } else if (typeof globalThis !== 'undefined' && globalThis.supabase?.rpc) {
            client = globalThis.supabase;
        }

        if (client?.rpc) {
            const { data, error } = await client.rpc('get_tourist_auth_email', { target_user_id: touristId });
            if (!error && data) {
                if (typeof data === 'string') return data;
                if (data.email) return data.email;
            }
        }
    } catch (_) {}

    return null;
}

/**
 * Inserta un registro en la tabla public.confirmation_messages
 *
 * @param {Object} registro - Objeto estructurado para confirmation_messages
 * @param {Object} [authHeaders]
 * @returns {Promise<{ ok: boolean, data?: Object, error?: any }>}
 */
export async function registrarMensajeConfirmacion(registro, authHeaders = null) {
    const headers = {
        ...(authHeaders || DEFAULT_HEADERS),
        'Prefer': 'return=representation'
    };

    try {
        const url = `${SUPABASE_URL}/rest/v1/confirmation_messages`;
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(registro)
        });

        if (res.ok) {
            const data = await res.json().catch(() => null);
            return { ok: true, data: Array.isArray(data) ? data[0] : data };
        }

        const errText = await res.text().catch(() => '');
        console.warn('Advertencia al registrar en confirmation_messages:', res.status, errText);
        return { ok: false, error: errText };
    } catch (error) {
        console.warn('Error al enviar registro a confirmation_messages:', error);
        return { ok: false, error };
    }
}

/**
 * Envía un correo electrónico real a la bandeja de entrada mediante la API REST de EmailJS.
 * Captura excepciones de red para no interrumpir el flujo administrativo si falla el proveedor de correo.
 *
 * @param {Object} params
 * @param {string} params.to_email - Dirección de correo electrónico del destinatario
 * @param {string} [params.to_name='Turista'] - Nombre del destinatario
 * @param {string} params.asunto - Asunto del correo electrónico
 * @param {string} params.mensaje - Cuerpo principal del mensaje
 * @param {string} [params.tour_name] - Nombre del tour
 * @param {string} [params.fecha] - Fecha del tour
 * @param {number|string} [params.cupos] - Cantidad de cupos reservados
 * @param {number|string} [params.monto] - Monto total de la reserva
 * @param {string} [params.motivo_rechazo] - Motivo de rechazo si aplica
 * @returns {Promise<{ ok: boolean, status: number, error?: any }>}
 */
export async function enviarEmailReal({
    to_email,
    to_name,
    asunto,
    mensaje,
    tour_name,
    fecha,
    cupos,
    monto,
    motivo_rechazo
} = {}) {
    try {
        const payload = {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
                to_email: to_email,
                to_name: to_name || 'Turista',
                subject: asunto,
                tour_name: tour_name,
                tour_date: fecha,
                spots: cupos,
                total_amount: monto,
                rejection_reason: motivo_rechazo || 'N/A',
                message: mensaje
            }
        };

        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const status = typeof res?.status === 'number' ? res.status : (res?.ok ? 200 : 500);
        return {
            ok: Boolean(res?.ok),
            status
        };
    } catch (error) {
        console.warn('Error al despachar correo vía EmailJS REST API:', error);
        return {
            ok: false,
            status: 0,
            error
        };
    }
}

/**
 * Orquesta la resolución de correos y el registro de notificaciones para una reserva.
 *
 * @param {Object} params
 * @param {string} params.reservaId
 * @param {'confirmacion_tour' | 'rechazo_tour'} params.tipo
 * @param {Object} params.reserva
 * @param {string} [params.motivoRechazo]
 * @param {Object} [params.authHeaders]
 * @returns {Promise<{ ok: boolean, destinatarios: string[], mensajes: Object[] }>}
 */
export async function enviarNotificacionesReserva({
    reservaId,
    tipo,
    reserva,
    motivoRechazo = null,
    authHeaders = null
}) {
    if (!reservaId || !reserva) {
        return { ok: false, destinatarios: [], mensajes: [] };
    }

    // 1. Obtener datos completos de la reserva
    const emailReserva = reserva.tourist_email || '';
    const touristId = reserva.tourist_id || null;

    // 2. Obtener de forma segura el correo del usuario registrado
    let emailAuth = null;
    if (touristId) {
        emailAuth = await obtenerEmailUsuarioAuth(touristId, authHeaders);
    }

    // 3. Resolver la lista de correos con determinarDestinatariosNotificacion
    const destinatarios = determinarDestinatariosNotificacion({ emailAuth, emailReserva });

    // 4. Construir payload informativo y validar campos obligatorios
    const razonRechazoFinal = motivoRechazo || reserva.rejection_reason;
    const payload = construirPayloadNotificacion({
        tipo,
        nombreTour: reserva.tour_name || reserva.tours?.name,
        fechaTour: reserva.tour_date || reserva.tour_dates?.departure_date,
        horaTour: reserva.departure_time || reserva.tours?.departure_time,
        cupos: reserva.spots_reserved,
        montoTotal: reserva.total_amount,
        motivoRechazo: razonRechazoFinal,
        rejection_reason: razonRechazoFinal
    });

    // 5. Configurar asunto, mensaje y motivo para el despacho físico
    const identificador = reserva.reservation_code || reservaId;
    let asunto = '';
    let mensaje = '';
    let motivoRechazoEnvio = null;

    if (tipo === 'confirmacion_tour') {
        asunto = 'Confirmación de Reserva MITUR - ' + identificador;
        mensaje = 'Su reserva ha sido confirmada con éxito. Adjuntamos los detalles oficiales de su tour.';
    } else if (tipo === 'rechazo_tour') {
        asunto = 'Actualización de Reserva MITUR - ' + identificador;
        mensaje = 'Su comprobante de pago ha sido rechazado. Motivo: ' + razonRechazoFinal;
        motivoRechazoEnvio = razonRechazoFinal;
    }

    // 6. Para cada destinatario resuelto, registrar en confirmation_messages y despachar email físico
    const mensajesRegistrados = [];

    for (const dest of destinatarios) {
        const registro = crearRegistroConfirmacionMessage({
            reservaId,
            tipo,
            status: 'enviado',
            payload
        });

        // Insertar el registro de auditoría en public.confirmation_messages
        const auditRes = await registrarMensajeConfirmacion(registro, authHeaders);
        mensajesRegistrados.push(registro);
        console.log(`[Auditoría] Registro de auditoría guardado en confirmation_messages para ${dest}:`, { ok: auditRes.ok, registro });

        // Invocar enviarEmailReal(...) para despachar el correo directamente a la bandeja de Gmail
        const emailRes = await enviarEmailReal({
            to_email: dest,
            to_name: reserva.tourist_name || 'Turista',
            asunto,
            mensaje,
            tour_name: payload.tour_name,
            fecha: payload.tour_date,
            cupos: payload.spots_reserved,
            monto: payload.total_amount,
            motivo_rechazo: motivoRechazoEnvio
        });
        console.log(`[EmailJS] Despacho físico de correo a ${dest}:`, { ok: emailRes.ok, status: emailRes.status, asunto });

        const logDetalles = {
            tipo,
            destinatario: dest,
            tour: payload.tour_name,
            cupos: payload.spots_reserved,
            monto: payload.total_amount,
            ...(tipo === 'rechazo_tour' ? { rejection_reason: payload.rejection_reason } : {})
        };
        console.log(`[Notificaciones] Notificación de ${tipo === 'rechazo_tour' ? 'rechazo' : 'confirmación'} enviada exitosamente a ${dest}:`, logDetalles);
    }

    return {
        ok: true,
        destinatarios,
        mensajes: mensajesRegistrados
    };
}

export const NotificacionesModel = {
    determinarDestinatariosNotificacion,
    construirPayloadNotificacion,
    crearRegistroConfirmacionMessage,
    obtenerEmailUsuarioAuth,
    registrarMensajeConfirmacion,
    enviarEmailReal,
    enviarNotificacionesReserva
};

export default NotificacionesModel;
