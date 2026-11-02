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

export const LugaresModel = {
    async cargarLugares() {
        const respuesta = await obtenerLugaresTuristicos();
        if (!Array.isArray(respuesta)) {
            throw new Error('La respuesta de Supabase no tiene el formato esperado.');
        }

        todosLosLugares = desduplicarLugares(respuesta);
        return todosLosLugares;
    },

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

    obtenerCategoriasDisponibles() {
        if (categoriasCargadas.length > 0) {
            return categoriasCargadas;
        }

        // Si aún no se llamó a cargarCategorias(), extraer de lugares
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

    obtenerCategoriasUnicas() {
        const categoriasMap = new Map();
        const lista = this.obtenerCategoriasDisponibles();
        lista.forEach(cat => {
            categoriasMap.set(cat.name, cat.color || null);
        });
        return categoriasMap;
    },

    setCategoria(categoria) {
        categoriaActiva = categoria || 'todos';
    },

    getCategoria() {
        return categoriaActiva;
    },

    setBusqueda(termino) {
        terminoBusqueda = (termino || '').toLowerCase().trim();
    },

    getBusqueda() {
        return terminoBusqueda;
    },

    setRatingMinimo(minRating) {
        if (minRating === 'Todas' || minRating === 'todas') {
            ratingMinimoActivo = 0;
        } else {
            ratingMinimoActivo = Number(minRating) || 0;
        }
    },

    getRatingMinimo() {
        return ratingMinimoActivo;
    },

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

    getTotalLugares() {
        return todosLosLugares.length;
    }
};
