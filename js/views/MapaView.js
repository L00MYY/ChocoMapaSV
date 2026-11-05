// Vista e integración visual de Mapbox.
import { MAPBOX_TOKEN_B64 } from '../config.js';
import { calcularPromedioRating } from '../models/CalificacionesModel.js';
import { coincideCategoria } from '../utils/textUtils.js';

const MAPBOX_TOKEN = atob(MAPBOX_TOKEN_B64);
mapboxgl.accessToken = MAPBOX_TOKEN;

// Límites estáticos (se mantienen en JS para que el mapa cargue sin esperar a la BD).
// Extremos reales de El Salvador: O -90.13, E -87.69, S 13.15, N 14.45
// Margen de ~0.05° para no cortar territorio.
const limitesElSalvador = [
    [-90.18, 13.10], // Suroeste
    [-87.64, 14.50]  // Noreste
];

// Color con el que se "tapan" los países vecinos (cercano al fondo de light-v11)
const COLOR_MASCARA = '#f2f2f0';

export const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',

    // Encuadra El Salvador completo según el tamaño real del contenedor
    // (reemplaza a center + zoom, que no se adaptan a cada pantalla)
    bounds: limitesElSalvador,
    fitBoundsOptions: { padding: 10 },

    maxZoom: 17,
    maxBounds: limitesElSalvador
});

// El zoom mínimo es el que encuadra el país: no se puede alejar más que eso
map.on('load', () => {
    map.resize();
    fijarZoomMinimo();

    // Máscara: cubre todos los países excepto El Salvador usando el tileset
    // oficial de fronteras de Mapbox (no requiere GeoJSON propio).
    map.addSource('fronteras-paises', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
    });

    map.addLayer({
        id: 'mascara-vecinos',
        type: 'fill',
        source: 'fronteras-paises',
        'source-layer': 'country_boundaries',
        filter: [
            'all',
            ['!=', ['get', 'iso_3166_1'], 'SV'],
            ['any',
                ['==', 'all', ['get', 'worldview']],
                ['in', 'US', ['get', 'worldview']]
            ]
        ],
        paint: {
            'fill-color': COLOR_MASCARA,
            'fill-opacity': 1
        }
    });
});

// Si cambia el tamaño de la ventana o se termina de cargar el DOM completo, recalcula
map.on('resize', fijarZoomMinimo);
window.addEventListener('load', () => {
    map.resize();
    fijarZoomMinimo();
});

function fijarZoomMinimo() {
    const zoomEncuadre = map.cameraForBounds(limitesElSalvador, { padding: 10 })?.zoom;
    if (zoomEncuadre) {
        map.setMinZoom(zoomEncuadre);
        if (map.getZoom() < zoomEncuadre) map.setZoom(zoomEncuadre);
    }
}

const nav = new mapboxgl.NavigationControl({
    visualizePitch: true
});
map.addControl(nav, 'bottom-right');


function crearEstrellas(calificacion) {
    const estrellasLlenas = Math.floor(calificacion);
    const tieneFraccion = (calificacion - estrellasLlenas) >= 0.4;
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= 5; i++) {
        const llena = i <= estrellasLlenas || (i === estrellasLlenas + 1 && tieneFraccion);
        const color = llena ? '#F59E0B' : '#D1D5DB'; // amarillo / gris
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('fill', color);
        svg.setAttribute('stroke', color);
        svg.setAttribute('stroke-width', '1.5');
        svg.style.display = 'inline-block';
        svg.style.flexShrink = '0';
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
        svg.appendChild(polygon);
        fragment.appendChild(svg);
    }
    return fragment;
}

let activeMarkers = {};

const hoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 25,
    className: 'hover-popup'
});

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('info-sidebar');

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.add('hidden');
        });
    }
});

