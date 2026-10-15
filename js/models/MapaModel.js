import { obtenerLugaresTuristicos } from './SupabaseClient.js';
import { normalizarTexto } from '../utils/textUtils.js';

let lugaresDisponibles = [];

export const MapaModel = {
    async cargarLugares() {
        const respuesta = await obtenerLugaresTuristicos();
        lugaresDisponibles = Array.isArray(respuesta) ? respuesta : [];
        return lugaresDisponibles;
    },

    buscarLugares(termino) {
        const busqueda = normalizarTexto(termino);
        if (!busqueda) return [];
        return lugaresDisponibles.filter(lugar =>
            normalizarTexto(lugar.name).includes(busqueda) ||
            normalizarTexto(lugar.category).includes(busqueda)
        );
    }
};