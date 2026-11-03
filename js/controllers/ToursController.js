/**
 * @file ToursController.js
 * @description Controlador del catálogo de tours turísticos y promociones.
 * Rol en el MVC: Controlador (Controller). Orquesta la recuperación de tours desde ToursModel,
 * gestiona los filtros multicriterio (fecha, departamento, oferta, sitio) y delega el renderizado a ToursView.
 */

import { ToursModel } from '../models/ToursModel.js';
import { ToursView } from '../views/ToursView.js';

/**
 * Redirige al usuario hacia la página de detalle del tour seleccionado.
 * @function redirigirADetalle
 * @param {string} id - Identificador único del tour.
 * @returns {void}
 */
function redirigirADetalle(id) {
    if (!id) return;
    window.location.href = `tour-detalle.html?id=${encodeURIComponent(id)}`;
}

/**
 * Objeto controlador que gestiona la lógica y filtrado del catálogo de tours.
 * @namespace ToursController
 */
export const ToursController = {
    /**
     * Inicializa los eventos, la carga de datos del catálogo y el mecanismo de seguridad.
     * @function init
     * @returns {void}
     */
    init() {
        this.inicializarEventos();
        this.cargarDatos();
        this.inicializarFailsafe();
    },

    /**
     * Vincula los controladores de eventos para los filtros y botones de restablecimiento.
     * @function inicializarEventos
     * @returns {void}
     */
    inicializarEventos() {
        const { filterDate, filterDepartment, filterOffer, filterPlace, btnClearFilters, btnResetEmpty } = ToursView.elements;
        [filterDate, filterDepartment, filterOffer, filterPlace].forEach(element => {
            element?.addEventListener('change', () => this.aplicarFiltros());
        });
        btnClearFilters?.addEventListener('click', () => this.restablecerFiltros());
        btnResetEmpty?.addEventListener('click', () => this.restablecerFiltros());
    },

    /**
     * Carga el catálogo de tours y sitios para filtros desde ToursModel y actualiza la vista.
     * @async
     * @function cargarDatos
     * @returns {Promise<void>}
     */
    async cargarDatos() {
        ToursView.mostrarCargando();
        try {
            // Carga asíncrona de tours y sitios turísticos desde Supabase (con fallback en ToursModel)
            const { tours, lugares } = await ToursModel.cargarCatalogo();
            ToursView.poblarSelectores(tours, lugares);
            if (tours.length === 0) {
                ToursView.mostrarSinDatos();
            } else {
                this.aplicarFiltros();
            }
        } catch (error) {
            console.error('Error o timeout al inicializar catálogo de tours:', error);
            ToursView.mostrarSinDatos();
        } finally {
            ToursView.elements.stateLoading?.classList.add('hidden');
        }
    },

    /**
     * Aplica los filtros seleccionados a través de ToursModel y solicita la renderización a ToursView.
     * @function aplicarFiltros
     * @returns {void}
     */
    aplicarFiltros() {
        ToursView.renderizarTours(
            ToursModel.getToursFiltrados(ToursView.getFiltros()),
            ToursModel.getTotalTours(),
            redirigirADetalle
        );
    },

    /**
     * Limpia los valores de todos los selectores de filtro y vuelve a renderizar el catálogo completo.
     * @function restablecerFiltros
     * @returns {void}
     */
    restablecerFiltros() {
        const { filterDate, filterDepartment, filterOffer, filterPlace } = ToursView.elements;
        [filterDate, filterDepartment, filterOffer, filterPlace].forEach(element => {
            if (element) element.value = '';
        });
        this.aplicarFiltros();
    },

    /**
     * Establece un temporizador de seguridad de 3.5 segundos para evitar estados de carga congelados.
     * @function inicializarFailsafe
     * @returns {void}
     */
    inicializarFailsafe() {
        const activarFailsafe = () => {
            const { stateLoading, stateNoResults, noResultsMessage, toursGrid } = ToursView.elements;
            if (stateLoading && (!toursGrid || toursGrid.classList.contains('hidden') || toursGrid.children.length === 0)) {
                stateLoading.classList.add('hidden');
                stateLoading.style.display = 'none';
                stateNoResults?.classList.remove('hidden');
                if (noResultsMessage) noResultsMessage.textContent = 'No hay datos disponibles para mostrar';
            }
        };

        setTimeout(activarFailsafe, 3500);
        window.addEventListener('error', activarFailsafe);
    }
};

// Inicialización del controlador según el estado de carga del documento
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ToursController.init(), { once: true });
} else {
    ToursController.init();
}