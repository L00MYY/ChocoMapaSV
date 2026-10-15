// js/tours.js
// Controlador para el catálogo de tours con filtros combinables (CP-015, CP-016, CP-017)
import { obtenerToursActivos, obtenerLugaresParaFiltro } from './tours-service.js';

const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80';

// Referencias al DOM
const filterDate = document.getElementById('filter-date');
const filterDepartment = document.getElementById('filter-department');
const filterOffer = document.getElementById('filter-offer');
const filterPlace = document.getElementById('filter-place');
const btnClearFilters = document.getElementById('btn-clear-filters');
const btnResetEmpty = document.getElementById('btn-reset-empty');
const resultsCounter = document.getElementById('results-counter');
const stateLoading = document.getElementById('state-loading');
const stateNoResults = document.getElementById('state-no-results');
const toursGrid = document.getElementById('tours-grid');

// Estado en memoria
let todosLosTours = [];
let lugaresDisponibles = [];

/**
 * Formatea un número decimal como moneda estadounidense USD (ej. $25.00)
 * @param {number|string} valor
 * @returns {string} Formato de precio en USD
 */
function formatearPrecioUSD(valor) {
    const num = Number(valor);
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
}

/**
 * Navega a la vista de detalle del tour (CP-018)
 * @param {string} id - UUID del tour
 */
function redirigirADetalle(id) {
    if (!id) return;
    window.location.href = `tour-detalle.html?id=${encodeURIComponent(id)}`;
}

/**
 * Crea el elemento DOM de una tarjeta de tour (CP-015, CP-017)
 * @param {Object} tour
 * @returns {HTMLElement} Elemento article interactivo
 */
function crearTarjetaTour(tour) {
    const card = document.createElement('article');
    card.className = 'tour-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Ver detalles completos del tour ${tour.name || ''}`);
    card.dataset.id = tour.id;

    // Clic en la tarjeta redirige a la página de detalle
    card.addEventListener('click', () => {
        redirigirADetalle(tour.id);
    });

    // Accesibilidad mediante teclado
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            redirigirADetalle(tour.id);
        }
    });

    // 1. Contenedor de la Imagen
    const media = document.createElement('div');
    media.className = 'tour-card-media';

    const img = document.createElement('img');
    img.className = 'tour-card-image';
    img.alt = `Fotografía de ${tour.name || 'Tour oficial'}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = (tour.image_url && typeof tour.image_url === 'string' && tour.image_url.trim().length > 0)
        ? tour.image_url.trim()
        : IMAGEN_FALLBACK;

    img.addEventListener('error', () => {
        if (img.src !== IMAGEN_FALLBACK) {
            img.src = IMAGEN_FALLBACK;
        }
    });

    media.appendChild(img);

    // CP-017: Etiqueta de descuento SI Y SOLO SI has_offer === true y discount_percentage > 0
    if (tour.has_offer === true && Number(tour.discount_percentage) > 0) {
        const discountBadge = document.createElement('span');
        discountBadge.className = 'tour-card-discount-badge';
        discountBadge.textContent = `-${tour.discount_percentage}% Descuento`;
        media.appendChild(discountBadge);
    }

    card.appendChild(media);

    // 2. Cuerpo de la Tarjeta
    const body = document.createElement('div');
    body.className = 'tour-card-body';

    // Encabezado de la tarjeta con nombre y departamento
    const header = document.createElement('div');
    header.className = 'tour-card-header';

    const title = document.createElement('h3');
    title.className = 'tour-card-title';
    title.textContent = tour.name || 'Tour turístico';
    header.appendChild(title);

    if (tour.department) {
        const dept = document.createElement('span');
        dept.className = 'tour-card-dept';
        dept.innerHTML = `
            <svg class="dept-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${tour.department}</span>
        `;
        header.appendChild(dept);
    }

    body.appendChild(header);

    // Descripción breve
    const desc = document.createElement('p');
    desc.className = 'tour-card-description';
    desc.textContent = tour.short_description || 'Sin descripción disponible para este tour.';
    body.appendChild(desc);

    // Metadatos: Guía y Precio
    const meta = document.createElement('div');
    meta.className = 'tour-card-meta';

    const guide = document.createElement('div');
    guide.className = 'tour-card-guide';
    guide.innerHTML = `
        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Guía: <strong>${tour.guide_name || 'Certificado'}</strong></span>
    `;
    meta.appendChild(guide);

    // Precios
    const pricing = document.createElement('div');
    pricing.className = 'tour-card-pricing';

    const priceLabel = document.createElement('span');
    priceLabel.className = 'price-label';
    priceLabel.textContent = 'Precio';
    pricing.appendChild(priceLabel);

    const priceValues = document.createElement('div');
    priceValues.className = 'price-values';

    if (tour.has_offer === true && Number(tour.discount_percentage) > 0) {
        const originalPrice = document.createElement('span');
        originalPrice.className = 'price-original';
        originalPrice.textContent = formatearPrecioUSD(tour.price);
        priceValues.appendChild(originalPrice);

        const finalPrice = document.createElement('strong');
        finalPrice.className = 'price-amount price-discounted';
        const calcPrice = tour.final_price !== null && tour.final_price !== undefined
            ? tour.final_price
            : (Number(tour.price) - (Number(tour.price) * Number(tour.discount_percentage) / 100));
        finalPrice.textContent = formatearPrecioUSD(calcPrice);
        priceValues.appendChild(finalPrice);
    } else {
        const standardPrice = document.createElement('strong');
        standardPrice.className = 'price-amount';
        standardPrice.textContent = formatearPrecioUSD(tour.price);
        priceValues.appendChild(standardPrice);
    }

    pricing.appendChild(priceValues);
    meta.appendChild(pricing);
    body.appendChild(meta);

    card.appendChild(body);

    // 3. Pie de la Tarjeta
    const footer = document.createElement('div');
    footer.className = 'tour-card-footer';
    footer.innerHTML = `
        <span class="tour-card-action">Ver detalles y fechas</span>
        <svg class="tour-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    `;
    card.appendChild(footer);

    return card;
}

