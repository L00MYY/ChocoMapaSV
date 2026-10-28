import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { AuthModel } from './AuthModel.js';

let supabaseUrl = '';
let supabaseAnonKey = '';

try {
    if (typeof SUPABASE_URL_B64 === 'string' && SUPABASE_URL_B64.length > 0) {
        supabaseUrl = atob(SUPABASE_URL_B64);
    }
    if (typeof SUPABASE_ANON_KEY_B64 === 'string' && SUPABASE_ANON_KEY_B64.length > 0) {
        supabaseAnonKey = atob(SUPABASE_ANON_KEY_B64);
    }
} catch (e) {
    // Entorno sin atob o claves vacías en tests
}

/**
 * CA-01: Calcula el promedio y total de calificaciones de una lista de ratings.
 * Función pura desacoplada sin dependencias de red ni DOM.
 * 
 * @param {Array<Object|number>} ratingsList - Lista de objetos { score } o números
 * @returns {{ promedio: number, total: number, texto: string, tieneCalificaciones: boolean }}
 */
export function calcularPromedioRating(ratingsList) {
    if (!ratingsList || !Array.isArray(ratingsList) || ratingsList.length === 0) {
        return {
            promedio: 0,
            total: 0,
            texto: 'Sin calificaciones aún',
            tieneCalificaciones: false
        };
    }

    const scores = [];
    for (const item of ratingsList) {
        let val;
        if (typeof item === 'number') {
            val = item;
        } else if (item && typeof item === 'object') {
            val = Number(item.score);
        }

        if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
            scores.push(val);
        }
    }

    if (scores.length === 0) {
        return {
            promedio: 0,
            total: 0,
            texto: 'Sin calificaciones aún',
            tieneCalificaciones: false
        };
    }

    const total = scores.length;
    const suma = scores.reduce((acc, curr) => acc + curr, 0);
    const promedio = Math.round((suma / total) * 10) / 10;

    return {
        promedio,
        total,
        texto: promedio.toFixed(1),
        tieneCalificaciones: true
    };
}

/**
 * CA-04: Valida que la puntuación enviada sea un entero estricto entre 1 y 5.
 * 
 * @param {*} score - Puntuación a validar
 * @returns {{ esValido: boolean, error?: string }}
 */
export function validarScoreRating(score) {
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
        return {
            esValido: false,
            error: 'La calificación debe ser un número entero entre 1 y 5'
        };
    }
    return {
        esValido: true
    };
}

/**
 * CA-04 y CA-05: Evalúa si un usuario tiene permitido calificar un sitio turístico.
 * Reglas de negocio:
 * 1. Usuario debe estar autenticado (sesión activa).
 * 2. Voto único / inmutabilidad: Si ya calificó, no puede enviar otra ni modificar.
 * 3. Visita confirmada: Debe existir una reserva con status 'confirmada' que incluya el placeId.
 * 
 * @param {Object} params
 * @param {Object|null} params.usuario - Datos del usuario autenticado
 * @param {Array<Object>} params.reservacionesConfirmadas - Reservas confirmadas del usuario
 * @param {string} params.placeId - Identificador del sitio turístico
 * @param {boolean} params.yaCalifico - Si el usuario ya calificó previamente este lugar
 * @returns {{ puede: boolean, razon?: string, mensaje?: string }}
 */
