/**
 * js/models/LugaresModel.js
 * Modelo para el catálogo y filtrado multidimensional de lugares turísticos (MITUR).
 * Integra filtros combinados por búsqueda de texto, categoría y puntuación de rating.
 */

import { obtenerLugaresTuristicos, obtenerCategorias } from './SupabaseClient.js';
import { coincideCategoria, normalizarTexto, generarSlug } from '../utils/textUtils.js';
import {
    calcularPromedioRating,
    validarScoreRating,
    evaluarElegibilidadCalificacion,
    filtrarLugaresPorRating
} from './CalificacionesModel.js';

export {
    calcularPromedioRating,
    validarScoreRating,
    evaluarElegibilidadCalificacion,
    filtrarLugaresPorRating
};

let todosLosLugares = [];
let categoriasCargadas = [];
let categoriaActiva = 'todos';
let terminoBusqueda = '';
let ratingMinimoActivo = 0;

/**
 * @description Elimina duplicados de una lista de lugares basándose en su ID único.
 * @param {Array<Object>} lista - Lista de lugares con posibles duplicados.
 * @returns {Array<Object>} Lista filtrada de lugares únicos.
 */
function desduplicarLugares(lista) {
    if (!Array.isArray(lista)) return [];

    const idsRegistrados = new Set();
    const resultado = [];

    for (const item of lista) {
        if (!item || typeof item !== 'object') continue;

        const id = item.id;
        if (id && !idsRegistrados.has(id)) {
            idsRegistrados.add(id);
            resultado.push(item);
        }
    }

    return resultado;
}

/**
 * Objeto LugaresModel que encapsula la gestión de estado y persistencia del catálogo
 */
export const LugaresModel = {
    /**
     * @description Consulta la lista de lugares en Supabase y desduplica los registros en memoria.
     * @returns {Promise<Array<Object>>} Colección desduplicada de lugares.
     * @throws {Error} Si la respuesta de Supabase no es un arreglo válido.
     */
    async cargarLugares() {
        try {
            const respuesta = await obtenerLugaresTuristicos();
            if (!Array.isArray(respuesta)) {
                throw new Error('La respuesta de Supabase no tiene el formato esperado.');
            }
            todosLosLugares = desduplicarLugares(respuesta);
            return todosLosLugares;
        } catch (error) {
            console.error('Error al cargar lugares en LugaresModel:', error);
            throw error;
        }
    },

    /**
     * @description Obtiene las categorías desde Supabase o genera un respaldo dinámico desde los lugares.
     * @returns {Promise<Array<{id?: string, name: string, slug: string, color?: string, icon?: string}>>}
     */
    async cargarCategorias() {
        try {
            const respuestaBD = await obtenerCategorias();
            if (Array.isArray(respuestaBD) && respuestaBD.length > 0) {
                categoriasCargadas = respuestaBD.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug || generarSlug(cat.name),
                    color: cat.color || null,
                    icon: cat.icon || null
                }));
                return categoriasCargadas;
            }
        } catch (error) {
            console.warn('No se pudieron obtener las categorías directamente de Supabase. Extrayendo de lugares:', error);
        }

        // Respaldo dinámico a partir de los lugares cargados
        const categoriasMap = new Map();
        todosLosLugares.forEach(lugar => {
            const nombre = (lugar.category || '').trim();
            if (nombre && !categoriasMap.has(nombre)) {
                categoriasMap.set(nombre, {
                    name: nombre,
                    slug: lugar.category_slug || generarSlug(nombre),
                    color: lugar.color || null
                });
            }
        });

        categoriasCargadas = Array.from(categoriasMap.values());
        return categoriasCargadas;
    },

    /**
     * @description Retorna las categorías disponibles ya cargadas o extraídas dinámicamente.
     * @returns {Array<{name: string, slug: string, color?: string}>}
     */
    obtenerCategoriasDisponibles() {
        if (categoriasCargadas.length > 0) {
            return categoriasCargadas;
        }

        const categoriasMap = new Map();
        todosLosLugares.forEach(lugar => {
            const nombre = (lugar.category || '').trim();
            if (nombre && !categoriasMap.has(nombre)) {
                categoriasMap.set(nombre, {
                    name: nombre,
                    slug: lugar.category_slug || generarSlug(nombre),
                    color: lugar.color || null
                });
            }
        });

        return Array.from(categoriasMap.values());
    },

    /**
     * @description Retorna un mapa asociativo de nombres de categorías y sus colores.
     * @returns {Map<string, string|null>}
     */
    obtenerCategoriasUnicas() {
        const categoriasMap = new Map();
        const lista = this.obtenerCategoriasDisponibles();
        lista.forEach(cat => {
            categoriasMap.set(cat.name, cat.color || null);
        });
        return categoriasMap;
    },

    /**
     * @description Asigna la categoría activa para el filtrado.
     * @param {string} categoria
     */
    setCategoria(categoria) {
        categoriaActiva = categoria || 'todos';
    },

    /**
     * @description Obtiene la categoría activa actual.
     * @returns {string}
     */
    getCategoria() {
        return categoriaActiva;
    },

    /**
     * @description Asigna el término de búsqueda normalizado.
     * @param {string} termino
     */
    setBusqueda(termino) {
        terminoBusqueda = (termino || '').toLowerCase().trim();
    },

    /**
     * @description Obtiene el término de búsqueda actual.
     * @returns {string}
     */
    getBusqueda() {
        return terminoBusqueda;
    },

    /**
     * @description Asigna el rating mínimo filtrable.
     * @param {number|string} minRating
     */
    setRatingMinimo(minRating) {
        if (minRating === 'Todas' || minRating === 'todas') {
            ratingMinimoActivo = 0;
        } else {
            ratingMinimoActivo = Number(minRating) || 0;
        }
    },

    /**
     * @description Obtiene el rating mínimo activo.
     * @returns {number}
     */
    getRatingMinimo() {
        return ratingMinimoActivo;
    },

    /**
     * @description Retorna el conjunto de lugares filtrados según categoría, búsqueda y rating.
     * @returns {Array<Object>} Lugares que cumplen con todos los criterios activos.
     */
    getLugaresFiltrados() {
        let filtrados = todosLosLugares;

        if (categoriaActiva && categoriaActiva !== 'todos' && categoriaActiva !== 'todas') {
            filtrados = filtrados.filter(lugar =>
                coincideCategoria(lugar.category, categoriaActiva) ||
                coincideCategoria(lugar.category_slug, categoriaActiva)
            );
        }

        if (terminoBusqueda.length > 0) {
            const busquedaNorm = normalizarTexto(terminoBusqueda);
            filtrados = filtrados.filter(lugar => {
                const nombre = normalizarTexto(lugar.name || '');
                const descripcion = normalizarTexto(lugar.description || '');
                const categoria = normalizarTexto(lugar.category || '');
                const depto = normalizarTexto(lugar.department || '');

                return nombre.includes(busquedaNorm) ||
                    descripcion.includes(busquedaNorm) ||
                    categoria.includes(busquedaNorm) ||
                    depto.includes(busquedaNorm);
            });
        }

        if (ratingMinimoActivo > 0) {
            filtrados = filtrarLugaresPorRating(filtrados, ratingMinimoActivo);
        }

        return filtrados;
    },

    /**
     * @description Retorna el total general de lugares cargados en memoria.
     * @returns {number}
     */
    getTotalLugares() {
        return todosLosLugares.length;
    }
};

export default LugaresModel;
