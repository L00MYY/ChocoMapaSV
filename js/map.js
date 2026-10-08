// js/map.js
import { MAPBOX_TOKEN } from './config.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

const limitesElSalvador = [
    [-90.25, 13.10], 
    [-87.65, 14.50]  
];

export const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11', 
    center: [-88.8965, 13.7942], 
    zoom: 8, 
    maxBounds: limitesElSalvador, 
});

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

// Configurar evento del botón cerrar una sola vez
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('info-sidebar');
    
    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            // Oculta la tarjeta al hacer clic en la X
            sidebar.classList.add('hidden');
        });
    }
});

export function renderizarMarcadores(lugares) {
    Object.values(activeMarkers).forEach(item => item.marker.remove());
    activeMarkers = {};

    lugares.forEach(lugar => {
        let color = '#FF6B6B'; 
        if (lugar.category === 'Sitios Históricos') color = '#4ECDC4';
        if (lugar.category === 'Restaurantes') color = '#FFA07A';
        if (lugar.category === 'Miradores') color = '#88D49E';
        if (lugar.category === 'Tours') color = '#FFD166';

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

        // Inyectamos los datos SOLO en el contenedor de contenido, protegiendo el botón cerrar
        sidebarContent.innerHTML = `
            <img src="${lugar.image}" alt="${lugar.name}" class="sidebar-image">
            <div class="sidebar-details">
                <span class="sidebar-category" style="color: ${color};">${lugar.category}</span>
                <h3 class="sidebar-title">${lugar.name}</h3>
                <p class="sidebar-description">${lugar.description}</p>
            </div>
        `;
    }
}