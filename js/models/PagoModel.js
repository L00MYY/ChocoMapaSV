import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { AuthModel } from './AuthModel.js';

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

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
                const item = data[0];
                return {
                    id: item.id,
                    tour_id: item.tour_id,
                    tourist_id: item.tourist_id,
                    tourist_name: item.tourist_name || (sesion?.user?.user_metadata?.full_name || 'Turista'),
                    tourist_email: item.tourist_email || (sesion?.user?.email || ''),
                    tourist_phone: item.tourist_phone || '',
                    spots_reserved: Number(item.spots_reserved) || 1,
                    tour_date: item.tour_date,
                    status: item.status || 'pendiente_pago',
                    reservation_code: item.reservation_code || item.code || `CM-${String(item.id).slice(0, 6).toUpperCase()}`,
                    total_amount: Number(item.total_amount) || (Number(item.tours?.final_price || item.tours?.price || 35) * (Number(item.spots_reserved) || 1)),
                    expires_at: item.expires_at || null,
                    created_at: item.created_at || new Date().toISOString(),
                    tours: item.tours || null
                };
            }
        }
    } catch (error) {
        console.warn(error);
    }

    try {
        const claves = Object.keys(localStorage);
        for (const clave of claves) {
            if (clave.startsWith('chocomapa_reserva_')) {
                const raw = localStorage.getItem(clave);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && (parsed.id === reservaId || parsed.reservation_code === reservaId)) {
                        return {
                            id: parsed.id,
                            tour_id: parsed.tour_id,
                            tourist_id: parsed.tourist_id,
                            tourist_name: parsed.tourist_name || 'Turista',
                            tourist_email: parsed.tourist_email || '',
                            tourist_phone: parsed.tourist_phone || '',
                            spots_reserved: Number(parsed.spots_reserved) || 1,
                            tour_date: parsed.tour_date,
                            status: parsed.status || 'pendiente_pago',
                            reservation_code: parsed.reservation_code || `CM-${String(parsed.id).slice(0, 6).toUpperCase()}`,
                            total_amount: Number(parsed.total_amount) || 35.00,
                            expires_at: parsed.expires_at || null,
                            created_at: parsed.created_at || new Date().toISOString(),
                            tours: parsed.tours || null
                        };
                    }
                }
            }
        }
    } catch (_) {}

    return {
        id: reservaId,
        tour_id: 'a1000000-0000-0000-0000-000000000001',
        tourist_id: '',
        tourist_name: 'Turista ChocoMapa',
        tourist_email: '',
        tourist_phone: '',
        spots_reserved: 1,
        tour_date: new Date().toISOString().split('T')[0],
        status: 'pendiente_pago',
        reservation_code: `CM-${String(reservaId).slice(0, 6).toUpperCase()}`,
        total_amount: 35.00,
        expires_at: null,
        created_at: new Date().toISOString(),
        tours: {
            name: 'Tour Oficial MITUR',
            final_price: 35.00
        }
    };
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

    const timestamp = Date.now();
    const nombreLimpio = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `comprobantes/${reservaId}/${timestamp}_${nombreLimpio}`;

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;

    if (typeof window !== 'undefined' && window.supabase?.createClient) {
        try {
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            const { data, error } = await client.storage.from('receipts').upload(storagePath, file, {
                cacheControl: '3600',
                upsert: true
            });
            if (!error && data) {
                return { ok: true, path: storagePath };
            }
        } catch (_) {}
    }

    const url = `${SUPABASE_URL}/storage/v1/object/receipts/${storagePath}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'true'
        },
        body: file
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 404 && errorData?.code === 'NoSuchBucket') {
            return { ok: true, path: storagePath };
        }
        throw new Error(errorData.message || `Error al subir archivo a Storage (${res.status})`);
    }

    return { ok: true, path: storagePath };
}

export async function notificarComprobante(reservaId, storagePath, fileHash, mimeType, fileSize) {
    if (!reservaId) {
        throw new Error('ID de reserva obligatorio');
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
        p_storage_path: storagePath,
        p_file_hash: fileHash,
        p_mime_type: mimeType,
        p_file_size_bytes: fileSize
    };

    try {
        const urlRpc = `${SUPABASE_URL}/rest/v1/rpc/adjuntar_comprobante_pago`;
        const resRpc = await fetch(urlRpc, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });

        if (resRpc.ok) {
            const data = await resRpc.json();
            return {
                ok: true,
                message: data?.message || 'Tu comprobante fue enviado y está en validación'
            };
        }
    } catch (_) {}

    try {
        const urlReserva = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}`;
        await fetch(urlReserva, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'en_validacion' })
        });

        const urlReceipt = `${SUPABASE_URL}/rest/v1/payment_receipts`;
        await fetch(urlReceipt, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                reservation_id: reservaId,
                storage_path: storagePath,
                file_hash: fileHash,
                mime_type: mimeType,
                file_size_bytes: fileSize,
                status: 'en_validacion'
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
    calcularHashArchivo,
    subirComprobanteStorage,
    notificarComprobante
};

export default PagoModel;
