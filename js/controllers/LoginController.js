/**
 * js/controllers/LoginController.js
 * Controlador del Inicio de Sesión para ChocoMapaSV (MITUR)
 * Orquestador entre la vista (LoginView) y el modelo (AuthModel).
 */

import { AuthModel } from '../models/AuthModel.js';
import { LoginView } from '../views/LoginView.js';

export const LoginController = {
    /**
     * Inicializa los listeners y el flujo del controlador
     */
    async init() {
        this.inicializarEventos();
        await this.verificarSesionExistente();
    },

    /**
     * Si el usuario ya cuenta con una sesión activa, lo redirige de inmediato
     */
    async verificarSesionExistente() {
        try {
            const sesion = await AuthModel.obtenerSesionActual();
            if (sesion) {
                this.redirigirUsuario();
            }
        } catch (error) {
            console.warn('Verificación de sesión previa finalizada sin sesión:', error);
        }
    },

    /**
     * Configura los escuchadores de eventos sobre los elementos de LoginView
     */
    inicializarEventos() {
        const { form, emailInput, passwordInput, passwordToggleBtn } = LoginView.elements;

        // Limpiar errores cuando el usuario edite cualquiera de los campos
        emailInput?.addEventListener('input', () => {
            LoginView.limpiarError();
        });

        passwordInput?.addEventListener('input', () => {
            LoginView.limpiarError();
        });

        // Alternar visibilidad de contraseña
        passwordToggleBtn?.addEventListener('click', () => {
            if (!passwordInput) return;
            const esPassword = passwordInput.getAttribute('type') === 'password';
            const nuevoTipo = esPassword ? 'text' : 'password';
            passwordInput.setAttribute('type', nuevoTipo);
            passwordToggleBtn.setAttribute('aria-label', esPassword ? 'Ocultar contraseña' : 'Ver contraseña');
            passwordToggleBtn.classList.toggle('active', esPassword);
        });

        // Evento submit del formulario
        form?.addEventListener('submit', (event) => {
            this.manejarSubmit(event);
        });
    },

    /**
     * Maneja el envío del formulario de inicio de sesión
     * 
     * @param {Event} event 
     */
    async manejarSubmit(event) {
        event.preventDefault();
        LoginView.limpiarError();

        const { email, password } = LoginView.obtenerCredenciales();

        // 1. Validación de campos obligatorios
        if (!email || !password) {
            LoginView.mostrarError('Todos los campos son obligatorios');
            if (!email) LoginView.marcarCampoInvalido('emailInput', true);
            else if (!password) LoginView.marcarCampoInvalido('passwordInput', true);
            return;
        }

        // 2. Estado visual de carga
        LoginView.mostrarCargando(true);

        try {
            // 3. Autenticación con Supabase Auth
            await AuthModel.iniciarSesion(email, password);

            // 4. Redirección en caso de éxito
            this.redirigirUsuario();
        } catch (error) {
            console.error('Error de autenticación:', error);
            LoginView.mostrarCargando(false);
            LoginView.mostrarError('Correo o contraseña incorrectos');
            LoginView.marcarCampoInvalido('passwordInput', true);
        }
    },

    /**
     * Redirige al destino especificado en el parámetro ?redirect= o a mapa.html por defecto
     */
    redirigirUsuario() {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');

        if (redirect) {
            try {
                const urlDecodificada = decodeURIComponent(redirect);
                // Validación básica de seguridad para evitar redirecciones abiertas maliciosas
                if (urlDecodificada.startsWith('http://') || urlDecodificada.startsWith('https://')) {
                    const destinoUrl = new URL(urlDecodificada);
                    if (destinoUrl.origin === window.location.origin) {
                        window.location.href = urlDecodificada;
                        return;
                    }
                } else {
                    // Es una ruta relativa válida
                    window.location.href = urlDecodificada;
                    return;
                }
            } catch (_) {
                // Si falla la decodificación, se ignora y se redirige a la ruta por defecto
            }
        }

        // Redirección por defecto
        window.location.href = 'mapa.html';
    }
};

// Inicialización automática al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LoginController.init(), { once: true });
} else {
    LoginController.init();
}

export default LoginController;
