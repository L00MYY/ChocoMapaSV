import { MAPBOX_TOKEN } from './config.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

// 1. Export map instance to use it elsewhere
export const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11', // Cleaner style to make UI pop
    center: [-89.5597, 13.9941], // Center on Santa Ana city
    zoom: 13, 
    pitch: 45, 
    bearing: -17.6
});

const nav = new mapboxgl.NavigationControl({
    visualizePitch: true 
});
map.addControl(nav, 'bottom-right');

let activeMarkers = {}; // Object mapping id to { marker, popup }

export function renderizarMarcadores(lugares) {
    // Clear old markers if any
    Object.values(activeMarkers).forEach(item => item.marker.remove());
    activeMarkers = {};

    lugares.forEach(lugar => {
        // Choose color based on category
        let color = '#FF6B6B'; // default
        if (lugar.category === 'Sitios Históricos') color = '#4ECDC4';
        if (lugar.category === 'Restaurantes') color = '#FFA07A';
        if (lugar.category === 'Miradores') color = '#88D49E';
        if (lugar.category === 'Tours') color = '#FFD166';

        // Create Popup HTML content
        const popupHTML = `
            <div class="popup-container">
                <img src="${lugar.image}" alt="${lugar.name}" class="popup-image">
                <div class="popup-details">
                    <span class="popup-category">${lugar.category}</span>
                    <h3 class="popup-title">${lugar.name}</h3>
                    <p class="popup-description">${lugar.description}</p>
                    ${lugar.discount ? `<div class="popup-discount">🏷️ ${lugar.discount}</div>` : ''}
                </div>
            </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(popupHTML);

        const marker = new mapboxgl.Marker({ color })
            .setLngLat(lugar.coords)
            .setPopup(popup) // Bind popup to marker
            .addTo(map);

        // Store reference so we can programmatically open the popup
        activeMarkers[lugar.id] = { marker, popup };
    });
}

export function openPopupAndFly(lugar) {
    // Fly map to marker
    map.flyTo({
        center: lugar.coords,
        zoom: 15, // zoom in
        essential: true,
        duration: 2000 // smooth animation 2 seconds
    });

    // Close any other open popups
    Object.values(activeMarkers).forEach(item => {
        if (item.popup.isOpen()) {
            item.popup.remove();
        }
    });

    // Open target popup
    const target = activeMarkers[lugar.id];
    if (target) {
        // We need a slight timeout to wait for flyTo to start, otherwise it can look glitchy
        setTimeout(() => {
            target.marker.togglePopup();
        }, 100);
    }
}