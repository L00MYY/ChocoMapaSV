/**
 * @file InicioView.js
 * @description Vista para la página de inicio (Landing Page).
 * Rol en el MVC: Vista (View). Se encarga exclusivamente de la manipulación del DOM
 * en la página principal, actualizando indicadores dinámicos como el contador total de destinos.
 */

/**
 * Objeto vista que encapsula las referencias del DOM y renderizado de la página de inicio.
 * @namespace InicioView
 */
export const InicioView = {
    /** @type {{ totalLugares: HTMLElement|null }} Referencias a elementos del DOM */
    elements: {
        totalLugares: document.getElementById('dato-total')
    },

    /**
     * Actualiza en el DOM el número total de lugares turísticos registrados.
     * @function actualizarTotalLugares
     * @param {number|string} total - Cantidad total de destinos a mostrar.
     * @returns {void}
     */
    actualizarTotalLugares(total) {
        if (this.elements.totalLugares) {
            this.elements.totalLugares.textContent = String(total);
        }
    }
};