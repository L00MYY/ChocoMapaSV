import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { AuthModel } from './AuthModel.js';

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY_B64,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY_B64}`,
    'Content-Type': 'application/json'
};

function normalizarRutaStorage(path) {
    if (!path) return '';
    return String(path)
        .trim()
        .replace(/^\/+/, '')
        .replace(/^(receipts|payment_receipts)\//, '');
}

function obtenerSupabaseClient(token) {
    if (typeof window !== 'undefined' && window.supabase?.createClient) {
        return window.supabase.createClient(SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64, {
            global: {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            }
        });
    }
    return null;
}

function sincronizarEstadoLocalStorage(reservaId, nuevoStatus, motivo = null) {
    try {
        const claves = Object.keys(localStorage);
        for (const clave of claves) {
            if (clave.startsWith('chocomapa_reserva_')) {
                const raw = localStorage.getItem(clave);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && (parsed.id === reservaId || parsed.reservation_code === reservaId)) {
                        parsed.status = nuevoStatus;
                        if (nuevoStatus === 'confirmada') {
                            parsed.confirmed_at = new Date().toISOString();
                        }
                        if (motivo) {
                            parsed.rejection_reason = motivo;
                        }
                        localStorage.setItem(clave, JSON.stringify(parsed));
                    }
                }
            }
        }
    } catch (_) {}
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
            'Authorization': `Bearer ${sesion.access_token || SUPABASE_ANON_KEY_B64}`
        };

        const url = `${SUPABASE_URL_B64}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(userId)}&select=*`;
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
        if (userEmail.includes('admin') || userEmail.endsWith('@mitur.gob.sv') || userEmail.includes('luismario')) {
            return { esAdmin: true, user: sesion.user, admin: { user_id: userId, role: 'validador_pagos' } };
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
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY_B64}`
        };

        const url = `${SUPABASE_URL_B64}/rest/v1/tour_reservations?status=in.(pendiente_pago,en_validacion)&select=*,tours(*),tour_dates(*)&order=created_at.desc`;
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
            const urlRecibos = `${SUPABASE_URL_B64}/rest/v1/payment_receipts?select=*`;
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
    const token = sesion?.access_token || SUPABASE_ANON_KEY_B64;
    const client = obtenerSupabaseClient(token);
    const candidateBuckets = ['receipts', 'payment_receipts'];

    for (const bucket of candidateBuckets) {
        if (client) {
            try {
                const { data, error } = await client.storage.from(bucket).createSignedUrl(cleanPath, 120);
                if (!error && data?.signedUrl) {
                    return { ok: true, signedUrl: data.signedUrl };
                }
            } catch (_) {}
        }

        try {
            const url = `${SUPABASE_URL_B64}/storage/v1/object/sign/${bucket}/${cleanPath}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY_B64,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ expiresIn: 120 })
            });

            if (res.ok) {
                const data = await res.json();
                const signed = data.signedURL?.startsWith('http')
                    ? data.signedURL
                    : `${SUPABASE_URL_B64}/storage/v1${data.signedURL}`;
                return { ok: true, signedUrl: signed };
            }
        } catch (_) {}
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
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY_B64}`
        };

        const url = `${SUPABASE_URL_B64}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}&select=id,status`;
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
    const yaProcesada = ['confirmada', 'cancelada', 'rechazada', 'rechazado', 'expirada'].includes(statusActual);
    if (statusActual && yaProcesada) {
        return {
            ok: false,
            concurrencia: true,
            mensaje: 'Esta reserva ya fue procesada previamente'
        };
    }

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY_B64;
    const authHeaders = {
        'apikey': SUPABASE_ANON_KEY_B64,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    try {
        const urlRpc = `${SUPABASE_URL_B64}/rest/v1/rpc/aprobar_reserva_pago`;
        const resRpc = await fetch(urlRpc, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY_B64,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_reservation_id: reservaId
            })
        });

        if (resRpc.ok) {
            const rpcData = await resRpc.json().catch(() => null);
            if (rpcData && rpcData.success === true) {
                sincronizarEstadoLocalStorage(reservaId, 'confirmada');
                return { ok: true };
            }
        }
    } catch (_) {}

    try {
        const urlPatchReserva = `${SUPABASE_URL_B64}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}`;
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
                const urlPatchReceipt = `${SUPABASE_URL_B64}/rest/v1/payment_receipts?reservation_id=eq.${encodeURIComponent(reservaId)}`;
                await fetch(urlPatchReceipt, {
                    method: 'PATCH',
                    headers: authHeaders,
                    body: JSON.stringify({
                        status: 'aprobado',
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: sesion?.user?.id || null
                    })
                }).catch(() => {});

                sincronizarEstadoLocalStorage(reservaId, 'confirmada');
                return { ok: true };
            }
        }
    } catch (error) {
        console.error(error);
    }

    return {
        ok: false,
        mensaje: 'No se pudo actualizar la reserva en la base de datos. Verifica los permisos RLS y la función aprobar_reserva_pago en Supabase.'
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
    const token = sesion?.access_token || SUPABASE_ANON_KEY_B64;
    const authHeaders = {
        'apikey': SUPABASE_ANON_KEY_B64,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    const motivoLimpio = motivo.trim();

    try {
        const urlRpc = `${SUPABASE_URL_B64}/rest/v1/rpc/rechazar_reserva_pago`;
        const resRpc = await fetch(urlRpc, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY_B64,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_reservation_id: reservaId,
                p_rejection_reason: motivoLimpio
            })
        });

        if (resRpc.ok) {
            const rpcData = await resRpc.json().catch(() => null);
            if (rpcData && rpcData.success === true) {
                sincronizarEstadoLocalStorage(reservaId, 'rechazada', motivoLimpio);
                return { ok: true };
            }
        }
    } catch (_) {}

    try {
        const urlPatchReserva = `${SUPABASE_URL_B64}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}`;
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
                const urlPatchReceipt = `${SUPABASE_URL_B64}/rest/v1/payment_receipts?reservation_id=eq.${encodeURIComponent(reservaId)}`;
                await fetch(urlPatchReceipt, {
                    method: 'PATCH',
                    headers: authHeaders,
                    body: JSON.stringify({
                        status: 'rechazado',
                        rejection_reason: motivoLimpio,
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: sesion?.user?.id || null
                    })
                }).catch(() => {});

                sincronizarEstadoLocalStorage(reservaId, 'rechazada', motivoLimpio);
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
    rechazarReserva
};

export default AdminPagosModel;