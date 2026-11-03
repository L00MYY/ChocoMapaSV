/**
 * @file InicioController.js
 * @description Controlador de la página de inicio (Landing Page).
 * Rol en el MVC: Controlador (Controller) que orquesta el flujo entre el cliente de datos
 * (SupabaseClient) y la vista inicial (InicioView), actualizando contadores dinámicos.
 */

import { obtenerLugaresTuristicos } from '../models/SupabaseClient.js';
import { InicioView } from '../views/InicioView.js';

/**
 * Controlador de la página de inicio.
 * @namespace InicioController
 */
export const InicioController = {
    /**
     * Inicializa la vista de inicio solicitando los destinos turísticos registrados en Supabase.
     * @async
     * @function init
     * @returns {Promise<void>} Promesa que resuelve al completar la inicialización.
     */
    async init() {
        try {
            // Consulta asíncrona a Supabase para recuperar la lista de lugares turísticos
        const lugares = await obtenerLugaresTuristicos();
            if (Array.isArray(lugares) && lugares.length > 0) {
                InicioView.actualizarTotalLugares(lugares.length);
            }
        } catch (error) {
            console.warn('No se pudo actualizar el total de destinos:', error);
        }
    }
};

// Inicialización automática del controlador al cargar el script
InicioController.init();