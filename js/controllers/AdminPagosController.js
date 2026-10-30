import { AdminPagosModel, obtenerSupabaseClient } from '../models/AdminPagosModel.js';
import { AdminPagosView } from '../views/AdminPagosView.js';
import { AuthModel } from '../models/AuthModel.js';
import { NavbarController } from './NavbarController.js';

export const AdminPagosController = {
    async init() {
        AdminPagosView.bindEventosModales();
        this.configurarCierreSesion();
        this.configurarBotonLoginAdmin();

        try {
            await NavbarController.init();
        } catch (_) {}

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
                } catch (_) {}

                try {
                    await AuthModel.cerrarSesion();
                } catch (_) {}

                try {
                    sessionStorage.clear();
                    localStorage.clear();
                } catch (_) {}

                window.location.replace('login.html');
            }, true);
        }
    },

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

    async cargarReservas() {
        try {
            const reservas = await AdminPagosModel.obtenerReservasEnValidacion();
            AdminPagosView.renderListado(reservas);
        } catch (error) {
            console.error(error);
            AdminPagosView.mostrarNotificacion('error', 'Error al cargar las reservaciones');
        }
    },

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
                        AdminPagosView.removerFila(reservaId);
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
                    AdminPagosView.removerFila(reservaId);
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
