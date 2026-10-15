import { MapaModel } from '../models/MapaModel.js';
import { MapaView, map, openPopupAndFly, renderizarMarcadores } from '../views/MapaView.js';

export const MapaController = {
    init() {
        const { searchInput, searchResults, closeSidebar, sidebar } = MapaView.elements;

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