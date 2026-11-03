/**
 * @file LugaresController.js
 * @description Controlador de la página del catálogo general de lugares turísticos.
 * Rol en el MVC: Controlador (Controller). Orquesta la interacción entre LugaresModel y LugaresView,
 * gestionando búsqueda por texto libre, filtrado por categorías de destino y sincronización con parámetros URL.
 */

import { LugaresModel } from '../models/LugaresModel.js';
import { LugaresView } from '../views/LugaresView.js';
import { coincideCategoria, normalizarTexto } from '../utils/textUtils.js';

/**
 * Redirige al usuario hacia la página de detalle del sitio turístico seleccionado.
 * @function redirigirADetalle
 * @param {string} id - Identificador único (UUID) del sitio turístico.
 * @returns {void}
 */
function redirigirADetalle(id) {
    if (!id || typeof id !== 'string') return;
    window.location.href = `detalle-lugar.html?id=${encodeURIComponent(id)}`;
}

/**
 * Objeto controlador que gestiona la interacción y presentación del catálogo de lugares.
 * @namespace LugaresController
 */
export const LugaresController = {
    /**
     * Inicializa los eventos del DOM y desencadena la carga de destinos.
     * @function init
     * @returns {void}
     */
    init() {
        this.inicializarEventos();
        this.cargarLugares();
    },

    /**
     * Vincula los escuchadores de eventos para los filtros, barra de búsqueda y navegación en historial.
     * @function inicializarEventos
     * @returns {void}
     */
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

    /**
     * Consulta asíncronamente los lugares mediante LugaresModel y configura la vista inicial.
     * @async
     * @function cargarLugares
     * @returns {Promise<void>}
     */
    async cargarLugares() {
        LugaresView.mostrarCargando();

        try {
            // Petición a Supabase para recuperar la totalidad de atractivos turísticos activos
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

    /**
     * Aplica los filtros activos en el modelo y delega la renderización a LugaresView.
     * @function aplicarFiltros
     * @returns {void}
     */
    aplicarFiltros() {
        LugaresView.renderizarGridLugares(
            LugaresModel.getLugaresFiltrados(),
            LugaresModel.getTotalLugares(),
            redirigirADetalle
        );
    },

    /**
     * Actualiza la categoría activa, refresca la vista y sincroniza el parámetro en la URL.
     * @function seleccionarCategoria
     * @param {string} categoria - Slug o nombre normalizado de la categoría seleccionada.
     * @param {HTMLElement|null} [botonSeleccionado=null] - Elemento de botón presionado para actualizar estilos.
     * @param {boolean} [sincronizarURL=true] - Si debe persistir el cambio en la URL mediante replaceState.
     * @param {string} [categoriaOriginal=''] - Nombre original de la categoría sin normalizar.
     * @returns {void}
     */
    seleccionarCategoria(categoria, botonSeleccionado = null, sincronizarURL = true, categoriaOriginal = '') {
        LugaresModel.setCategoria(categoria);
        LugaresView.actualizarCategoriaActiva(categoria, botonSeleccionado);

        if (sincronizarURL) {
            const valorURL = categoria === 'todos' ? 'todos' : (categoriaOriginal || categoria);
            this.actualizarURLConCategoria(valorURL);
        }

        this.aplicarFiltros();
    },

    /**
     * Extrae y normaliza el parámetro de categoría proveniente de los search params de la URL.
     * @function procesarParametrosURL
     * @returns {string} Nombre normalizado de la categoría encontrada o 'todos'.
     */
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

    /**
     * Modifica los parámetros de búsqueda de la URL sin recargar la página.
     * @function actualizarURLConCategoria
     * @param {string} categoria - Categoría que se reflejará en la URL.
     * @returns {void}
     */
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

// Inicialización del controlador una vez el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LugaresController.init(), { once: true });
} else {
    LugaresController.init();
}