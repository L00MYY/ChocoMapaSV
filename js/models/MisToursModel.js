/**
 * js/models/MisToursModel.js
 * Modelo para el historial de reservas turísticas del usuario autenticado (MITUR).
 * Provee consulta directa a Supabase tour_reservations y mapeo de estados cronológicos.
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

/**
 * @description Retorna la fecha de hoy en formato local 'YYYY-MM-DD'.
 * @returns {string} Fecha local.
 */
export function obtenerFechaHoyLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/**
 * @description Convierte una fecha ISO o YYYY-MM-DD en formato largo en español.
 * @param {string|null} fechaStr - Cadena de fecha.
 * @returns {string} Fecha formateada en español.
 */
export function formatearFechaEspanol(fechaStr) {
    if (!fechaStr) return '';
    try {
        const partes = String(fechaStr).split('T')[0].split('-');
        if (partes.length === 3) {
            const anio = parseInt(partes[0], 10);
            const mes = parseInt(partes[1], 10) - 1;
            const dia = parseInt(partes[2], 10);
            const fecha = new Date(anio, mes, dia);
            return fecha.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        return fechaStr;
    } catch (error) {
        console.warn('Advertencia al formatear fecha en formatearFechaEspanol:', error);
        return fechaStr;
    }
}

/**
 * @description Calcula la etiqueta de estado visual considerando vigencia de la fecha del tour.
 * @param {string|null} status - Estado en BD.
 * @param {string|null} tourDate - Fecha del tour.
 * @returns {string} Estado visual formateado.
 */
export function calcularEstadoVisual(status, tourDate) {
    const hoyStr = obtenerFechaHoyLocal();
    const fechaTourLimpia = tourDate ? String(tourDate).split('T')[0] : '';
    const esPasada = Boolean(fechaTourLimpia && fechaTourLimpia < hoyStr);

    const s = String(status || '').trim().toLowerCase();

    if (s === 'confirmada' || s === 'confirmado') {
        return esPasada ? 'Pasado' : 'Confirmado';
    }
    if (s === 'pasado') {
        return 'Pasado';
    }
    if (s === 'pendiente_pago') {
        return 'Pendiente de pago';
    }
    if (s === 'en_validacion' || s === 'en validacion' || s === 'en validación') {
        return 'En validación';
    }
    if (s === 'rechazada' || s === 'rechazado') {
        return 'Rechazado';
    }
    if (s === 'expirada' || s === 'expirado') {
        return 'Expirada';
    }
    if (s === 'pendiente de confirmar') {
        return 'Pendiente de confirmar';
    }
    if (esPasada) {
        return 'Pasado';
    }
    return 'Pendiente de pago';
}

/**
 * @description Verifica la validez de la sesión con Supabase Auth.
 * @returns {Promise<Object|null>} Objeto de usuario autenticado o null.
 */
export async function verificarSesion() {
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        if (!sesion || !sesion.access_token) {
            return null;
        }

        try {
            // Consulta al endpoint auth/v1/user para validar el JWT y extraer los metadatos del usuario
            const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${sesion.access_token}`
                }
            });

            if (res.ok) {
                const user = await res.json();
                return user;
            }
        } catch (fetchError) {
            console.warn('Advertencia al validar usuario en /auth/v1/user:', fetchError);
        }

        if (sesion.user) {
            return sesion.user;
        }

        return null;
    } catch (error) {
        console.warn('Error al verificar sesión en MisToursModel:', error);
        return null;
    }
}

/**
 * @description Consulta el historial completo de reservaciones del turista en Supabase PostgREST.
 * @param {string} touristId - UUID del usuario turista autenticado.
 * @returns {Promise<Array<Object>>} Lista de reservas ordenadas cronológicamente.
 */
export async function obtenerHistorial(touristId) {
    if (!touristId) {
        return [];
    }

    let datos = [];

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        };

        const params = new URLSearchParams({
            select: 'id,tour_id,tourist_id,spots_reserved,tour_date,status,created_at,reservation_code,total_amount,expires_at,tours(id,name,full_description,short_description,image_url,guide_name,departure_time,price,has_offer,discount_percentage,final_price,department)',
            tourist_id: `eq.${touristId}`,
            order: 'tour_date.desc'
        });

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?${params.toString()}`;
        // Petición REST a Supabase para recuperar reservaciones con join embebido a la tabla tours
        const res = await fetch(url, {
            method: 'GET',
            headers
        });

        if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) {
                datos = json;
            }
        }
    } catch (err) {
        console.error('Error al consultar tour_reservations en Supabase:', err);
    }

    if (!Array.isArray(datos) || datos.length === 0) {
        return [];
    }

    datos.sort((a, b) => {
        const fechaA = new Date(a.tour_date || a.created_at || 0);
        const fechaB = new Date(b.tour_date || b.created_at || 0);
        return fechaB - fechaA;
    });

    return datos.map(item => {
        const tour = item.tours || item.tour || {};
        const estadoVisual = calcularEstadoVisual(item.status, item.tour_date);
        const codigo = item.reservation_code || `CM-${String(item.id).slice(0, 6).toUpperCase()}`;

        return {
            id: item.id,
            tour_id: item.tour_id,
            tourist_id: item.tourist_id,
            spots_reserved: Number(item.spots_reserved) || 1,
            tour_date: item.tour_date,
            fecha_formateada: formatearFechaEspanol(item.tour_date),
            status: estadoVisual,
            status_original: item.status,
            reservation_code: codigo,
            total_amount: Number(item.total_amount) || 0,
            expires_at: item.expires_at || null,
            created_at: item.created_at,
            tour: {
                id: tour.id || item.tour_id,
                name: tour.name || 'Tour Oficial MITUR',
                image_url: tour.image_url || 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80',
                department: tour.department || 'El Salvador',
                guide_name: tour.guide_name || 'Guía Oficial MITUR',
                short_description: tour.short_description || '',
                full_description: tour.full_description || '',
                price: tour.price,
                has_offer: tour.has_offer,
                discount_percentage: tour.discount_percentage,
                final_price: tour.final_price
            }
        };
    });
}

/**
 * Objeto MisToursModel agrupando la API del historial de tours
 */
export const MisToursModel = {
    verificarSesion,
    obtenerHistorial,
    calcularEstadoVisual,
    formatearFechaEspanol,
    obtenerFechaHoyLocal
};

export default MisToursModel;
