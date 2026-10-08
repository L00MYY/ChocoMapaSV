// js/map.js
import { MAPBOX_TOKEN } from './config.js';

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

// Si cambia el tamaño de la ventana, recalcula el zoom mínimo
map.on('resize', fijarZoomMinimo);

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
                      .setHTML(`<span>${lugar.name}</span>`)
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

export function openPopupAndFly(lugar, colorHex) {
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

        sidebarContent.innerHTML = `
            <img src="${lugar.image_url}" alt="${lugar.name}" class="sidebar-image">
            <div class="sidebar-details">
                <span class="sidebar-category" style="color: ${color};">${lugar.category}</span>
                <h3 class="sidebar-title">${lugar.name}</h3>
                <p class="sidebar-description">${lugar.description}</p>
            </div>
        `;
    }
}