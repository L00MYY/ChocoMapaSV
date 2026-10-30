import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';
import { AuthModel } from './AuthModel.js';
import {
    TOURS_DEMO,
    obtenerTourPorId,
    obtenerPorId,
    crearReservaTour,
    actualizarCuposTour,
    actualizarCuposFecha,
    formatearFechaLarga,
    formatearMonedaUSD,
    esFechaPasada,
    sanitizarTelefono,
    validarFormularioReserva
} from './ToursModel.js';

const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http') ? atob(SUPABASE_URL_B64) : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_') ? atob(SUPABASE_ANON_KEY_B64) : SUPABASE_ANON_KEY_B64;

export {
    TOURS_DEMO,
    obtenerTourPorId,
    obtenerPorId,
    crearReservaTour,
    actualizarCuposTour,
    actualizarCuposFecha,
    formatearFechaLarga,
    formatearMonedaUSD,
    esFechaPasada,
    sanitizarTelefono,
    validarFormularioReserva
};

export function obtenerFechaHoyLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

export function calcularEstadoVisual(status, tourDate) {
    const hoyStr = obtenerFechaHoyLocal();
    const fechaTourLimpia = tourDate ? String(tourDate).split('T')[0] : '';
    const esPasada = Boolean(fechaTourLimpia && fechaTourLimpia < hoyStr);

    const s = String(status || '').trim().toLowerCase();

    if (s === 'confirmada' || s === 'confirmado') {
        return esPasada ? 'Pasado' : 'Confirmado';
    }
    if (s === 'pasado') {
        return 'Pasado';
    }
    if (s === 'pendiente_pago') {
        return 'Pendiente de pago';
    }
    if (s === 'en_validacion' || s === 'en validacion' || s === 'en validación') {
        return 'En validación';
    }
    if (s === 'rechazada' || s === 'rechazado') {
        return 'Rechazado';
    }
    if (s === 'expirada' || s === 'expirado') {
        return 'Expirada';
    }
    if (s === 'pendiente de confirmar') {
        return 'Pendiente de confirmar';
    }
    if (esPasada) {
        return 'Pasado';
    }
    return 'Pendiente de pago';
}

export async function obtenerReservaPorId(reservaId) {
    if (!reservaId) return null;

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?id=eq.${encodeURIComponent(reservaId)}&select=id,tour_id,tour_date_id,tourist_id,spots_reserved,tour_date,status,created_at,reservation_code,total_amount,expires_at,tours(*,tour_dates(id,departure_date,available_spots))`;

        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const item = data[0];
                return {
                    id: item.id,
                    tour_id: item.tour_id,
                    tour_date_id: item.tour_date_id || null,
                    tourist_id: item.tourist_id,
                    spots_reserved: Number(item.spots_reserved) || 1,
                    tour_date: item.tour_date,
                    status: calcularEstadoVisual(item.status, item.tour_date),
                    status_original: item.status,
                    reservation_code: item.reservation_code || `CM-${String(item.id).slice(0, 6).toUpperCase()}`,
                    total_amount: Number(item.total_amount) || 0,
                    expires_at: item.expires_at || null,
                    created_at: item.created_at,
                    tours: item.tours || null
                };
            }
        }
    } catch (_) { }

    return null;
}

export async function obtenerReservaUsuarioPorTour(touristId, tourId) {
    if (!touristId || !tourId) return null;

    try {
        const sesion = await AuthModel.obtenerSesionActual();
        const authHeaders = {
            ...HEADERS,
            'Authorization': `Bearer ${sesion?.access_token || SUPABASE_ANON_KEY}`
        };

        const params = new URLSearchParams({
            select: 'id,tour_id,tour_date_id,tourist_id,spots_reserved,tour_date,status,created_at,reservation_code,total_amount,expires_at,tours(*,tour_dates(id,departure_date,available_spots))',
            tourist_id: `eq.${touristId}`,
            tour_id: `eq.${tourId}`,
            order: 'created_at.desc'
        });

        const url = `${SUPABASE_URL}/rest/v1/tour_reservations?${params.toString()}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const activa = data.find(item => {
                    const st = String(item.status || '').toLowerCase();
                    return ['pendiente_pago', 'en_validacion', 'confirmada', 'confirmado'].includes(st);
                });

                const target = activa || data[0];

                if (target) {
                    let stOriginal = target.status;
                    const stNorm = String(stOriginal || '').toLowerCase();

                    if (stNorm === 'pendiente_pago') {
                        const expTimestamp = target.expires_at
                            ? new Date(target.expires_at).getTime()
                            : (target.created_at ? new Date(target.created_at).getTime() + 3600000 : null);

                        if (expTimestamp && Date.now() >= expTimestamp) {
                            stOriginal = 'expirada';
                        }
                    }

                    return {
                        id: target.id,
                        tour_id: target.tour_id,
                        tour_date_id: target.tour_date_id || null,
                        tourist_id: target.tourist_id,
                        spots_reserved: Number(target.spots_reserved) || 1,
                        tour_date: target.tour_date,
                        status: calcularEstadoVisual(stOriginal, target.tour_date),
                        status_original: stOriginal,
                        reservation_code: target.reservation_code || `CM-${String(target.id).slice(0, 6).toUpperCase()}`,
                        total_amount: Number(target.total_amount) || 0,
                        expires_at: target.expires_at || null,
                        created_at: target.created_at,
                        tours: target.tours || null
                    };
                }
            }
        }
    } catch (_) { }

    // Sin reservas en BD: NO recurrir a localStorage ni mock
    return null;
}

export const TourDetalleModel = {
    obtenerPorId,
    obtenerTourPorId,
    obtenerReservaPorId,
    obtenerReservaUsuarioPorTour,
    crearReservaTour,
    actualizarCuposTour,
    actualizarCuposFecha,
    calcularEstadoVisual,
    formatearFechaLarga,
    formatearMonedaUSD,
    esFechaPasada,
    sanitizarTelefono,
    validarFormularioReserva,
    obtenerFechaHoyLocal,
    TOURS_DEMO
};

export default TourDetalleModel;
