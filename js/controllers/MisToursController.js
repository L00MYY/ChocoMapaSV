import { AuthModel } from '../models/AuthModel.js';
import { MisToursModel } from '../models/MisToursModel.js';
import { MisToursView } from '../views/MisToursView.js';

export const MisToursController = {
    usuarioActual: null,
    unsubscribeAuth: null,

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

    limpiarVista() {
        if (typeof MisToursView.limpiar === 'function') {
            MisToursView.limpiar();
        } else if (MisToursView.container) {
            MisToursView.container.innerHTML = '';
        }
    },

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
                } catch (_) {}
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
