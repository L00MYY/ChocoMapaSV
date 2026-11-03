import { AdminPagosModel, obtenerSupabaseClient } from '../models/AdminPagosModel.js';
import { AdminPagosView } from '../views/AdminPagosView.js';
import { AuthModel } from '../models/AuthModel.js';
import { NavbarController } from './NavbarController.js';

/**
 * @namespace AdminPagosController
 * @description Controlador del panel de administración para validación de comprobantes de pago.
 * Gestiona el control de acceso basado en roles (admin_users), visualización de URLs firmadas,
 * aprobación y rechazo de reservas con reincorporación de cupos y resolución de concurrencia.
 */
export const AdminPagosController = {
    /**
     * @description Inicializa el panel administrativo, verifica el rol de administrador y carga las reservaciones.
     * @returns {Promise<void>}
     */
    async init() {
        AdminPagosView.bindEventosModales();
        AdminPagosView.bindFiltros();
        this.configurarCierreSesion();
        this.configurarBotonLoginAdmin();

        try {
            await NavbarController.init();
        } catch (error) {
            console.warn('NavbarController init warn en AdminPagosController:', error);
        }

        // En el arranque (DOMContentLoaded):
        // Validar si hay sesión activa y si el user.id pertenece a la tabla admin_users.
        // Si no hay sesión o no es admin, ocultar la tabla, no ejecutar fetch de pagos
        // y mostrar únicamente la tarjeta de "Acceso Denegado".
        const verificacion = await AdminPagosModel.verificarRolAdmin();
        if (!verificacion.esAdmin) {
            AdminPagosView.mostrarAccesoDenegado();
            return;
        }

        AdminPagosView.mostrarVistaAdmin();
        await this.cargarReservas();
        this.configurarEventos();
    },

    /**
     * @description Configura el comportamiento del botón de cerrar sesión en el panel de administración.
     * @returns {void}
     */
    configurarCierreSesion() {
        const btnLogout = document.getElementById('nav-btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                    const client = obtenerSupabaseClient();
                    if (client?.auth?.signOut) {
                        await client.auth.signOut();
                    } else if (window.supabase?.auth?.signOut) {
                        await window.supabase.auth.signOut();
                    }
                } catch (error) {
                    console.warn('Error al cerrar sesión en cliente Supabase:', error);
                }

                try {
                    await AuthModel.cerrarSesion();
                } catch (error) {
                    console.warn('Error al cerrar sesión en AuthModel:', error);
                }

                try {
                    sessionStorage.clear();
                    localStorage.clear();
                } catch (error) {
                    console.warn('Error al limpiar almacenamiento local en logout admin:', error);
                }

                window.location.replace('login.html');
            }, true);
        }
    },

    /**
     * @description Configura el botón de inicio de sesión con validación de roles cruzados (turista vs admin).
     * @returns {void}
     */
    configurarBotonLoginAdmin() {
        const btnLoginAdmin = document.getElementById('btn-login-admin') || document.querySelector('a[href*="admin-pagos.html"].btn-regresar');
        if (btnLoginAdmin) {
            btnLoginAdmin.addEventListener('click', async (e) => {
                e.preventDefault();

                // Intercepción ante sesión activa de turista
                const sesion = await AuthModel.obtenerSesionActual();
                if (sesion && sesion.user) {
                    AdminPagosView.mostrarAvisoCerrarSesionTurista();
                    return;
                }

                window.location.href = 'login.html?redirect=admin-pagos.html';
            });
        }
    },

    /**
     * @description Carga las reservaciones en estado 'en_validacion' desde el modelo y renderiza la tabla.
     * @returns {Promise<void>}
     */
    async cargarReservas() {
        try {
            const reservas = await AdminPagosModel.obtenerReservasEnValidacion();
            AdminPagosView.renderListado(reservas);
        } catch (error) {
            console.error(error);
            AdminPagosView.mostrarNotificacion('error', 'Error al cargar las reservaciones');
        }
    },

    /**
     * @description Enlaza las acciones de aprobación, visualización y rechazo de la tabla a sus controladores del modelo.
     * @returns {void}
     */
    configurarEventos() {
        AdminPagosView.bindAccionesTabla({
            onVer: async ({ codigo, storagePath, mimeType }) => {
                if (!storagePath) {
                    AdminPagosView.mostrarNotificacion('warning', 'Esta reserva no tiene un comprobante adjunto');
                    return;
                }

                try {
                    const resUrl = await AdminPagosModel.obtenerUrlFirmada(storagePath);
                    if (resUrl.ok && resUrl.signedUrl) {
                        AdminPagosView.mostrarModalComprobante(resUrl.signedUrl, mimeType, codigo);
                    } else {
                        AdminPagosView.mostrarNotificacion('error', resUrl.error || 'No se pudo generar la URL del comprobante');
                    }
                } catch (error) {
                    console.error(error);
                    AdminPagosView.mostrarNotificacion('error', 'Error al consultar comprobante');
                }
            },

            onAprobar: async ({ reservaId, codigo, btn }) => {
                if (btn) btn.disabled = true;

                try {
                    const res = await AdminPagosModel.aprobarReserva(reservaId);
                    if (res.concurrencia) {
                        AdminPagosView.deshabilitarFilaPorConcurrencia(reservaId, res.mensaje);
                        return;
                    }

                    if (res.ok) {
                        AdminPagosView.mostrarNotificacion('success', `Reserva ${codigo} aprobada y confirmada con éxito`);
                        AdminPagosView.actualizarReservaLocal(reservaId, 'confirmada');
                    } else {
                        AdminPagosView.mostrarNotificacion('error', res.mensaje || 'No se pudo aprobar la reserva');
                        if (btn) btn.disabled = false;
                    }
                } catch (error) {
                    console.error(error);
                    AdminPagosView.mostrarNotificacion('error', error.message || 'Error al aprobar la reserva');
                    if (btn) btn.disabled = false;
                }
            },

            onRechazarClick: ({ reservaId, codigo }) => {
                AdminPagosView.mostrarModalRechazo(reservaId, codigo);
            },

            onVerMotivo: ({ codigo, motivo }) => {
                AdminPagosView.mostrarModalMotivo(codigo, motivo);
            }
        });

        AdminPagosView.bindConfirmarRechazo(async ({ reservaId, motivo, btn }) => {
            if (!reservaId) return;
            if (btn) btn.disabled = true;

            try {
                const res = await AdminPagosModel.rechazarReserva(reservaId, motivo);
                if (res.concurrencia) {
                    AdminPagosView.cerrarModalRechazo();
                    AdminPagosView.deshabilitarFilaPorConcurrencia(reservaId, res.mensaje);
                    return;
                }

                if (res.ok) {
                    AdminPagosView.cerrarModalRechazo();
                    AdminPagosView.mostrarNotificacion('error', 'Comprobante y reserva rechazados correctamente');
                    AdminPagosView.actualizarReservaLocal(reservaId, 'rechazada', motivo);
                } else {
                    AdminPagosView.mostrarNotificacion('error', res.mensaje || 'No se pudo rechazar la reserva');
                }
            } catch (error) {
                console.error(error);
                AdminPagosView.mostrarNotificacion('error', error.message || 'Error al rechazar reserva');
            } finally {
                if (btn) btn.disabled = false;
            }
        });
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AdminPagosController.init(), { once: true });
    } else {
        AdminPagosController.init();
    }
}

export default AdminPagosController;
