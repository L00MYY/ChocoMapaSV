import { LugaresModel } from '../models/LugaresModel.js';
import { LugaresView } from '../views/LugaresView.js';
import { coincideCategoria, normalizarTexto, generarSlug } from '../utils/textUtils.js';

/**
 * @description Redirige a la página de detalle del sitio turístico seleccionado.
 * @param {string} id - Identificador único UUID del lugar turístico.
 * @returns {void}
 */
function redirigirADetalle(id) {
    if (!id || typeof id !== 'string') return;
    window.location.href = `detalle-lugar.html?id=${encodeURIComponent(id)}`;
}

/**
 * @namespace LugaresController
 * @description Controlador del catálogo de lugares turísticos.
 * Maneja la reactividad de filtros por categoría, búsqueda textual predictiva,
 * calificación mínima por estrellas y sincronización bidireccional con la URL.
 */
export const LugaresController = {
    /**
     * @description Inicializa los manejadores de eventos y dispara la carga de datos.
     * @returns {void}
     */
    init() {
        this.inicializarEventos();
        this.cargarLugares();
    },

    /**
     * @description Vincula los escuchadores de eventos del DOM para inputs de búsqueda, botones de filtro y popstate.
     * @returns {void}
     */
    inicializarEventos() {
        const {
            searchInput,
            searchClearBtn,
            btnRetry,
            btnResetFilters,
            ratingPillsContainer
        } = LugaresView.elements;

        searchInput?.addEventListener('input', (event) => {
            const termino = event.target.value;
            LugaresModel.setBusqueda(termino);
            searchClearBtn?.classList.toggle('hidden', LugaresModel.getBusqueda().length === 0);
            this.actualizarURL({ q: LugaresModel.getBusqueda() });
            this.aplicarFiltros();
        });

        searchClearBtn?.addEventListener('click', () => {
            if (!searchInput) return;
            searchInput.value = '';
            LugaresModel.setBusqueda('');
            searchClearBtn.classList.add('hidden');
            this.actualizarURL({ q: '' });
            searchInput.focus();
            this.aplicarFiltros();
        });

        ratingPillsContainer?.addEventListener('click', (event) => {
            const btn = event.target.closest('.rating-pill-btn');
            if (!btn) return;
            const minRating = Number(btn.dataset.rating) || 0;
            this.seleccionarRating(minRating);
        });

        btnRetry?.addEventListener('click', () => this.cargarLugares());

        btnResetFilters?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            LugaresModel.setBusqueda('');
            searchClearBtn?.classList.add('hidden');
            this.actualizarURL({ q: '', categoria: 'todos' });
            const btnTodos = LugaresView.elements.categoryPillsContainer?.querySelector('[data-category="todos"], [data-categoria="todos"]');
            this.seleccionarCategoria('todos', btnTodos, true);
            this.seleccionarRating(0);
        });

        window.addEventListener('popstate', () => {
            const categoriaURL = this.procesarParametrosURL();
            this.procesarParametroBusquedaURL();
            const boton = Array.from(LugaresView.elements.categoryPillsContainer?.querySelectorAll('.pill-btn') || [])
                .find(element => {
                    const cat = element.dataset.category || element.dataset.categoria;
                    return cat === categoriaURL || coincideCategoria(cat, categoriaURL);
                });
            this.seleccionarCategoria(categoriaURL, boton, false);
        });
    },

    /**
     * @description Carga lugares y categorías desde Supabase PostgREST, renderizando la vista inicial.
     * @returns {Promise<void>}
     */
    async cargarLugares() {
        LugaresView.mostrarCargando();

        try {
            const lugares = await LugaresModel.cargarLugares();
            if (lugares.length === 0) {
                LugaresView.mostrarVacio(0);
                return;
            }

            // Cargar categorías oficiales de la base de datos
            const categorias = await LugaresModel.cargarCategorias();

            const categoriaActiva = this.procesarParametrosURL();
            this.procesarParametroBusquedaURL();

            LugaresModel.setCategoria(categoriaActiva);
            LugaresView.inicializarFiltrosCategorias(
                categorias,
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
     * @description Aplica los filtros combinados actuales (búsqueda, categoría, calificación) en la vista.
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
     * @description Selecciona una categoría turística y refresca la vista y la URL.
     * @param {string} categoria - Slug o nombre normalizado de la categoría.
     * @param {HTMLElement|null} [botonSeleccionado=null] - Botón de la pill pulsada en la interfaz.
     * @param {boolean} [sincronizarURL=true] - Si se debe actualizar la URL en el historial del navegador.
     * @param {string} [categoriaOriginal=''] - Nombre textual original de la categoría.
     * @returns {void}
     */
    seleccionarCategoria(categoria, botonSeleccionado = null, sincronizarURL = true, categoriaOriginal = '') {
        LugaresModel.setCategoria(categoria);
        LugaresView.actualizarCategoriaActiva(categoria, botonSeleccionado);

        if (sincronizarURL) {
            const valorURL = (categoria === 'todos' || categoria === 'todas') ? 'todos' : (categoriaOriginal || categoria);
            this.actualizarURL({ categoria: valorURL });
        }

        this.aplicarFiltros();
    },

    /**
     * @description Selecciona la calificación mínima por estrellas (1 a 5) y actualiza el catálogo.
     * @param {number} minRating - Calificación mínima entre 0 y 5.
     * @returns {void}
     */
    seleccionarRating(minRating) {
        LugaresModel.setRatingMinimo(minRating);
        LugaresView.actualizarRatingActivo(minRating);
        this.aplicarFiltros();
    },

    /**
     * @description Lee y aplica el parámetro `q` de la URL al input de búsqueda.
     * @returns {string} El término de búsqueda recuperado o cadena vacía.
     */
    procesarParametroBusquedaURL() {
        try {
            const params = new URLSearchParams(window.location.search);
            const queryURL = params.get('q');
            if (queryURL && queryURL.trim().length > 0) {
                const queryLimpio = queryURL.trim();
                LugaresModel.setBusqueda(queryLimpio);
                if (LugaresView.elements.searchInput) {
                    LugaresView.elements.searchInput.value = queryLimpio;
                }
                LugaresView.elements.searchClearBtn?.classList.remove('hidden');
                return queryLimpio;
            } else if (LugaresView.elements.searchInput && LugaresModel.getBusqueda().length === 0) {
                LugaresView.elements.searchInput.value = '';
                LugaresView.elements.searchClearBtn?.classList.add('hidden');
            }
        } catch (error) {
            console.warn('Error al procesar parámetro de búsqueda en URL:', error);
        }
        return '';
    },

    /**
     * @description Extrae y normaliza el parámetro `categoria` desde los searchParams de la URL.
     * @returns {string} Slug o nombre de categoría normalizado, o 'todos'.
     */
    procesarParametrosURL() {
        const categoriaURL = new URLSearchParams(window.location.search).get('categoria');
        if (!categoriaURL) return 'todos';

        const categorias = LugaresModel.obtenerCategoriasDisponibles();
        for (const cat of categorias) {
            if (
                coincideCategoria(cat.name, categoriaURL) ||
                coincideCategoria(cat.slug, categoriaURL) ||
                generarSlug(cat.name) === generarSlug(categoriaURL)
            ) {
                return cat.slug || normalizarTexto(cat.name);
            }
        }

        return normalizarTexto(categoriaURL);
    },

    /**
     * @description Sincroniza los parámetros de filtrado actuales con la barra de direcciones del navegador.
     * @param {Object} [cambios={}] - Objeto con claves a actualizar (categoria, q).
     * @returns {void}
     */
    actualizarURL(cambios = {}) {
        try {
            const url = new URL(window.location.href);

            if ('categoria' in cambios) {
                const valor = cambios.categoria;
                if (!valor || valor === 'todos' || valor === 'todas') {
                    url.searchParams.delete('categoria');
                } else {
                    url.searchParams.set('categoria', valor);
                }
            }

            if ('q' in cambios) {
                const query = (cambios.q || '').trim();
                if (query.length === 0) {
                    url.searchParams.delete('q');
                } else {
                    url.searchParams.set('q', query);
                }
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
