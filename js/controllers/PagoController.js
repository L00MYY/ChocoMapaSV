import { AuthModel } from '../models/AuthModel.js';
import { PagoModel } from '../models/PagoModel.js';
import { PagoView } from '../views/PagoView.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

let reservaActual = null;
let archivoSeleccionado = null;
let expirado = false;
let expiresAtTimestamp = 0;

export const PagoController = {
    async init() {
        const sesion = await AuthModel.obtenerSesionActual();
        if (!sesion || !sesion.user) {
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const reservaId = params.get('reservaId') || params.get('id');
        const codigo = params.get('codigo');

        if (!reservaId) {
            PagoView.mostrarError('No se encontró el identificador de la reserva.');
            return;
        }

        try {
            reservaActual = await PagoModel.obtenerDetalleReserva(reservaId);
        } catch (error) {
            console.error(error);
            PagoView.mostrarError('No se pudieron cargar los datos de la reserva.');
            return;
        }

        if (codigo && reservaActual && !reservaActual.reservation_code) {
            reservaActual.reservation_code = codigo;
        }

        PagoView.renderDetalle(reservaActual);

        if (reservaActual.status === 'en_validacion' || reservaActual.status === 'confirmada') {
            PagoView.mostrarExito();
            return;
        }

        this.configurarTemporizador();
        this.configurarEventos();
    },

    configurarTemporizador() {
        if (!reservaActual) return;

        if (reservaActual.expires_at) {
            expiresAtTimestamp = new Date(reservaActual.expires_at).getTime();
        } else {
            const baseTime = reservaActual.created_at ? new Date(reservaActual.created_at).getTime() : Date.now();
            expiresAtTimestamp = baseTime + 60 * 60 * 1000;
        }

        const ahora = Date.now();
        if (ahora >= expiresAtTimestamp) {
            expirado = true;
            PagoView.mostrarMensajeExpirado();
            return;
        }

        PagoView.iniciarTemporizador(expiresAtTimestamp, () => {
            expirado = true;
            PagoView.mostrarMensajeExpirado();
        });
    },

    configurarEventos() {
        PagoView.bindArchivoSeleccionado((file) => {
            this.validarArchivo(file);
        });

        PagoView.bindRemoverArchivo(() => {
            archivoSeleccionado = null;
            PagoView.limpiarArchivoSeleccionado();
            PagoView.limpiarErrores();
        });

        PagoView.bindCopiarCodigo(() => {
            const codigo = reservaActual?.reservation_code || PagoView.elements.reservaCodigo?.textContent;
            if (codigo && navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(codigo).then(() => {
                    PagoView.mostrarCopiadoExitoso();
                }).catch(() => {});
            }
        });

        PagoView.bindSubirComprobante(() => {
            this.procesarSubidaComprobante();
        });
    },

    validarArchivo(file) {
        if (!file) return false;

        PagoView.limpiarErrores();

        if (expirado || Date.now() >= expiresAtTimestamp) {
            expirado = true;
            PagoView.mostrarMensajeExpirado();
            return false;
        }

        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const tipoValido = ALLOWED_MIME_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);

        if (!tipoValido) {
            PagoView.mostrarError('Formato no permitido. Solo se aceptan archivos JPG, PNG o PDF.');
            PagoView.limpiarArchivoSeleccionado();
            archivoSeleccionado = null;
            return false;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            PagoView.mostrarError('El archivo supera el tamaño máximo permitido de 5 MB.');
            PagoView.limpiarArchivoSeleccionado();
            archivoSeleccionado = null;
            return false;
        }

        archivoSeleccionado = file;
        PagoView.mostrarArchivoSeleccionado(file);
        return true;
    },

    async procesarSubidaComprobante() {
        if (!archivoSeleccionado || !reservaActual) {
            PagoView.mostrarError('Por favor selecciona un archivo de comprobante válido.');
            return;
        }

        if (expirado || Date.now() >= expiresAtTimestamp) {
            expirado = true;
            PagoView.mostrarMensajeExpirado();
            return;
        }

        PagoView.limpiarErrores();
        PagoView.setSubiendo(true);

        try {
            const fileHash = await PagoModel.calcularHashArchivo(archivoSeleccionado);

            if (Date.now() >= expiresAtTimestamp) {
                expirado = true;
                PagoView.mostrarMensajeExpirado();
                PagoView.setSubiendo(false);
                return;
            }

            const storageResult = await PagoModel.subirComprobanteStorage(reservaActual.id, archivoSeleccionado);
            const storagePath = storageResult.path;

            if (Date.now() >= expiresAtTimestamp) {
                expirado = true;
                PagoView.mostrarMensajeExpirado();
                PagoView.setSubiendo(false);
                return;
            }

            const mimeType = archivoSeleccionado.type || 'application/octet-stream';
            const fileSize = archivoSeleccionado.size;

            await PagoModel.notificarComprobante(
                reservaActual.id,
                storagePath,
                fileHash,
                mimeType,
                fileSize
            );

            reservaActual.status = 'en_validacion';
            PagoView.mostrarExito();
        } catch (error) {
            console.error(error);
            PagoView.mostrarError(error.message || 'Ocurrió un error al subir el comprobante. Intenta nuevamente.');
        } finally {
            PagoView.setSubiendo(false);
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PagoController.init(), { once: true });
} else {
    PagoController.init();
}

export default PagoController;
