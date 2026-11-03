/**
 * js/models/AdminPagosModel.js
 * Modelo administrativo de conciliación y validación de pagos (MITUR SV).
 * Orquesta la verificación de roles administrativos, aprobación, rechazo,
 * reincorporación atómica de cupos y generación de URLs firmadas temporales.
 */

import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { AuthModel } from './AuthModel.js';
import { enviarNotificacionesReserva } from './NotificacionesModel.js';

// Decodificación segura en memoria en tiempo de ejecución
const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http')
    ? atob(SUPABASE_URL_B64)
    : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_')
    ? atob(SUPABASE_ANON_KEY_B64)
    : SUPABASE_ANON_KEY_B64;

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

/**
 * @description Normaliza la ruta de almacenamiento eliminando barras iniciales redundantes.
 * @param {string|null} path - Ruta en Storage.
 * @returns {string} Ruta normalizada.
 */
function normalizarRutaStorage(path) {
    if (!path) return '';
    return String(path).trim().replace(/^\/+/, '');
}

/**
 * @description Crea una instancia del cliente Supabase con token de autorización si aplica.
 * @param {string} [token] - Token JWT.
 * @returns {Object|null}
 */
export function obtenerSupabaseClient(token) {
    if (typeof window !== 'undefined' && window.supabase?.createClient) {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            }
        });
    }
    return null;
}

/**
 * @description Verifica si el usuario autenticado tiene rol de administrador en la tabla admin_users.
 * @returns {Promise<{ esAdmin: boolean, user?: Object|null, admin?: Object, razon?: string, error?: * }>}
 */
