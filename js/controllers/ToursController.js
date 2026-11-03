import { ToursModel } from '../models/ToursModel.js';
import { ToursView } from '../views/ToursView.js';

/**
 * @description Redirige a la página de detalle del tour seleccionado.
 * @param {string} id - Identificador único UUID del tour.
 * @returns {void}
 */
function redirigirADetalle(id) {
    if (!id) return;
    window.location.href = `tour-detalle.html?id=${encodeURIComponent(id)}`;
}

/**
 * @namespace ToursController
 * @description Controlador del catálogo general de experiencias y tours turísticos.
 * Administra el filtrado multifacético (por departamento, sitio turístico, ofertas y fecha de salida)
 * y la persistencia de estados de interfaz.
 */
export const ToursController = {
    /**
     * @description Inicializa los eventos del DOM, carga el catálogo y activa el seguro contra bloqueos (failsafe).
     * @returns {void}
     */
    init() {
        this.inicializarEventos();
        this.cargarDatos();
        this.inicializarFailsafe();
    },

    /**
     * @description Configura los escuchadores de cambio en filtros de selección y botones de reseteo.
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
     * @description Realiza la petición asíncrona a Supabase para cargar tours vigentes y sitios turísticos asociados.
     * @returns {Promise<void>}
     */
    async cargarDatos() {
        ToursView.mostrarCargando();
        try {
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
     * @description Ejecuta el motor de filtrado del modelo según los selectores activos y renderiza las tarjetas de tour.
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
     * @description Restablece todos los filtros de búsqueda a su estado por defecto y recarga la vista completa.
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
     * @description Seguro temporal que oculta el loader si la respuesta de red excede el tiempo tolerable (failsafe).
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ToursController.init(), { once: true });
} else {
    ToursController.init();
}
