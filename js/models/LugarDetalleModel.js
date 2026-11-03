/**
 * @file LugarDetalleModel.js
 * @description Modelo de acceso a datos para la ficha detallada de un atractivo turístico.
 * Rol en el MVC: Modelo (Model). Realiza consultas a la tabla 'places' en Supabase PostgREST
 * vinculando categorías, servicios asociados y calificaciones, y delega consultas de tours a ToursModel.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { obtenerToursPorLugar } from './ToursModel.js';

/**
 * Modelo para la obtención de datos detallados de un sitio turístico.
 * @namespace LugarDetalleModel
 */
export const LugarDetalleModel = {
    /**
     * Consulta un atractivo turístico específico por su identificador UUID en Supabase.
     * @async
     * @function obtenerPorId
     * @param {string} id - Identificador UUID del atractivo.
     * @returns {Promise<Object|null>} Objeto con los datos del lugar o null si no existe o falla la consulta.
     */
    async obtenerPorId(id) {
        if (!id) return null;

        try {
            const params = new URLSearchParams({
                id: `eq.${id}`,
                select: 'id,name,description,image_url,opening_days,opening_time,closing_time,department,region,is_active,latitude,longitude,categories(name,color),place_services(services(name)),ratings(score)'
            });
            // Petición HTTP a Supabase PostgREST para obtener el lugar con joins a categorías, servicios y calificaciones
            const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/places?${params}`, {
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!respuesta.ok) throw new Error(`Supabase respondió ${respuesta.status}`);
            const datos = await respuesta.json();
            return Array.isArray(datos) ? (datos[0] || null) : null;
        } catch (error) {
            console.error('Error al consultar el detalle del sitio en Supabase:', error);
            return null;
        }
    },

    /**
     * Obtiene los tours que incluyen el atractivo turístico especificado delegando en ToursModel.
     * @function obtenerTours
     * @param {string} idLugar - Identificador UUID del lugar turístico.
     * @returns {Promise<Array<Object>>} Lista de tours asociados.
     */
    obtenerTours(idLugar) {
        return obtenerToursPorLugar(idLugar);
    }
};