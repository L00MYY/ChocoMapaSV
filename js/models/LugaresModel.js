/**
 * @file LugaresModel.js
 * @description Modelo de datos y gestión de estado en memoria para el catálogo de atractivos turísticos.
 * Rol en el MVC: Modelo (Model). Consume SupabaseClient, mantiene la lista de lugares en caché local,
 * desduplica registros y ejecuta la lógica de filtrado por categoría y búsqueda textual.
 */

import { obtenerLugaresTuristicos } from './SupabaseClient.js';
import { coincideCategoria, normalizarTexto } from '../utils/textUtils.js';

/** @type {Array<Object>} Colección en memoria de todos los destinos turísticos cargados */
let todosLosLugares = [];
/** @type {string} Categoría actualmente seleccionada para el filtrado */
let categoriaActiva = 'todos';
/** @type {string} Término de búsqueda textual ingresado */
let terminoBusqueda = '';

/**
 * Elimina registros duplicados garantizando unicidad mediante el identificador UUID 'id'.
 * @function desduplicarLugares
 * @param {Array<Object>} lista - Colección de atractivos turísticos con posibles duplicados.
 * @returns {Array<Object>} Arreglo desduplicado.
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
 * Objeto modelo que gestiona el estado y consultas del catálogo de destinos turísticos.
 * @namespace LugaresModel
 */
export const LugaresModel = {
    /**
     * Consulta los destinos turísticos desde Supabase y los almacena desduplicados en memoria.
     * @async
     * @function cargarLugares
     * @returns {Promise<Array<Object>>} Lista de atractivos turísticos procesados.
     * @throws {Error} Si la respuesta de la base de datos no es una lista válida.
     */
    async cargarLugares() {
        const respuesta = await obtenerLugaresTuristicos();
        if (!Array.isArray(respuesta)) {
            throw new Error('La respuesta de Supabase no tiene el formato esperado.');
        }

        todosLosLugares = desduplicarLugares(respuesta);
        return todosLosLugares;
    },

    /**
     * Establece la categoría activa para los filtros.
     * @function setCategoria
     * @param {string} categoria - Nombre de la categoría o 'todos'.
     * @returns {void}
     */
    setCategoria(categoria) {
        categoriaActiva = categoria || 'todos';
    },

    /**
     * Retorna la categoría activa actualmente configurada.
     * @function getCategoria
     * @returns {string} Categoría actual.
     */
    getCategoria() {
        return categoriaActiva;
    },

    /**
     * Establece el término de búsqueda textual para los filtros.
     * @function setBusqueda
     * @param {string} termino - Cadena de texto a buscar.
     * @returns {void}
     */
    setBusqueda(termino) {
        terminoBusqueda = (termino || '').toLowerCase().trim();
    },

    /**
     * Retorna el término de búsqueda textual actualmente configurado.
     * @function getBusqueda
     * @returns {string} Término actual.
     */
    getBusqueda() {
        return terminoBusqueda;
    },

    /**
     * Aplica los filtros de categoría y texto sobre los destinos turísticos almacenados en memoria.
     * @function getLugaresFiltrados
     * @returns {Array<Object>} Lista filtrada de sitios turísticos.
     */
    getLugaresFiltrados() {
        let filtrados = todosLosLugares;

        if (categoriaActiva && categoriaActiva !== 'todos') {
            filtrados = filtrados.filter(lugar => coincideCategoria(lugar.category, categoriaActiva));
        }

        if (terminoBusqueda.length > 0) {
            const busquedaNorm = normalizarTexto(terminoBusqueda);
            filtrados = filtrados.filter(lugar => {
                const nombre = normalizarTexto(lugar.name || '');
                const descripcion = normalizarTexto(lugar.description || '');
                const categoria = normalizarTexto(lugar.category || '');

                return nombre.includes(busquedaNorm) ||
                    descripcion.includes(busquedaNorm) ||
                    categoria.includes(busquedaNorm);
            });
        }

        return filtrados;
    },

    /**
     * Retorna la cantidad total de destinos registrados en memoria.
     * @function getTotalLugares
     * @returns {number} Conteo total de atractivos turísticos.
     */
    getTotalLugares() {
        return todosLosLugares.length;
    },

    /**
     * Extrae un mapa con las categorías únicas y sus colores representativos asociados.
     * @function obtenerCategoriasUnicas
     * @returns {Map<string, string|null>} Mapa asociativo [nombreCategoria, colorHex].
     */
    obtenerCategoriasUnicas() {
        const categoriasMap = new Map();

        todosLosLugares.forEach(lugar => {
            if (lugar.category && typeof lugar.category === 'string') {
                const categoria = lugar.category.trim();
                if (categoria && !categoriasMap.has(categoria)) {
                    categoriasMap.set(categoria, lugar.color || null);
                }
            }
        });

        return categoriasMap;
    }
};