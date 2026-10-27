import {
    TOURS_DEMO,
    actualizarCuposTour,
    crearReservaTour,
    obtenerTourPorId,
    obtenerReservaPorId,
    obtenerReservaUsuarioPorTour,
    obtenerFechaHoyLocal,
    esFechaPasada,
    TourDetalleModel
} from '../models/TourDetalleModel.js';
import {
    AuthModel,
    validarEmail,
    validarTelefonoSV,
    sanitizarUsuario
} from '../models/AuthModel.js';
import { TourDetalleView } from '../views/TourDetalleView.js';

let tourActual = null;
let failsafeTimeout;

export const TourDetalleController = {
    unsubscribeAuth: null,

    init() {
        const { btnReturn, btnOpenReserve, reservationForm, selectDate } = TourDetalleView.elements;
        const params = new URLSearchParams(window.location.search);
        const fromHistorial = params.get('from') === 'historial';

        btnReturn?.addEventListener('click', event => {
            const isFromHistorial = new URLSearchParams(window.location.search).get('from') === 'historial';
            if (isFromHistorial) {
                event.preventDefault();
                window.location.href = 'mis-tours.html';
                return;
            }
            if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
                event.preventDefault();
                window.history.back();
            }
        });

        // Escuchar el evento de cambio (change) en la selección de fecha y actualizar cupos dinámicamente
        const manejarCambioFecha = (selectedDateId) => {
            if (!tourActual || !selectedDateId) {
                TourDetalleView.marcarFechaSeleccionada(null);
                TourDetalleView.actualizarCupos(0);
                return;
            }
            const fechaObj = (tourActual.tour_dates || []).find(d => String(d.id) === String(selectedDateId));
            if (fechaObj) {
                // Impedir selección de fecha pasada o igual a la actual
                if (esFechaPasada(fechaObj.departure_date)) {
                    TourDetalleView.marcarFechaSeleccionada(null);
                    TourDetalleView.actualizarCupos(0);
                    return;
                }

                const cupos = Number(fechaObj.available_spots) || 0;
                TourDetalleView.marcarFechaSeleccionada(fechaObj.id);
                TourDetalleView.actualizarCupos(cupos);
            } else {
                TourDetalleView.marcarFechaSeleccionada(null);
                TourDetalleView.actualizarCupos(0);
            }
        };

        selectDate?.addEventListener('change', event => {
            manejarCambioFecha(event.target.value);
        });

        // Escucha global para radio buttons de fecha si se renderizan en el DOM
        document.addEventListener('change', event => {
            if (event.target && (event.target.name === 'tour_date' || event.target.name === 'tour_date_id') && event.target.type === 'radio') {
                manejarCambioFecha(event.target.value);
            }
        });

        btnOpenReserve?.addEventListener('click', async () => {
            // Criterio 4: NO permitir reservar cupos si se visita desde el historial
            const isFromHistorial = new URLSearchParams(window.location.search).get('from') === 'historial';
            if (isFromHistorial) return;

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

            const fechaActual = this.obtenerFechaSeleccionadaActual();
            const cuposDisponibles = fechaActual ? Number(fechaActual.available_spots || 0) : 0;
            if (!tourActual || !fechaActual || cuposDisponibles <= 0) return;
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

    obtenerFechaMasProxima(fechas = []) {
        if (!Array.isArray(fechas) || fechas.length === 0) return null;

        const fechasOrdenadas = [...fechas].sort((a, b) => {
            const dateA = new Date(a.departure_date || a);
            const dateB = new Date(b.departure_date || b);
            return dateA - dateB;
        });

        // Buscar únicamente la primera fecha estrictamente futura
        const proximaFutura = fechasOrdenadas.find(f => {
            const fStr = f.departure_date || f;
            return !esFechaPasada(fStr);
        });

        return proximaFutura || null;
    },

    obtenerFechaSeleccionadaActual() {
        if (!tourActual || !Array.isArray(tourActual.tour_dates)) return null;
        const e = TourDetalleView.elements;
        const radioChecked = document.querySelector('input[name="tour_date"]:checked, input[name="tour_date_id"]:checked');
        const selectedId = e.selectDate?.value || radioChecked?.value;
        if (selectedId) {
            const encontrada = tourActual.tour_dates.find(d => String(d.id) === String(selectedId));
            if (encontrada && !esFechaPasada(encontrada.departure_date)) {
                return encontrada;
            }
        }
        return this.obtenerFechaMasProxima(tourActual.tour_dates);
    },

    inicializarSuscripcionAuth() {
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
        }

        this.unsubscribeAuth = AuthModel.onCambioEstadoAuth(async (evento, sesion) => {
            if (evento === 'SIGNED_OUT' || !sesion || !sesion.user) {
                TourDetalleView.restablecerModoPublico(tourActual);
                if (window.location.search.includes('from=historial') || window.location.search.includes('reservaId=')) {
                    const currentParams = new URLSearchParams(window.location.search);
                    currentParams.delete('from');
                    currentParams.delete('reservaId');
                    const newQuery = currentParams.toString() ? `?${currentParams.toString()}` : '';
                    window.history.replaceState({}, document.title, `${window.location.pathname}${newQuery}`);
                }
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

            // Requerimiento 3: La fecha más próxima futura determina por defecto cuántos cupos se muestran
            const fechaProxima = this.obtenerFechaMasProxima(tourActual.tour_dates);
            if (fechaProxima) {
                TourDetalleView.marcarFechaSeleccionada(fechaProxima.id);
                TourDetalleView.actualizarCupos(fechaProxima.available_spots);
            } else {
                TourDetalleView.marcarFechaSeleccionada(null);
                TourDetalleView.actualizarCupos(0);
                TourDetalleView.deshabilitarReservaPorTourPasado();
            }

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
                        tour_date_id: fechaProxima?.id || null,
                        spots_reserved: 1,
                        tour_date: fechaProxima?.departure_date || tourActual.tour_dates?.[0]?.departure_date || obtenerFechaHoyLocal(),
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
                    // Criterio 4: Si el tour no cuenta con fechas futuras vigentes, deshabilitar reserva
                    const fechas = tourActual.tour_dates || [];
                    const tieneFechasFuturas = fechas.some(d => {
                        const fechaStr = typeof d === 'string' ? d : d.departure_date;
                        return !esFechaPasada(fechaStr);
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
                const fechaProxima = this.obtenerFechaMasProxima(tourActual.tour_dates);
                if (fechaProxima) {
                    TourDetalleView.marcarFechaSeleccionada(fechaProxima.id);
                    TourDetalleView.actualizarCupos(fechaProxima.available_spots);
                } else {
                    TourDetalleView.marcarFechaSeleccionada(null);
                    TourDetalleView.actualizarCupos(0);
                    TourDetalleView.deshabilitarReservaPorTourPasado();
                }

                if (fromHistorial) {
                    TourDetalleView.renderizarModoHistorial({
                        id: reservaId || 'demo-reserva',
                        tour_id: tourActual.id,
                        tour_date_id: fechaProxima?.id || null,
                        spots_reserved: 1,
                        tour_date: fechaProxima?.departure_date || tourActual.tour_dates?.[0]?.departure_date || obtenerFechaHoyLocal(),
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

                    const fechas = tourActual.tour_dates || [];
                    const tieneFechasFuturas = fechas.some(d => {
                        const fechaStr = typeof d === 'string' ? d : d.departure_date;
                        return !esFechaPasada(fechaStr);
                    });
                    if (fechas.length > 0 && !tieneFechasFuturas) {
                        TourDetalleView.deshabilitarReservaPorTourPasado();
                    }
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

        // Sanitización y validación del nombre con sanitizarUsuario
        const nombreSanitizado = sanitizarUsuario(values.nombre);
        if (!nombreSanitizado) {
            errors.push(['inputName', 'Este campo es obligatorio']);
        }

        // Validación de correo electrónico con validarEmail
        const emailSanitizado = (values.email || '').trim();
        if (!emailSanitizado) {
            errors.push(['inputEmail', 'Este campo es obligatorio']);
        } else if (!validarEmail(emailSanitizado)) {
            errors.push(['inputEmail', 'Ingresa un correo electrónico con formato válido']);
        }

        // Validación de teléfono con validarTelefonoSV
        const telefonoSanitizado = (values.telefono || '').trim();
        if (!telefonoSanitizado) {
            errors.push(['inputPhone', 'Este campo es obligatorio']);
        } else if (!validarTelefonoSV(telefonoSanitizado)) {
            errors.push(['inputPhone', 'El teléfono debe contener un número válido salvadoreño']);
        }

        // Validación de fecha seleccionada
        if (!values.tour_date_id && !values.fecha) {
            errors.push(['selectDate', 'Debes seleccionar una fecha de salida']);
        }

        const fechaSeleccionada = (tourActual.tour_dates || []).find(d =>
            String(d.id) === String(values.tour_date_id) || String(d.departure_date) === String(values.fecha)
        );

        const fechaStr = fechaSeleccionada
            ? String(fechaSeleccionada.departure_date || '')
            : String(values.fecha || '');

        if (fechaSeleccionada && esFechaPasada(fechaStr)) {
            errors.push(['selectDate', 'La fecha seleccionada ya no se encuentra disponible. Por favor elige una fecha futura.']);
        }

        const cuposDisponiblesFecha = fechaSeleccionada
            ? Number(fechaSeleccionada.available_spots) || 0
            : 0;

        const cupos = Number.parseInt(values.cupos, 10);
        if (!values.cupos) errors.push(['inputSpots', 'Este campo es obligatorio']);
        else if (!Number.isInteger(cupos) || cupos < 1) errors.push(['inputSpots', 'Ingresa al menos 1 cupo']);
        else if (cupos > cuposDisponiblesFecha) errors.push(['inputSpots', `La cantidad de cupos no puede superar los cupos disponibles para esta fecha (${cuposDisponiblesFecha})`]);

        if (errors.length) {
            TourDetalleView.mostrarErrorCampo(...errors[0]);
            errors.slice(1).forEach(error => TourDetalleView.mostrarErrorCampo(...error));
            e[errors[0][0]]?.focus();
            return;
        }

        const tourDateId = fechaSeleccionada?.id || values.tour_date_id;
        const tourDateStr = fechaSeleccionada?.departure_date || values.tour_date || values.fecha;

        const datosReserva = {
            tourId: tourActual.id,
            tourDateId: tourDateId,
            tourDate: tourDateStr,
            nombre: nombreSanitizado,
            email: emailSanitizado,
            telefono: telefonoSanitizado,
            cuposReservados: cupos
        };

        const button = e.btnConfirmReserve;
        const textoOriginal = button?.textContent || 'Confirmar reserva';
        if (button) {
            button.disabled = true;
            button.textContent = 'Confirmando reserva...';
        }

        try {
            // 1. Ejecutar primero la inserción de la reserva (POST a tour_reservations)
            const resultado = await crearReservaTour(datosReserva);

            // 2. Solo si tiene éxito, proceder a descontar cupos en tour_dates
            const nuevosCuposDisponibles = Math.max(0, cuposDisponiblesFecha - cupos);

            if (tourDateId) {
                if (fechaSeleccionada) {
                    fechaSeleccionada.available_spots = nuevosCuposDisponibles;
                }
                await actualizarCuposTour(tourDateId, nuevosCuposDisponibles);
                TourDetalleView.actualizarCuposEnOpcion(tourDateId, nuevosCuposDisponibles);
            }
            TourDetalleView.actualizarCupos(nuevosCuposDisponibles);

            const reservaIdGenerado = resultado?.data?.id || `res-${Date.now()}`;
            const reservaCompleta = {
                id: reservaIdGenerado,
                tour_id: tourActual.id,
                tour_date_id: tourDateId,
                tourist_id: sesion.user.id,
                tourist_name: nombreSanitizado,
                tourist_email: emailSanitizado,
                tourist_phone: telefonoSanitizado,
                spots_reserved: cupos,
                tour_date: values.fecha,
                status: 'Confirmado'
            };

            try {
                localStorage.setItem(`chocomapa_reserva_${sesion.user.id}_${tourActual.id}`, JSON.stringify(reservaConfirmada));
            } catch (_) {}

            TourDetalleView.mostrarConfirmacion(tourActual, reservaCompleta);
            TourDetalleView.renderizarModoHistorial(reservaCompleta, tourActual);
        } catch (error) {
            console.error('Error al procesar la reserva:', error);

            // En caso de error en el catch:
            // - NO mostrar "Tu reservación oficial"
            if (e.historialCard) {
                e.historialCard.classList.add('hidden');
            }
            if (e.reservationSuccessCard) {
                e.reservationSuccessCard.classList.add('hidden');
            }

            // - Mantener visible el formulario
            if (e.reservationCard) {
                e.reservationCard.classList.remove('hidden');
            }

            // - Llamar a TourDetalleView.mostrarError(error.message) para notificar al usuario
            TourDetalleView.mostrarError(error.message || 'Error al guardar la reservación');
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