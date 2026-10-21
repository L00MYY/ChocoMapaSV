/**
 * js/controllers/NavbarController.js
 * Controlador del Componente Navbar Institucional para ChocoMapaSV (MITUR)
 * Conecta el modelo de autenticación (AuthModel) con la vista (NavbarView)
 * para proporcionar reactividad en tiempo real en todas las vistas.
 */

import { AuthModel } from '../models/AuthModel.js';
import { NavbarView } from '../views/NavbarView.js';

export const NavbarController = {
    initialized: false,
    unsubscribeAuth: null,

    /**
     * Inicializa el controlador del navbar de forma idempotente
     */
    async init() {
        if (this.initialized) {
            // Si ya se inicializó, sincronizar estado actual por si acaso
            await this.actualizarEstadoDesdeModelo();
            return;
        }

        this.initialized = true;
        this.inicializarEventos();
        this.inicializarSuscripcionAuth();
        await this.actualizarEstadoDesdeModelo();
    },

    /**
     * Configura los escuchadores de eventos del DOM
     */
    inicializarEventos() {
        const { btnUser, btnLogout, btnLogin, dropdownMenu, userContainer } = NavbarView.elements;

        // 1. Abrir/Cerrar Dropdown al hacer clic en el botón circular de usuario
        btnUser?.addEventListener('click', (event) => {
            event.stopPropagation();
            NavbarView.alternarDropdown();
        });

        // 2. Prevenir que clics dentro del contenido del dropdown (excepto botones de acción) lo cierren
        dropdownMenu?.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        // 3. Cerrar dropdown automáticamente al hacer clic en cualquier lugar fuera del menú
        document.addEventListener('click', (event) => {
            if (!NavbarView.isDropdownAbierto()) return;

            const clickDentroDeMenu = userContainer?.contains(event.target);
            if (!clickDentroDeMenu) {
                NavbarView.cerrarDropdown();
            }
        });

        // 4. Cerrar dropdown automáticamente al presionar la tecla Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && NavbarView.isDropdownAbierto()) {
                NavbarView.cerrarDropdown();
                NavbarView.elements.btnUser?.focus();
            }
        });

        // 5. Acción de Cerrar Sesión
        btnLogout?.addEventListener('click', async (event) => {
            event.preventDefault();
            await this.manejarCerrarSesion();
        });

        // 6. Clic en "Iniciar sesión": Asegurar parámetro de retorno si estamos en tour-detalle.html
        btnLogin?.addEventListener('click', (event) => {
            const urlDestino = NavbarView.obtenerUrlLogin();
            if (urlDestino !== 'login.html') {
                event.preventDefault();
                window.location.href = urlDestino;
            }
        });
    },

    /**
     * Suscribe un observador a los eventos del AuthModel para actualizar la UI reactivamente
     */
    inicializarSuscripcionAuth() {
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
        }

        this.unsubscribeAuth = AuthModel.onCambioEstadoAuth((evento, sesion) => {
            if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
                NavbarView.mostrarEstadoAutenticado(sesion);
            } else if (evento === 'SIGNED_OUT') {
                NavbarView.mostrarEstadoNoAutenticado();
            }
        });
    },

    /**
     * Consulta el estado de sesión actual en AuthModel y actualiza la vista
     */
    async actualizarEstadoDesdeModelo() {
        try {
            const sesion = await AuthModel.obtenerSesionActual();
            if (sesion && sesion.user) {
                NavbarView.mostrarEstadoAutenticado(sesion);
            } else {
                NavbarView.mostrarEstadoNoAutenticado();
            }
        } catch (error) {
            console.warn('Error al verificar sesión en NavbarController:', error);
            NavbarView.mostrarEstadoNoAutenticado();
        }
    },

    /**
     * Ejecuta el cierre de sesión a través del AuthModel y actualiza la interfaz
     */
    async manejarCerrarSesion() {
        try {
            NavbarView.cerrarDropdown();
            await AuthModel.cerrarSesion();
            NavbarView.mostrarEstadoNoAutenticado();
        } catch (error) {
            console.error('Error al cerrar sesión desde el Navbar:', error);
            NavbarView.mostrarEstadoNoAutenticado();
        }
    }
};

// Inicialización automática al cargar el documento
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NavbarController.init(), { once: true });
} else {
    NavbarController.init();
}

export default NavbarController;
