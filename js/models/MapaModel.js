import { obtenerLugaresTuristicos } from './SupabaseClient.js';
import { normalizarTexto, generarSlug, coincideCategoria } from '../utils/textUtils.js';

let lugaresDisponibles = [];

/**
 * Extrae la lista única de categorías reales a partir de los lugares cargados.
 * @param {Array<Object>} lugares
 * @returns {Array<{name: string, slug: string, color: string}>}
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
 * Filtra los lugares por categoría (soporta nombre exacto, slug, alias y comodín 'todos').
 * @param {Array<Object>} lugares
 * @param {string} categoria
 * @returns {Array<Object>}
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

export const MapaModel = {
    async cargarLugares() {
        const respuesta = await obtenerLugaresTuristicos();
        lugaresDisponibles = Array.isArray(respuesta) ? respuesta : [];
        return lugaresDisponibles;
    },

    obtenerLugares() {
        return [...lugaresDisponibles];
    },

    setLugares(lugares) {
        lugaresDisponibles = Array.isArray(lugares) ? [...lugares] : [];
        return lugaresDisponibles;
    },

    extraerCategorias(lugares = lugaresDisponibles) {
        return extraerCategorias(lugares);
    },

    filtrarPorCategoria(categoria, lugares = lugaresDisponibles) {
        return filtrarLugaresPorCategoria(lugares, categoria);
    },

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
