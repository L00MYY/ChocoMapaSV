import { AuthModel } from '../models/AuthModel.js';
import { MisToursModel } from '../models/MisToursModel.js';
import { MisToursView } from '../views/MisToursView.js';

/**
 * @namespace MisToursController
 * @description Controlador para el historial personal de reservaciones de tours del turista autenticado.
 * Supervisa el ciclo de vida de la sesión, consulta de reservas por estado y navegación hacia el detalle.
 */
export const MisToursController = {
    /** @type {Object|null} */
    usuarioActual: null,
    /** @type {Function|null} */
    unsubscribeAuth: null,

    /**
     * @description Inicializa la suscripción a eventos de autenticación, verifica la sesión del usuario
     * y dispara la carga del historial de tours.
     * @returns {Promise<void>}
     */
     * @returns {Promise<void>}
    async init() {
        this.inicializarSuscripcionAuth();

        try {
            const sesion = await AuthModel.obtenerSesionActual();
            if (!sesion || !sesion.user) {
                this.limpiarVista();
                window.location.replace(`login.html?redirect=${encodeURIComponent(window.location.href)}`);
                return;
            }

            MisToursView.renderLoading();

            const usuario = (await MisToursModel.verificarSesion()) || sesion.user;
            if (!usuario) {
                this.limpiarVista();
                window.location.replace(`login.html?redirect=${encodeURIComponent(window.location.href)}`);
                return;
            }

            this.usuarioActual = usuario;
            await this.cargarHistorial();
        } catch (error) {
            console.error(error);
            MisToursView.renderError(
                'Ocurrió un problema de comunicación con el servidor de autenticación.',
                () => this.init()
            );
        }
    },

    /**
     * @description Configura la reactividad ante cambios de sesión, expulsando a login si se cierra la sesión.
     * @returns {void}
     */
    inicializarSuscripcionAuth() {
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
        }

        this.unsubscribeAuth = AuthModel.onCambioEstadoAuth((evento, sesion) => {
            if (evento === 'SIGNED_OUT' || !sesion?.user) {
                this.usuarioActual = null;
                this.limpiarVista();
                window.location.replace(`login.html?redirect=${encodeURIComponent(window.location.href)}`);
            }
        });
    },

    /**
     * @description Limpia de forma segura el contenedor del historial en la vista.
     * @returns {void}
     */
    limpiarVista() {
        if (typeof MisToursView.limpiar === 'function') {
            MisToursView.limpiar();
        } else if (MisToursView.container) {
            MisToursView.container.innerHTML = '';
        }
    },

    /**
     * @description Recupera el listado de reservas del usuario y renderiza las tarjetas de historial o estados vacíos.
     * @returns {Promise<void>}
     */
     * @returns {Promise<void>}
    async cargarHistorial() {
        if (!this.usuarioActual) return;

        try {
            MisToursView.renderLoading();
            const reservas = await MisToursModel.obtenerHistorial(this.usuarioActual.id);

            // Extraer posible alerta desde URL (?alerta=...) o sessionStorage
            let alertaTexto = null;
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                alertaTexto = params.get('alerta');
                try {
                    const alertaStorage = sessionStorage.getItem('mis_tours_alerta');
                    if (alertaStorage) {
                        alertaTexto = alertaTexto || alertaStorage;
                        sessionStorage.removeItem('mis_tours_alerta');
                    }
                } catch (error) {
                    console.warn('Error al leer alerta de sessionStorage:', error);
                }
            }

            if (!reservas || reservas.length === 0) {
                MisToursView.renderEstadoVacio(alertaTexto);
                return;
            }

            MisToursView.renderHistorial(reservas, alertaTexto);

            MisToursView.bindVerDetalleTour((tourId, reservaId) => {
                const params = new URLSearchParams({
                    id: tourId,
                    from: 'historial',
                    reservaId: reservaId
                });
                window.location.href = `tour-detalle.html?${params.toString()}`;
            });
        } catch (error) {
            console.error(error);
            MisToursView.renderError(
                'No fue posible obtener las reservas desde la base de datos.',
                () => this.cargarHistorial()
            );
        }
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MisToursController.init(), { once: true });
    } else {
        MisToursController.init();
    }
}

export default MisToursController;
