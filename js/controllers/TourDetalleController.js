import {
    TOURS_DEMO,
    actualizarCuposTour,
    crearReservaTour,
    obtenerTourPorId,
    obtenerReservaPorId,
    obtenerReservaUsuarioPorTour,
    TourDetalleModel
} from '../models/TourDetalleModel.js';
import { AuthModel } from '../models/AuthModel.js';
import { TourDetalleView } from '../views/TourDetalleView.js';

let tourActual = null;
let failsafeTimeout;

export const TourDetalleController = {
    unsubscribeAuth: null,

    init() {
        const { btnReturn, btnOpenReserve, reservationForm } = TourDetalleView.elements;
        const params = new URLSearchParams(window.location.search);
        const fromHistorial = params.get('from') === 'historial';

        btnReturn?.addEventListener('click', event => {
            if (fromHistorial) {
                event.preventDefault();
                window.location.href = 'mis-tours.html';
                return;
            }
            if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
                event.preventDefault();
                window.history.back();
            }
        });

        btnOpenReserve?.addEventListener('click', async () => {
            // Criterio 4: NO permitir reservar cupos si se visita desde el historial
            if (fromHistorial) return;

            const sesion = await AuthModel.obtenerSesionActual();
            if (!sesion || !sesion.user) {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
                return;
            }

            // Validación: Si el usuario ya reservó en este tour, mostrar la información de su reserva
            try {
                const reservaExistente = await obtenerReservaUsuarioPorTour(sesion.user.id, tourActual?.id);
                if (reservaExistente) {
                    TourDetalleView.renderizarModoHistorial(reservaExistente, tourActual);
                    return;
                }
            } catch (_) {}

            if (!tourActual || Number(tourActual.available_spots) <= 0) return;
            TourDetalleView.mostrarFormularioReserva();
        });

        reservationForm?.addEventListener('submit', event => {
            event.preventDefault();
            this.procesarReserva();
        });

        this.inicializarSuscripcionAuth();
        this.inicializarLimpiezaErrores();
        this.inicializarFailsafe();
        this.cargarTour();
    },

    inicializarSuscripcionAuth() {
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
        }

        this.unsubscribeAuth = AuthModel.onCambioEstadoAuth(async (evento, sesion) => {
            if (evento === 'SIGNED_OUT' || !sesion || !sesion.user) {
                TourDetalleView.ocultarFormularioReserva();
                TourDetalleView.limpiarFormularioReserva();
            } else if ((evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') && tourActual) {
                try {
                    const reservaExistente = await obtenerReservaUsuarioPorTour(sesion.user.id, tourActual.id);
                    if (reservaExistente) {
                        TourDetalleView.renderizarModoHistorial(reservaExistente, tourActual);
                    }
                } catch (_) {}
            }
        });
    },

    inicializarLimpiezaErrores() {
        const e = TourDetalleView.elements;
        [
            ['inputName', 'name'], ['inputEmail', 'email'], ['inputPhone', 'phone'],
            ['selectDate', 'date'], ['inputSpots', 'spots']
        ].forEach(([inputName, errorName]) => {
            const input = e[inputName];
            const error = e[`error${errorName[0].toUpperCase()}${errorName.slice(1)}`];
            input?.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
                input.classList.remove('is-invalid');
                if (error) {
                    error.textContent = '';
                    error.style.display = 'none';
                }
            });
        });
    },

    inicializarFailsafe() {
        const activar = () => {
            const e = TourDetalleView.elements;
            if (e.stateLoading && (!e.stateContent || e.stateContent.classList.contains('hidden'))) {
                e.stateLoading.classList.add('hidden');
                e.stateLoading.style.display = 'none';
                TourDetalleView.mostrarEstado('error', 'No hay datos disponibles para mostrar');
            }
        };
        failsafeTimeout = setTimeout(activar, 6000);
        window.addEventListener('error', activar);
    },

    async cargarTour() {
        TourDetalleView.mostrarEstado('loading');
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id')?.trim() || 'a1000000-0000-0000-0000-000000000001';
        const fromHistorial = params.get('from') === 'historial';
        const reservaId = params.get('reservaId');

        try {
            tourActual = await Promise.race([
                obtenerTourPorId(id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), 6000))
            ]);
            tourActual ||= TOURS_DEMO.find(tour => tour.id === id) || null;
            if (!tourActual) {
                TourDetalleView.mostrarEstado('error', 'No hay datos disponibles para mostrar', 'El tour solicitado no existe o no se encuentra disponible actualmente.');
                return;
            }

            TourDetalleView.renderizarTour(tourActual);
            TourDetalleView.mostrarEstado('content');
            clearTimeout(failsafeTimeout);

            // Criterio 3: Flujo especial desde historial
            if (fromHistorial) {
                let reserva = null;
                if (reservaId) {
                    reserva = await obtenerReservaPorId(reservaId);
                }

                if (!reserva) {
                    reserva = {
                        id: reservaId || 'demo-reserva',
                        tour_id: tourActual.id,
                        spots_reserved: 1,
                        tour_date: tourActual.tour_dates?.[0]?.departure_date || new Date().toISOString().split('T')[0],
                        status: 'Confirmado'
                    };
                }

                TourDetalleView.renderizarModoHistorial(reserva, tourActual);
            } else {
                // Validación: Si el usuario ya reservó en este tour en específico, mostrar la información de su reserva
                let reservaExistente = null;
                try {
                    const sesion = await AuthModel.obtenerSesionActual();
                    if (sesion?.user?.id) {
                        reservaExistente = await obtenerReservaUsuarioPorTour(sesion.user.id, tourActual.id);
                    }
                } catch (errCheck) {
                    console.warn('Error al verificar reservación previa del usuario:', errCheck);
                }

                if (reservaExistente) {
                    TourDetalleView.renderizarModoHistorial(reservaExistente, tourActual);
                } else {
                    // Criterio 4: Si el tour ya pasó, no permitir reservar cupos
                    const hoyStr = new Date().toISOString().split('T')[0];
                    const fechas = tourActual.tour_dates || [];
                    const tieneFechasFuturas = fechas.some(d => {
                        const fechaStr = typeof d === 'string' ? d : d.departure_date;
                        return String(fechaStr).split('T')[0] >= hoyStr;
                    });
                    if (fechas.length > 0 && !tieneFechasFuturas) {
                        TourDetalleView.deshabilitarReservaPorTourPasado();
                    }
                }
            }
        } catch (error) {
            console.error('Error o timeout al cargar detalle del tour:', error);
            tourActual = TOURS_DEMO.find(tour => tour.id === id) || null;
            if (tourActual) {
                TourDetalleView.renderizarTour(tourActual);
                TourDetalleView.mostrarEstado('content');
                if (fromHistorial) {
                    TourDetalleView.renderizarModoHistorial({
                        id: reservaId || 'demo-reserva',
                        tour_id: tourActual.id,
                        spots_reserved: 1,
                        tour_date: tourActual.tour_dates?.[0]?.departure_date || new Date().toISOString().split('T')[0],
                        status: 'Confirmado'
                    }, tourActual);
                } else {
                    try {
                        const sesion = await AuthModel.obtenerSesionActual();
                        if (sesion?.user?.id) {
                            const reservaExistente = await obtenerReservaUsuarioPorTour(sesion.user.id, tourActual.id);
                            if (reservaExistente) {
                                TourDetalleView.renderizarModoHistorial(reservaExistente, tourActual);
                            }
                        }
                    } catch (_) {}
                }
            } else {
                TourDetalleView.mostrarEstado('error', 'No hay datos disponibles para mostrar', 'Ocurrió un problema de comunicación con el servidor o se agotó el tiempo de espera.');
            }
        }
    },

    async procesarReserva() {
        if (!tourActual) return;

        // Doble validación: Verificar sesión activa antes de construir el payload o llamar al modelo
        const sesion = await AuthModel.obtenerSesionActual();
        if (!sesion || !sesion.user) {
            TourDetalleView.ocultarFormularioReserva();
            TourDetalleView.mostrarError("Debes iniciar sesión para completar una reserva.");
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            return;
        }

        const e = TourDetalleView.elements;
        const values = TourDetalleView.obtenerDatosReserva();
        TourDetalleView.limpiarErrores();
        const errors = [];
        if (!values.nombre) errors.push(['inputName', 'Este campo es obligatorio']);
        if (!values.email) errors.push(['inputEmail', 'Este campo es obligatorio']);
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.push(['inputEmail', 'Ingresa un correo electrónico con formato válido']);
        if (!values.telefono) errors.push(['inputPhone', 'Este campo es obligatorio']);
        else if (!/^\d+$/.test(values.telefono)) errors.push(['inputPhone', 'El teléfono debe contener solo números']);
        if (!values.fecha) errors.push(['selectDate', 'Este campo es obligatorio']);
        const cupos = Number.parseInt(values.cupos, 10);
        if (!values.cupos) errors.push(['inputSpots', 'Este campo es obligatorio']);
        else if (!Number.isInteger(cupos) || cupos < 1) errors.push(['inputSpots', 'Ingresa al menos 1 cupo']);
        else if (cupos > Number(tourActual.available_spots || 0)) errors.push(['inputSpots', `La cantidad de cupos no puede superar los cupos disponibles (${Number(tourActual.available_spots) || 0})`]);

        if (errors.length) {
            TourDetalleView.mostrarErrorCampo(...errors[0]);
            errors.slice(1).forEach(error => TourDetalleView.mostrarErrorCampo(...error));
            e[errors[0][0]]?.focus();
            return;
        }

        const reserva = {
            tour_id: tourActual.id,
            tourist_id: sesion.user.id,
            tourist_name: values.nombre,
            tourist_email: values.email,
            tourist_phone: values.telefono,
            tour_date: values.fecha,
            spots_reserved: cupos
        };
        const button = e.btnConfirmReserve;
        const textoOriginal = button?.textContent || 'Confirmar reserva';
        if (button) {
            button.disabled = true;
            button.textContent = 'Confirmando reserva...';
        }
        try {
            const resultado = await crearReservaTour(reserva);
            const cuposActualizados = Math.max(0, Number(tourActual.available_spots) - cupos);
            await actualizarCuposTour(tourActual.id, cuposActualizados);
            tourActual.available_spots = cuposActualizados;
            TourDetalleView.actualizarCupos(cuposActualizados);

            const reservaIdGenerado = resultado?.data?.id || `res-${Date.now()}`;
            const codigoGenerado = resultado?.data?.reservation_code || resultado?.data?.code || resultado?.data?.codigo || `CM-${String(reservaIdGenerado).slice(0, 6).toUpperCase()}`;
            const reservaCompleta = {
                id: reservaIdGenerado,
                tour_id: tourActual.id,
                tourist_id: sesion.user.id,
                spots_reserved: cupos,
                tour_date: values.fecha,
                status: 'pendiente_pago',
                reservation_code: codigoGenerado
            };

            try {
                localStorage.setItem(`chocomapa_reserva_${sesion.user.id}_${tourActual.id}`, JSON.stringify(reservaCompleta));
            } catch (_) {}

            window.location.href = `pago-comprobante.html?reservaId=${encodeURIComponent(reservaIdGenerado)}&codigo=${encodeURIComponent(codigoGenerado)}`;
            return;
        } catch (error) {
            console.error('Error al guardar la reserva:', error);
            TourDetalleView.mostrarError('Ocurrió un error al procesar tu reserva con el servidor. Por favor intenta nuevamente.');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = textoOriginal;
            }
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TourDetalleController.init(), { once: true });
} else {
    TourDetalleController.init();
}