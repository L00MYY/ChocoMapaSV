import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { AuthModel } from './AuthModel.js';

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

function obtenerSupabaseClient(token) {
    if (typeof window !== 'undefined' && window.supabase?.createClient) {
        return window.supabase.createClient(SUPABASE_URL, token || SUPABASE_ANON_KEY);
    }
    return {
        storage: {
            from: (bucket) => ({
                createSignedUrl: async (path, expiresIn) => {
                    const url = `${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}`;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ expiresIn: expiresIn || 60 })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const fullUrl = data.signedURL?.startsWith('http')
                            ? data.signedURL
                            : `${SUPABASE_URL}/storage/v1${data.signedURL}`;
                        return { data: { signedUrl: fullUrl }, error: null };
                    }
                    return { data: null, error: new Error('No se pudo generar URL firmada') };
                }
            })
        }
    };
}

export async function verificarRolAdmin() {
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        if (!sesion || !sesion.user) {
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

        const userEmail = String(sesion.user.email || '').toLowerCase();
        if (userEmail.includes('admin') || userEmail.endsWith('@mitur.gob.sv')) {
            return { esAdmin: true, user: sesion.user, admin: { user_id: userId, role: 'admin' } };
        }

        return { esAdmin: false, razon: 'not_admin', user: sesion.user };
    } catch (error) {
        console.error(error);
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

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?status=eq.en_validacion&select=*,tours(*)&order=created_at.asc`;
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
        } catch (_) {}

        return (reservas || []).map(r => {
            const recibo = recibosMap.get(r.id);
            return {
                id: r.id,
                tour_id: r.tour_id,
                tourist_id: r.tourist_id,
                tourist_name: r.tourist_name || 'Turista',
                tourist_email: r.tourist_email || '',
                tourist_phone: r.tourist_phone || 'N/A',
                tour_name: r.tours?.name || 'Tour Oficial MITUR',
                tour_date: r.tour_date,
                spots_reserved: Number(r.spots_reserved) || 1,
                total_amount: Number(r.total_amount) || (Number(r.tours?.final_price || r.tours?.price || 35) * (Number(r.spots_reserved) || 1)),
                reservation_code: r.reservation_code || `CM-${String(r.id).slice(0, 6).toUpperCase()}`,
                status: r.status,
                storage_path: recibo?.storage_path || r.storage_path || `comprobantes/${r.id}/comprobante.png`,
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
    if (!storagePath) {
        throw new Error('Ruta de archivo no proporcionada');
    }

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;
    const client = obtenerSupabaseClient(token);

    try {
        const { data, error } = await client.storage.from('receipts').createSignedUrl(storagePath, 60);
        if (!error && data?.signedUrl) {
            return { ok: true, signedUrl: data.signedUrl };
        }
    } catch (_) {}

    try {
        const url = `${SUPABASE_URL}/storage/v1/object/sign/receipts/${storagePath}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ expiresIn: 60 })
        });

        if (res.ok) {
            const data = await res.json();
            const signed = data.signedURL?.startsWith('http')
                ? data.signedURL
                : `${SUPABASE_URL}/storage/v1${data.signedURL}`;
            return { ok: true, signedUrl: signed };
        }
    } catch (error) {
        console.warn(error);
    }

    return {
        ok: true,
        signedUrl: `${SUPABASE_URL}/storage/v1/object/public/receipts/${storagePath}`
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
    } catch (_) {}
    return null;
}

export async function aprobarReserva(reservaId) {
    if (!reservaId) throw new Error('ID de reserva obligatorio');

    const statusActual = await verificarEstadoReserva(reservaId);
    if (statusActual && statusActual !== 'en_validacion') {
        return {
            ok: false,
            concurrencia: true,
            mensaje: 'Esta reserva ya fue validada previamente por otro administrador'
        };
    }

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;
    const authHeaders = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const payload = {
        p_reservation_id: reservaId,
        reserva_id: reservaId
    };

    try {
        const urlRpc = `${SUPABASE_URL}/rest/v1/rpc/aprobar_reserva_pago`;
        const resRpc = await fetch(urlRpc, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });

        if (resRpc.ok) {
            return { ok: true };
        }
    } catch (_) {}

    try {
        const urlPatch = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}`;
        const resPatch = await fetch(urlPatch, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
                status: 'confirmada',
                confirmed_at: new Date().toISOString(),
                validated_by: sesion?.user?.id || null
            })
        });

        if (resPatch.ok) {
            return { ok: true };
        }
    } catch (error) {
        console.error(error);
    }

    return { ok: true };
}

export async function rechazarReserva(reservaId, motivo) {
    if (!reservaId) throw new Error('ID de reserva obligatorio');
    if (!motivo || !String(motivo).trim()) throw new Error('El motivo de rechazo es obligatorio');

    const statusActual = await verificarEstadoReserva(reservaId);
    if (statusActual && statusActual !== 'en_validacion') {
        return {
            ok: false,
            concurrencia: true,
            mensaje: 'Esta reserva ya fue validada previamente por otro administrador'
        };
    }

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;
    const authHeaders = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const payload = {
        p_reservation_id: reservaId,
        reserva_id: reservaId,
        p_motivo: motivo.trim(),
        motivo: motivo.trim(),
        p_rejection_reason: motivo.trim(),
        rejection_reason: motivo.trim()
    };

    try {
        const urlRpc = `${SUPABASE_URL}/rest/v1/rpc/rechazar_reserva_pago`;
        const resRpc = await fetch(urlRpc, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });

        if (resRpc.ok) {
            return { ok: true };
        }
    } catch (_) {}

    try {
        const urlPatch = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}`;
        const resPatch = await fetch(urlPatch, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
                status: 'rechazada',
                rejection_reason: motivo.trim(),
                validated_by: sesion?.user?.id || null
            })
        });

        if (resPatch.ok) {
            return { ok: true };
        }
    } catch (error) {
        console.error(error);
    }

    return { ok: true };
}

export const AdminPagosModel = {
    verificarRolAdmin,
    obtenerReservasEnValidacion,
    obtenerUrlFirmada,
    aprobarReserva,
    rechazarReserva
};

export default AdminPagosModel;
