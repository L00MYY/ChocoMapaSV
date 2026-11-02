/**
 * js/controllers/NavbarController.js
 * Controlador del Componente Navbar Institucional para ChocoMapaSV (MITUR)
 * Conecta el modelo de autenticación (AuthModel) con la vista (NavbarView)
 * y orquesta el sistema unificado de Temas (Claro y Oscuro) persistido en localStorage.
 */

import { AuthModel } from '../models/AuthModel.js';
import { NavbarView } from '../views/NavbarView.js';

const THEME_STORAGE_KEY = 'chocomapa_theme';

/**
 * Resuelve el tema preferido: evalúa localStorage o prefers-color-scheme (por defecto 'dark')
 * @returns {'dark' | 'light'}
 */
export function resolverTemaPreferido() {
    try {
        const temaGuardado = localStorage.getItem(THEME_STORAGE_KEY);
        if (temaGuardado === 'light' || temaGuardado === 'dark') {
            return temaGuardado;
        }
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
    } catch (e) {
        // Fallback seguro si localStorage está bloqueado
    }
    return 'dark';
}

// Detección y aplicación temprana inmediata antes de terminar el render para evitar parpadeos
if (typeof document !== 'undefined' && document.documentElement) {
    const temaInicial = resolverTemaPreferido();
    document.documentElement.setAttribute('data-theme', temaInicial);
}

