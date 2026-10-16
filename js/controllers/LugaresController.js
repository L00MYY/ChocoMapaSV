import { LugaresModel } from '../models/LugaresModel.js';
import { LugaresView } from '../views/LugaresView.js';
import { coincideCategoria, normalizarTexto } from '../utils/textUtils.js';

function redirigirADetalle(id) {
    if (!id || typeof id !== 'string') return;
    window.location.href = `detalle-lugar.html?id=${encodeURIComponent(id)}`;
}

export const LugaresController = {
    init() {
        this.inicializarEventos();
        this.cargarLugares();
    },

    inicializarEventos() {
        const {
            searchInput,
            searchClearBtn,
            btnRetry,
            btnResetFilters
        } = LugaresView.elements;

        searchInput?.addEventListener('input', (event) => {
            LugaresModel.setBusqueda(event.target.value);
            searchClearBtn?.classList.toggle('hidden', LugaresModel.getBusqueda().length === 0);
            this.aplicarFiltros();
        });

        searchClearBtn?.addEventListener('click', () => {
            if (!searchInput) return;
            searchInput.value = '';
            LugaresModel.setBusqueda('');
            searchClearBtn.classList.add('hidden');
            searchInput.focus();
            this.aplicarFiltros();
        });

        btnRetry?.addEventListener('click', () => this.cargarLugares());

        btnResetFilters?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            LugaresModel.setBusqueda('');
            searchClearBtn?.classList.add('hidden');
            const btnTodos = LugaresView.elements.categoryPillsContainer?.querySelector('[data-category="todos"], [data-categoria="todos"]');
            this.seleccionarCategoria('todos', btnTodos, true);
        });

        window.addEventListener('popstate', () => {
            const categoriaURL = this.procesarParametrosURL();
            const boton = Array.from(LugaresView.elements.categoryPillsContainer?.querySelectorAll('.pill-btn') || [])
                .find(element => (element.dataset.category || element.dataset.categoria) === categoriaURL);
            this.seleccionarCategoria(categoriaURL, boton, false);
        });
    },

    async cargarLugares() {
        LugaresView.mostrarCargando();

        try {
            const lugares = await LugaresModel.cargarLugares();
            if (lugares.length === 0) {
                LugaresView.mostrarVacio(0);
                return;
            }

            const categoriaActiva = this.procesarParametrosURL();
            LugaresModel.setCategoria(categoriaActiva);
            LugaresView.inicializarFiltrosCategorias(
                LugaresModel.obtenerCategoriasUnicas(),
                categoriaActiva,
                (categoria, boton, categoriaOriginal) => this.seleccionarCategoria(categoria, boton, true, categoriaOriginal)
            );
            this.aplicarFiltros();
        } catch (error) {
            console.error('Error al obtener lugares turísticos:', error);
            LugaresView.mostrarError('No se pudo conectar con el servidor de Supabase. Revisa tu conexión a internet e inténtalo de nuevo.');
        }
    },

    aplicarFiltros() {
        LugaresView.renderizarGridLugares(
            LugaresModel.getLugaresFiltrados(),
            LugaresModel.getTotalLugares(),
            redirigirADetalle
        );
    },

    seleccionarCategoria(categoria, botonSeleccionado = null, sincronizarURL = true, categoriaOriginal = '') {
        LugaresModel.setCategoria(categoria);
        LugaresView.actualizarCategoriaActiva(categoria, botonSeleccionado);

        if (sincronizarURL) {
            const valorURL = categoria === 'todos' ? 'todos' : (categoriaOriginal || categoria);
            this.actualizarURLConCategoria(valorURL);
        }

        this.aplicarFiltros();
    },

    procesarParametrosURL() {
        const categoriaURL = new URLSearchParams(window.location.search).get('categoria');
        if (!categoriaURL) return 'todos';

        const categoriaNormalizada = normalizarTexto(categoriaURL);
        const coincidencia = LugaresModel.obtenerCategoriasUnicas().keys();
        for (const categoria of coincidencia) {
            if (coincideCategoria(categoria, categoriaNormalizada)) {
                return normalizarTexto(categoria);
            }
        }

        return 'todos';
    },

    actualizarURLConCategoria(categoria) {
        try {
            const url = new URL(window.location.href);
            if (!categoria || categoria === 'todos') {
                url.searchParams.delete('categoria');
            } else {
                url.searchParams.set('categoria', categoria);
            }
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {
            console.warn('No se pudo actualizar la URL del navegador:', error);
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LugaresController.init(), { once: true });
} else {
    LugaresController.init();
}