/**
 * js/models/MisToursModel.js
 * Modelo del Historial de Tours para ChocoMapaSV (MITUR)
 * Capa de datos desacoplada del DOM que gestiona la comunicación con Supabase
 * para las reservas del usuario autenticado.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { AuthModel } from './AuthModel.js';

/**
 * Formatea una fecha YYYY-MM-DD en texto legible en español
 * @param {string} fechaStr 
 * @returns {string}
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
    } catch (_) {
        return fechaStr;
    }
}

/**
 * Calcula el estado visual respetando las reglas de negocio:
 * - Si tour_date < CURRENT_DATE y el status es 'Confirmado', el estado visual debe ser "Pasado".
 * - Si la fecha es igual o posterior a hoy, muestra su status original: "Pendiente de confirmar" o "Confirmado".
 * 
 * @param {string} status 
 * @param {string} tourDate 
 * @returns {'Pendiente de confirmar' | 'Confirmado' | 'Pasado'}
 */
export function calcularEstadoVisual(status, tourDate) {
    if (!tourDate) {
        return status === 'Confirmado' ? 'Confirmado' : 'Pendiente de confirmar';
    }

    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const hoyStr = `${anio}-${mes}-${dia}`;

    const fechaTourLimpia = String(tourDate).split('T')[0];

    // Regla: Si tour_date < CURRENT_DATE y el status es 'Confirmado' -> 'Pasado'
    if (fechaTourLimpia < hoyStr && (status === 'Confirmado' || status === 'Pasado')) {
        return 'Pasado';
    }

    if (status === 'Confirmado') {
        return 'Confirmado';
    }

    if (status === 'Pasado') {
        return 'Pasado';
    }

    return 'Pendiente de confirmar';
}

/**
 * Verifica si existe una sesión activa y consulta el usuario validado en Supabase Auth
 * @returns {Promise<Object|null>} Objeto de usuario autenticado o null
 */
export async function verificarSesion() {
    try {
        const sesion = await AuthModel.obtenerSesionActual();
        if (!sesion || !sesion.access_token) {
            return null;
        }

        try {
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
        } catch (fetchErr) {
            console.warn('Advertencia al consultar endpoint auth/v1/user de Supabase:', fetchErr);
        }

        // Si la sesión local tiene usuario y el token sigue vigente
        if (sesion.user) {
            return sesion.user;
        }

        return null;
    } catch (error) {
        console.error('Error al verificar sesión en MisToursModel:', error);
        return null;
    }
}

/**
 * Realiza el select a tour_reservations con join a tours filtrando por tourist_id.
 * Aplica la lógica para clasificar el estado ("Pendiente de confirmar", "Confirmado", "Pasado")
 * y ordena por tour_date descendente.
 * 
 * @param {string} touristId - UUID del usuario / turista
 * @returns {Promise<Array<Object>>} Lista de reservas enriquecidas con datos del tour
 */
export async function obtenerHistorial(touristId) {
    if (!touristId) {
        return [];
    }

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        };

        const params = new URLSearchParams({
            select: 'id,tour_id,tourist_id,spots_reserved,tour_date,status,created_at,tours(id,name,full_description,short_description,image_url,guide_name,departure_time,price,has_offer,discount_percentage,final_price,department)',
            tourist_id: `eq.${touristId}`,
            order: 'tour_date.desc'
        });

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?${params.toString()}`;
        const res = await fetch(url, {
            method: 'GET',
            headers
        });

        if (!res.ok) {
            throw new Error(`Error al consultar reservas en Supabase: ${res.status}`);
        }

        const datos = await res.json();
        if (!Array.isArray(datos)) {
            return [];
        }

        return datos.map(item => {
            const tour = item.tours || {};
            const estadoVisual = calcularEstadoVisual(item.status, item.tour_date);
            return {
                id: item.id,
                tour_id: item.tour_id,
                tourist_id: item.tourist_id,
                spots_reserved: Number(item.spots_reserved) || 1,
                tour_date: item.tour_date,
                fecha_formateada: formatearFechaEspanol(item.tour_date),
                status: estadoVisual,
                status_original: item.status,
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
    } catch (error) {
        console.error('Fallo al obtener historial de tours desde Supabase:', error);
        return [];
    }
}

export const MisToursModel = {
    verificarSesion,
    obtenerHistorial,
    calcularEstadoVisual,
    formatearFechaEspanol
};

export default MisToursModel;
