/**
 * js/controllers/LoginController.js
 * Controlador del Inicio de Sesión para ChocoMapaSV (MITUR)
 * Orquestador entre la vista (LoginView) y el modelo (AuthModel).
 */

import { AuthModel, validarFormularioLogin, MENSAJE_ERROR_CREDENCIALES } from '../models/AuthModel.js';
import { LoginView } from '../views/LoginView.js';

/**
 * Objeto controlador que gestiona el formulario de login y redirecciones seguras
 */
export const LoginController = {
    /**
     * @description Inicializa los listeners y el flujo de verificación de sesión previa.
     * @returns {Promise<void>}
     */
     * @returns {Promise<void>}
    async init() {
        this.inicializarEventos();
        await this.verificarSesionExistente();
    },

    /**
     * @description Si el usuario ya cuenta con una sesión activa, lo redirige de inmediato.
     * @returns {Promise<boolean>} True si existía sesión y se inició redirección.
     */
     * @returns {Promise<void>}
    async verificarSesionExistente() {
        try {
            const sesion = await AuthModel.obtenerSesionActual();
            if (sesion) {
                this.redirigirUsuario();
                return true;
            }
        } catch (error) {
            console.warn('Verificación de sesión previa finalizada sin sesión:', error);
        }
        return false;
    },

    /**
     * @description Configura los escuchadores de eventos sobre los elementos de LoginView.
     */
     * @returns {void}
    inicializarEventos() {
        const { form, emailInput, passwordInput, passwordToggleBtn } = LoginView.elements;

        emailInput?.addEventListener('input', () => {
            LoginView.limpiarErrorCampo('email');
            LoginView.limpiarError();
        });

        passwordInput?.addEventListener('input', () => {
            LoginView.limpiarErrorCampo('password');
            LoginView.limpiarError();
        });

        passwordToggleBtn?.addEventListener('click', () => {
            if (!passwordInput) return;
            const esPassword = passwordInput.getAttribute('type') === 'password';
            const nuevoTipo = esPassword ? 'text' : 'password';
            passwordInput.setAttribute('type', nuevoTipo);
            passwordToggleBtn.setAttribute('aria-label', esPassword ? 'Ocultar contraseña' : 'Ver contraseña');
            passwordToggleBtn.classList.toggle('active', esPassword);
        });

        form?.addEventListener('submit', (event) => {
            this.manejarSubmit(event);
        });
    },

    /**
     * @description Maneja el envío del formulario de inicio de sesión, validando campos y autenticando con Supabase.
     * @param {Event} event - Evento submit del formulario.
     * @returns {Promise<void>}
     */
     * @returns {Promise<void>}
    async manejarSubmit(event) {
        event.preventDefault();
        LoginView.limpiarError();

        const credenciales = LoginView.obtenerCredenciales();

        const validacion = validarFormularioLogin(credenciales);
        if (!validacion.esValido) {
            if (validacion.errores.email) {
                LoginView.mostrarErrorCampo('email', validacion.errores.email);
            }
            if (validacion.errores.password) {
                LoginView.mostrarErrorCampo('password', validacion.errores.password);
            }
            return;
        }

        LoginView.mostrarCargando(true);

        try {
            await AuthModel.iniciarSesion(credenciales.email, credenciales.password);

            const { form } = LoginView.elements;
            if (form && typeof form.reset === 'function') {
                form.reset();
            } else if (typeof LoginView.limpiarFormulario === 'function') {
                LoginView.limpiarFormulario();
            }
            LoginView.mostrarCargando(false);

            this.redirigirUsuario();
        } catch (error) {
            console.error('Error de autenticación:', error);
            LoginView.mostrarCargando(false);
            LoginView.mostrarError(MENSAJE_ERROR_CREDENCIALES);
            LoginView.marcarCampoInvalido('passwordInput', true);
        }
    },

    /**
     * @description Redirige al destino especificado en el parámetro ?redirect= o a mapa.html por defecto,
     * aplicando validación de origen para prevenir ataques de Open Redirect.
     */
     * @returns {void}
    redirigirUsuario() {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');

        if (redirect) {
            try {
                const urlDecodificada = decodeURIComponent(redirect);
                const esLogin = urlDecodificada.toLowerCase().includes('login.html');
                if (!esLogin) {
                    if (urlDecodificada.startsWith('http://') || urlDecodificada.startsWith('https://')) {
                        const destinoUrl = new URL(urlDecodificada);
                        if (destinoUrl.origin === window.location.origin) {
                            window.location.replace(urlDecodificada);
                            return;
                        }
                    } else {
                        window.location.replace(urlDecodificada);
                        return;
                    }
                }
            } catch (error) {
                console.warn('Advertencia al decodificar URL de redirección:', error);
            }
        }

        window.location.replace('mapa.html');
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('pageshow', async () => {
        const haySesion = await LoginController.verificarSesionExistente();
        if (!haySesion) {
            LoginView.mostrarCargando(false);
        }
    });
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LoginController.init(), { once: true });
    } else {
        LoginController.init();
    }
}

export default LoginController;
