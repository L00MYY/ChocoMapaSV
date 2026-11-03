/**
 * @file LugarDetalleController.js
 * @description Controlador para la vista detallada de un atractivo turístico específico.
 * Rol en el MVC: Controlador (Controller). Extrae el identificador del destino desde la URL,
 * coordina la obtención de datos con LugarDetalleModel y delega la representación a LugarDetalleView.
 */

import { LugarDetalleModel } from '../models/LugarDetalleModel.js';
import { LugarDetalleView } from '../views/LugarDetalleView.js';

/**
 * Identificador UUID por defecto utilizado como respaldo si no se proporciona 'id' en los parámetros URL.
 * @constant {string}
 */
const DEFAULT_FALLBACK_ID = '9506d663-3b09-4430-860d-dbb336c18295';

/**
 * Controlador de la página de detalle de lugar.
 * @namespace LugarDetalleController
 */
export const LugarDetalleController = {
    /**
     * Inicializa la vista de detalle obteniendo los parámetros URL, cargando el lugar y sus tours asociados.
     * @async
     * @function init
     * @returns {Promise<void>} Promesa que resuelve al finalizar la inicialización.
     */
    async init() {
        const { returnButton, dateFilter, clearDate } = LugarDetalleView.elements;
        returnButton?.addEventListener('click', event => {
            event.preventDefault();
            window.location.href = document.referrer.includes('lugares-turisticos.html')
                ? 'lugares-turisticos.html'
                : 'mapa.html';
        });

        LugarDetalleView.mostrarEstado('loading');
        const id = new URLSearchParams(window.location.search).get('id')?.trim() || DEFAULT_FALLBACK_ID;
        const lugar = await LugarDetalleModel.obtenerPorId(id);
        if (!lugar) {
            LugarDetalleView.mostrarEstado('error', 'El sitio turístico solicitado no existe o no se encuentra registrado en el sistema del Ministerio de Turismo.');
            return;
        }

        LugarDetalleView.renderizarLugar(lugar);
        LugarDetalleView.mostrarEstado('content');
        let tours = [];
        try {
            // Petición con límite de tiempo de seguridad (6s) para evitar bloqueos por conexión lenta a Supabase
            tours = await Promise.race([
                LugarDetalleModel.obtenerTours(lugar.id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), 6000))
            ]);
        } catch (error) {
            console.warn('Error al cargar tours del sitio:', error);
        }

        /**
         * Función auxiliar para filtrar y renderizar los tours asociados según la fecha seleccionada.
         * @function renderTours
         * @returns {void}
         */
        const renderTours = () => LugarDetalleView.renderizarTours(tours, dateFilter?.value.trim() || '', idTour => {
            window.location.href = `tour-detalle.html?id=${encodeURIComponent(idTour)}`;
        });
        dateFilter?.addEventListener('change', renderTours);
        clearDate?.addEventListener('click', () => {
            if (dateFilter) dateFilter.value = '';
            renderTours();
        });
        renderTours();
    }
};

// Inicialización del controlador según el estado de carga del documento DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LugarDetalleController.init(), { once: true });
} else {
    LugarDetalleController.init();
}