/**
 * Renderiza la lista de tours en el grid o despliega el mensaje de no resultados (CP-016)
 * @param {Array} lista - Tours a mostrar
 */
function renderizarTours(lista) {
    if (!toursGrid) return;

    toursGrid.replaceChildren();

    const noResultsMsg = document.getElementById('no-results-message');

    if (resultsCounter) {
        if (lista.length === 1) {
            resultsCounter.textContent = 'Mostrando 1 tour oficial';
        } else {
            resultsCounter.textContent = `Mostrando ${lista.length} de ${todosLosTours.length} tours oficiales`;
        }
    }

    // Si la lista está vacía
    if (lista.length === 0) {
        toursGrid.classList.add('hidden');
        if (stateNoResults) {
            stateNoResults.classList.remove('hidden');
            if (noResultsMsg) {
                // Si la base de datos no tiene tours en absoluto o falló la consulta:
                if (todosLosTours.length === 0) {
                    noResultsMsg.textContent = 'No hay datos disponibles para mostrar';
                } else {
                    // Si hay tours cargados pero no coinciden con los filtros (CP-016 texto exacto):
                    noResultsMsg.textContent = 'No hay tours que coincidan con los filtros seleccionados';
                }
            }
        }
        return;
    }

    if (stateNoResults) stateNoResults.classList.add('hidden');
    toursGrid.classList.remove('hidden');

    const fragment = document.createDocumentFragment();
    lista.forEach(tour => {
        fragment.appendChild(crearTarjetaTour(tour));
    });

    toursGrid.appendChild(fragment);
}

/**
 * Muestra el estado vacío sin datos cuando la tabla está vacía o falló la consulta
 */
function mostrarEstadoSinDatos() {
    if (toursGrid) toursGrid.classList.add('hidden');
    if (stateNoResults) {
        stateNoResults.classList.remove('hidden');
        const noResultsMsg = document.getElementById('no-results-message');
        if (noResultsMsg) {
            noResultsMsg.textContent = 'No hay datos disponibles para mostrar';
        }
    }
    if (resultsCounter) {
        resultsCounter.textContent = '0 tours encontrados';
    }
}

/**
 * Aplica los 4 filtros combinables en lógica AND (CP-016)
 */
