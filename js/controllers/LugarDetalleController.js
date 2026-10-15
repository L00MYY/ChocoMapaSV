import { LugarDetalleModel } from '../models/LugarDetalleModel.js';
import { LugarDetalleView } from '../views/LugarDetalleView.js';

const DEFAULT_FALLBACK_ID = '9506d663-3b09-4430-860d-dbb336c18295';

export const LugarDetalleController = {
    async init() {
        const { returnButton, dateFilter, clearDate } = LugarDetalleView.elements;
        returnButton?.addEventListener('click', event => {
            event.preventDefault();
            window.location.href = document.referrer.includes('lugares-turisticos.html')
                ? 'lugares-turisticos.html'
                : 'mapa.html';
        });

        LugarDetalleView.mostrarEstado('loading');
        const id = new URLSearchParams(window.location.search).get('id')?.trim() || DEFAULT_FALLBACK_ID;
        const lugar = await LugarDetalleModel.obtenerPorId(id);
        if (!lugar) {
            LugarDetalleView.mostrarEstado('error', 'El sitio turístico solicitado no existe o no se encuentra registrado en el sistema del Ministerio de Turismo.');
            return;
        }

        LugarDetalleView.renderizarLugar(lugar);
        LugarDetalleView.mostrarEstado('content');
        let tours = [];
        try {
            tours = await Promise.race([
                LugarDetalleModel.obtenerTours(lugar.id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), 6000))
            ]);
        } catch (error) {
            console.warn('Error al cargar tours del sitio:', error);
        }

        const renderTours = () => LugarDetalleView.renderizarTours(tours, dateFilter?.value.trim() || '', idTour => {
            window.location.href = `tour-detalle.html?id=${encodeURIComponent(idTour)}`;
        });
        dateFilter?.addEventListener('change', renderTours);
        clearDate?.addEventListener('click', () => {
            if (dateFilter) dateFilter.value = '';
            renderTours();
        });
        renderTours();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LugarDetalleController.init(), { once: true });
} else {
    LugarDetalleController.init();
}