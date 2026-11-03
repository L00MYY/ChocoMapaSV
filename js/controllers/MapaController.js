/**
 * @file MapaController.js
 * @description Controlador para el mapa interactivo geográfico de El Salvador.
 * Rol en el MVC: Controlador (Controller). Orquesta la carga de marcadores geográficos desde MapaModel,
 * escucha las interacciones de búsqueda y selección del usuario y actualiza la visualización cartográfica en MapaView.
 */

import { MapaModel } from '../models/MapaModel.js';
import { MapaView, map, openPopupAndFly, renderizarMarcadores } from '../views/MapaView.js';

/**
 * Controlador del mapa interactivo de atractivos turísticos.
 * @namespace MapaController
 */
export const MapaController = {
    /**
     * Inicializa los eventos del mapa, la búsqueda interactiva y el panel lateral de información.
     * @function init
     * @returns {void}
     */
    init() {
        const { searchInput, searchResults, closeSidebar, sidebar } = MapaView.elements;

        // Carga inicial asíncrona de sitios turísticos desde Supabase al completarse la carga de Mapbox
        map.on('load', async () => {
            try {
                const lugares = await MapaModel.cargarLugares();
                if (lugares.length > 0) renderizarMarcadores(lugares);
                else console.warn('La base de datos de Supabase está vacía o no retornó lugares.');
            } catch (error) {
                console.error('No se pudieron cargar los lugares del mapa:', error);
            }
        });

        // Forzar redibujado de Mapbox en resize de ventana
        window.addEventListener('resize', () => {
            if (map) map.resize();
        });

        // Búsqueda en tiempo real con sugerencias y animación de cámara hacia el destino seleccionado
        searchInput?.addEventListener('input', event => {
            const termino = event.target.value.trim();
            MapaView.renderizarResultados(MapaModel.buscarLugares(termino), lugar => {
                openPopupAndFly(lugar, lugar.color);
                searchInput.value = lugar.name || '';
                MapaView.ocultarResultados();
            });
        });

        document.addEventListener('click', event => {
            if (!searchInput?.contains(event.target) && !searchResults?.contains(event.target)) {
                MapaView.ocultarResultados();
            }
        });

        closeSidebar?.addEventListener('click', () => sidebar?.classList.add('hidden'));
    }
};

// Inicialización inmediata del controlador
MapaController.init();