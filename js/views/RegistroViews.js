/**
 * js/views/RegistroViews.js
 * Capa de Vista para la Pantalla de Registro - ChocoMapaSV / MITUR
 * 
 * Responsabilidades exclusivas de la Vista:
 * - Manejo gráfico e interactivo de elementos del DOM.
 * - Validación visual en tiempo real (reglas de contraseña, coincidencia, formato).
 * - Alternancia de visibilidad de contraseñas (mostrar/ocultar con icono).
 * - Despliegue de estados de error, advertencia y éxito en la interfaz.
 * - Sin lógica de negocio ni persistencia (no interactúa con Model ni Controller).
 */

export const RegistroViews = {
    // -------------------------------------------------------------------------
    // 1. Mapeo de elementos del DOM
    // -------------------------------------------------------------------------
    elements: {
        form: null,
        nombre: null,
        email: null,
        password: null,
        confirmPassword: null,
        terms: null,
        submitBtn: null,
        alertSuccess: null,
        alertError: null,
        alertErrorTitle: null,
        alertErrorDesc: null,
        rulesList: null,
        ruleItems: {},
        toggleButtons: []
    },

    // -------------------------------------------------------------------------
    // 2. Iconos SVG para manipulación dinámica
    // -------------------------------------------------------------------------
    icons: {
        check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        bullet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle></svg>`,
        eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
    },

    // -------------------------------------------------------------------------
    // 3. Inicialización gráfica y vinculación de eventos
    // -------------------------------------------------------------------------
    init() {
        this.cacheElements();
        if (!this.elements.form) return;

        this.setupPasswordToggles();
        this.setupRealtimeValidations();
        this.setupFormSubmitBehavior();
    },

    cacheElements() {
        this.elements.form = document.getElementById('form-registro');
        this.elements.nombre = document.getElementById('reg-nombre');
        this.elements.email = document.getElementById('reg-email');
        this.elements.password = document.getElementById('reg-password');
        this.elements.confirmPassword = document.getElementById('reg-confirm-password');
        this.elements.terms = document.getElementById('reg-terms');
        this.elements.submitBtn = document.getElementById('btn-crear-cuenta');

        this.elements.alertSuccess = document.getElementById('alert-success');
        this.elements.alertError = document.getElementById('alert-error');
        this.elements.alertErrorTitle = document.getElementById('alert-error-title');
        this.elements.alertErrorDesc = document.getElementById('alert-error-desc');

        // Mapeo de reglas de contraseña
        const rules = document.querySelectorAll('.rule-item[data-rule]');
        rules.forEach(rule => {
            const ruleName = rule.getAttribute('data-rule');
            this.elements.ruleItems[ruleName] = rule;
        });

        // Botones de mostrar/ocultar contraseña
        this.elements.toggleButtons = Array.from(document.querySelectorAll('.btn-toggle-password'));
    },

    // -------------------------------------------------------------------------
    // 4. Comportamiento Gráfico: Alternar visibilidad de contraseña
    // -------------------------------------------------------------------------
    setupPasswordToggles() {
        this.elements.toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (!input) return;

                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                // Actualizar icono y accesibilidad
                btn.innerHTML = isPassword ? this.icons.eyeOff : this.icons.eye;
                btn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Ver contraseña');
                btn.classList.toggle('active', isPassword);
            });
        });
    },

    // -------------------------------------------------------------------------
    // 5. Comportamiento Gráfico: Validación en tiempo real (Live Feedback)
    // -------------------------------------------------------------------------
    setupRealtimeValidations() {
        // Validación interactiva de reglas de contraseña al tipear
        if (this.elements.password) {
            this.elements.password.addEventListener('input', () => {
                const val = this.elements.password.value;
                this.evaluarReglasContrasena(val);
                this.limpiarErrorCampo('password');

                // Si ya hay texto en confirmar contraseña, revalidar coincidencia
                if (this.elements.confirmPassword && this.elements.confirmPassword.value) {
                    this.evaluarCoincidenciaContrasenas();
                }
            });

            this.elements.password.addEventListener('blur', () => {
                const val = this.elements.password.value;
                if (val && !this.validarReglasContrasena(val).todasCumplidas) {
                    this.mostrarErrorCampo('password', 'La contraseña no cumple con todas las reglas de seguridad requeridas.');
                }
            });
        }

        // Validación interactiva de confirmación de contraseña
        if (this.elements.confirmPassword) {
            this.elements.confirmPassword.addEventListener('input', () => {
                this.evaluarCoincidenciaContrasenas();
            });

            this.elements.confirmPassword.addEventListener('blur', () => {
                this.evaluarCoincidenciaContrasenas(true);
            });
        }

        // Validación básica de nombre al perder el foco
        if (this.elements.nombre) {
            this.elements.nombre.addEventListener('input', () => {
                if (this.elements.nombre.value.trim().length >= 3) {
                    this.limpiarErrorCampo('nombre');
                    this.marcarCampoValido(this.elements.nombre, true);
                }
            });

            this.elements.nombre.addEventListener('blur', () => {
                if (!this.elements.nombre.value.trim()) {
                    this.mostrarErrorCampo('nombre', 'El nombre completo es obligatorio.');
                } else if (this.elements.nombre.value.trim().length < 3) {
                    this.mostrarErrorCampo('nombre', 'El nombre debe tener al menos 3 caracteres.');
                }
            });
        }

        // Validación de formato de correo
        if (this.elements.email) {
            this.elements.email.addEventListener('input', () => {
                this.limpiarErrorCampo('email');
            });

            this.elements.email.addEventListener('blur', () => {
                const emailVal = this.elements.email.value.trim();
                if (!emailVal) {
                    this.mostrarErrorCampo('email', 'El correo electrónico es obligatorio.');
                } else if (!this.validarFormatoEmail(emailVal)) {
                    this.mostrarErrorCampo('email', 'Ingresa un correo electrónico con formato válido (ej. usuario@dominio.com).');
                } else {
                    this.marcarCampoValido(this.elements.email, true);
                }
            });
        }

        // Checkbox de términos
        if (this.elements.terms) {
            this.elements.terms.addEventListener('change', () => {
                if (this.elements.terms.checked) {
                    this.limpiarErrorCampo('terms');
                }
            });
        }
    },

    // -------------------------------------------------------------------------
    // 6. Evaluación de reglas de contraseña y actualización gráfica
    // -------------------------------------------------------------------------
    validarReglasContrasena(password) {
        const estado = {
            length: password.length >= 8 && password.length <= 32,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };
        estado.todasCumplidas = Object.values(estado).every(Boolean);
        return estado;
    },

    evaluarReglasContrasena(password) {
        const reglas = this.validarReglasContrasena(password);

        Object.keys(this.elements.ruleItems).forEach(ruleName => {
            const item = this.elements.ruleItems[ruleName];
            if (!item) return;

            const iconSpan = item.querySelector('.rule-icon');
            const estaCumplida = reglas[ruleName];

            if (password.length === 0) {
                // Estado neutro inicial
                item.classList.remove('rule-met', 'rule-unmet');
                if (iconSpan) iconSpan.innerHTML = this.icons.bullet;
            } else if (estaCumplida) {
                // Regla cumplida (verde con checkmark)
                item.classList.add('rule-met');
                item.classList.remove('rule-unmet');
                if (iconSpan) iconSpan.innerHTML = this.icons.check;
            } else {
                // Regla no cumplida aún
                item.classList.remove('rule-met');
                item.classList.add('rule-unmet');
                if (iconSpan) iconSpan.innerHTML = this.icons.bullet;
            }
        });

        // Actualizar estado general del input
        if (password.length > 0) {
            this.marcarCampoValido(this.elements.password, reglas.todasCumplidas);
        } else {
            this.marcarCampoValido(this.elements.password, false);
        }

        return reglas;
    },

    evaluarCoincidenciaContrasenas(mostrarErrorSiFalla = false) {
        if (!this.elements.password || !this.elements.confirmPassword) return false;

        const pass = this.elements.password.value;
        const confirm = this.elements.confirmPassword.value;

        if (!confirm) {
            this.limpiarErrorCampo('confirmPassword');
            this.marcarCampoValido(this.elements.confirmPassword, false);
            return false;
        }

        const coinciden = pass === confirm;

        if (coinciden) {
            this.limpiarErrorCampo('confirmPassword');
            this.marcarCampoValido(this.elements.confirmPassword, true);
            return true;
        } else {
            this.marcarCampoValido(this.elements.confirmPassword, false);
            if (mostrarErrorSiFalla) {
                this.mostrarErrorCampo('confirmPassword', 'Las contraseñas no coinciden. Por favor verifícalas.');
            }
            return false;
        }
    },

    validarFormatoEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // -------------------------------------------------------------------------
    // 7. Modificación gráfica de campos (Éxito / Error)
    // -------------------------------------------------------------------------
    mostrarErrorCampo(nombreCampo, mensaje) {
        const group = document.getElementById(`group-${nombreCampo}`);
        if (!group) return;

        group.classList.add('has-error');
        const input = group.querySelector('.form-control');
        if (input) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
        }

        const errorMsg = group.querySelector('.field-error-message');
        if (errorMsg) {
            const spanText = errorMsg.querySelector('.error-text') || errorMsg;
            if (spanText) spanText.textContent = mensaje;
            errorMsg.classList.add('show');
        }
    },

    limpiarErrorCampo(nombreCampo) {
        const group = document.getElementById(`group-${nombreCampo}`);
        if (!group) return;

        group.classList.remove('has-error');
        const input = group.querySelector('.form-control');
        if (input) {
            input.classList.remove('is-invalid');
        }

        const errorMsg = group.querySelector('.field-error-message');
        if (errorMsg) {
            errorMsg.classList.remove('show');
        }
    },

    marcarCampoValido(inputElement, esValido) {
        if (!inputElement) return;
        if (esValido) {
            inputElement.classList.add('is-valid');
            inputElement.classList.remove('is-invalid');
        } else {
            inputElement.classList.remove('is-valid');
        }
    },

    limpiarTodosLosErrores() {
        ['nombre', 'email', 'password', 'confirmPassword', 'terms'].forEach(campo => {
            this.limpiarErrorCampo(campo);
        });
        this.ocultarErrorGlobal();
        this.ocultarExito();
    },

    // -------------------------------------------------------------------------
    // 8. Banners de Alerta (Globales)
    // -------------------------------------------------------------------------
    mostrarErrorGlobal(titulo, descripcion) {
        if (!this.elements.alertError) return;
        if (this.elements.alertErrorTitle && titulo) {
            this.elements.alertErrorTitle.textContent = titulo;
        }
        if (this.elements.alertErrorDesc && descripcion) {
            this.elements.alertErrorDesc.textContent = descripcion;
        }
        this.elements.alertError.classList.add('show');
        this.ocultarExito();
        this.elements.alertError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    ocultarErrorGlobal() {
        if (this.elements.alertError) {
            this.elements.alertError.classList.remove('show');
        }
    },

    mostrarExito(mensaje) {
        if (!this.elements.alertSuccess) return;
        if (mensaje) {
            const desc = this.elements.alertSuccess.querySelector('.alert-desc');
            if (desc) desc.textContent = mensaje;
        }
        this.elements.alertSuccess.classList.add('show');
        this.ocultarErrorGlobal();
        this.elements.alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    ocultarExito() {
        if (this.elements.alertSuccess) {
            this.elements.alertSuccess.classList.remove('show');
        }
    },

    activarCargando(estaCargando) {
        if (!this.elements.submitBtn) return;
        if (estaCargando) {
            this.elements.submitBtn.disabled = true;
            this.elements.submitBtn.classList.add('is-loading');
            this.elements.submitBtn.innerHTML = `
                <span class="btn-spinner" aria-hidden="true"></span>
                <span>Creando cuenta...</span>
            `;
        } else {
            this.elements.submitBtn.disabled = false;
            this.elements.submitBtn.classList.remove('is-loading');
            this.elements.submitBtn.innerHTML = `
                <span>Crear cuenta</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            `;
        }
    },

    // -------------------------------------------------------------------------
    // 9. Comportamiento Gráfico del Formulario al Intentar Enviar
    // -------------------------------------------------------------------------
    setupFormSubmitBehavior() {
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.ejecutarValidacionVisual();
        });
    },

    ejecutarValidacionVisual() {
        let hayErrores = false;
        let primerCampoInvalido = null;

        // 1. Nombre completo
        const nombreVal = this.elements.nombre ? this.elements.nombre.value.trim() : '';
        if (!nombreVal) {
            this.mostrarErrorCampo('nombre', 'El nombre completo es obligatorio.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.nombre;
        } else if (nombreVal.length < 3) {
            this.mostrarErrorCampo('nombre', 'El nombre debe tener al menos 3 caracteres.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.nombre;
        } else {
            this.limpiarErrorCampo('nombre');
            this.marcarCampoValido(this.elements.nombre, true);
        }

        // 2. Correo electrónico
        const emailVal = this.elements.email ? this.elements.email.value.trim() : '';
        if (!emailVal) {
            this.mostrarErrorCampo('email', 'El correo electrónico es obligatorio.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.email;
        } else if (!this.validarFormatoEmail(emailVal)) {
            this.mostrarErrorCampo('email', 'Ingresa un correo con formato válido (ej. usuario@dominio.com).');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.email;
        } else if (emailVal.toLowerCase() === 'turista@registrado.com') {
            // Demostración gráfica de la regla: "Un correo no puede pertenecer a más de una cuenta"
            this.mostrarErrorCampo('email', 'Este correo ya está registrado. Usa otro correo para tu nueva cuenta.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.email;
        } else {
            this.limpiarErrorCampo('email');
            this.marcarCampoValido(this.elements.email, true);
        }

        // 3. Contraseña
        const passVal = this.elements.password ? this.elements.password.value : '';
        const reglasPass = this.validarReglasContrasena(passVal);
        if (!passVal) {
            this.mostrarErrorCampo('password', 'La contraseña es obligatoria.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.password;
        } else if (!reglasPass.todasCumplidas) {
            this.mostrarErrorCampo('password', 'La contraseña no cumple con todas las reglas de seguridad requeridas.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.password;
        } else {
            this.limpiarErrorCampo('password');
            this.marcarCampoValido(this.elements.password, true);
        }

        // 4. Confirmar contraseña
        const confirmVal = this.elements.confirmPassword ? this.elements.confirmPassword.value : '';
        if (!confirmVal) {
            this.mostrarErrorCampo('confirmPassword', 'Debes confirmar tu contraseña.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.confirmPassword;
        } else if (passVal !== confirmVal) {
            this.mostrarErrorCampo('confirmPassword', 'Las contraseñas no coinciden. Por favor verifícalas.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.confirmPassword;
        } else {
            this.limpiarErrorCampo('confirmPassword');
            this.marcarCampoValido(this.elements.confirmPassword, true);
        }

        // 5. Términos y condiciones
        if (this.elements.terms && !this.elements.terms.checked) {
            this.mostrarErrorCampo('terms', 'Debes aceptar los términos y la política de privacidad.');
            hayErrores = true;
            if (!primerCampoInvalido) primerCampoInvalido = this.elements.terms;
        } else {
            this.limpiarErrorCampo('terms');
        }

        // Si existen errores gráficos
        if (hayErrores) {
            this.mostrarErrorGlobal(
                'No fue posible crear la cuenta',
                'Por favor corrige los campos señalados en rojo a continuación.'
            );
            if (primerCampoInvalido) {
                primerCampoInvalido.focus();
            }
            return false;
        }

        // Si todos los datos son válidos en la vista (Demostración de éxito)
        this.ocultarErrorGlobal();
        this.activarCargando(true);

        setTimeout(() => {
            this.activarCargando(false);
            this.mostrarExito(
                'Tu sesión ha sido iniciada automáticamente. Ya puedes seleccionar cualquier tour y reservar tus cupos inmediatamente.'
            );
            // Deshabilitar campos temporalmente para reflejar cuenta creada
            if (this.elements.form) {
                this.elements.form.querySelectorAll('input, button').forEach(el => {
                    el.disabled = true;
                });
            }
        }, 650);

        return true;
    },

    // -------------------------------------------------------------------------
    // 10. API para integración futura con el Controlador
    // -------------------------------------------------------------------------
    obtenerDatosFormulario() {
        return {
            nombre: this.elements.nombre ? this.elements.nombre.value.trim() : '',
            email: this.elements.email ? this.elements.email.value.trim() : '',
            password: this.elements.password ? this.elements.password.value : '',
            confirmPassword: this.elements.confirmPassword ? this.elements.confirmPassword.value : '',
            terminosAceptados: this.elements.terms ? this.elements.terms.checked : false
        };
    },

    onFormSubmit(callback) {
        if (!this.elements.form || typeof callback !== 'function') return;
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const esValido = this.ejecutarValidacionVisual();
            if (esValido) {
                callback(this.obtenerDatosFormulario());
            }
        });
    }
};

// Auto-inicialización gráfica al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RegistroViews.init());
} else {
    RegistroViews.init();
}
