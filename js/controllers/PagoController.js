import { AuthModel } from '../models/AuthModel.js';
import { PagoModel } from '../models/PagoModel.js';
import { PagoView } from '../views/PagoView.js';
import { NavbarController } from './NavbarController.js';

const MAX_FILE_SIZE_BYTES = 5242880; // 5 MB (5,242,880 bytes)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

let reservaActual = null;
let archivoSeleccionado = null;
let expirado = false;
let expiresAtTimestamp = 0;

/**
 * @namespace PagoController
 * @description Controlador para el flujo de pago y adjunción de comprobantes de reserva.
 * Valida formatos (JPG, PNG, PDF), límites de peso (5MB), calcula hashes SHA-256
 * y gestiona el temporizador de cuenta regresiva de 60 minutos con protección de sesión.
 */
export const PagoController = {
    /**
     * @description Inicializa la verificación de autenticación, carga la reserva activa o por URL,
     * y configura el temporizador de pago y eventos del DOM.
     * @returns {Promise<void>}
     */
    async init() {
        // Configurar protección inmediata ante cierre de sesión
        this.configurarProteccionCierreSesion();

        // Asegurar inicialización y avatar del Navbar
        try {
            await NavbarController.init();
        } catch (e) {
            console.warn('NavbarController init warn:', e);
        }

        // 1. Validar si hay usuario autenticado. Si no hay sesión, redirigir a login.html?redirect=pago-comprobante.html
        const sesion = await AuthModel.obtenerSesionActual();
        if (!sesion || !sesion.user) {
            window.location.replace('login.html?redirect=pago-comprobante.html');
            return;
        }

        // 2. Obtener el id o reserva desde los parámetros de búsqueda de la URL
        const params = new URLSearchParams(window.location.search);
        const reservaId = params.get('id') || params.get('reserva') || params.get('reservaId');
        const codigo = params.get('codigo');

        let reserva = null;

        if (reservaId) {
            try {
                reserva = await PagoModel.obtenerDetalleReserva(reservaId);
            } catch (error) {
                console.error('Error al cargar datos de reserva:', error);
            }

            // Verificar en Supabase que la reserva exista y pertenezca al tourist_id actual
            if (!reserva || (reserva.tourist_id && sesion.user.id && reserva.tourist_id !== sesion.user.id)) {
                reserva = null;
            }
        } else {
            // Si NO viene un ID en la URL:
            // Consultar en tour_reservations si el usuario autenticado tiene alguna reserva activa en estado 'pendiente_pago' o 'en_validacion'
            try {
                reserva = await PagoModel.obtenerReservaActivaUsuario(sesion.user.id);
            } catch (error) {
                console.error('Error al consultar reserva activa:', error);
            }
        }

        // Si el usuario no tiene ninguna reserva activa (o el ID de la URL es inválido/inexistente):
        // Redirigir de inmediato a mis-tours.html con una alerta visible:
        // "No tienes ninguna reserva pendiente de pago por procesar",
        // eliminando la vista con placeholders ("CARGANDO...", "59:59").
        if (!reserva) {
            PagoView.mostrarEstadoVacio('No tienes ninguna reserva pendiente de pago por procesar');
            try {
                sessionStorage.setItem('mis_tours_alerta', 'No tienes ninguna reserva pendiente de pago por procesar');
            } catch (error) {
                console.warn('No se pudo guardar alerta en sessionStorage:', error);
            }
            window.location.replace('mis-tours.html?alerta=' + encodeURIComponent('No tienes ninguna reserva pendiente de pago por procesar'));
            return;
        }

        reservaActual = reserva;
        if (codigo && !reservaActual.reservation_code) {
            reservaActual.reservation_code = codigo;
        }

        PagoView.renderDetalle(reservaActual);

        // Verificar si la reserva ya cuenta con comprobante adjunto
        let tieneComprobante = false;
        try {
            const recibo = await PagoModel.verificarComprobanteExistente(reservaActual.id);
            if (recibo && recibo.storage_path) {
                tieneComprobante = true;
            }
        } catch (error) {
            console.warn('Error al verificar comprobante existente:', error);
        }

        if (reservaActual.status === 'confirmada' || reservaActual.status === 'Confirmado') {
            PagoView.mostrarReservaConfirmada();
            return;
        }

        if (reservaActual.status === 'en_validacion' || tieneComprobante) {
            PagoView.mostrarComprobanteEnValidacion();
            return;
        }

        this.configurarTemporizador();
        this.configurarEventos();
    },

    /**
     * @description Vincula protecciones reactivas en múltiples canales para cerrar la vista
     * y limpiar sesiones si el usuario activa el cierre de sesión en otra pestaña o en el Navbar.
     * @returns {void}
     */
    configurarProteccionCierreSesion() {
        const expulsarUsuario = () => {
            try {
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.clear();
                }
            } catch (error) {
                console.warn('No se pudo limpiar sessionStorage:', error);
            }
            if (typeof window !== 'undefined' && window.location?.replace) {
                window.location.replace('login.html');
            }
        };

        // 1. Suscribirse a los cambios de estado de autenticación de Supabase
        if (typeof window !== 'undefined' && window.supabase?.auth?.onAuthStateChange) {
            try {
                window.supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_OUT' || !session) {
                        expulsarUsuario();
                    }
                });
            } catch (error) {
                console.warn('Error al suscribir a Supabase onAuthStateChange:', error);
            }
        }

        if (AuthModel.onCambioEstadoAuth) {
            try {
                AuthModel.onCambioEstadoAuth((event, session) => {
                    if (event === 'SIGNED_OUT' || !session) {
                        expulsarUsuario();
                    }
                });
            } catch (error) {
                console.warn('Error al suscribir a AuthModel.onCambioEstadoAuth:', error);
            }
        }

        if (NavbarController?.onLogout) {
            try {
                NavbarController.onLogout(() => {
                    expulsarUsuario();
                });
            } catch (error) {
                console.warn('Error al registrar listener onLogout de NavbarController:', error);
            }
        }

        if (typeof window !== 'undefined' && window.addEventListener) {
            try {
                window.addEventListener('auth:logout', () => {
                    expulsarUsuario();
                });
            } catch (error) {
                console.warn('Error al escuchar evento auth:logout:', error);
            }
        }

        // 2. En el manejador del botón #nav-btn-logout (o enlace de cerrar sesión en el Navbar):
        const configurarBotonLogout = () => {
            const btnLogout = typeof document !== 'undefined' && typeof document.getElementById === 'function'
                ? document.getElementById('nav-btn-logout')
                : null;
            if (btnLogout && !btnLogout.dataset?.pagoLogoutBound) {
                if (btnLogout.dataset) {
                    btnLogout.dataset.pagoLogoutBound = 'true';
                }
                btnLogout.addEventListener?.('click', async (e) => {
                    e.preventDefault?.();
                    e.stopPropagation?.();

                    try {
                        if (typeof window !== 'undefined' && window.supabase?.auth?.signOut) {
                            await window.supabase.auth.signOut();
                        }
                    } catch (error) {
                        console.warn('Error en supabase.auth.signOut:', error);
                    }

                    try {
                        await AuthModel.cerrarSesion();
                    } catch (error) {
                        console.warn('Error en AuthModel.cerrarSesion:', error);
                    }

                    expulsarUsuario();
                }, true);
            }
        };

        configurarBotonLogout();
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('DOMContentLoaded', configurarBotonLogout, { once: true });
        }

        // 3. Verificar en el ciclo de vida de la página (visibilitychange, focus, pageshow) que si AuthModel.obtenerSesionActual() retorna null, se aplique window.location.replace('login.html')
        const verificarSesionCicloVida = async () => {
            try {
                const sesion = await AuthModel.obtenerSesionActual();
                if (!sesion || !sesion.user) {
                    expulsarUsuario();
                }
            } catch (error) {
                console.warn('Error al verificar sesión en ciclo de vida:', error);
            }
        };

        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState === 'visible') {
                    await verificarSesionCicloVida();
                }
            });
        }

        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('focus', async () => {
                await verificarSesionCicloVida();
            });
            window.addEventListener('pageshow', async () => {
                await verificarSesionCicloVida();
            });
        }
    },

    /**
     * @description Calcula el tiempo restante según el campo `expires_at` de la reserva y activa la cuenta regresiva.
     * @returns {void}
     */
    configurarTemporizador() {
        if (!reservaActual) return;

        // Leer el campo expires_at (timestamptz) directamente desde el registro de la reserva
        let expiresAtIso = reservaActual.expires_at;
        if (!expiresAtIso) {
            const baseTime = reservaActual.created_at ? new Date(reservaActual.created_at).getTime() : Date.now();
            expiresAtIso = new Date(baseTime + 3600000).toISOString();
            reservaActual.expires_at = expiresAtIso;
        }

        const expDate = new Date(expiresAtIso);
        const ahora = new Date();
        const diferenciaMs = expDate.getTime() - ahora.getTime();
        expiresAtTimestamp = expDate.getTime();

        // Si la diferencia es menor o igual a 0, detener el temporizador, mostrar 00:00,
        // deshabilitar el botón de adjuntar archivo y mostrar el mensaje: "El tiempo para pagar esta reserva venció"
        if (diferenciaMs <= 0) {
            expirado = true;
            PagoView.mostrarMensajeExpirado();
            return;
        }

        PagoView.iniciarTemporizador(expiresAtIso, () => {
            expirado = true;
            PagoView.mostrarMensajeExpirado();
        });
    },

    /**
     * @description Enlaza los callbacks de interacción de la vista para subida, eliminación y copia de código.
     * @returns {void}
     */
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
                }).catch(error => {
                    console.warn('No se pudo copiar código al portapapeles:', error);
                });
            }
        });

        PagoView.bindSubirComprobante(() => {
            this.procesarSubidaComprobante();
        });
    },

    /**
     * @description Valida si el archivo provisto cumple los requerimientos de formato, peso y no expiración.
     * @param {File} file - Objeto de archivo capturado por el input o drag-and-drop.
     * @returns {boolean} `true` si el archivo es aceptado, `false` en caso contrario.
     */
    validarArchivo(file) {
        if (!file) return false;

        PagoView.limpiarErrores();

        // Validar expiración en el cliente
        if (expirado || (expiresAtTimestamp && Date.now() >= expiresAtTimestamp)) {
            expirado = true;
            PagoView.mostrarMensajeExpirado();
            return false;
        }

        // Determinar MIME type
        let mimeType = file.type;
        if (!mimeType) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'pdf') mimeType = 'application/pdf';
        }

        // Validar formato MIME: ['image/jpeg', 'image/png', 'application/pdf']
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            PagoView.mostrarError('Formato no permitido. Solo se aceptan archivos JPG, PNG o PDF');
            PagoView.limpiarArchivoSeleccionado();
            archivoSeleccionado = null;
            return false;
        }

        // Validar tamaño máximo: 5 MB (5,242,880 bytes)
        if (file.size > MAX_FILE_SIZE_BYTES) {
            PagoView.mostrarError('El archivo supera el tamaño máximo permitido de 5 MB');
            PagoView.limpiarArchivoSeleccionado();
            archivoSeleccionado = null;
            return false;
        }

        archivoSeleccionado = file;
        PagoView.mostrarArchivoSeleccionado(file);
        return true;
    },

    /**
     * @description Orquesta la subida física del comprobante a Supabase Storage y el registro del recibo en PostgreSQL.
     * @returns {Promise<void>}
     */
    async procesarSubidaComprobante() {
        if (!archivoSeleccionado || !reservaActual) {
            PagoView.mostrarError('Por favor selecciona un archivo de comprobante válido.');
            return;
        }

        if (!this.validarArchivo(archivoSeleccionado)) {
            return;
        }

        if (expirado || (expiresAtTimestamp && Date.now() >= expiresAtTimestamp)) {
            expirado = true;
            PagoView.mostrarMensajeExpirado();
            return;
        }

        PagoView.limpiarErrores();
        PagoView.setSubiendo(true);

        try {
            const reservationId = reservaActual.id;

            // 1. Subida a Supabase Storage con SDK oficial
            const storageResult = await PagoModel.subirComprobanteStorage(reservationId, archivoSeleccionado);
            const storagePath = storageResult.path;

            // 2. Insertar en payment_receipts y actualizar tour_reservations a 'en_validacion'
            const fileHash = await PagoModel.calcularHashArchivo(archivoSeleccionado).catch(() => null);
            const mimeType = archivoSeleccionado.type || 'application/octet-stream';
            const fileSize = archivoSeleccionado.size;

            await PagoModel.notificarComprobante(
                reservationId,
                storagePath,
                fileHash,
                mimeType,
                fileSize
            );

            reservaActual.status = 'en_validacion';

            // 3. Mostrar estado post-subida
            PagoView.mostrarExito();
        } catch (error) {
            console.error('Error al procesar subida de comprobante:', error);
            PagoView.mostrarError(error.message || 'Ocurrió un error al subir el comprobante. Intenta nuevamente.');
        } finally {
            PagoView.setSubiendo(false);
        }
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PagoController.init(), { once: true });
    } else {
        PagoController.init();
    }
}

export default PagoController;
