// js/map.js
import { MAPBOX_TOKEN } from './config.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

// Se mantienen los límites estáticos. (Aunque tienes la tabla map_settings, es mejor 
// mantener esto en el JS para que el mapa cargue instantáneamente sin esperar a la BD).
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
        // Asignamos el color dinámico que viene de la tabla 'categories' de tu BD
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

        // Actualizamos lugar.image por lugar.image_url según tu nueva BD
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