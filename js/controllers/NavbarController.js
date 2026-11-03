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
 * @description Resuelve el tema visual preferido evaluando el almacenamiento local
 * o la preferencia del sistema operativo (prefers-color-scheme), retornando 'dark' por defecto.
 * @returns {'dark' | 'light'} Identificador del tema preferido.
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
    } catch (error) {
        console.warn('Advertencia al resolver tema preferido desde storage:', error);
    }
    return 'dark';
}

// Detección y aplicación temprana inmediata antes de terminar el render para evitar parpadeos
if (typeof document !== 'undefined' && document.documentElement) {
    const temaInicial = resolverTemaPreferido();
    document.documentElement.setAttribute('data-theme', temaInicial);
}

/**
 * Objeto controlador que gestiona el ciclo de vida, eventos de UI y sincronización del navbar
 */
export const NavbarController = {
    initialized: false,
    unsubscribeAuth: null,
    logoutCallbacks: new Set(),

    /**
     * @description Inicializa el controlador del navbar de forma idempotente,
     * aplicando el tema persistido y cableando escuchadores de eventos y observadores de autenticación.
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initialized) {
            await this.actualizarEstadoDesdeModelo();
            return;
        }

        this.initialized = true;

        const temaActual = this.obtenerTemaActual();
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('data-theme', temaActual);
        }
        NavbarView.actualizarIndicadorTema(temaActual);

        this.inicializarEventos();
        this.inicializarSuscripcionAuth();
        this.inicializarEscuchaPreferenciaSistema();
        await this.actualizarEstadoDesdeModelo();
    },

    /**
     * @description Retorna el tema actual activo en el documento HTML.
     * @returns {'dark' | 'light'} Tema activo.
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
     * @description Aplica el nuevo tema en el documento, persiste la selección en localStorage y sincroniza la vista.
     * @param {'dark' | 'light'} nuevoTema - Tema a activar.
     */
    aplicarTema(nuevoTema) {
        const tema = nuevoTema === 'light' ? 'light' : 'dark';
        try {
            localStorage.setItem(THEME_STORAGE_KEY, tema);
        } catch (error) {
            console.warn('No se pudo guardar la preferencia de tema en localStorage:', error);
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
     * @description Alterna suavemente entre el modo Claro y Oscuro.
     */
    alternarTema() {
        const actual = this.obtenerTemaActual();
        const siguiente = actual === 'dark' ? 'light' : 'dark';
        this.aplicarTema(siguiente);
    },

    /**
     * @description Escucha cambios en la preferencia del sistema operativo si no existe una configuración explícita.
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
        } catch (error) {
            console.warn('Advertencia al configurar mediaQuery listener de tema:', error);
        }
    },

    /**
     * @description Configura los escuchadores de eventos del DOM para dropdown, atajos de teclado y clics externos.
     */
    inicializarEventos() {
        const { btnUser, btnLogout, btnLogin, dropdownMenu, userContainer } = NavbarView.elements;

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

        const stopPropagationHandler = (event) => {
            if (event.target.closest('#nav-btn-logout') || event.target.closest('#nav-link-historial')) {
                return;
            }
            event.stopPropagation();
        };
        dropdownMenu?.addEventListener('click', stopPropagationHandler);
        dropdownMenu?.addEventListener('touchend', stopPropagationHandler);

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

        dropdownMenu?.addEventListener('keydown', (event) => {
            const btnToggle = event.target.closest('#btn-theme-toggle');
            if (btnToggle && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                event.stopPropagation();
                this.alternarTema();
            }
        });

        const outsideHandler = (event) => {
            if (!NavbarView.isDropdownAbierto()) return;

            const clickDentroDeMenu = userContainer?.contains(event.target);
            if (!clickDentroDeMenu) {
                NavbarView.cerrarDropdown();
            }
        };
        document.addEventListener('click', outsideHandler);
        document.addEventListener('touchend', outsideHandler);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && NavbarView.isDropdownAbierto()) {
                NavbarView.cerrarDropdown();
                NavbarView.elements.btnUser?.focus();
            }
        });

        btnLogout?.addEventListener('click', async (event) => {
            event.preventDefault();
            await this.manejarCerrarSesion();
        });

        btnLogin?.addEventListener('click', (event) => {
            const urlDestino = NavbarView.obtenerUrlLogin();
            if (urlDestino !== 'login.html') {
                event.preventDefault();
                window.location.href = urlDestino;
            }
        });

        NavbarView.elements.linkHistorial?.addEventListener('click', () => {
            NavbarView.cerrarDropdown();
        });

        NavbarView.elements.navMisTours?.addEventListener('click', async (event) => {
            const sesion = await AuthModel.obtenerSesionActual();
            if (!sesion || !sesion.user) {
                event.preventDefault();
                window.location.href = 'login.html?redirect=mis-tours.html';
            }
        });
    },

    /**
     * @description Suscribe un observador a los eventos de AuthModel para reflejar cambios reactivamente en el navbar.
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
     * @description Consulta el estado de sesión actual en AuthModel y sincroniza la vista del navbar.
     * @returns {Promise<void>}
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
     * @description Registra un callback que se invocará cuando el usuario cierre sesión desde el navbar.
     * @param {Function} callback - Función a ejecutar en cierre de sesión.
     * @returns {Function} Función para cancelar la suscripción.
     */
    onLogout(callback) {
        if (typeof callback === 'function') {
            this.logoutCallbacks.add(callback);
            return () => this.logoutCallbacks.delete(callback);
        }
        return () => {};
    },

    /**
     * @description Ejecuta el cierre de sesión a través del AuthModel y actualiza la interfaz.
     * @returns {Promise<void>}
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