export function evaluarElegibilidadCalificacion(params = {}) {
    const { usuario, reservacionesConfirmadas, placeId, yaCalifico } = (params && typeof params === 'object') ? params : {};
    if (!usuario) {
        return {
            puede: false,
            razon: 'AUTH_REQUERIDA',
            mensaje: 'Debes iniciar sesión para calificar este lugar'
        };
    }

    if (yaCalifico) {
        return {
            puede: false,
            razon: 'YA_CALIFICADO',
            mensaje: 'Ya has calificado este lugar turístico'
        };
    }

    const tieneReservaValida = Array.isArray(reservacionesConfirmadas) && reservacionesConfirmadas.some(reserva => {
        if (!reserva) return false;

        // Si la reserva cuenta con campo status, debe ser estrictamente 'confirmada'
        if (reserva.status && String(reserva.status).trim().toLowerCase() !== 'confirmada') {
            return false;
        }

        // Si se provee tourist_id y usuario.id, deben coincidir
        if (reserva.tourist_id && usuario.id && reserva.tourist_id !== usuario.id) {
            return false;
        }

        // Comprobación de coincidencia con placeId
        if (reserva.place_id === placeId || reserva.placeId === placeId || reserva === placeId) {
            return true;
        }

        if (Array.isArray(reserva.place_ids) && reserva.place_ids.includes(placeId)) {
            return true;
        }

        if (Array.isArray(reserva.tour_places) && reserva.tour_places.some(tp =>
            tp === placeId || tp?.place_id === placeId || tp?.id === placeId || tp?.places?.id === placeId
        )) {
            return true;
        }

        if (Array.isArray(reserva.places) && reserva.places.some(p =>
            p === placeId || p?.id === placeId || p?.place_id === placeId
        )) {
            return true;
        }

        const tourAsociado = reserva.tours || reserva.tour;
        if (tourAsociado) {
            if (tourAsociado.place_id === placeId || tourAsociado.placeId === placeId) return true;
            if (Array.isArray(tourAsociado.place_ids) && tourAsociado.place_ids.includes(placeId)) return true;
            if (Array.isArray(tourAsociado.places) && tourAsociado.places.some(p => p === placeId || p?.id === placeId || p?.place_id === placeId)) return true;
            if (Array.isArray(tourAsociado.tour_places) && tourAsociado.tour_places.some(tp =>
                tp === placeId || tp?.place_id === placeId || tp?.id === placeId || tp?.places?.id === placeId
            )) return true;
        }

        return false;
    });

    if (!tieneReservaValida) {
        return {
            puede: false,
            razon: 'SIN_TOUR_CONFIRMADO',
            mensaje: 'Solo puedes calificar lugares turísticos incluidos en tours que hayas reservado y confirmado'
        };
    }

    return { puede: true };
}

/**
 * CA-02 y CA-03: Filtra un catálogo de lugares por calificación mínima promedio.
 * Se combina limpiamente con filtros existentes de búsqueda y categoría.
 * 
 * @param {Array<Object>} lugares - Arreglo de lugares turísticos
 * @param {number|string} minRating - Calificación mínima (ej. 4, 3, 0 o 'Todas')
 * @returns {Array<Object>} Lugares que cumplen el criterio de puntuación
 */
export function filtrarLugaresPorRating(lugares, minRating) {
    if (!Array.isArray(lugares)) return [];

    if (!minRating || minRating === 'Todas' || minRating === 'todas') {
        return [...lugares];
    }

    const minimo = Number(minRating);
    if (!Number.isFinite(minimo) || minimo <= 0) {
        return [...lugares];
    }

    return lugares.filter(lugar => {
        if (!lugar) return false;

        let promedio = 0;
        if (Array.isArray(lugar.ratings)) {
            promedio = calcularPromedioRating(lugar.ratings).promedio;
        } else if (typeof lugar.promedio === 'number') {
            promedio = lugar.promedio;
        } else if (typeof lugar.rating === 'number') {
            promedio = lugar.rating;
        } else if (typeof lugar.score === 'number') {
            promedio = lugar.score;
        }

        return promedio >= minimo;
    });
}

/**
 * Modelo con métodos integrados de acceso a datos para lugares turísticos y calificaciones
 */