function aplicarFiltros() {
    const valFecha = filterDate ? filterDate.value.trim() : '';
    const valDepto = filterDepartment ? filterDepartment.value.trim().toLowerCase() : '';
    const valOferta = filterOffer ? filterOffer.value.trim() : '';
    const valLugar = filterPlace ? filterPlace.value.trim() : '';

    const filtrados = todosLosTours.filter(tour => {
        // 1. Filtro por Fecha (departure_date en tour_dates)
        if (valFecha) {
            const tieneFecha = Array.isArray(tour.tour_dates) && tour.tour_dates.some(td => {
                return td.departure_date === valFecha;
            });
            if (!tieneFecha) return false;
        }

        // 2. Filtro por Departamento
        if (valDepto) {
            const deptoTour = (tour.department || '').trim().toLowerCase();
            if (deptoTour !== valDepto) return false;
        }

        // 3. Filtro por Descuento aplicable (has_offer)
        if (valOferta === 'oferta') {
            if (tour.has_offer !== true || !(Number(tour.discount_percentage) > 0)) {
                return false;
            }
        } else if (valOferta === 'sin_oferta') {
            if (tour.has_offer === true && Number(tour.discount_percentage) > 0) {
                return false;
            }
        }

        // 4. Filtro por Lugar Turístico (place_id en tour_places)
        if (valLugar) {
            const incluyeLugar = Array.isArray(tour.tour_places) && tour.tour_places.some(tp => {
                return tp.place_id === valLugar || (tp.places && tp.places.id === valLugar);
            });
            if (!incluyeLugar) return false;
        }

        return true;
    });

    renderizarTours(filtrados);
}

/**
 * Llena las opciones de los selectores de departamento y lugar turístico
 */
function poblarSelectoresFiltro() {
    // 1. Departamentos únicos
    if (filterDepartment) {
        const deptosSet = new Set();
        todosLosTours.forEach(t => {
            if (t.department && t.department.trim()) {
                deptosSet.add(t.department.trim());
            }
        });

        // Limpiar opciones previas excepto la primera
        filterDepartment.innerHTML = '<option value="">Todos los departamentos</option>';
        Array.from(deptosSet).sort().forEach(depto => {
            const opt = document.createElement('option');
            opt.value = depto;
            opt.textContent = depto;
            filterDepartment.appendChild(opt);
        });
    }

    // 2. Lugares turísticos
    if (filterPlace && Array.isArray(lugaresDisponibles)) {
        filterPlace.innerHTML = '<option value="">Todos los lugares</option>';
        lugaresDisponibles.forEach(lugar => {
            const opt = document.createElement('option');
            opt.value = lugar.id;
            opt.textContent = lugar.name ? `${lugar.name} (${lugar.department || 'El Salvador'})` : 'Sitio turístico';
            filterPlace.appendChild(opt);
        });
    }
}

/**
 * Restablece los 4 filtros a sus valores predeterminados
 */
function restablecerFiltros() {
    if (filterDate) filterDate.value = '';
    if (filterDepartment) filterDepartment.value = '';
    if (filterOffer) filterOffer.value = '';
    if (filterPlace) filterPlace.value = '';
    aplicarFiltros();
}

/**
 * Carga inicial de datos desde Supabase con timeout de seguridad (6s)
 */
async function cargarDatos() {
    if (stateLoading) stateLoading.classList.remove('hidden');
    if (stateNoResults) stateNoResults.classList.add('hidden');
    if (toursGrid) toursGrid.classList.add('hidden');
    if (resultsCounter) resultsCounter.textContent = 'Cargando catálogo de tours...';

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de seguridad (6s) excedido al cargar catálogo')), 6000);
    });

    try {
        const [tours, lugares] = await Promise.race([
            Promise.all([
                obtenerToursActivos(),
                obtenerLugaresParaFiltro()
            ]),
            timeoutPromise
        ]);

        todosLosTours = Array.isArray(tours) ? tours : [];
        lugaresDisponibles = Array.isArray(lugares) ? lugares : [];

        poblarSelectoresFiltro();

        if (todosLosTours.length === 0) {
            mostrarEstadoSinDatos();
        } else {
            aplicarFiltros();
        }
    } catch (error) {
        console.error('Error o timeout al inicializar catálogo de tours:', error);
        todosLosTours = [];
        mostrarEstadoSinDatos();
    } finally {
        // Regla: Siempre, sin excepción, oculta el spinner/indicador de carga al finalizar o ante error
        if (stateLoading) {
            stateLoading.classList.add('hidden');
        }
    }
}

/**
 * Inicialización de escuchadores de eventos
 */
function inicializarEventos() {
    if (filterDate) filterDate.addEventListener('change', aplicarFiltros);
    if (filterDepartment) filterDepartment.addEventListener('change', aplicarFiltros);
    if (filterOffer) filterOffer.addEventListener('change', aplicarFiltros);
    if (filterPlace) filterPlace.addEventListener('change', aplicarFiltros);

    if (btnClearFilters) btnClearFilters.addEventListener('click', restablecerFiltros);
    if (btnResetEmpty) btnResetEmpty.addEventListener('click', restablecerFiltros);
}

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventos();
    cargarDatos();
});
