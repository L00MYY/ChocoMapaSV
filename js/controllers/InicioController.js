import { obtenerLugaresTuristicos } from '../models/SupabaseClient.js';
import { obtenerToursActivos, TOURS_DEMO } from '../models/ToursModel.js';
import { calcularPromedioRating } from '../models/CalificacionesModel.js';
import { InicioView } from '../views/InicioView.js';

/**
 * Catálogo de respaldo para destinos turísticos cuando no hay conexión
 * a Supabase o la red está inaccesible (Modo Offline 100% resiliente).
 */
const DESTINOS_RESPALDO = [
    {
        id: '236c0fa7-2ae1-4fb5-a504-8f35e63105cf',
        name: 'Biblioteca Nacional (BINAES)',
        department: 'San Salvador',
        category: 'Sitios históricos',
        color: '#73C6B6',
        image_url: 'https://lh3.googleusercontent.com/d/1pNfmL_rSHxv01_sqwCv5MTU9UP_PPXBb',
        description: 'Vanguardista centro de conocimiento, tecnología y cultura en el corazón del Centro Histórico de la capital salvadoreña.',
        ratings: [{ score: 5 }, { score: 5 }, { score: 5 }, { score: 4 }]
    },
    {
        id: 'd5000000-0000-0000-0000-000000000005',
        name: 'Volcán de Santa Ana (Ilamatepec)',
        department: 'Santa Ana',
        category: 'Miradores',
        color: '#A9DFBF',
        image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
        description: 'El volcán más alto de El Salvador con su impresionante laguna cratérica de color verde esmeralda brillante.',
        ratings: [{ score: 5 }, { score: 5 }, { score: 5 }, { score: 5 }, { score: 5 }]
    },
    {
        id: 'd6000000-0000-0000-0000-000000000006',
        name: 'Surf City - Playa El Tunco',
        department: 'La Libertad',
        category: 'Tours',
        color: '#F7DC6F',
        image_url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1000&q=80',
        description: 'Epicentro del surf internacional en El Salvador, famosa por sus formaciones rocosas y vibrante vida turística.',
        ratings: [{ score: 5 }, { score: 5 }, { score: 4 }, { score: 5 }]
    },
    {
        id: 'd7000000-0000-0000-0000-000000000007',
        name: 'Parque Arqueológico Tazumal',
        department: 'Santa Ana',
        category: 'Sitios históricos',
        color: '#73C6B6',
        image_url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1000&q=80',
        description: 'El asentamiento maya más importante de El Salvador con su monumental basamento piramidal de 24 metros de altura.',
        ratings: [{ score: 5 }, { score: 5 }, { score: 4 }, { score: 5 }]
    },
    {
        id: '9b1d17db-0467-4372-8ed3-9f4ec84116f1',
        name: 'Laguna de Apastepeque',
        department: 'San Vicente',
        category: 'Miradores',
        color: '#A9DFBF',
        image_url: 'https://lh3.googleusercontent.com/d/1FjMwSMq1ktqF4fgzN9aivDVaAej7_pFb',
        description: 'Hermoso espejo de agua de origen volcánico rodeado de frondosa vegetación, muelles flotantes y pesca deportiva.',
        ratings: [{ score: 5 }, { score: 5 }, { score: 4 }]
    },
    {
        id: '1691705a-ab71-4546-bacb-9455f89729ac',
        name: 'Parque Recreativo Amapulapa',
        department: 'San Vicente',
        category: 'Restaurantes',
        color: '#E59866',
        image_url: 'https://lh3.googleusercontent.com/d/1UA8Jw0OTgJwmSGJnzPGJ_DXT-9Jy7Uwm',
        description: 'Nacimientos de agua cristalina, piscinas naturales familiares y exuberante vegetación tropical.',
        ratings: [{ score: 5 }, { score: 4 }, { score: 5 }, { score: 5 }]
    },
    {
        id: 'd8000000-0000-0000-0000-000000000008',
        name: 'Suchitoto Colonial & Lago Suchitlán',
        department: 'Cuscatlán',
        category: 'Sitios históricos',
        color: '#73C6B6',
        image_url: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1000&q=80',
        description: 'La capital cultural de El Salvador, con arquitectura colonial española preservada, galerías y paseos en lancha.',
        ratings: [{ score: 5 }, { score: 5 }, { score: 5 }, { score: 4 }]
    },
    {
        id: '9506d663-3b09-4430-860d-dbb336c18295',
        name: 'Parque Recreativo Altos de la Cueva',
        department: 'San Miguel',
        category: 'Miradores',
        color: '#A9DFBF',
        image_url: 'https://lh3.googleusercontent.com/d/1ik9s0NdKmAzLWriuTyVafM0HP_yuvbF7',
        description: 'Senderos ecológicos, miradores panorámicos hacia el valle y áreas de recreación para toda la familia.',
        ratings: [{ score: 4 }, { score: 5 }, { score: 4 }]
    }
];

export const InicioController = {
    async init() {
        // 1. Inicializar interactividad de la vista
        InicioView.inicializarBuscador((termino) => {
            if (termino && termino.length > 0) {
                window.location.href = `lugares-turisticos.html?q=${encodeURIComponent(termino)}`;
            } else {
                window.location.href = 'lugares-turisticos.html';
            }
        });

        InicioView.inicializarCarrusel();
        InicioView.mostrarCargandoTours();
        InicioView.mostrarCargandoDestinos();

        // 2. Consulta concurrente resiliente a fuentes de datos
        try {
            const [lugaresResult, toursResult] = await Promise.allSettled([
                obtenerLugaresTuristicos(),
                obtenerToursActivos()
            ]);

            // Procesar Lugares
            let lugares = [];
            if (lugaresResult.status === 'fulfilled' && Array.isArray(lugaresResult.value) && lugaresResult.value.length > 0) {
                lugares = lugaresResult.value;
            } else {
                lugares = DESTINOS_RESPALDO;
            }

            // Actualizar contador total de destinos oficiales en el Hero
            InicioView.actualizarTotalLugares(lugares.length);

            // Ordenar por calificación más alta y cantidad de reseñas
            const lugaresOrdenados = [...lugares].sort((a, b) => {
                const infoA = calcularPromedioRating(a.ratings);
                const infoB = calcularPromedioRating(b.ratings);
                if (infoB.promedio !== infoA.promedio) {
                    return infoB.promedio - infoA.promedio;
                }
                return infoB.total - infoA.total;
            });

            InicioView.renderizarDestinosImperdibles(lugaresOrdenados);

            // Procesar Tours
            let tours = [];
            if (toursResult.status === 'fulfilled' && Array.isArray(toursResult.value) && toursResult.value.length > 0) {
                tours = toursResult.value;
            } else {
                tours = TOURS_DEMO;
            }

            InicioView.renderizarTours(tours);

        } catch (error) {
            console.warn('Recurriendo a catálogo de respaldo por fallo general:', error);
            InicioView.actualizarTotalLugares(DESTINOS_RESPALDO.length);
            InicioView.renderizarDestinosImperdibles(DESTINOS_RESPALDO);
            InicioView.renderizarTours(TOURS_DEMO);
        }
    }
};

// Auto-inicialización según el estado del documento DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => InicioController.init(), { once: true });
} else {
    InicioController.init();
}