export const MapaView = {
    elements: {
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('results-list'),
        categoryFilters: document.getElementById('map-category-filters'),
        closeSidebar: document.getElementById('close-sidebar'),
        sidebar: document.getElementById('info-sidebar')
    },

    renderizarResultados(lugares, onSelectLugar) {
        const { searchResults } = this.elements;
        if (!searchResults) return;

        searchResults.replaceChildren();
        if (!lugares.length) {
            searchResults.classList.add('hidden');
            return;
        }

        searchResults.classList.remove('hidden');
        const fragment = document.createDocumentFragment();
        lugares.forEach(lugar => {
            const item = document.createElement('li');
            item.className = 'result-item';

            const title = document.createElement('span');
            title.className = 'result-item-title';
            title.textContent = lugar.name || 'Sitio turístico';

            const category = document.createElement('span');
            category.className = 'result-item-category';
            category.style.color = lugar.color || '#FF6B6B';
            category.textContent = lugar.category || 'Turismo';

            item.append(title, category);
            item.addEventListener('click', () => onSelectLugar(lugar));
            fragment.appendChild(item);
        });
        searchResults.appendChild(fragment);
    },

    ocultarResultados() {
        this.elements.searchResults?.classList.add('hidden');
    },

    /**
     * Renderiza dinámicamente las píldoras de categorías obtenidas en tiempo real.
     * @param {Array<{name: string, slug: string, color: string}>} categorias
     * @param {Function} onSelectCategory
     */
    renderizarCategorias(categorias, onSelectCategory) {
        const container = document.getElementById('map-category-filters') || this.elements.categoryFilters;
        if (!container) return;

        container.replaceChildren();

        // Botón inicial "Todos" marcado como activo por defecto
        const btnTodos = document.createElement('button');
        btnTodos.type = 'button';
        btnTodos.className = 'legend-item active';
        btnTodos.setAttribute('data-category', 'todos');
        btnTodos.setAttribute('aria-pressed', 'true');

        const dotTodos = document.createElement('span');
        dotTodos.className = 'color-dot';
        dotTodos.style.backgroundColor = '#38bdf8';

        btnTodos.append(dotTodos, document.createTextNode(' Todos'));

        btnTodos.addEventListener('click', () => {
            const allPills = container.querySelectorAll('.legend-item');
            allPills.forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-pressed', 'false');
            });
            btnTodos.classList.add('active');
            btnTodos.setAttribute('aria-pressed', 'true');
            if (typeof onSelectCategory === 'function') {
                onSelectCategory('todos');
            }
        });

        container.appendChild(btnTodos);

        // Renderizar píldoras para cada categoría real
        categorias.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'legend-item';
            btn.setAttribute('data-category', cat.name);
            btn.setAttribute('aria-pressed', 'false');

            const dot = document.createElement('span');
            dot.className = 'color-dot';
            dot.style.backgroundColor = cat.color || '#38bdf8';

            btn.append(dot, document.createTextNode(` ${cat.name}`));

            btn.addEventListener('click', () => {
                const yaActivo = btn.classList.contains('active');
                const allPills = container.querySelectorAll('.legend-item');
                allPills.forEach(p => {
                    p.classList.remove('active');
                    p.setAttribute('aria-pressed', 'false');
                });

                if (yaActivo) {
                    // Si ya estaba activo, alternar volviendo a "Todos"
                    btnTodos.classList.add('active');
                    btnTodos.setAttribute('aria-pressed', 'true');
                    if (typeof onSelectCategory === 'function') {
                        onSelectCategory('todos');
                    }
                } else {
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                    if (typeof onSelectCategory === 'function') {
                        onSelectCategory(cat.name);
                    }
                }
            });

            container.appendChild(btn);
        });
    }
};

export function renderizarMarcadores(lugares) {
    Object.values(activeMarkers).forEach(item => item.marker.remove());
    activeMarkers = {};

    lugares.forEach(lugar => {
        // Color dinámico que viene de la tabla 'categories' de la BD
        const color = lugar.color || '#FF6B6B';

        const marker = new mapboxgl.Marker({ color })
            .setLngLat(lugar.coords)
            .addTo(map);

        marker.getElement().addEventListener('mouseenter', () => {
            hoverPopup.setLngLat(lugar.coords)
                .setText(lugar.name || '')
                .addTo(map);
        });

        marker.getElement().addEventListener('mouseleave', () => {
            hoverPopup.remove();
        });

        marker.getElement().addEventListener('click', () => {
            openPopupAndFly(lugar, color);
        });

        activeMarkers[lugar.id] = { marker, lugar, color };
    });
}

