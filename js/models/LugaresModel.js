import { obtenerLugaresTuristicos } from './SupabaseClient.js';
import { coincideCategoria, normalizarTexto } from '../utils/textUtils.js';

let todosLosLugares = [];
let categoriaActiva = 'todos';
let terminoBusqueda = '';

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

    getTotalLugares() {
        return todosLosLugares.length;
    },

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