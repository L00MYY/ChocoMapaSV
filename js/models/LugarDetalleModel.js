/**
 * js/models/LugarDetalleModel.js
 * Modelo de acceso a datos para la ficha detallada de un sitio turístico (MITUR).
 * Provee consulta de atributos, servicios, calificaciones y tours asociados.
 */

import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { obtenerToursPorLugar } from './ToursModel.js';
import { CalificacionesModel } from './CalificacionesModel.js';

// Decodificación segura en memoria en tiempo de ejecución
const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http')
    ? atob(SUPABASE_URL_B64)
    : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_')
    ? atob(SUPABASE_ANON_KEY_B64)
    : SUPABASE_ANON_KEY_B64;

/**
 * Objeto LugarDetalleModel que gestiona la información detallada del sitio
 */
export const LugarDetalleModel = {
    /**
     * @description Consulta la información completa de un lugar turístico por su identificador UUID,
     * incluyendo categorías, servicios ofrecidos y valoraciones.
     * @param {string} id - UUID del lugar turístico.
     * @returns {Promise<Object|null>} Objeto de lugar detallado o null si no existe.
     */
    async obtenerPorId(id) {
        if (!id) return null;

        try {
            const params = new URLSearchParams({
                id: `eq.${id}`,
                select: 'id,name,description,image_url,opening_days,opening_time,closing_time,department,region,is_active,latitude,longitude,categories(name,color),place_services(services(name)),ratings(id,score,user_id)'
            });
            const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/places?${params.toString()}`, {
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!respuesta.ok) {
                throw new Error(`Supabase respondió con error ${respuesta.status}`);
            }
            const datos = await respuesta.json();
            return Array.isArray(datos) ? (datos[0] || null) : null;
        } catch (error) {
            console.error('Error al consultar el detalle del sitio en Supabase:', error);
            return null;
        }
    },

    /**
     * @description Obtiene los paquetes de tours oficiales que incluyen este sitio turístico.
     * @param {string} idLugar - UUID del sitio turístico.
     * @returns {Promise<Array<Object>>} Lista de tours asociados.
     */
    obtenerTours(idLugar) {
        return obtenerToursPorLugar(idLugar);
    },

    /**
     * @description Evalúa si el usuario activo tiene derecho a calificar este lugar turístico.
     * @param {string} idLugar - UUID del sitio turístico.
     * @param {Object} [usuario=undefined] - Usuario específico a evaluar (opcional).
     * @returns {Promise<Object>} Resultado de elegibilidad con razón y mensaje explicativo.
     */
    verificarElegibilidad(idLugar, usuario = undefined) {
        return CalificacionesModel.verificarElegibilidad(idLugar, usuario);
    },

    /**
     * @description Registra una calificación de 1 a 5 estrellas para el sitio turístico.
     * @param {Object} params
     * @param {string} params.placeId - UUID del lugar turístico.
     * @param {number} params.score - Calificación entera (1 a 5).
     * @returns {Promise<{ ok: boolean, data?: Object, error?: string }>}
     */
    guardarCalificacion({ placeId, score }) {
        return CalificacionesModel.guardarCalificacion({ placeId, score });
    }
};

export default LugarDetalleModel;