/**
 * Filtra de manera interactiva los marcadores de Mapbox en base a la categoría seleccionada.
 * Si se selecciona "todos", muestra el 100% de los marcadores.
 * @param {string} categoria
 */
export function filtrarMarcadores(categoria) {
    const esTodos = !categoria || categoria.toLowerCase() === 'todos' || categoria.toLowerCase() === 'todas';

    Object.values(activeMarkers).forEach(({ marker, lugar }) => {
        const visible = esTodos ||
            coincideCategoria(lugar.category, categoria) ||
            coincideCategoria(lugar.category_slug, categoria);

        const el = marker.getElement();
        if (el) {
            el.style.display = visible ? '' : 'none';
        }
    });
}

export function openPopupAndFly(lugar, colorHex) {
    // Asegurar que el marcador sea visible si estaba oculto por filtro
    if (lugar?.id && activeMarkers[lugar.id]?.marker) {
        const el = activeMarkers[lugar.id].marker.getElement();
        if (el) el.style.display = '';
    }

    map.flyTo({
        center: lugar.coords,
        zoom: 15,
        essential: true,
        duration: 2000
    });

    const sidebar = document.getElementById('info-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');

    if (sidebar && sidebarContent) {
        sidebar.classList.remove('hidden');

        const color = colorHex || '#FF6B6B';

        // --- Calificación promedio (columna score de public.ratings) ---
        const infoRating = calcularPromedioRating(lugar.ratings);
        const hayRating = infoRating.tieneCalificaciones;
        const ratingTexto = hayRating ? infoRating.texto : 'Sin calificaciones aún';
        // --- Horarios (columna opening_days de public.places) ---
        const horarios = lugar.opening_days && lugar.opening_days.trim().length > 0
            ? lugar.opening_days.trim()
            : 'Consultar disponibilidad';
        const image = document.createElement('img');
        image.className = 'sidebar-image';
        image.src = lugar.image_url || '';
        image.alt = lugar.name || 'Sitio turístico';

        const details = document.createElement('div');
        details.className = 'sidebar-details';
        const category = document.createElement('span');
        category.className = 'sidebar-category';
        category.style.color = color;
        category.textContent = lugar.category || 'Turismo';
        const title = document.createElement('h3');
        title.className = 'sidebar-title place-title info-sidebar-title';
        title.textContent = lugar.name || 'Sitio turístico';
        const description = document.createElement('p');
        description.className = 'sidebar-description place-description info-sidebar-desc';
        description.textContent = lugar.description || '';

        const rating = document.createElement('div');
        rating.className = 'sidebar-rating info-sidebar-rating';
        rating.style.cssText = 'display:flex;align-items:center;gap:6px;margin:8px 0;';
        const stars = document.createElement('span');
        stars.style.cssText = 'display:flex;gap:2px;align-items:center;';
        if (hayRating) stars.appendChild(crearEstrellas(infoRating.promedio));
        const ratingLabel = document.createElement('span');
        ratingLabel.className = 'rating-text info-sidebar-rating rating-score';
        ratingLabel.style.cssText = 'font-size:0.85rem;font-weight:600;';
        ratingLabel.textContent = ratingTexto;
        rating.append(stars, ratingLabel);
        if (hayRating) {
            const count = document.createElement('span');
            count.className = 'rating-score info-sidebar-rating';
            count.style.cssText = 'font-size:0.75rem;';
            count.textContent = `(${infoRating.total} reseña${infoRating.total !== 1 ? 's' : ''})`;
            rating.appendChild(count);
        }

        const hours = document.createElement('div');
        hours.className = 'sidebar-hours opening-days info-sidebar-days';
        hours.style.cssText = 'display:flex;align-items:center;gap:6px;margin:4px 0 12px;font-size:0.8rem;';
        const hoursLabel = document.createElement('span');
        hoursLabel.className = 'info-sidebar-days days-badge';
        hoursLabel.textContent = horarios;
        hours.appendChild(hoursLabel);

        const link = document.createElement('a');
        link.className = 'sidebar-btn-more';
        link.textContent = 'Ver más información';
        link.href = `detalle-lugar.html?id=${encodeURIComponent(lugar.id || '')}`;

        details.append(category, title, description, rating, hours, link);
        sidebarContent.replaceChildren(image, details);
    }
}
