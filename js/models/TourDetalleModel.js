/**
 * js/models/TourDetalleModel.js
 * Modelo del Detalle del Tour para ChocoMapaSV (MITUR)
 * Capa de datos desacoplada del DOM que gestiona la comunicación con Supabase
 * para consultar tours individuales y reservaciones específicas.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { AuthModel } from './AuthModel.js';
import {
    TOURS_DEMO,
    obtenerTourPorId,
    obtenerPorId,
    crearReservaTour,
    actualizarCuposTour,
    actualizarCuposFecha,
    formatearFechaLarga,
    formatearMonedaUSD
} from './ToursModel.js';

export {
    TOURS_DEMO,
    obtenerTourPorId,
    obtenerPorId,
    crearReservaTour,
    actualizarCuposTour,
    actualizarCuposFecha,
    formatearFechaLarga,
    formatearMonedaUSD
};

/**
 * Retorna la fecha actual en la zona local del usuario en formato estándar YYYY-MM-DD,
 * evitando discrepancias de huso horario derivadas de toISOString().
 * @returns {string} Fecha en formato 'YYYY-MM-DD'
 */
export function obtenerFechaHoyLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

/**
 * Calcula el estado visual de una reservación respetando las reglas de negocio:
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

    const hoyStr = obtenerFechaHoyLocal();
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
 * Consulta los datos específicos de una reserva en Supabase (status, spots_reserved, tour_date, tour_date_id)
 * y clasifica su estado visual.
 * 
 * @param {string} reservaId - UUID de la reservación
 * @returns {Promise<Object|null>}
 */
export async function obtenerReservaPorId(reservaId) {
    if (!reservaId) return null;

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}&select=id,tour_id,tour_date_id,tourist_id,spots_reserved,tour_date,status,created_at,tours(*,tour_dates(id,departure_date,available_spots))`;

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
                    tour_date_id: item.tour_date_id || null,
                    tourist_id: item.tourist_id,
                    spots_reserved: Number(item.spots_reserved) || 1,
                    tour_date: item.tour_date,
                    status: calcularEstadoVisual(item.status, item.tour_date),
                    status_original: item.status,
                    created_at: item.created_at,
                    tours: item.tours || null
                };
            }
        }
    } catch (error) {
        console.warn('Error al consultar reserva por ID en Supabase:', error);
    }

    // Respaldo de contingencia para pruebas o tours locales simulados
    return {
        id: reservaId,
        spots_reserved: 1,
        tour_date: new Date().toISOString().split('T')[0],
        status: 'Confirmado',
        status_original: 'Confirmado'
    };
}

/**
 * Consulta si un usuario específico ya posee una reservación activa o pasada en un tour determinado.
 * @param {string} touristId - UUID del usuario
 * @param {string} tourId - UUID del tour
 * @returns {Promise<Object|null>}
 */
export async function obtenerReservaUsuarioPorTour(touristId, tourId) {
    if (!touristId || !tourId) return null;

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const params = new URLSearchParams({
            select: 'id,tour_id,tour_date_id,tourist_id,spots_reserved,tour_date,status,created_at,tours(*,tour_dates(id,departure_date,available_spots))',
            tourist_id: `eq.${touristId}`,
            tour_id: `eq.${tourId}`,
            order: 'created_at.desc',
            limit: '1'
        });

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?${params.toString()}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                if (data.length > 0) {
                    const item = data[0];
                    return {
                        id: item.id,
                        tour_id: item.tour_id,
                        tour_date_id: item.tour_date_id || null,
                        tourist_id: item.tourist_id,
                        spots_reserved: Number(item.spots_reserved) || 1,
                        tour_date: item.tour_date,
                        status: calcularEstadoVisual(item.status, item.tour_date),
                        status_original: item.status,
                        created_at: item.created_at,
                        tours: item.tours || null
                    };
                }
                return null;
            }
        }
    } catch (error) {
        console.warn('Error al verificar reservación previa del usuario para este tour:', error);
    }

    // Comprobar respaldo local si se registró en la sesión actual
    try {
        const localKey = `chocomapa_reserva_${touristId}_${tourId}`;
        const rawLocal = localStorage.getItem(localKey);
        if (rawLocal) {
            const localData = JSON.parse(rawLocal);
            if (localData && (localData.tour_id === tourId || !localData.tour_id)) {
                return {
                    id: localData.id || 'reserva-local',
                    tour_id: tourId,
                    tour_date_id: localData.tour_date_id || null,
                    tourist_id: touristId,
                    spots_reserved: Number(localData.spots_reserved) || 1,
                    tour_date: localData.tour_date || new Date().toISOString().split('T')[0],
                    status: calcularEstadoVisual(localData.status || 'Confirmado', localData.tour_date),
                    status_original: localData.status || 'Confirmado',
                    tours: null
                };
            }
        }
    } catch (_) {}

    return null;
}

export const TourDetalleModel = {
    obtenerPorId,
    obtenerTourPorId,
    obtenerReservaPorId,
    obtenerReservaUsuarioPorTour,
    crearReservaTour,
    actualizarCuposTour,
    actualizarCuposFecha,
    calcularEstadoVisual,
    formatearFechaLarga,
    formatearMonedaUSD,
    TOURS_DEMO
};

export default TourDetalleModel;

