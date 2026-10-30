import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { AuthModel } from './AuthModel.js';

const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http') ? atob(SUPABASE_URL_B64) : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_') ? atob(SUPABASE_ANON_KEY_B64) : SUPABASE_ANON_KEY_B64;

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

function normalizarRutaStorage(path) {
    if (!path) return '';
    return String(path).trim().replace(/^\/+/, '');
}

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

        // Validar si el user.id pertenece a la tabla admin_users
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

export async function obtenerReservasEnValidacion() {
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?status=in.(pendiente_pago,en_validacion)&select=*,tours(*),tour_dates(*)&order=created_at.desc`;
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
        } catch (_) { }

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
                spots_reserved: Number(r.spots_reserved) || 1,
                total_amount: Number(r.total_amount) || (Number(r.tours?.final_price || r.tours?.price || 35) * (Number(r.spots_reserved) || 1)),
                reservation_code: r.reservation_code || `CM-${String(r.id).slice(0, 6).toUpperCase()}`,
                status: r.status,
                storage_path: pathReal,
                mime_type: recibo?.mime_type || 'image/png',
                created_at: r.created_at
            };
        });
    } catch (error) {
        console.error(error);
        return [];
    }
}

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
            } catch (_) { }
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
        } catch (_) { }
    }

    return {
        ok: false,
        error: 'No se pudo localizar el archivo en el almacenamiento. Asegúrate de que el bucket de Storage exista y el archivo haya sido transferido.'
    };
}

export async function verificarEstadoReserva(reservaId) {
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}&select=id,status`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data[0].status;
            }
        }
    } catch (_) { }
    return null;
}

export async function aprobarReserva(reservaId) {
    if (!reservaId) throw new Error('ID de reserva obligatorio');

    const statusActual = await verificarEstadoReserva(reservaId);
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
            const filasActualizadas = await resPatch.json().catch(() => []);
            if (Array.isArray(filasActualizadas) && filasActualizadas.length > 0) {
                const urlPatchReceipt = `${SUPABASE_URL}/rest/v1/payment_receipts?reservation_id=eq.${encodeURIComponent(reservaId)}`;
                await fetch(urlPatchReceipt, {
                    method: 'PATCH',
                    headers: authHeaders,
                    body: JSON.stringify({
                        status: 'aprobado',
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: sesion?.user?.id || null
                    })
                }).catch(() => { });

                return { ok: true };
            }
        }
    } catch (error) {
        console.error(error);
    }

    return {
        ok: false,
        mensaje: 'No se pudo actualizar la reserva en la base de datos. Verifica los permisos RLS en Supabase.'
    };
}

export async function rechazarReserva(reservaId, motivo) {
    if (!reservaId) throw new Error('ID de reserva obligatorio');
    if (!motivo || !String(motivo).trim()) throw new Error('El motivo de rechazo es obligatorio');

    const statusActual = await verificarEstadoReserva(reservaId);
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
            const filasActualizadas = await resPatch.json().catch(() => []);
            if (Array.isArray(filasActualizadas) && filasActualizadas.length > 0) {
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
                }).catch(() => { });

                return { ok: true };
            }
        }
    } catch (error) {
        console.error(error);
    }

    return {
        ok: false,
        mensaje: 'No se pudo rechazar la reserva en la base de datos. Verifica los permisos RLS en Supabase.'
    };
}

export const AdminPagosModel = {
    verificarRolAdmin,
    obtenerReservasEnValidacion,
    obtenerUrlFirmada,
    aprobarReserva,
    rechazarReserva,
    obtenerSupabaseClient
};

export default AdminPagosModel;
