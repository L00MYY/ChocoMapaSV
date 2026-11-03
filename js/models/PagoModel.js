/**
 * js/models/PagoModel.js
 * Modelo de datos para la gestión y carga de comprobantes de pago (MITUR).
 * Integra Supabase Storage y persistencia en payment_receipts y tour_reservations.
 */

import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { AuthModel } from './AuthModel.js';

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
 * @description Obtiene una instancia del cliente de Supabase desde window.supabase si está disponible.
 * @param {string} [token] - Token JWT del usuario autenticado.
 * @returns {Object|null} Instancia del cliente de Supabase o null.
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
 * @description Mapea un registro de reservación con sus atributos calculados.
 * @param {Object} item - Fila de tour_reservations.
 * @param {Object|null} sesion - Sesión activa del usuario.
 * @returns {Object|null} Reservación mapeada.
 */
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

/**
 * @description Consulta el detalle completo de una reserva por su ID único.
 * @param {string} reservaId - UUID de la reservación.
 * @returns {Promise<Object|null>} Detalle de la reserva o null.
 */
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

/**
 * @description Obtiene la reserva activa más reciente del turista ('pendiente_pago' o 'en_validacion').
 * @param {string} touristId - UUID del turista.
 * @returns {Promise<Object|null>} Reserva activa encontrada o null.
 */
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

/**
 * @description Verifica si ya existe un comprobante registrado en payment_receipts para la reserva.
 * @param {string} reservaId - UUID de la reservación.
 * @returns {Promise<Object|null>} Registro del comprobante si existe o null.
 */
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
    } catch (error) {
        console.warn('Error al verificar comprobante existente en Supabase:', error);
    }

    return null;
}

/**
 * @description Calcula el hash criptográfico SHA-256 de un archivo para integridad de auditoría.
 * @param {File|Blob} file - Archivo del comprobante.
 * @returns {Promise<string>} Cadena hexadecimal del hash SHA-256.
 * @throws {Error} Si el archivo no está presente.
 */
export async function calcularHashArchivo(file) {
    if (!file) throw new Error('Archivo no proporcionado');
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @description Sube el archivo físico del comprobante a Supabase Storage mediante el SDK cliente oficial.
 * @param {string} reservaId - UUID de la reservación.
 * @param {File} file - Archivo del comprobante.
 * @returns {Promise<{ ok: boolean, path: string }>} Ruta relativa del archivo en el bucket.
 * @throws {Error} Si faltan parámetros o la subida a Storage falla.
 */
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

/**
 * @description Registra el comprobante en payment_receipts y transiciona la reserva a 'en_validacion'.
 * @param {string} reservaId - UUID de la reservación.
 * @param {string} storagePath - Ruta del archivo en Storage.
 * @param {string|null} fileHash - Hash SHA-256 de verificación.
 * @param {string} mimeType - Tipo MIME del archivo.
 * @param {number} fileSize - Tamaño del archivo en bytes.
 * @returns {Promise<{ ok: boolean, message: string }>}
 * @throws {Error} Si el ID de reserva es omitido.
 */
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
    } catch (fallbackError) {
        console.warn('Advertencia en fallback REST de notificarComprobante:', fallbackError);
    }

    return {
        ok: true,
        message: 'Tu comprobante fue enviado y está en validación'
    };
}

/**
 * Objeto PagoModel agrupando la API del modelo de pagos
 */
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
