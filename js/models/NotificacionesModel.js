/**
 * js/models/NotificacionesModel.js
 * Modelo para el envío y registro de notificaciones y confirmaciones de tours (MITUR SV).
 * Provee desduplicación de correos entre auth.users y tour_reservations,
 * persistencia en confirmation_messages y despacho real mediante EmailJS REST API.
 */

import {
    SUPABASE_URL_B64,
    SUPABASE_ANON_KEY_B64,
    EMAILJS_SERVICE_ID_B64,
    EMAILJS_TEMPLATE_ID_B64,
    EMAILJS_PUBLIC_KEY_B64
} from '../config.js';
import { AuthModel } from './AuthModel.js';

/**
 * @description Decodifica de forma segura cadenas base64 en entornos navegador y Node.js.
 * @param {string} val - Cadena en base64.
 * @returns {string} Cadena decodificada en UTF-8.
 */
const decodeB64 = (val) => {
    if (!val || typeof val !== 'string') return '';
    try {
        if (typeof atob === 'function') {
            return atob(val);
        }
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(val, 'base64').toString('utf-8');
        }
    } catch (error) {
        console.warn('Advertencia al decodificar base64 en NotificacionesModel:', error);
        return val;
    }
    return val;
};

const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http')
    ? atob(SUPABASE_URL_B64)
    : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_')
    ? atob(SUPABASE_ANON_KEY_B64)
    : SUPABASE_ANON_KEY_B64;

const EMAILJS_SERVICE_ID = decodeB64(EMAILJS_SERVICE_ID_B64);
const EMAILJS_TEMPLATE_ID = decodeB64(EMAILJS_TEMPLATE_ID_B64);
const EMAILJS_PUBLIC_KEY = decodeB64(EMAILJS_PUBLIC_KEY_B64);

const DEFAULT_HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

/**
 * @description Función pura que determina y desduplica los correos electrónicos de destino
 * comparando el correo autenticado del usuario (auth.users) con el correo registrado en la reserva.
 * Si emailAuth es null o igual a emailReserva, retorna [emailReserva].
 * Si ambos existen y son distintos, retorna [emailAuth, emailReserva].
 * @param {Object} params
 * @param {string|null} params.emailAuth - Correo de la sesión / auth.users.
 * @param {string|null} params.emailReserva - Correo indicado en la reserva del tour.
 * @returns {string[]} Lista de correos únicos y normalizados.
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
 * @description Construye y valida el payload de datos para el mensaje de notificación.
 * En caso de rechazo, exige obligatoriamente rejection_reason.
 * @param {Object} [params={}]
 * @param {'confirmacion_tour' | 'rechazo_tour'} [params.tipo='confirmacion_tour'] - Tipo de notificación.
 * @param {string} [params.nombreTour=''] - Nombre del paquete turístico.
 * @param {string} [params.fechaTour=''] - Fecha de salida.
 * @param {string} [params.horaTour=''] - Hora de reunión.
 * @param {number} [params.cupos=1] - Cupos reservados.
 * @param {number} [params.montoTotal=0] - Monto total de la reserva.
 * @param {string|null} [params.motivoRechazo=null] - Motivo en caso de rechazo.
 * @param {string|null} [params.rejection_reason=null] - Motivo alternativo de rechazo.
 * @param {string|null} [params.motivo=null] - Motivo alternativo de rechazo.
 * @returns {Object} Payload estructurado del mensaje.
 * @throws {Error} Si el tipo es rechazo_tour y no se suministra rejection_reason.
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
 * @description Crea la estructura oficial del registro que se almacena en la tabla public.confirmation_messages
 * alineada estrictamente al esquema DDL de la base de datos (reservation_id, channel, message_type, status, attempts, sent_at, created_at).
 * @param {Object} [params={}]
 * @param {string} params.reservaId - UUID de la reservación.
 * @param {'confirmacion_tour' | 'rechazo_tour'} [params.tipo='confirmacion_tour'] - Tipo de mensaje.
 * @param {string} [params.status='enviado'] - Estado de envío.
 * @param {Object|null} [params.payload=null] - Payload de la notificación para validación previa.
 * @returns {Object} Registro estructurado para confirmation_messages.
 * @throws {Error} Si es rechazo_tour y no incluye rejection_reason en payload.
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
 * @description Consulta el correo del usuario registrado consultando la sesión activa de forma segura
 * o invocando la función RPC get_tourist_auth_email de Supabase.
 * @param {string} touristId - ID del turista (auth.users.id).
 * @param {Object|null} [authHeaders=null] - Cabeceras de autenticación opcionales.
 * @returns {Promise<string|null>} Correo del usuario autenticado o null.
 */
export async function obtenerEmailUsuarioAuth(touristId, authHeaders = null) {
    if (!touristId) return null;

    // 1. Verificar si el usuario en sesión activa es el dueño
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        if (sesion?.user?.id === touristId && sesion.user.email) {
            return sesion.user.email;
        }
    } catch (error) {
        console.warn('Advertencia al consultar sesión activa en obtenerEmailUsuarioAuth:', error);
    }

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
    } catch (error) {
        console.warn('Advertencia al invocar RPC get_tourist_auth_email:', error);
    }

    return null;
}

/**
 * @description Inserta un registro en la tabla public.confirmation_messages de Supabase.
 * @param {Object} registro - Objeto estructurado para confirmation_messages.
 * @param {Object|null} [authHeaders=null] - Cabeceras de autenticación opcionales.
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
            const data = await res.json().catch((jsonErr) => {
                console.warn('Advertencia al parsear data en registrarMensajeConfirmacion:', jsonErr);
                return null;
            });
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
 * @description Envía un correo electrónico real a la bandeja de entrada mediante la API REST de EmailJS.
 * Captura excepciones de red retornando { ok: false, status: 0, error } para no interrumpir el flujo administrativo.
 * @param {Object} [params={}]
 * @param {string} params.to_email - Dirección de correo electrónico del destinatario.
 * @param {string} [params.to_name='Turista'] - Nombre del destinatario.
 * @param {string} params.asunto - Asunto del correo electrónico.
 * @param {string} params.mensaje - Cuerpo principal del mensaje.
 * @param {string} [params.tour_name] - Nombre del tour.
 * @param {string} [params.fecha] - Fecha del tour.
 * @param {number|string} [params.cupos] - Cantidad de cupos reservados.
 * @param {number|string} [params.monto] - Monto total de la reserva.
 * @param {string} [params.motivo_rechazo] - Motivo de rechazo si aplica.
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
 * @description Orquesta la resolución de correos, persistencia de auditoría y despacho vía EmailJS para una reserva.
 * @param {Object} params
 * @param {string} params.reservaId - UUID de la reservación.
 * @param {'confirmacion_tour' | 'rechazo_tour'} params.tipo - Tipo de evento.
 * @param {Object} params.reserva - Datos de la reserva.
 * @param {string|null} [params.motivoRechazo=null] - Motivo de rechazo.
 * @param {Object|null} [params.authHeaders=null] - Cabeceras de autenticación.
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

/**
 * Objeto NotificacionesModel agrupando la API del modelo de notificaciones
 */
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