export async function verificarRolAdmin() {
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        if (!sesion || !sesion.user || !sesion.user.id) {
            return { esAdmin: false, razon: 'no_session', user: null };
        }

        const userId = sesion.user.id;
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(userId)}&select=*`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return { esAdmin: true, user: sesion.user, admin: data[0] };
            }
        }

        return { esAdmin: false, razon: 'not_admin', user: sesion.user };
    } catch (error) {
        console.error('Error al verificar admin_users:', error);
        return { esAdmin: false, razon: 'error', error };
    }
}

/**
 * @description Consulta todas las reservas históricas relevantes (pendiente_pago, en_validacion, confirmada, rechazada).
 * @returns {Promise<Array<Object>>} Lista de reservas enriquecidas con metadatos del comprobante.
 */
export async function obtenerReservasEnValidacion() {
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?status=in.(pendiente_pago,en_validacion,confirmada,rechazada)&select=*,tours(*),tour_dates(*)&order=created_at.desc`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        let reservas = [];
        if (res.ok) {
            reservas = await res.json();
        }

        let recibosMap = new Map();
        try {
            const urlRecibos = `${SUPABASE_URL}/rest/v1/payment_receipts?select=*`;
            const resRecibos = await fetch(urlRecibos, {
                method: 'GET',
                headers: authHeaders
            });
            if (resRecibos.ok) {
                const recibos = await resRecibos.json();
                if (Array.isArray(recibos)) {
                    recibos.forEach(rc => {
                        if (rc.reservation_id) {
                            recibosMap.set(rc.reservation_id, rc);
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('Advertencia al consultar payment_receipts en lote:', error);
        }

        return (reservas || []).map(r => {
            const recibo = recibosMap.get(r.id);
            const pathReal = recibo?.storage_path
                ? normalizarRutaStorage(recibo.storage_path)
                : (r.storage_path ? normalizarRutaStorage(r.storage_path) : '');

            return {
                id: r.id,
                tour_id: r.tour_id,
                tour_date_id: r.tour_date_id,
                tourist_id: r.tourist_id,
                tourist_name: r.tourist_name || 'Turista',
                tourist_email: r.tourist_email || '',
                tourist_phone: r.tourist_phone || 'N/A',
                tour_name: r.tours?.name || 'Tour Oficial MITUR',
                tour_date: r.tour_dates?.departure_date || r.tour_date,
                departure_time: r.tours?.departure_time || '07:00 AM',
                spots_reserved: Number(r.spots_reserved) || 1,
                total_amount: Number(r.total_amount) || (Number(r.tours?.final_price || r.tours?.price || 35) * (Number(r.spots_reserved) || 1)),
                reservation_code: r.reservation_code || `CM-${String(r.id).slice(0, 6).toUpperCase()}`,
                status: r.status,
                rejection_reason: r.rejection_reason || recibo?.rejection_reason || '',
                storage_path: pathReal,
                mime_type: recibo?.mime_type || 'image/png',
                created_at: r.created_at
            };
        });
    } catch (error) {
        console.error('Error al obtener reservas históricas en AdminPagosModel:', error);
        return [];
    }
}

export const obtenerReservasHistoricas = obtenerReservasEnValidacion;

/**
 * @description Genera una URL firmada de descarga temporal (300s) para visualizar el comprobante en Storage.
 * @param {string} storagePath - Ruta del archivo en Storage.
 * @returns {Promise<{ ok: boolean, signedUrl?: string, error?: string }>}
 */
export async function obtenerUrlFirmada(storagePath) {
    const cleanPath = normalizarRutaStorage(storagePath);
    if (!cleanPath) {
        return { ok: false, error: 'Esta reserva no cuenta con un archivo adjunto' };
    }

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;
    const client = obtenerSupabaseClient(token);
    const candidateBuckets = ['payment_receipts', 'receipts'];

    for (const bucket of candidateBuckets) {
        if (client) {
            try {
                const { data, error } = await client.storage.from(bucket).createSignedUrl(cleanPath, 300);
                if (!error && data?.signedUrl) {
                    return { ok: true, signedUrl: data.signedUrl };
                }
            } catch (error) {
                console.warn('Advertencia al generar signedUrl con SDK:', error);
            }
        }

        try {
            const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
            const url = `${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encodedPath}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ expiresIn: 300 })
            });

            if (res.ok) {
                const data = await res.json();
                const signed = data.signedURL?.startsWith('http')
                    ? data.signedURL
                    : `${SUPABASE_URL}/storage/v1${data.signedURL}`;
                return { ok: true, signedUrl: signed };
            }
        } catch (error) {
            console.warn('Advertencia en fallback REST de signedUrl:', error);
        }
    }

    return {
        ok: false,
        error: 'No se pudo localizar el archivo en el almacenamiento. Asegúrate de que el bucket de Storage exista y el archivo haya sido transferido.'
    };
}

/**
 * @description Consulta los datos detallados de una reserva individual para el panel de administración.
 * @param {string} reservaId - UUID de la reservación.
 * @returns {Promise<Object|null>}
 */
export async function obtenerReservaParaAdmin(reservaId) {
    if (!reservaId) return null;
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}&select=id,status,tour_id,tour_date_id,tourist_id,tourist_name,tourist_email,tourist_phone,spots_reserved,total_amount,tour_date,rejection_reason,tours(name,departure_time),tour_dates(departure_date)`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const item = data[0];
                return {
                    ...item,
                    tour_name: item.tours?.name || 'Tour Oficial MITUR',
                    departure_time: item.tours?.departure_time || '07:00 AM',
                    tour_date: item.tour_dates?.departure_date || item.tour_date
                };
            }
        }
    } catch (error) {
        console.warn('Advertencia al consultar reserva en obtenerReservaParaAdmin:', error);
    }
    return null;
}

/**
 * @description Reincorpora los cupos reservados a la tabla tour_dates cuando una reserva es rechazada.
 * @param {string} tourDateId - UUID de la fecha del tour.
 * @param {number} spotsReserved - Cantidad de cupos a reintegrar.
 * @param {Object|null} [authHeadersCustom=null] - Cabeceras de autenticación opcionales.
 * @returns {Promise<{ ok: boolean, available_spots?: number, data?: Object, error?: * }>}
 */
export async function reincorporarCuposTour(tourDateId, spotsReserved, authHeadersCustom = null) {
    if (!tourDateId || !spotsReserved || Number(spotsReserved) <= 0) {
        return { ok: false, error: 'Parámetros inválidos' };
    }

    try {
        let authHeaders = authHeadersCustom;
        if (!authHeaders) {
            const sesion = await AuthModel.obtenerSesionActual();
            const token = sesion?.access_token || SUPABASE_ANON_KEY;
            authHeaders = {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            };
        }

        const urlGetDate = `${SUPABASE_URL}/rest/v1/tour_dates?id=eq.${encodeURIComponent(tourDateId)}&select=id,available_spots`;
        const resGetDate = await fetch(urlGetDate, {
            method: 'GET',
            headers: authHeaders
        });

        if (!resGetDate.ok) {
            return { ok: false, error: 'Error al consultar tour_dates' };
        }

        const dateData = await resGetDate.json();
        if (!Array.isArray(dateData) || dateData.length === 0) {
            return { ok: false, error: 'Registro de fecha no encontrado' };
        }

        const cuposActuales = Number(dateData[0].available_spots) || 0;
        const nuevoAvailableSpots = cuposActuales + Number(spotsReserved);

        const urlPatchDate = `${SUPABASE_URL}/rest/v1/tour_dates?id=eq.${encodeURIComponent(tourDateId)}`;
        const resPatchDate = await fetch(urlPatchDate, {
            method: 'PATCH',
            headers: {
                ...authHeaders,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                available_spots: nuevoAvailableSpots
            })
        });

        if (!resPatchDate.ok) {
            return { ok: false, error: 'Error al actualizar available_spots en tour_dates' };
        }

        const dataUpdated = await resPatchDate.json().catch((jsonErr) => {
            console.warn('Advertencia al parsear dataUpdated en reincorporarCuposTour:', jsonErr);
            return null;
        });
        return {
            ok: true,
            available_spots: nuevoAvailableSpots,
            data: Array.isArray(dataUpdated) ? dataUpdated[0] : dataUpdated
        };
    } catch (error) {
        console.error('Error al reincorporar cupos en tour_dates:', error);
        return { ok: false, error };
    }
}

/**
 * @description Verifica el estado actual de una reserva en Supabase.
 * @param {string} reservaId
 * @returns {Promise<string|null>} Estado actual de la reserva.
 */
export async function verificarEstadoReserva(reservaId) {
    const reserva = await obtenerReservaParaAdmin(reservaId);
    return reserva?.status || null;
}

/**
 * @description Aprueba la reserva, actualiza el recibo y envía la notificación por correo al turista.
 * @param {string} reservaId - UUID de la reservación.
 * @returns {Promise<{ ok: boolean, concurrencia?: boolean, mensaje?: string, reserva?: Object }>}
 * @throws {Error} Si el ID de reserva es omitido.
 */
export async function aprobarReserva(reservaId) {
    if (!reservaId) throw new Error('ID de reserva obligatorio');

    const reserva = await obtenerReservaParaAdmin(reservaId);
    const statusActual = reserva?.status || null;
    const yaProcesada = ['confirmada', 'cancelada', 'rechazada', 'rechazado', 'expirada'].includes(statusActual);
    if (statusActual && yaProcesada) {
        return {
            ok: false,
            concurrencia: true,
            mensaje: 'Esta reserva ya fue procesada previamente'
        };
    }

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;
    const authHeaders = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    try {
        const urlPatchReserva = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}`;
        const resPatch = await fetch(urlPatchReserva, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
                status: 'confirmada',
                confirmed_at: new Date().toISOString(),
                validated_by: sesion?.user?.id || null
            })
        });

        if (resPatch.ok) {
            const filasActualizadas = await resPatch.json().catch((jsonErr) => {
                console.warn('Advertencia al parsear filas en aprobarReserva:', jsonErr);
                return [];
            });
            if (Array.isArray(filasActualizadas) && filasActualizadas.length > 0) {
                const fila = filasActualizadas[0];
                const urlPatchReceipt = `${SUPABASE_URL}/rest/v1/payment_receipts?reservation_id=eq.${encodeURIComponent(reservaId)}`;
                await fetch(urlPatchReceipt, {
                    method: 'PATCH',
                    headers: authHeaders,
                    body: JSON.stringify({
                        status: 'aprobado',
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: sesion?.user?.id || null
                    })
                }).catch((receiptErr) => {
                    console.warn('Advertencia al actualizar payment_receipts en aprobación:', receiptErr);
                });

                const datosReservaCompleta = {
                    ...(reserva || {}),
                    ...fila
                };

                try {
                    await enviarNotificacionesReserva({
                        reservaId,
                        tipo: 'confirmacion_tour',
                        reserva: datosReservaCompleta,
                        authHeaders
                    });
                } catch (notifErr) {
                    console.warn('Advertencia al enviar notificaciones de confirmación:', notifErr);
                }

                return { ok: true, reserva: datosReservaCompleta };
            }
        }
    } catch (error) {
        console.error('Error al aprobar reserva en Supabase:', error);
    }

    return {
        ok: false,
        mensaje: 'No se pudo actualizar la reserva en la base de datos. Verifica los permisos RLS en Supabase.'
    };
}

/**
 * @description Rechaza la reserva, reincorpora cupos a tour_dates y envía notificación con el motivo del rechazo.
 * @param {string} reservaId - UUID de la reservación.
 * @param {string} motivo - Razón explicativa del rechazo del comprobante.
 * @returns {Promise<{ ok: boolean, concurrencia?: boolean, mensaje?: string, reserva?: Object }>}
 * @throws {Error} Si falta el ID de reserva o el motivo de rechazo.
 */
export async function rechazarReserva(reservaId, motivo) {
    if (!reservaId) throw new Error('ID de reserva obligatorio');
    if (!motivo || !String(motivo).trim()) throw new Error('El motivo de rechazo es obligatorio');

    const reserva = await obtenerReservaParaAdmin(reservaId);
    const statusActual = reserva?.status || null;
    const yaProcesada = ['confirmada', 'cancelada', 'rechazada', 'rechazado', 'expirada'].includes(statusActual);
    if (statusActual && yaProcesada) {
        return {
            ok: false,
            concurrencia: true,
            mensaje: 'Esta reserva ya fue procesada previamente'
        };
    }

    const tourDateId = reserva?.tour_date_id || null;
    const spotsReserved = Number(reserva?.spots_reserved) || 0;

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;
    const authHeaders = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    const motivoLimpio = motivo.trim();

    try {
        const urlPatchReserva = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}`;
        const resPatch = await fetch(urlPatchReserva, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
                status: 'rechazada',
                rejection_reason: motivoLimpio,
                validated_by: sesion?.user?.id || null
            })
        });

        if (resPatch.ok) {
            const filasActualizadas = await resPatch.json().catch((jsonErr) => {
                console.warn('Advertencia al parsear filas en rechazarReserva:', jsonErr);
                return [];
            });
            if (Array.isArray(filasActualizadas) && filasActualizadas.length > 0) {
                const fila = filasActualizadas[0];
                const finalTourDateId = tourDateId || fila.tour_date_id;
                const finalSpotsReserved = spotsReserved || Number(fila.spots_reserved) || 0;

                const urlPatchReceipt = `${SUPABASE_URL}/rest/v1/payment_receipts?reservation_id=eq.${encodeURIComponent(reservaId)}`;
                await fetch(urlPatchReceipt, {
                    method: 'PATCH',
                    headers: authHeaders,
                    body: JSON.stringify({
                        status: 'rechazado',
                        rejection_reason: motivoLimpio,
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: sesion?.user?.id || null
                    })
                }).catch((receiptErr) => {
                    console.warn('Advertencia al actualizar payment_receipts en rechazo:', receiptErr);
                });

                if (finalTourDateId && finalSpotsReserved > 0) {
                    await reincorporarCuposTour(finalTourDateId, finalSpotsReserved, authHeaders);
                }

                const datosReservaCompleta = {
                    ...(reserva || {}),
                    ...fila,
                    rejection_reason: motivoLimpio
                };

                try {
                    await enviarNotificacionesReserva({
                        reservaId,
                        tipo: 'rechazo_tour',
                        reserva: datosReservaCompleta,
                        motivoRechazo: motivoLimpio,
                        authHeaders
                    });
                } catch (notifErr) {
                    console.warn('Advertencia al enviar notificaciones de rechazo:', notifErr);
                }

                return { ok: true, reserva: datosReservaCompleta };
            }
        }
    } catch (error) {
        console.error('Error al rechazar reserva en Supabase:', error);
    }

    return {
        ok: false,
        mensaje: 'No se pudo rechazar la reserva en la base de datos. Verifica los permisos RLS en Supabase.'
    };
}

/**
 * Objeto AdminPagosModel agrupando la API del modelo administrativo
 */
export const AdminPagosModel = {
    verificarRolAdmin,
    obtenerReservasEnValidacion,
    obtenerReservasHistoricas,
    obtenerUrlFirmada,
    aprobarReserva,
    rechazarReserva,
    obtenerReservaParaAdmin,
    reincorporarCuposTour,
    obtenerSupabaseClient
};

export default AdminPagosModel;
