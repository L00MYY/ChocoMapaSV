import { obtenerLugaresTuristicos } from '../models/SupabaseClient.js';
import { InicioView } from '../views/InicioView.js';

export const InicioController = {
    async init() {
        try {
        const lugares = await obtenerLugaresTuristicos();
            if (Array.isArray(lugares) && lugares.length > 0) {
                InicioView.actualizarTotalLugares(lugares.length);
            }
        } catch (error) {
            console.warn('No se pudo actualizar el total de destinos:', error);
        }
    }
};

InicioController.init();