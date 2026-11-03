/**
 * js/models/MapaModel.js
 * Modelo de datos para la vista cartográfica interactiva de ChocoMapaSV (MITUR).
 * Provee filtrado reactivo por categorías y búsqueda predictiva de lugares.
 */

import { obtenerLugaresTuristicos } from './SupabaseClient.js';
import { normalizarTexto, generarSlug, coincideCategoria } from '../utils/textUtils.js';

let lugaresDisponibles = [];

/**
 * @description Extrae la lista única de categorías reales a partir de los lugares cargados.
 * @param {Array<Object>} [lugares=lugaresDisponibles] - Colección de lugares a procesar.
 * @returns {Array<{name: string, slug: string, color: string}>} Lista de categorías con metadatos.
 */
export function extraerCategorias(lugares = lugaresDisponibles) {
    const lista = Array.isArray(lugares) ? lugares : [];
    const categoriasMap = new Map();

    lista.forEach(lugar => {
        const nombre = (lugar.category || '').trim();
        if (nombre && !categoriasMap.has(nombre)) {
            categoriasMap.set(nombre, {
                name: nombre,
                slug: lugar.category_slug || generarSlug(nombre),
                color: lugar.color || '#38bdf8'
            });
        }
    });

    return Array.from(categoriasMap.values());
}

/**
 * @description Filtra los lugares turísticos por categoría, soportando coincidencias
 * por nombre exacto, slug, alias y comodines universales ('todos'/'todas').
 * @param {Array<Object>} [lugares=lugaresDisponibles] - Colección de lugares turísticos.
 * @param {string} [categoria='todos'] - Nombre, slug o alias de la categoría a filtrar.
 * @returns {Array<Object>} Subconjunto de lugares coincidentes.
 */
export function filtrarLugaresPorCategoria(lugares = lugaresDisponibles, categoria = 'todos') {
    const lista = Array.isArray(lugares) ? lugares : [];
    if (!categoria || categoria.toLowerCase() === 'todos' || categoria.toLowerCase() === 'todas') {
        return [...lista];
    }
    return lista.filter(lugar =>
        coincideCategoria(lugar.category, categoria) ||
        coincideCategoria(lugar.category_slug, categoria)
    );
}

/**
 * Objeto MapaModel que expone la API pública del modelo del mapa interactivo
 */
export const MapaModel = {
    /**
     * @description Carga la colección de lugares turísticos desde el cliente de Supabase.
     * @returns {Promise<Array<Object>>} Lista de lugares disponibles.
     */
    async cargarLugares() {
        try {
            const respuesta = await obtenerLugaresTuristicos();
            lugaresDisponibles = Array.isArray(respuesta) ? respuesta : [];
            return lugaresDisponibles;
        } catch (error) {
            console.error('Error al cargar lugares en MapaModel:', error);
            lugaresDisponibles = [];
            return [];
        }
    },

    /**
     * @description Retorna una copia de la lista en memoria de lugares disponibles.
     * @returns {Array<Object>}
     */
    obtenerLugares() {
        return [...lugaresDisponibles];
    },

    /**
     * @description Asigna la colección de lugares en memoria (útil para pruebas y sincronización).
     * @param {Array<Object>} lugares - Arreglo de lugares a asignar.
     * @returns {Array<Object>}
     */
    setLugares(lugares) {
        lugaresDisponibles = Array.isArray(lugares) ? [...lugares] : [];
        return lugaresDisponibles;
    },

    /**
     * @description Extrae categorías únicas de la colección de lugares.
     * @param {Array<Object>} [lugares=lugaresDisponibles]
     * @returns {Array<{name: string, slug: string, color: string}>}
     */
    extraerCategorias(lugares = lugaresDisponibles) {
        return extraerCategorias(lugares);
    },

    /**
     * @description Filtra lugares por categoría delegando en filtrarLugaresPorCategoria.
     * @param {string} categoria
     * @param {Array<Object>} [lugares=lugaresDisponibles]
     * @returns {Array<Object>}
     */
    filtrarPorCategoria(categoria, lugares = lugaresDisponibles) {
        return filtrarLugaresPorCategoria(lugares, categoria);
    },

    /**
     * @description Realiza una búsqueda predictiva filtrando por término y categoría.
     * @param {string} termino - Término de búsqueda.
     * @param {string} [categoria='todos'] - Categoría activa para restringir la búsqueda.
     * @returns {Array<Object>} Lugares que coinciden con el criterio de búsqueda.
     */
    buscarLugares(termino, categoria = 'todos') {
        const busqueda = normalizarTexto(termino);
        if (!busqueda) return [];
        const base = this.filtrarPorCategoria(categoria);
        return base.filter(lugar =>
            normalizarTexto(lugar.name).includes(busqueda) ||
            normalizarTexto(lugar.category).includes(busqueda)
        );
    }
};

export default MapaModel;
