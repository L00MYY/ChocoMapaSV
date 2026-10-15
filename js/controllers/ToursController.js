import { ToursModel } from '../models/ToursModel.js';
import { ToursView } from '../views/ToursView.js';

function redirigirADetalle(id) {
    if (!id) return;
    window.location.href = `tour-detalle.html?id=${encodeURIComponent(id)}`;
}

export const ToursController = {
    init() {
        this.inicializarEventos();
        this.cargarDatos();
        this.inicializarFailsafe();
    },

    inicializarEventos() {
        const { filterDate, filterDepartment, filterOffer, filterPlace, btnClearFilters, btnResetEmpty } = ToursView.elements;
        [filterDate, filterDepartment, filterOffer, filterPlace].forEach(element => {
            element?.addEventListener('change', () => this.aplicarFiltros());
        });
        btnClearFilters?.addEventListener('click', () => this.restablecerFiltros());
        btnResetEmpty?.addEventListener('click', () => this.restablecerFiltros());
    },

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

    aplicarFiltros() {
        ToursView.renderizarTours(
            ToursModel.getToursFiltrados(ToursView.getFiltros()),
            ToursModel.getTotalTours(),
            redirigirADetalle
        );
    },

    restablecerFiltros() {
        const { filterDate, filterDepartment, filterOffer, filterPlace } = ToursView.elements;
        [filterDate, filterDepartment, filterOffer, filterPlace].forEach(element => {
            if (element) element.value = '';
        });
        this.aplicarFiltros();
    },

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