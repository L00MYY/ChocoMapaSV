/**
 * @file MapaController.js
 * @description Controlador para el mapa interactivo geográfico de El Salvador.
 * Rol en el MVC: Controlador (Controller). Orquesta la carga de marcadores geográficos desde MapaModel,
 * escucha las interacciones de búsqueda y selección del usuario y actualiza la visualización cartográfica en MapaView.
 */

import { MapaModel } from '../models/MapaModel.js';
import { MapaView, map, openPopupAndFly, renderizarMarcadores, filtrarMarcadores } from '../views/MapaView.js';

/**
 * @namespace MapaController
 * @description Controlador para el mapa interactivo de sitios turísticos (MITUR).
 * Orquesta la carga de marcadores georreferenciados, filtrado por categorías y búsqueda predictiva.
 */
export const MapaController = {
    /**
     * @type {string}
     * @description Identificador o slug de la categoría turística activa en el filtro del mapa.
     */
    categoriaActiva: 'todos',

    /**
     * @description Inicializa la carga del mapa Mapbox, suscripción a eventos de filtrado y búsqueda.
     * @returns {void}
     */
    init() {
        const { searchInput, searchResults, closeSidebar, sidebar } = MapaView.elements;

        // Carga inicial asíncrona de sitios turísticos desde Supabase al completarse la carga de Mapbox
        map.on('load', async () => {
            try {
                const lugares = await MapaModel.cargarLugares();
                if (lugares.length > 0) {
                    renderizarMarcadores(lugares);
                    const categorias = MapaModel.extraerCategorias(lugares);
                    MapaView.renderizarCategorias(categorias, (categoria) => {
                        this.categoriaActiva = categoria;
                        filtrarMarcadores(categoria);
                    });
                } else {
                    console.warn('La base de datos de Supabase está vacía o no retornó lugares.');
                }
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

MapaController.init();