export const NavbarController = {
    initialized: false,
    unsubscribeAuth: null,
    logoutCallbacks: new Set(),

    /**
     * Inicializa el controlador del navbar de forma idempotente
     */
    async init() {
        if (this.initialized) {
            await this.actualizarEstadoDesdeModelo();
            return;
        }

        this.initialized = true;

        // Asegurar que el tema actual esté aplicado en <html> y reflejado en el indicador
        const temaActual = this.obtenerTemaActual();
        document.documentElement.setAttribute('data-theme', temaActual);
        NavbarView.actualizarIndicadorTema(temaActual);

        this.inicializarEventos();
        this.inicializarSuscripcionAuth();
        this.inicializarEscuchaPreferenciaSistema();
        await this.actualizarEstadoDesdeModelo();
    },

    /**
     * Retorna el tema actual activo en el documento
     * @returns {'dark' | 'light'}
     */
    obtenerTemaActual() {
        if (typeof document !== 'undefined' && document.documentElement) {
            const attr = document.documentElement.getAttribute('data-theme');
            if (attr === 'dark' || attr === 'light') {
                return attr;
            }
        }
        return resolverTemaPreferido();
    },

    /**
     * Aplica el nuevo tema en <html>, lo persiste en localStorage y actualiza la vista
     * @param {'dark' | 'light'} nuevoTema 
     */
    aplicarTema(nuevoTema) {
        const tema = nuevoTema === 'light' ? 'light' : 'dark';
        try {
            localStorage.setItem(THEME_STORAGE_KEY, tema);
        } catch (e) {
            console.warn('No se pudo guardar la preferencia de tema en localStorage:', e);
        }

        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('data-theme', tema);
        }

        NavbarView.actualizarIndicadorTema(tema);

        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('chocomapa:themechange', { detail: { theme: tema } }));
        }
    },

    /**
     * Alterna suavemente entre el modo Claro y Oscuro
     */
    alternarTema() {
        const actual = this.obtenerTemaActual();
        const siguiente = actual === 'dark' ? 'light' : 'dark';
        this.aplicarTema(siguiente);
    },

    /**
     * Escucha cambios en la preferencia del sistema operativo si no hay una explícita guardada
     */
    inicializarEscuchaPreferenciaSistema() {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        try {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                const tienePreferenciaGuardada = !!localStorage.getItem(THEME_STORAGE_KEY);
                if (!tienePreferenciaGuardada) {
                    this.aplicarTema(e.matches ? 'dark' : 'light');
                }
            });
        } catch (e) {
            // Ignorar en navegadores antiguos
        }
    },

    /**
     * Configura los escuchadores de eventos del DOM
     */
    inicializarEventos() {
        const { btnUser, btnLogout, btnLogin, dropdownMenu, userContainer } = NavbarView.elements;

        // 1. Abrir/Cerrar Dropdown al hacer clic o toque en el botón circular de usuario (móvil y escritorio)
        let lastToggleTime = 0;
        const toggleDropdown = (event) => {
            const now = Date.now();
            if (now - lastToggleTime < 350) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            lastToggleTime = now;
            event.preventDefault();
            event.stopPropagation();
            NavbarView.alternarDropdown();
        };

        btnUser?.addEventListener('click', toggleDropdown);
        btnUser?.addEventListener('touchend', toggleDropdown);

        // 2. Prevenir que clics y toques generales dentro del dropdown lo cierren (excepto botones que lo indiquen)
        const stopPropagationHandler = (event) => {
            // No detener si es el botón de cerrar sesión o enlaces
            if (event.target.closest('#nav-btn-logout') || event.target.closest('#nav-link-historial')) {
                return;
            }
            event.stopPropagation();
        };
        dropdownMenu?.addEventListener('click', stopPropagationHandler);
        dropdownMenu?.addEventListener('touchend', stopPropagationHandler);

        // 3. Manejador del Toggle de Tema (clic y soporte táctil mediante delegación)
        const handleThemeToggle = (event) => {
            const btnToggle = event.target.closest('#btn-theme-toggle');
            if (btnToggle) {
                event.preventDefault();
                event.stopPropagation();
                this.alternarTema();
            }
        };

        dropdownMenu?.addEventListener('click', handleThemeToggle);
        dropdownMenu?.addEventListener('touchend', handleThemeToggle);

        // 4. Accesibilidad por teclado para el Toggle de Tema (Enter o Espacio)
        dropdownMenu?.addEventListener('keydown', (event) => {
            const btnToggle = event.target.closest('#btn-theme-toggle');
            if (btnToggle && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                event.stopPropagation();
                this.alternarTema();
            }
        });

        // 5. Cerrar dropdown automáticamente al hacer clic o toque en cualquier lugar fuera del menú
        const outsideHandler = (event) => {
            if (!NavbarView.isDropdownAbierto()) return;

            const clickDentroDeMenu = userContainer?.contains(event.target);
            if (!clickDentroDeMenu) {
                NavbarView.cerrarDropdown();
            }
        };
        document.addEventListener('click', outsideHandler);
        document.addEventListener('touchend', outsideHandler);

        // 6. Cerrar dropdown automáticamente al presionar la tecla Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && NavbarView.isDropdownAbierto()) {
                NavbarView.cerrarDropdown();
                NavbarView.elements.btnUser?.focus();
            }
        });

        // 7. Acción de Cerrar Sesión
        btnLogout?.addEventListener('click', async (event) => {
            event.preventDefault();
            await this.manejarCerrarSesion();
        });

        // 8. Clic en "Iniciar sesión": Asegurar parámetro de retorno si estamos en tour-detalle.html o mis-tours.html
        btnLogin?.addEventListener('click', (event) => {
            const urlDestino = NavbarView.obtenerUrlLogin();
            if (urlDestino !== 'login.html') {
                event.preventDefault();
                window.location.href = urlDestino;
            }
        });

        // 9. Clic en enlace "Mis tours" en dropdown: cerrar menú
        NavbarView.elements.linkHistorial?.addEventListener('click', () => {
            NavbarView.cerrarDropdown();
        });

        // 10. Clic en enlace "Mis tours" en navegación principal: guardia si no hay sesión
        NavbarView.elements.navMisTours?.addEventListener('click', async (event) => {
            const sesion = await AuthModel.obtenerSesionActual();
            if (!sesion || !sesion.user) {
                event.preventDefault();
                window.location.href = 'login.html?redirect=mis-tours.html';
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
                NavbarView.actualizarIndicadorTema(this.obtenerTemaActual());
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
                NavbarView.actualizarIndicadorTema(this.obtenerTemaActual());
            } else {
                NavbarView.mostrarEstadoNoAutenticado();
            }
        } catch (error) {
            console.warn('Error al verificar sesión en NavbarController:', error);
            NavbarView.mostrarEstadoNoAutenticado();
        }
    },

    /**
     * Registra un callback que se invocará cuando el usuario cierre sesión desde el navbar
     * @param {Function} callback
     * @returns {Function} Función para cancelar la suscripción
     */
    onLogout(callback) {
        if (typeof callback === 'function') {
            this.logoutCallbacks.add(callback);
            return () => this.logoutCallbacks.delete(callback);
        }
        return () => {};
    },

    /**
     * Ejecuta el cierre de sesión a través del AuthModel y actualiza la interfaz
     */
    async manejarCerrarSesion() {
        try {
            NavbarView.cerrarDropdown();
            await AuthModel.cerrarSesion();
            NavbarView.mostrarEstadoNoAutenticado();
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('auth:logout'));
            }
            this.logoutCallbacks.forEach(cb => {
                try { cb(); } catch (err) { console.error('Error en callback logout:', err); }
            });
        } catch (error) {
            console.error('Error al cerrar sesión desde el Navbar:', error);
            NavbarView.mostrarEstadoNoAutenticado();
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('auth:logout'));
            }
            this.logoutCallbacks.forEach(cb => {
                try { cb(); } catch (err) { console.error('Error en callback logout:', err); }
            });
        }
    }
};

// Inicialización automática al cargar el documento en el navegador
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NavbarController.init(), { once: true });
    } else {
        NavbarController.init();
    }
}

export default NavbarController;
