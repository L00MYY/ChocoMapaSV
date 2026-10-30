// Modelo y acceso a datos para tours y reservas (MITUR SV)
import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { AuthModel } from './AuthModel.js';

// Decodificamos en memoria al momento de ejecutar el código
const SUPABASE_URL = atob(SUPABASE_URL_B64);
const SUPABASE_ANON_KEY = atob(SUPABASE_ANON_KEY_B64);

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

/**
 * Catálogo de tours de demostración con destinos oficiales reales de El Salvador
 * Se utiliza únicamente como respaldo cuando la tabla 'tours' en Supabase está vacía (0 registros),
 * permitiendo pruebas completas e interacción inmediata. En cuanto existan registros en Supabase,
 * estos tienen prioridad absoluta.
 */

export const TOURS_DEMO = [
    {
        id: 'a1000000-0000-0000-0000-000000000001',
        name: 'Ruta de la Historia & Joyas del Centro',
        short_description: 'Recorrido guiado por el Centro Histórico de San Salvador, BINAES y sitios emblemáticos de la capital.',
        full_description: 'Sumérgete en el corazón cultural e histórico de El Salvador. Este paquete integral guiado por expertos te lleva a través de los monumentos más representativos del Centro Histórico de San Salvador, visitando la moderna Biblioteca Nacional (BINAES), la Catedral Metropolitana y el Palacio Nacional. Incluye degustación gastronómica tradicional y acceso prioritario a todas las instalaciones.',
        image_url: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80',
        guide_name: 'Carlos Rivas (Guía Oficial MITUR)',
        department: 'San Salvador',
        departure_time: '08:30:00',
        price: 35.00,
        has_offer: true,
        discount_percentage: 20,
        final_price: 28.00,
        is_active: true,
        tour_dates: [
            { id: 'd1000001', departure_date: '2026-10-18', available_spots: 12 },
            { id: 'd1000002', departure_date: '2026-10-25', available_spots: 8 },
            { id: 'd1000003', departure_date: '2026-11-01', available_spots: 10 }
        ],
        tour_places: [
            {
                tour_id: 'a1000000-0000-0000-0000-000000000001',
                place_id: '236c0fa7-2ae1-4fb5-a504-8f35e63105cf',
                visit_order: 1,
                places: {
                    id: '236c0fa7-2ae1-4fb5-a504-8f35e63105cf',
                    name: 'Biblioteca Nacional (BINAES)',
                    department: 'San Salvador',
                    image_url: 'https://lh3.googleusercontent.com/d/1pNfmL_rSHxv01_sqwCv5MTU9UP_PPXBb',
                    short_description: 'Centro de conocimiento y cultura moderno en el corazón de la capital salvadoreña.'
                }
            },
            {
                tour_id: 'a1000000-0000-0000-0000-000000000001',
                place_id: '9506d663-3b09-4430-860d-dbb336c18295',
                visit_order: 2,
                places: {
                    id: '9506d663-3b09-4430-860d-dbb336c18295',
                    name: 'Parque Recreativo Altos de la Cueva',
                    department: 'San Miguel',
                    image_url: 'https://lh3.googleusercontent.com/d/1ik9s0NdKmAzLWriuTyVafM0HP_yuvbF7',
                    short_description: 'Senderos naturales y áreas de esparcimiento familiar.'
                }
            },
            {
                tour_id: 'a1000000-0000-0000-0000-000000000001',
                place_id: '1691705a-ab71-4546-bacb-9455f89729ac',
                visit_order: 3,
                places: {
                    id: '1691705a-ab71-4546-bacb-9455f89729ac',
                    name: 'Parque Recreativo Amapulapa',
                    department: 'San Vicente',
                    image_url: 'https://lh3.googleusercontent.com/d/1UA8Jw0OTgJwmSGJnzPGJ_DXT-9Jy7Uwm',
                    short_description: 'Nacimientos de agua cristalina y piscinas naturales.'
                }
            }
        ],
        tour_images: [
            { id: 'i1', image_url: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80' },
            { id: 'i2', image_url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80' },
            { id: 'i3', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' }
        ]
    },
    {
        id: 'a2000000-0000-0000-0000-000000000002',
        name: 'Aventura en Aguas Termales y Lagunas',
        short_description: 'Exploración de la Laguna de Apastepeque y manantiales naturales de San Vicente.',
        full_description: 'Disfruta de una jornada revitalizante en los principales cuerpos de agua dulce y parques acuáticos del departamento de San Vicente. Incluye navegación guiada en la Laguna de Apastepeque, caminata ecológica por manantiales y visita al Parque Recreativo Amapulapa con almuerzo típico incluido.',
        image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        guide_name: 'Ana María Morales',
        department: 'San Vicente',
        departure_time: '07:00:00',
        price: 45.00,
        has_offer: false,
        discount_percentage: 0,
        final_price: 45.00,
        is_active: true,
        tour_dates: [
            { id: 'd2000001', departure_date: '2026-10-18', available_spots: 8 },
            { id: 'd2000002', departure_date: '2026-10-24', available_spots: 6 },
            { id: 'd2000003', departure_date: '2026-10-31', available_spots: 4 }
        ],
        tour_places: [
            {
                tour_id: 'a2000000-0000-0000-0000-000000000002',
                place_id: '9b1d17db-0467-4372-8ed3-9f4ec84116f1',
                visit_order: 1,
                places: {
                    id: '9b1d17db-0467-4372-8ed3-9f4ec84116f1',
                    name: 'Laguna de Apastepeque',
                    department: 'San Vicente',
                    image_url: 'https://lh3.googleusercontent.com/d/1FjMwSMq1ktqF4fgzN9aivDVaAej7_pFb',
                    short_description: 'Hermoso espejo de agua de origen volcánico rodeado de vegetación.'
                }
            },
            {
                tour_id: 'a2000000-0000-0000-0000-000000000002',
                place_id: '1691705a-ab71-4546-bacb-9455f89729ac',
                visit_order: 2,
                places: {
                    id: '1691705a-ab71-4546-bacb-9455f89729ac',
                    name: 'Parque Recreativo Amapulapa',
                    department: 'San Vicente',
                    image_url: 'https://lh3.googleusercontent.com/d/1UA8Jw0OTgJwmSGJnzPGJ_DXT-9Jy7Uwm',
                    short_description: 'Nacimientos de agua cristalina y piscinas naturales.'
                }
            },
            {
                tour_id: 'a2000000-0000-0000-0000-000000000002',
                place_id: '9506d663-3b09-4430-860d-dbb336c18295',
                visit_order: 3,
                places: {
                    id: '9506d663-3b09-4430-860d-dbb336c18295',
                    name: 'Parque Recreativo Altos de la Cueva',
                    department: 'San Miguel',
                    image_url: 'https://lh3.googleusercontent.com/d/1ik9s0NdKmAzLWriuTyVafM0HP_yuvbF7',
                    short_description: 'Senderos naturales y áreas de esparcimiento familiar.'
                }
            }
        ],
        tour_images: [
            { id: 'i4', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
            { id: 'i5', image_url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80' }
        ]
    },
    {
        id: 'a3000000-0000-0000-0000-000000000003',
        name: 'Expedición Bosque & Tradición Oriental',
        short_description: 'Visita los pulmones verdes de Ahuachapán y la riqueza natural del oriente del país.',
        full_description: 'Una expedición pensada para amantes de la naturaleza y la biodiversidad. Conoce el Bosque de Mamapán en Ahuachapán, explora flora endémica y continúa hacia los tesoros naturales del oriente salvadoreño con guías especializados en ecoturismo y fotografía de paisajes.',
        image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
        guide_name: 'Roberto Henríquez',
        department: 'Ahuachapán',
        departure_time: '06:00:00',
        price: 50.00,
        has_offer: true,
        discount_percentage: 15,
        final_price: 42.50,
        is_active: true,
        tour_dates: [
            { id: 'd3000001', departure_date: '2026-10-19', available_spots: 15 },
            { id: 'd3000002', departure_date: '2026-10-26', available_spots: 12 },
            { id: 'd3000003', departure_date: '2026-11-02', available_spots: 10 }
        ],
        tour_places: [
            {
                tour_id: 'a3000000-0000-0000-0000-000000000003',
                place_id: '55ba3abd-f67c-4a36-98a7-c5f77605f7b3',
                visit_order: 1,
                places: {
                    id: '55ba3abd-f67c-4a36-98a7-c5f77605f7b3',
                    name: 'El Bosque de Mamapán',
                    department: 'Ahuachapán',
                    image_url: 'https://lh3.googleusercontent.com/d/11pekOzG2trB897unfFZ_DGEcuCpMr2YN',
                    short_description: 'Reserva forestal y senderos ecológicos de alta montaña.'
                }
            },
            {
                tour_id: 'a3000000-0000-0000-0000-000000000003',
                place_id: '236c0fa7-2ae1-4fb5-a504-8f35e63105cf',
                visit_order: 2,
                places: {
                    id: '236c0fa7-2ae1-4fb5-a504-8f35e63105cf',
                    name: 'Biblioteca Nacional (BINAES)',
                    department: 'San Salvador',
                    image_url: 'https://lh3.googleusercontent.com/d/1pNfmL_rSHxv01_sqwCv5MTU9UP_PPXBb',
                    short_description: 'Centro de conocimiento y cultura moderno.'
                }
            },
            {
                tour_id: 'a3000000-0000-0000-0000-000000000003',
                place_id: '9b1d17db-0467-4372-8ed3-9f4ec84116f1',
                visit_order: 3,
                places: {
                    id: '9b1d17db-0467-4372-8ed3-9f4ec84116f1',
                    name: 'Laguna de Apastepeque',
                    department: 'San Vicente',
                    image_url: 'https://lh3.googleusercontent.com/d/1FjMwSMq1ktqF4fgzN9aivDVaAej7_pFb',
                    short_description: 'Hermoso espejo de agua de origen volcánico.'
                }
            }
        ],
        tour_images: [
            { id: 'i6', image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80' },
            { id: 'i7', image_url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80' }
        ]
    }
];

/**
 * Realiza una petición fetch con límite de tiempo de seguridad (6 segundos)
 * para evitar bloqueos y estados de carga infinita.
 * @param {string} url 
 * @param {Object} options 
 * @param {number} timeoutMs 
 * @returns {Promise<Response>}
 */
async function fetchConTimeout(url, options = {}, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Consulta todos los tours activos desde Supabase con sus relaciones
 * @returns {Promise<Array>} Lista de tours activos
 */
export async function obtenerToursActivos() {
    try {
        const queryParams = new URLSearchParams({
            is_active: 'eq.true',
            select: '*,tour_dates(id,departure_date,available_spots),tour_places(*,places(id,name,department,image_url,short_description)),tour_images(*)',
            order: 'name.asc'
        });

        const url = `${SUPABASE_URL}/rest/v1/tours?${queryParams.toString()}`;
        const res = await fetchConTimeout(url, { headers: HEADERS }, 6000);

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data;
            }
        }
    } catch (error) {
        console.warn('Fallo o timeout al consultar tours en Supabase, recurriendo a catálogo de respaldo:', error);
    }

    return TOURS_DEMO;
}

/**
 * Consulta un tour específico por su ID único (UUID) de forma resiliente
 * Realiza la consulta principal a tours con la relación tour_dates(id, departure_date, available_spots)
 * y las secundarias (tour_places con places, tour_dates, tour_images) con Promise.allSettled.
 * @param {string} id - Identificador UUID del tour
 * @returns {Promise<Object|null>} Registro del tour o null
 */
export async function obtenerTourPorId(id) {
    if (!id || typeof id !== 'string' || !id.trim()) return null;

    const cleanId = id.trim();

    try {
        // 1. Consulta principal a la tabla tours incluyendo tour_dates con available_spots
        const tourUrl = `${SUPABASE_URL}/rest/v1/tours?id=eq.${cleanId}&select=*,tour_dates(id,departure_date,available_spots)`;
        const resTour = await fetchConTimeout(tourUrl, { headers: HEADERS }, 6000);

        if (resTour.ok) {
            const dataTour = await resTour.json();
            if (Array.isArray(dataTour) && dataTour.length > 0) {
                const tour = dataTour[0];

                // 2. Consultas secundarias independientes con Promise.allSettled
                const placesUrl = `${SUPABASE_URL}/rest/v1/tour_places?tour_id=eq.${cleanId}&select=*,places(id,name,department,image_url,short_description)&order=visit_order.asc`;
                const datesUrl = `${SUPABASE_URL}/rest/v1/tour_dates?tour_id=eq.${cleanId}&select=id,departure_date,available_spots&order=departure_date.asc`;
                const imagesUrl = `${SUPABASE_URL}/rest/v1/tour_images?tour_id=eq.${cleanId}`;

                const [placesResult, datesResult, imagesResult] = await Promise.allSettled([
                    fetchConTimeout(placesUrl, { headers: HEADERS }, 6000).then(r => r.ok ? r.json() : []),
                    fetchConTimeout(datesUrl, { headers: HEADERS }, 6000).then(r => r.ok ? r.json() : []),
                    fetchConTimeout(imagesUrl, { headers: HEADERS }, 6000).then(r => r.ok ? r.json() : [])
                ]);

                tour.tour_places = (placesResult.status === 'fulfilled' && Array.isArray(placesResult.value))
                    ? placesResult.value
                    : [];

                if (datesResult.status === 'fulfilled' && Array.isArray(datesResult.value) && datesResult.value.length > 0) {
                    tour.tour_dates = datesResult.value;
                } else if (!Array.isArray(tour.tour_dates)) {
                    tour.tour_dates = [];
                }

                tour.tour_images = (imagesResult.status === 'fulfilled' && Array.isArray(imagesResult.value))
                    ? imagesResult.value
                    : [];

                return tour;
            }
        }
    } catch (error) {
        console.warn('Error o timeout al consultar tour por ID en Supabase:', error);
    }

    // 3. Fallback en memoria si coincide con el catálogo de demostración
    const demoTour = TOURS_DEMO.find(t => t.id === cleanId);
    if (demoTour) {
        return demoTour;
    }

    return null;
}

/**
 * Consulta los tours activos que incluyen un lugar turístico determinado (CP-013)
 * @param {string} placeId - Identificador del sitio turístico
 * @returns {Promise<Array>} Lista de tours asociados
 */
export async function obtenerToursPorLugar(placeId) {
    if (!placeId) return [];

    try {
        const queryParams = new URLSearchParams({
            place_id: `eq.${placeId}`,
            select: 'tour_id,visit_order,tours(*,tour_dates(id,departure_date,available_spots),tour_places(*,places(id,name,department,image_url,short_description)),tour_images(*))'
        });

        const url = `${SUPABASE_URL}/rest/v1/tour_places?${queryParams.toString()}`;
        const res = await fetchConTimeout(url, { headers: HEADERS }, 6000);

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const toursValidos = [];
                const ids = new Set();
                data.forEach(item => {
                    const tour = item.tours;
                    if (tour && tour.is_active && !ids.has(tour.id)) {
                        ids.add(tour.id);
                        toursValidos.push(tour);
                    }
                });
                if (toursValidos.length > 0) {
                    return toursValidos;
                }
            }
        }
    } catch (error) {
        console.warn('Error o timeout al consultar tours por lugar en Supabase:', error);
    }

    // Fallback a los tours de demostración que incluyen este lugar
    return TOURS_DEMO.filter(t =>
        t.is_active && t.tour_places && t.tour_places.some(tp => tp.place_id === placeId)
    );
}

/**
 * Consulta la lista de lugares turísticos para poblar el selector de filtro
 * @returns {Promise<Array>} Lista de lugares con { id, name, department }
 */
export async function obtenerLugaresParaFiltro() {
    try {
        const queryParams = new URLSearchParams({
            is_active: 'eq.true',
            select: 'id,name,department',
            order: 'name.asc'
        });

        const url = `${SUPABASE_URL}/rest/v1/places?${queryParams.toString()}`;
        const res = await fetchConTimeout(url, { headers: HEADERS }, 6000);

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data;
            }
        }
    } catch (error) {
        console.warn('Error o timeout al consultar lugares para filtro:', error);
    }

    // Lugares extraídos de los tours de respaldo
    const lugaresMap = new Map();
    TOURS_DEMO.forEach(t => {
        (t.tour_places || []).forEach(tp => {
            if (tp.places && !lugaresMap.has(tp.places.id)) {
                lugaresMap.set(tp.places.id, tp.places);
            }
        });
    });
    return Array.from(lugaresMap.values());
}

/**
 * Inserta una nueva reserva en la tabla tour_reservations de Supabase
 * @param {Object} datosReserva - Datos de la reserva a registrar
 * @returns {Promise<{ ok: boolean, data?: Object }>}
 * @throws {Error} Si la petición a Supabase falla
 */
export async function crearReservaTour(datosReserva) {
    const sesion = await AuthModel.obtenerSesionActual();
    if (!sesion || !sesion.user) {
        throw new Error('Debes iniciar sesión para realizar una reserva');
    }

    const tourDateId = datosReserva.tourDateId || datosReserva.tour_date_id;
    if (!tourDateId) {
        throw new Error('Debes seleccionar una fecha de salida válida');
    }

    const chars = '0123456789ABCDEF';
    let code = 'CM-';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    const payload = {
        tour_id: datosReserva.tourId || datosReserva.tour_id,
        tour_date_id: tourDateId,
        tour_date: datosReserva.tourDate || datosReserva.tour_date,
        tourist_id: sesion.user.id,
        tourist_name: (datosReserva.nombre || datosReserva.tourist_name || '').trim(),
        tourist_email: (datosReserva.email || datosReserva.tourist_email || '').trim(),
        tourist_phone: (datosReserva.telefono || datosReserva.tourist_phone || '').trim(),
        spots_reserved: Number(datosReserva.cuposReservados ?? datosReserva.spots_reserved),
        reservation_code: datosReserva.reservation_code || datosReserva.codigo || code,
        status: datosReserva.status || 'pendiente_pago',
        total_amount: Number(datosReserva.total_amount ?? datosReserva.totalAmount) || null,
        expires_at: datosReserva.expires_at || new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };

    delete payload.available_spots;

    const url = `${SUPABASE_URL}/rest/v1/tour_reservations`;
    const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${sesion.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (!respuesta.ok) {
        const errorBody = await respuesta.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Error al guardar la reservación');
    }

    const data = await respuesta.json().catch(() => null);
    const resultado = Array.isArray(data) ? data[0] : (data || payload);
    return { ok: true, data: resultado };
}

/**
 * Actualiza los cupos disponibles de una fecha específica en tour_dates tras confirmar la reserva
 * @param {string} tourDateId - UUID del registro en la tabla tour_dates
 * @param {number} nuevosCuposDisponibles - Nueva cantidad de cupos disponibles
 * @returns {Promise<Object>} Datos actualizados devueltos por Supabase
 * @throws {Error} Si la actualización en Supabase falla
 */
export async function actualizarCuposTour(tourDateId, nuevosCuposDisponibles) {
    if (!tourDateId) return null;

    const sesion = await AuthModel.obtenerSesionActual();
    const token = sesion?.access_token || SUPABASE_ANON_KEY;

    const url = `${SUPABASE_URL}/rest/v1/tour_dates?id=eq.${tourDateId}`;
    const respuesta = await fetch(url, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation' // Para verificar que realmente actualizó una fila
        },
        body: JSON.stringify({
            available_spots: nuevosCuposDisponibles
        })
    });

    if (!respuesta.ok) {
        const errorBody = await respuesta.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Error al actualizar cupos en tour_dates');
    }

    const data = await respuesta.json().catch(() => null);
    return Array.isArray(data) ? data[0] : data;
}

export const actualizarCuposFecha = actualizarCuposTour;
export const obtenerPorId = obtenerTourPorId;

/**
 * Retorna la fecha actual en la zona local del usuario en formato estándar YYYY-MM-DD.
 * @returns {string} Fecha en formato 'YYYY-MM-DD'
 */
export function obtenerFechaHoyLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/**
 * Formatea un número decimal como moneda estadounidense USD (ej. $28.00)
 * @param {number|string} valor 
 * @returns {string}
 */
export function formatearMonedaUSD(valor) {
    const num = Number(valor);
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
}

/**
 * Calcula el precio final aplicando un descuento porcentual y redondeando a 2 decimales.
 * @param {number|string} precioBase 
 * @param {number|string} porcentajeDescuento 
 * @returns {number}
 */
export function calcularPrecioConDescuento(precioBase, porcentajeDescuento) {
    const p = Number(precioBase);
    const d = Number(porcentajeDescuento);
    if (isNaN(p) || p <= 0) return 0;
    if (isNaN(d) || d <= 0) return Number(p.toFixed(2));
    const finalPrice = p * (1 - d / 100);
    return Number(finalPrice.toFixed(2));
}

/**
 * Determina si una fecha de salida es pasada (o igual a la fecha de referencia).
 * En la regla de negocio de reservas, las fechas del día de hoy o anteriores no están disponibles para reserva.
 * @param {string} fechaStr 
 * @param {string} [fechaReferencia] - Fecha 'YYYY-MM-DD' de referencia (por defecto hoy local)
 * @returns {boolean}
 */
export function esFechaPasada(fechaStr, fechaReferencia) {
    if (!fechaStr) return true;
    const ref = fechaReferencia ? String(fechaReferencia).split('T')[0] : obtenerFechaHoyLocal();
    const f = String(fechaStr).split('T')[0];
    return f <= ref;
}

/**
 * Determina si una fecha de salida es futura y vigente para realizar reservaciones.
 * @param {string} fechaStr 
 * @param {string} [fechaReferencia]
 * @returns {boolean}
 */
export function esFechaVigente(fechaStr, fechaReferencia) {
    return !esFechaPasada(fechaStr, fechaReferencia);
}

/**
 * Filtra un catálogo de tours por departamento de manera insensible a mayúsculas y espacios.
 * @param {Array<Object>} tours 
 * @param {string} departamento 
 * @returns {Array<Object>}
 */
export function filtrarPorDepartamento(tours, departamento) {
    if (!Array.isArray(tours)) return [];
    if (!departamento || !departamento.trim() || departamento === 'todos') return tours;
    const deptoNorm = departamento.trim().toLowerCase();
    return tours.filter(t => (t.department || '').trim().toLowerCase() === deptoNorm);
}

/**
 * Filtra un catálogo de tours por condición de oferta ('oferta' vs 'sin_oferta').
 * @param {Array<Object>} tours 
 * @param {string} condicionOferta 
 * @returns {Array<Object>}
 */
export function filtrarPorOferta(tours, condicionOferta) {
    if (!Array.isArray(tours)) return [];
    if (!condicionOferta || condicionOferta === 'todas') return tours;
    return tours.filter(t => {
        const tieneOferta = t.has_offer === true && Number(t.discount_percentage) > 0;
        if (condicionOferta === 'oferta') return tieneOferta;
        if (condicionOferta === 'sin_oferta') return !tieneOferta;
        return true;
    });
}

/**
 * Realiza una búsqueda parcial insensible a mayúsculas por texto libre en el nombre/título del tour.
 * @param {Array<Object>} tours 
 * @param {string} textoBusqueda 
 * @returns {Array<Object>}
 */
export function buscarPorTitulo(tours, textoBusqueda) {
    if (!Array.isArray(tours)) return [];
    if (!textoBusqueda || !textoBusqueda.trim()) return tours;
    const queryNorm = textoBusqueda.trim().toLowerCase();
    return tours.filter(t => {
        const titulo = (t.name || t.title || '').trim().toLowerCase();
        return titulo.includes(queryNorm);
    });
}

/**
 * Función pura que filtra una lista de tours en base a los criterios recibidos.
 * Admite filtros: departamento, oferta, busqueda/texto, fecha, lugar.
 * 
 * @param {Array<Object>} listaTours - Array de tours a filtrar
 * @param {Object} [filtros={}] - Objeto con criterios de filtro
 * @returns {Array<Object>} Nueva lista filtrada
 */
export function filtrarCatalogoTours(listaTours, filtros = {}) {
    if (!Array.isArray(listaTours)) return [];
    const {
        fecha = '',
        departamento = '',
        oferta = '',
        lugar = '',
        busqueda = '',
        texto = ''
    } = filtros;

    let resultado = listaTours;

    if (fecha) {
        resultado = resultado.filter(tour =>
            Array.isArray(tour.tour_dates) && tour.tour_dates.some(item => {
                const f = typeof item === 'string' ? item : item.departure_date;
                return String(f).split('T')[0] === String(fecha).split('T')[0];
            })
        );
    }

    if (departamento) {
        resultado = filtrarPorDepartamento(resultado, departamento);
    }

    if (oferta) {
        resultado = filtrarPorOferta(resultado, oferta);
    }

    if (lugar) {
        resultado = resultado.filter(tour =>
            Array.isArray(tour.tour_places) && tour.tour_places.some(item =>
                item.place_id === lugar || item.places?.id === lugar
            )
        );
    }

    const termino = busqueda || texto;
    if (termino) {
        resultado = buscarPorTitulo(resultado, termino);
    }

    return resultado;
}

/**
 * Formatea una fecha YYYY-MM-DD en texto legible en español
 * @param {string} fechaStr 
 * @returns {string}
 */
export function formatearFechaLarga(fechaStr) {
    if (!fechaStr) return '';
    try {
        const partes = String(fechaStr).split('T')[0].split('-');
        if (partes.length === 3) {
            const anio = parseInt(partes[0], 10);
            const mes = parseInt(partes[1], 10) - 1;
            const dia = parseInt(partes[2], 10);
            const fecha = new Date(anio, mes, dia);
            return fecha.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        const fecha = new Date(fechaStr);
        if (!isNaN(fecha.getTime())) {
            return fecha.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    } catch (e) {
        console.warn('Error al formatear fecha:', e);
    }
    return String(fechaStr);
}

let todosLosTours = [];
let lugaresDisponibles = [];

export const ToursModel = {
    obtenerPorId,
    obtenerTourPorId,
    actualizarCuposTour,
    actualizarCuposFecha,
    crearReservaTour,
    filtrarCatalogoTours,
    setTours(tours) {
        todosLosTours = Array.isArray(tours) ? tours : [];
    },
    async cargarCatalogo() {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout de seguridad (6s) excedido al cargar catálogo')), 6000);
        });

        const [tours, lugares] = await Promise.race([
            Promise.all([obtenerToursActivos(), obtenerLugaresParaFiltro()]),
            timeoutPromise
        ]);

        todosLosTours = Array.isArray(tours) ? tours : [];
        lugaresDisponibles = Array.isArray(lugares) ? lugares : [];
        return { tours: todosLosTours, lugares: lugaresDisponibles };
    },

    getToursFiltrados(filtros = {}) {
        return filtrarCatalogoTours(todosLosTours, filtros);
    },

    getTotalTours() {
        return todosLosTours.length;
    },

    getLugaresDisponibles() {
        return lugaresDisponibles;
    }
};

