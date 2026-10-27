import { AdminPagosModel } from '../models/AdminPagosModel.js';
import { AdminPagosView } from '../views/AdminPagosView.js';

export const AdminPagosController = {
    async init() {
        AdminPagosView.bindEventosModales();

        const verificacion = await AdminPagosModel.verificarRolAdmin();
        if (!verificacion.esAdmin) {
            AdminPagosView.mostrarAccesoDenegado();
            return;
        }

        await this.cargarReservas();
        this.configurarEventos();
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
                        AdminPagosView.mostrarNotificacion('error', 'No se pudo aprobar la reserva');
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
                    AdminPagosView.mostrarNotificacion('error', 'No se pudo rechazar la reserva');
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminPagosController.init(), { once: true });
} else {
    AdminPagosController.init();
}

export default AdminPagosController;
