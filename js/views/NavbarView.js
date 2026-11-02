/**
 * js/views/NavbarView.js
 * Vista del Componente Navbar Institucional para ChocoMapaSV (MITUR)
 * Gestiona la representación del estado de autenticación (Login / Perfil y Dropdown)
 * y el switch global de Tema (Oscuro / Claro) siguiendo la arquitectura MVC.
 */

export const NavbarView = {
    /**
     * Getters dinámicos para los elementos del DOM relacionados con autenticación y temas en el navbar
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
            linkHistorial: document.getElementById('nav-link-historial'),
            navMisTours: document.getElementById('nav-mis-tours'),
            btnThemeToggle: document.getElementById('btn-theme-toggle'),
            themeIconIndicator: document.getElementById('theme-icon-indicator'),
            themeTextIndicator: document.getElementById('theme-text-indicator'),
            navThemeItem: document.getElementById('nav-theme-item-wrapper')
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
     * si la página actual es tour-detalle.html o mis-tours.html
     * @returns {string}
     */
    obtenerUrlLogin() {
        const path = window.location.pathname;
        const esPaginaRetorno = path.includes('tour-detalle.html') || path.includes('mis-tours.html');
        if (!esPaginaRetorno) {
            return 'login.html';
        }
        const archivoActual = path.split('/').pop() || 'index.html';
        const rutaRelativa = `${archivoActual}${window.location.search}${window.location.hash}`;
        return `login.html?redirect=${encodeURIComponent(rutaRelativa)}`;
    },

    /**
     * Inyecta el botón de alternancia dentro del dropdown del avatar exclusivamente cuando el usuario está autenticado
     * @param {string} [tema] Tema actual ('dark' | 'light')
     */
    inyectarThemeToggle(tema) {
        let toggleContainer = document.getElementById('btn-theme-toggle');
        if (!toggleContainer) {
            const dropdownUl = document.querySelector('#nav-user-dropdown .nav-dropdown-menu');
            if (!dropdownUl) return;

            const li = document.createElement('li');
            li.setAttribute('role', 'none');
            li.id = 'nav-theme-item-wrapper';
            li.innerHTML = `
                <div class="nav-dropdown-divider"></div>
                <div class="nav-theme-toggle-container" id="btn-theme-toggle" role="button" tabindex="0" aria-label="Cambiar tema">
                  <div class="theme-label-wrapper">
                    <span class="theme-icon" id="theme-icon-indicator">🌙</span>
                    <span class="theme-title" id="theme-text-indicator">Modo Oscuro</span>
                  </div>
                  <div class="theme-switch-pill">
                    <span class="theme-switch-circle"></span>
                  </div>
                </div>
            `;

            const btnLogout = document.getElementById('nav-btn-logout');
            if (btnLogout) {
                const logoutLi = btnLogout.closest('li');
                if (logoutLi && logoutLi.previousElementSibling && logoutLi.previousElementSibling.classList.contains('nav-dropdown-divider')) {
                    dropdownUl.insertBefore(li, logoutLi.previousElementSibling);
                } else if (logoutLi) {
                    dropdownUl.insertBefore(li, logoutLi);
                } else {
                    dropdownUl.appendChild(li);
                }
            } else {
                dropdownUl.appendChild(li);
            }
        }

        const temaActual = tema || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null) || 'dark';
        this.actualizarIndicadorTema(temaActual);
    },

    /**
     * Elimina el componente de toggle del DOM al cerrar sesión
     */
    removerThemeToggle() {
        const themeItem = document.getElementById('nav-theme-item-wrapper');
        if (themeItem) {
            themeItem.remove();
        }
    },

    /**
     * Actualiza el icono y texto indicador según el tema actual
     * @param {string} tema ('dark' | 'light')
     */
    actualizarIndicadorTema(tema) {
        const icon = document.getElementById('theme-icon-indicator');
        const text = document.getElementById('theme-text-indicator');
        const toggle = document.getElementById('btn-theme-toggle');
        const esOscuro = tema === 'dark';

        if (icon) {
            icon.textContent = esOscuro ? '🌙' : '☀️';
        }
        if (text) {
            text.textContent = esOscuro ? 'Modo Oscuro' : 'Modo Claro';
        }
        if (toggle) {
            toggle.setAttribute('aria-label', esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
            toggle.setAttribute('aria-checked', esOscuro ? 'true' : 'false');
        }
    },

    /**
     * Renderiza o conmuta la visibilidad del enlace "Mis tours" según la sesión
     * @param {boolean} autenticado 
     */
    renderizarEnlaceMisTours(autenticado) {
        const { linkHistorial, navMisTours } = this.elements;

        // 1. Enlace en Dropdown de perfil
        if (linkHistorial) {
            if (autenticado) {
                linkHistorial.href = 'mis-tours.html';
                const label = linkHistorial.querySelector('span');
                if (label) label.textContent = 'Mis tours';
                linkHistorial.classList.remove('hidden');
                const parentLi = linkHistorial.closest('li');
                if (parentLi) {
                    parentLi.classList.remove('hidden');
                    parentLi.style.display = '';
                }
            } else {
                linkHistorial.classList.add('hidden');
                const parentLi = linkHistorial.closest('li');
                if (parentLi) {
                    parentLi.classList.add('hidden');
                    parentLi.style.display = 'none';
                }
            }
        }

        // 2. Enlace en barra de navegación principal (si existe en el DOM)
        if (navMisTours) {
            if (autenticado) {
                navMisTours.href = 'mis-tours.html';
                navMisTours.classList.remove('hidden');
            } else {
                navMisTours.classList.add('hidden');
            }
        }
    },

    /**
     * Muestra la interfaz para el estado AUTENTICADO:
     * - Oculta botón "Iniciar sesión"
     * - Muestra botón circular de perfil
     * - Renderiza la inicial del usuario o icono por defecto
     * - Configura correo en el dropdown
     * - Renderiza el enlace "Mis tours" con href mis-tours.html
     * - Inyecta el switch de alternancia de tema (Modo Claro / Modo Oscuro)
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

        // Renderizar enlace "Mis tours"
        this.renderizarEnlaceMisTours(true);

        // Inyectar switch de alternancia de tema
        this.inyectarThemeToggle();
    },

    /**
     * Muestra la interfaz para el estado NO AUTENTICADO:
     * - Muestra botón "Iniciar sesión" con redirección configurada
     * - Oculta el contenedor de usuario
     * - Oculta la opción "Mis tours"
     * - Remueve el toggle de tema
     * - Cierra el dropdown si estaba abierto
     */
    mostrarEstadoNoAutenticado() {
        const { btnLogin, userContainer } = this.elements;

        if (userContainer) {
            userContainer.classList.add('hidden');
        }

        // Ocultar opción "Mis tours"
        this.renderizarEnlaceMisTours(false);

        // Remover toggle de tema
        this.removerThemeToggle();

        if (btnLogin) {
            btnLogin.classList.remove('hidden');
            btnLogin.href = this.obtenerUrlLogin();
        }

        this.cerrarDropdown();
    },

    /**
     * Alterna la visibilidad del dropdown de usuario (soporta .active, .open y .hidden)
     * @param {boolean} [forzar] - Opcional para forzar apertura o cierre
     */
    alternarDropdown(forzar) {
        const { dropdownMenu, btnUser } = this.elements;
        if (!dropdownMenu || !btnUser) return;

        const estaAbierto = !dropdownMenu.classList.contains('hidden') &&
            (dropdownMenu.classList.contains('active') || dropdownMenu.classList.contains('open'));

        const abrir = typeof forzar === 'boolean'
            ? forzar
            : !estaAbierto;

        if (abrir) {
            dropdownMenu.classList.remove('hidden');
            dropdownMenu.classList.add('active', 'open');
            btnUser.setAttribute('aria-expanded', 'true');
        } else {
            dropdownMenu.classList.add('hidden');
            dropdownMenu.classList.remove('active', 'open');
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
            dropdownMenu.classList.remove('active', 'open');
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
        if (!dropdownMenu) return false;
        return !dropdownMenu.classList.contains('hidden') &&
            (dropdownMenu.classList.contains('active') || dropdownMenu.classList.contains('open'));
    }
};

export default NavbarView;
