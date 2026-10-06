// js/map.js

// 1. Importamos la llave segura desde el archivo de configuración
import { MAPBOX_TOKEN } from './config.js';

// 2. Asignamos la llave a Mapbox
mapboxgl.accessToken = MAPBOX_TOKEN;

// 3. Inicializamos el mapa con opciones limpias
const map = new mapboxgl.Map({
    container: 'map', // El ID del div en el HTML
    style: 'mapbox://styles/mapbox/outdoors-v12', // Estilo 'outdoors' ideal para turismo (montañas, ríos)
    center: [-88.8965, 13.7942], // Coordenadas del centro de El Salvador [Longitud, Latitud]
    zoom: 8, // Nivel de acercamiento inicial
    pitch: 45, // Ángulo de inclinación (3D) para darle un toque más interactivo
    bearing: -17.6 // Rotación inicial de la cámara
});

// 4. Agregar Controles de Navegación (Zoom in/out y brújula)
// Posición: 'top-right' (arriba a la derecha), 'top-left', 'bottom-right', 'bottom-left'
const nav = new mapboxgl.NavigationControl({
    visualizePitch: true // Permite que la brújula muestre el ángulo 3D al interactuar
});
map.addControl(nav, 'bottom-right');

// 5. (Opcional) Agregar Control de Escala (Muestra la distancia en Km/Millas en la esquina inferior izquierda)
const scale = new mapboxgl.ScaleControl({
    maxWidth: 150,
    unit: 'metric' // Usa sistema métrico (kilómetros y metros)
});
map.addControl(scale, 'bottom-left');


// --- Variables y funciones para gestionar los marcadores turísticos ---

let marcadoresActivos = [];

/**
 * Función para recibir la lista de lugares y colocarlos en el mapa con Mapbox
 * @param {Array} lugares - Lista de objetos (de JSON o Firebase)
 * @param {Function} onSelectLugar - Función que se ejecuta al hacer clic en el pin
 */
export function renderizarMarcadores(lugares, onSelectLugar) {
    // Eliminar marcadores anteriores si se actualiza la lista
    marcadoresActivos.forEach(marker => marker.remove());
    marcadoresActivos = [];

    lugares.forEach(lugar => {
        // Se crea el pin por defecto de Mapbox (puedes personalizar el color aquí)
        const marker = new mapboxgl.Marker({
            color: '#007BFF', // Color azul turismo (puedes cambiarlo al color de tu diseño)
        })
            .setLngLat([lugar.lng, lugar.lat])
            .addTo(map);

        // Evento: qué sucede al hacer clic sobre el pin de un lugar turístico
        marker.getElement().addEventListener('click', () => {
            // Animación suave de la cámara hacia el lugar seleccionado
            map.flyTo({
                center: [lugar.lng, lugar.lat],
                zoom: 13, // Nos acercamos un poco al lugar
                essential: true // Asegura que la animación suceda
            });

            // Llamamos a la función que mostrará la tarjeta en pantalla
            if (onSelectLugar) {
                onSelectLugar(lugar);
            }
        });

        // Guardamos el marcador en el arreglo para futuras limpiezas
        marcadoresActivos.push(marker);
    });
}