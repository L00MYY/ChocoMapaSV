/**
 * js/views/NavbarView.js
 * Vista del Componente Navbar Institucional para ChocoMapaSV (MITUR)
 * Gestiona la representación del estado de autenticación (Login / Perfil y Dropdown)
 * siguiendo la arquitectura MVC.
 */

export const NavbarView = {
    /**
     * Getters dinámicos para los elementos del DOM relacionados con autenticación en el navbar
     */
    get elements() {
        return {
            navAuth: document.getElementById('nav-auth'),
            btnLogin: document.getElementById('nav-btn-login'),
            userContainer: document.getElementById('nav-user-container'),
            btnUser: document.getElementById('nav-user-btn'),
            avatarSpan: document.getElementById('nav-user-avatar'),
            dropdownMenu: document.getElementById('nav-user-dropdown'),
            userEmail: document.getElementById('nav-user-email'),
            btnLogout: document.getElementById('nav-btn-logout'),
            linkHistorial: document.getElementById('nav-link-historial')
        };
    },

    /**
     * Extrae una letra inicial representativa del usuario (del nombre o correo)
     * @param {Object} user 
     * @returns {string|null}
     */
    obtenerInicialUsuario(user) {
        if (!user) return null;
        const nombre = user.user_metadata?.nombre || user.user_metadata?.name || user.user_metadata?.full_name;
        if (nombre && typeof nombre === 'string' && nombre.trim().length > 0) {
            return nombre.trim().charAt(0).toUpperCase();
        }
        if (user.email && typeof user.email === 'string' && user.email.trim().length > 0) {
            return user.email.trim().charAt(0).toUpperCase();
        }
        return null;
    },

    /**
     * Obtiene la URL de inicio de sesión, agregando el parámetro de retorno
     * si la página actual es tour-detalle.html
     * @returns {string}
     */
    obtenerUrlLogin() {
        const esTourDetalle = window.location.pathname.includes('tour-detalle.html');
        if (!esTourDetalle) {
            return 'login.html';
        }
        const archivoActual = window.location.pathname.split('/').pop() || 'tour-detalle.html';
        const rutaRelativa = `${archivoActual}${window.location.search}${window.location.hash}`;
        return `login.html?redirect=${encodeURIComponent(rutaRelativa)}`;
    },

    /**
     * Muestra la interfaz para el estado AUTENTICADO:
     * - Oculta botón "Iniciar sesión"
     * - Muestra botón circular de perfil
     * - Renderiza la inicial del usuario o icono por defecto
     * - Configura correo en el dropdown
     * @param {Object} sesion 
     */
    mostrarEstadoAutenticado(sesion) {
        const { btnLogin, userContainer, avatarSpan, userEmail, btnUser } = this.elements;

        if (btnLogin) {
            btnLogin.classList.add('hidden');
        }

        if (userContainer) {
            userContainer.classList.remove('hidden');
        }

        const email = sesion?.user?.email || 'Usuario';
        if (userEmail) {
            userEmail.textContent = email;
            userEmail.title = email;
        }

        const inicial = this.obtenerInicialUsuario(sesion?.user);
        if (avatarSpan) {
            if (inicial) {
                avatarSpan.innerHTML = `<span class="nav-user-avatar-text">${inicial}</span>`;
            } else {
                avatarSpan.innerHTML = `
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                `;
            }
        }

        if (btnUser) {
            btnUser.setAttribute('title', `Cuenta de ${email}`);
            btnUser.setAttribute('aria-label', `Menú de usuario para ${email}`);
        }
    },

    /**
     * Muestra la interfaz para el estado NO AUTENTICADO:
     * - Muestra botón "Iniciar sesión" con redirección configurada
     * - Oculta el contenedor de usuario
     * - Cierra el dropdown si estaba abierto
     */
    mostrarEstadoNoAutenticado() {
        const { btnLogin, userContainer } = this.elements;

        if (userContainer) {
            userContainer.classList.add('hidden');
        }

        if (btnLogin) {
            btnLogin.classList.remove('hidden');
            btnLogin.href = this.obtenerUrlLogin();
        }

        this.cerrarDropdown();
    },

    /**
     * Alterna la visibilidad del dropdown de usuario
     * @param {boolean} [forzar] - Opcional para forzar apertura o cierre
     */
    alternarDropdown(forzar) {
        const { dropdownMenu, btnUser } = this.elements;
        if (!dropdownMenu || !btnUser) return;

        const abrir = typeof forzar === 'boolean'
            ? forzar
            : dropdownMenu.classList.contains('hidden');

        if (abrir) {
            dropdownMenu.classList.remove('hidden');
            btnUser.setAttribute('aria-expanded', 'true');
        } else {
            dropdownMenu.classList.add('hidden');
            btnUser.setAttribute('aria-expanded', 'false');
        }
    },

    /**
     * Cierra el dropdown y actualiza los atributos de accesibilidad
     */
    cerrarDropdown() {
        const { dropdownMenu, btnUser } = this.elements;
        if (dropdownMenu) {
            dropdownMenu.classList.add('hidden');
        }
        if (btnUser) {
            btnUser.setAttribute('aria-expanded', 'false');
        }
    },

    /**
     * Retorna si el dropdown se encuentra abierto actualmente
     * @returns {boolean}
     */
    isDropdownAbierto() {
        const { dropdownMenu } = this.elements;
        return Boolean(dropdownMenu && !dropdownMenu.classList.contains('hidden'));
    }
};

export default NavbarView;
