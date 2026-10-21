import {
    TOURS_DEMO,
    actualizarCuposTour,
    crearReservaTour,
    obtenerTourPorId
} from '../models/ToursModel.js';
import { AuthModel } from '../models/AuthModel.js';
import { TourDetalleView } from '../views/TourDetalleView.js';

let tourActual = null;
let failsafeTimeout;

export const TourDetalleController = {
    init() {
        const { btnReturn, btnOpenReserve, reservationForm } = TourDetalleView.elements;
        btnReturn?.addEventListener('click', event => {
            if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
                event.preventDefault();
                window.history.back();
            }
        });
        btnOpenReserve?.addEventListener('click', async () => {
            const sesion = await AuthModel.obtenerSesionActual();
            if (!sesion) {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
                return;
            }

            if (!tourActual || Number(tourActual.available_spots) <= 0) return;
            TourDetalleView.elements.reservationCard?.classList.remove('hidden');
            TourDetalleView.elements.reservationSuccessCard?.classList.add('hidden');
            TourDetalleView.elements.reservationCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => TourDetalleView.elements.inputName?.focus(), 300);
        });
        reservationForm?.addEventListener('submit', event => {
            event.preventDefault();
            this.procesarReserva();
        });
        this.inicializarLimpiezaErrores();
        this.inicializarFailsafe();
        this.cargarTour();
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
        const id = new URLSearchParams(window.location.search).get('id')?.trim() || 'a1000000-0000-0000-0000-000000000001';
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
        } catch (error) {
            console.error('Error o timeout al cargar detalle del tour:', error);
            tourActual = TOURS_DEMO.find(tour => tour.id === id) || null;
            if (tourActual) {
                TourDetalleView.renderizarTour(tourActual);
                TourDetalleView.mostrarEstado('content');
            } else {
                TourDetalleView.mostrarEstado('error', 'No hay datos disponibles para mostrar', 'Ocurrió un problema de comunicación con el servidor o se agotó el tiempo de espera.');
            }
        }
    },

    async procesarReserva() {
        if (!tourActual) return;
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
            await crearReservaTour(reserva);
            const cuposActualizados = Math.max(0, Number(tourActual.available_spots) - cupos);
            await actualizarCuposTour(tourActual.id, cuposActualizados);
            tourActual.available_spots = cuposActualizados;
            TourDetalleView.actualizarCupos(cuposActualizados);
            TourDetalleView.mostrarConfirmacion(tourActual, reserva);
        } catch (error) {
            console.error('Error al guardar la reserva:', error);
            window.alert('Ocurrió un error al procesar tu reserva con el servidor. Por favor intenta nuevamente.');
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