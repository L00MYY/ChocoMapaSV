import { LugaresModel } from '../models/LugaresModel.js';
import { LugaresView } from '../views/LugaresView.js';
import { coincideCategoria, normalizarTexto, generarSlug } from '../utils/textUtils.js';

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
            const valorURL = (categoria === 'todos' || categoria === 'todas') ? 'todos' : (categoriaOriginal || categoria);
            this.actualizarURL({ categoria: valorURL });
        }

        this.aplicarFiltros();
    },

    seleccionarRating(minRating) {
        LugaresModel.setRatingMinimo(minRating);
        LugaresView.actualizarRatingActivo(minRating);
        this.aplicarFiltros();
    },

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
