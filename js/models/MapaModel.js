/**
 * @file MapaModel.js
 * @description Modelo de datos y búsqueda geográfica para el mapa interactivo.
 * Rol en el MVC: Modelo (Model). Consume los sitios turísticos desde SupabaseClient,
 * los resguarda en memoria y provee funcionalidad de búsqueda y filtrado por nombre y categoría.
 */

import { obtenerLugaresTuristicos } from './SupabaseClient.js';
import { normalizarTexto } from '../utils/textUtils.js';

/** @type {Array<Object>} Colección en memoria de lugares georreferenciados disponibles */
let lugaresDisponibles = [];

/**
 * Objeto modelo que administra los datos y la búsqueda para el mapa interactivo.
 * @namespace MapaModel
 */
export const MapaModel = {
    /**
     * Consulta asíncronamente los lugares turísticos desde Supabase y los guarda en memoria.
     * @async
     * @function cargarLugares
     * @returns {Promise<Array<Object>>} Lista de atractivos con coordenadas y propiedades.
     */
    async cargarLugares() {
        const respuesta = await obtenerLugaresTuristicos();
        lugaresDisponibles = Array.isArray(respuesta) ? respuesta : [];
        return lugaresDisponibles;
    },

    /**
     * Filtra los lugares en memoria según coincidencia con el término de búsqueda normalizado.
     * @function buscarLugares
     * @param {string} termino - Cadena de texto a buscar por nombre o categoría.
     * @returns {Array<Object>} Lista de lugares que coinciden.
     */
    buscarLugares(termino) {
        const busqueda = normalizarTexto(termino);
        if (!busqueda) return [];
        return lugaresDisponibles.filter(lugar =>
            normalizarTexto(lugar.name).includes(busqueda) ||
            normalizarTexto(lugar.category).includes(busqueda)
        );
    }
};