export const CalificacionesModel = {
    calcularPromedioRating,
    validarScoreRating,
    evaluarElegibilidadCalificacion,
    filtrarLugaresPorRating,

    /**
     * Consulta con Supabase si el usuario actual tiene derecho a calificar el lugar especificado.
     * @param {string} placeId - UUID del lugar turístico
     * @returns {Promise<{ puede: boolean, razon?: string, mensaje?: string, yaCalifico?: boolean, calificacionPrevia?: number|null, usuario?: Object|null }>}
     */
    async verificarElegibilidad(placeId, usuarioEspecifico = undefined) {
        if (!placeId) {
            return { puede: false, razon: 'PLACE_ID_INVALIDO', mensaje: 'Identificador de lugar inválido' };
        }

        try {
            let sesion = null;
            let usuario = null;
            let token = null;

            if (usuarioEspecifico !== undefined) {
                usuario = usuarioEspecifico;
            } else {
                sesion = await AuthModel.obtenerSesionActual();
                usuario = sesion?.user || null;
                token = sesion?.access_token || null;
            }

            if (!usuario) {
                return {
                    ...evaluarElegibilidadCalificacion({ usuario: null }),
                    yaCalifico: false,
                    calificacionPrevia: null,
                    usuario: null
                };
            }

            if (!token) {
                sesion = await AuthModel.obtenerSesionActual();
                token = sesion?.access_token || supabaseAnonKey;
            }
            const headers = {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // 1. Verificar si ya calificó en la tabla ratings
            const ratingUrl = `${supabaseUrl}/rest/v1/ratings?place_id=eq.${encodeURIComponent(placeId)}&user_id=eq.${encodeURIComponent(usuario.id)}&select=id,score`;
            const ratingRes = await fetch(ratingUrl, { headers });
            const ratingsExistentes = ratingRes.ok ? await ratingRes.json() : [];
            const yaCalifico = Array.isArray(ratingsExistentes) && ratingsExistentes.length > 0;
            const calificacionPrevia = yaCalifico ? Number(ratingsExistentes[0].score) : null;

            if (yaCalifico) {
                return {
                    ...evaluarElegibilidadCalificacion({ usuario, reservacionesConfirmadas: [], placeId, yaCalifico: true }),
                    yaCalifico: true,
                    calificacionPrevia,
                    usuario
                };
            }

            // 2. Consultar reservaciones confirmadas del usuario en tour_reservations
            const reservasUrl = `${supabaseUrl}/rest/v1/tour_reservations?tourist_id=eq.${encodeURIComponent(usuario.id)}&status=eq.confirmada&select=id,tour_id,status`;
            const reservasRes = await fetch(reservasUrl, { headers });
            const reservaciones = reservasRes.ok ? await reservasRes.json() : [];

            if (!Array.isArray(reservaciones) || reservaciones.length === 0) {
                return {
                    ...evaluarElegibilidadCalificacion({ usuario, reservacionesConfirmadas: [], placeId, yaCalifico: false }),
                    yaCalifico: false,
                    calificacionPrevia: null,
                    usuario
                };
            }

            // 3. Consultar tours asociados a este lugar en tour_places
            const tourPlacesUrl = `${supabaseUrl}/rest/v1/tour_places?place_id=eq.${encodeURIComponent(placeId)}&select=tour_id`;
            const tpRes = await fetch(tourPlacesUrl, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } });
            const tourPlaces = tpRes.ok ? await tpRes.json() : [];
            const tourIdsConEsteLugar = new Set((Array.isArray(tourPlaces) ? tourPlaces : []).map(tp => String(tp.tour_id)));

            const reservacionesValidas = reservaciones
                .filter(res => tourIdsConEsteLugar.has(String(res.tour_id)))
                .map(res => ({ ...res, place_id: placeId }));

            const evaluacion = evaluarElegibilidadCalificacion({
                usuario,
                reservacionesConfirmadas: reservacionesValidas,
                placeId,
                yaCalifico: false
            });

            return {
                ...evaluacion,
                yaCalifico: false,
                calificacionPrevia: null,
                usuario
            };
        } catch (error) {
            console.error('Error al verificar elegibilidad de calificación:', error);
            return {
                puede: false,
                razon: 'ERROR_CONEXION',
                mensaje: 'No se pudo verificar la elegibilidad para calificar.'
            };
        }
    },

    /**
     * Guarda la calificación en la tabla ratings de Supabase.
     * @param {Object} params
     * @param {string} params.placeId - UUID del lugar turístico
     * @param {number} params.score - Puntuación entera del 1 al 5
     * @returns {Promise<{ ok: boolean, data?: Object, error?: string }>}
     */
    async guardarCalificacion({ placeId, score }) {
        const validacion = validarScoreRating(score);
        if (!validacion.esValido) {
            return { ok: false, error: validacion.error };
        }

        try {
            const sesion = await AuthModel.obtenerSesionActual();
            const usuario = sesion?.user || null;

            if (!usuario) {
                return { ok: false, error: 'Debes iniciar sesión para calificar este lugar' };
            }

            const token = sesion.access_token || supabaseAnonKey;
            const insertUrl = `${supabaseUrl}/rest/v1/ratings`;
            const respuesta = await fetch(insertUrl, {
                method: 'POST',
                headers: {
                    apikey: supabaseAnonKey,
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    place_id: placeId,
                    user_id: usuario.id,
                    score: Number(score)
                })
            });

            if (!respuesta.ok) {
                const errorData = await respuesta.json().catch(() => ({}));
                return { ok: false, error: errorData.message || `Error del servidor: ${respuesta.status}` };
            }

            const data = await respuesta.json().catch(() => ({}));
            const resultado = Array.isArray(data) ? data[0] : data;
            return { ok: true, data: resultado };
        } catch (error) {
            console.error('Error al guardar calificación:', error);
            return { ok: false, error: 'Error al enviar calificación a Supabase.' };
        }
    }
};
