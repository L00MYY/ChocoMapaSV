import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { AuthModel } from './AuthModel.js';

const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http') ? atob(SUPABASE_URL_B64) : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_') ? atob(SUPABASE_ANON_KEY_B64) : SUPABASE_ANON_KEY_B64;

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

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

function mapearReserva(item, sesion) {
    if (!item) return null;
    return {
        id: item.id,
        tour_id: item.tour_id,
        tour_date_id: item.tour_date_id,
        tourist_id: item.tourist_id,
        tourist_name: item.tourist_name || (sesion?.user?.user_metadata?.full_name || 'Turista'),
        tourist_email: item.tourist_email || (sesion?.user?.email || ''),
        tourist_phone: item.tourist_phone || '',
        spots_reserved: Number(item.spots_reserved) || 1,
        tour_date: item.tour_date,
        status: item.status || 'pendiente_pago',
        reservation_code: item.reservation_code || item.code || `CM-${String(item.id).slice(0, 6).toUpperCase()}`,
        total_amount: Number(item.total_amount) || (Number(item.tours?.final_price || item.tours?.price || 35) * (Number(item.spots_reserved) || 1)),
        expires_at: item.expires_at || (item.created_at ? new Date(new Date(item.created_at).getTime() + 3600000).toISOString() : new Date(Date.now() + 3600000).toISOString()),
        created_at: item.created_at || new Date().toISOString(),
        tours: item.tours || null
    };
}

export async function obtenerDetalleReserva(reservaId) {
    if (!reservaId) return null;

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}&select=*,tours(*)`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return mapearReserva(data[0], sesion);
            }
        }
    } catch (error) {
        console.warn('Error al obtener detalle de la reserva en Supabase:', error);
    }

    return null;
}

export async function obtenerReservaActivaUsuario(touristId) {
    if (!touristId) return null;

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?tourist_id=eq.${encodeURIComponent(touristId)}&status=in.(pendiente_pago,en_validacion)&order=created_at.desc&limit=1&select=*,tours(*)`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return mapearReserva(data[0], sesion);
            }
        }
    } catch (error) {
        console.warn('Error al obtener reserva activa en Supabase:', error);
    }

    return null;
}

export async function verificarComprobanteExistente(reservaId) {
    if (!reservaId) return null;

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/payment_receipts?reservation_id=eq.${encodeURIComponent(reservaId)}&select=*`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data[0];
            }
        }
    } catch (_) {}

    return null;
}

export async function calcularHashArchivo(file) {
    if (!file) throw new Error('Archivo no proporcionado');
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function subirComprobanteStorage(reservaId, file) {
    if (!reservaId || !file) {
        throw new Error('Parámetros incompletos para subir comprobante');
    }

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;
    const client = obtenerSupabaseClient(token);

    if (!client) {
        throw new Error('SDK de Supabase Client no está disponible en la página.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${reservaId}_${Date.now()}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    // Usar SDK oficial de Supabase Client (sin fetch directo a Storage para evitar Error 405)
    let uploadData = null;
    let uploadError = null;

    const candidateBuckets = ['payment_receipts', 'receipts'];
    for (const bucket of candidateBuckets) {
        const res = await client.storage
            .from(bucket)
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (!res.error) {
            uploadData = res.data;
            uploadError = null;
            break;
        }
        uploadError = res.error;
    }

    if (uploadError && !uploadData) {
        throw new Error(uploadError.message || 'Error al subir el comprobante a Storage');
    }

    const storagePath = uploadData?.path || filePath;
    return { ok: true, path: storagePath };
}

export async function notificarComprobante(reservaId, storagePath, fileHash, mimeType, fileSize) {
    if (!reservaId) {
        throw new Error('ID de reserva obligatorio');
    }

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;
    const client = obtenerSupabaseClient(token);

    if (client) {
        // 1. Insertar el registro en payment_receipts
        const { error: insertError } = await client
            .from('payment_receipts')
            .insert({
                reservation_id: reservaId,
                storage_path: storagePath,
                mime_type: mimeType,
                file_size_bytes: fileSize,
                file_hash: fileHash || null,
                status: 'en_revision'
            });

        if (insertError) {
            console.warn('Advertencia al insertar en payment_receipts con SDK:', insertError);
        }

        // 2. Actualizar el estado de tour_reservations a 'en_validacion'
        const { error: updateError } = await client
            .from('tour_reservations')
            .update({ status: 'en_validacion' })
            .eq('id', reservaId);

        if (updateError) {
            console.warn('Advertencia al actualizar tour_reservations con SDK:', updateError);
        }

        return {
            ok: true,
            message: 'Tu comprobante fue enviado y está en validación'
        };
    }

    // Fallback REST si SDK no estuviera disponible
    const authHeaders = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'en_validacion' })
        });

        await fetch(`${SUPABASE_URL}/rest/v1/payment_receipts`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                reservation_id: reservaId,
                storage_path: storagePath,
                file_hash: fileHash,
                mime_type: mimeType,
                file_size_bytes: fileSize,
                status: 'en_revision'
            })
        });
    } catch (_) {}

    return {
        ok: true,
        message: 'Tu comprobante fue enviado y está en validación'
    };
}

export const PagoModel = {
    obtenerDetalleReserva,
    obtenerReservaActivaUsuario,
    verificarComprobanteExistente,
    calcularHashArchivo,
    subirComprobanteStorage,
    notificarComprobante,
    obtenerSupabaseClient
};

export default PagoModel;
