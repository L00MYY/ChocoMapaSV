/**
 * js/views/RegistroView.js
 * Vista del Registro de Turistas para ChocoMapaSV (MITUR)
 * Capa de presentación responsable exclusiva de la manipulación segura del DOM y feedback visual.
 * PROHIBIDO: peticiones fetch, Supabase o reglas de negocio de autenticación.
 */

export const REGLAS_PASSWORD = {
    length: (password) => typeof password === 'string' && password.length >= 8 && password.length <= 32,
    uppercase: (password) => /[A-Z]/.test(password || ''),
    lowercase: (password) => /[a-z]/.test(password || ''),
    number: (password) => /[0-9]/.test(password || ''),
    special: (password) => /[!@#$%^&*_\-]/.test(password || '')
};

const ICONS = {
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    bullet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
};

export const RegistroView = {
    /**
     * Referencias a los elementos del DOM cacheadas por getElementById
     */
    elements: {
        form: document.getElementById('form-registro'),
        inputNombre: document.getElementById('reg-nombre'),
        inputEmail: document.getElementById('reg-email'),
        inputPassword: document.getElementById('reg-password'),
        inputConfirm: document.getElementById('reg-confirm-password'),
        inputTerms: document.getElementById('reg-terms'),
        submitBtn: document.getElementById('btn-crear-cuenta'),
        alertSuccess: document.getElementById('alert-success'),
        alertError: document.getElementById('alert-error'),
        alertErrorTitle: document.getElementById('alert-error-title'),
        alertErrorDesc: document.getElementById('alert-error-desc'),
        rulesContainer: document.getElementById('password-rules-container')
    },

    /**
     * Resuelve el elemento de entrada correspondiente a una clave o id
     * @private
     */
    _resolverInput(inputKey) {
        if (!inputKey) return null;
        if (typeof inputKey !== 'string') return inputKey;

        const mapa = {
            nombre: this.elements.inputNombre,
            inputNombre: this.elements.inputNombre,
            'reg-nombre': this.elements.inputNombre,
            email: this.elements.inputEmail,
            inputEmail: this.elements.inputEmail,
            'reg-email': this.elements.inputEmail,
            password: this.elements.inputPassword,
            inputPassword: this.elements.inputPassword,
            'reg-password': this.elements.inputPassword,
            confirm: this.elements.inputConfirm,
            confirmPassword: this.elements.inputConfirm,
            inputConfirm: this.elements.inputConfirm,
            'reg-confirm-password': this.elements.inputConfirm,
            terms: this.elements.inputTerms,
            inputTerms: this.elements.inputTerms,
            'reg-terms': this.elements.inputTerms
        };

        return mapa[inputKey] || document.getElementById(inputKey) || null;
    },

    /**
     * Muestra el banner de éxito y oculta alertas previas.
     * 
     * @param {string} [mensaje] - Descripción opcional de éxito
     * @param {string} [titulo] - Título opcional del banner
     */
    mostrarExito(mensaje, titulo) {
        this.limpiarErrorGlobal();
        const { alertSuccess } = this.elements;
        if (!alertSuccess) return;

        if (titulo) {
            const titleEl = alertSuccess.querySelector('.auth-alert-title');
            if (titleEl) titleEl.textContent = titulo;
        }

        if (mensaje) {
            const descEl = alertSuccess.querySelector('.alert-desc');
            if (descEl) descEl.textContent = mensaje;
        }

        alertSuccess.classList.remove('hidden');
        alertSuccess.classList.add('show');
        alertSuccess.style.display = 'flex';
        alertSuccess.setAttribute('aria-hidden', 'false');
        alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Muestra el banner de error global con título y descripción descriptiva.
     * 
     * @param {string} titulo - Título principal del error
     * @param {string} desc - Explicación detallada del error
     */
    mostrarErrorGlobal(titulo, desc) {
        const { alertSuccess, alertError, alertErrorTitle, alertErrorDesc } = this.elements;

        if (alertSuccess) {
            alertSuccess.classList.add('hidden');
            alertSuccess.classList.remove('show');
            alertSuccess.style.display = 'none';
            alertSuccess.setAttribute('aria-hidden', 'true');
        }

        if (!alertError) return;

        if (alertErrorTitle && titulo) {
            alertErrorTitle.textContent = titulo;
        }
        if (alertErrorDesc && desc) {
            alertErrorDesc.textContent = desc;
        }

        alertError.classList.remove('hidden');
        alertError.classList.add('show');
        alertError.style.display = 'flex';
        alertError.setAttribute('aria-hidden', 'false');
        alertError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Oculta el banner de error global.
     */
    limpiarErrorGlobal() {
        const { alertError } = this.elements;
        if (!alertError) return;

        alertError.classList.add('hidden');
        alertError.classList.remove('show');
        alertError.style.display = 'none';
        alertError.setAttribute('aria-hidden', 'true');
    },

    /**
     * Muestra el mensaje de error correspondiente a un campo individual
     * buscando el .field-error-message en su .form-group más cercano.
     * 
     * @param {string|HTMLElement} inputKey - Identificador o elemento del input
     * @param {string} mensaje - Mensaje de error descriptivo
     */
    mostrarErrorCampo(inputKey, mensaje) {
        const input = this._resolverInput(inputKey);
        if (!input) return;

        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        formGroup.classList.add('has-error');
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');

        const errorMsgContainer = formGroup.querySelector('.field-error-message');
        if (errorMsgContainer) {
            let errorTextSpan = errorMsgContainer.querySelector('.error-text');
            if (!errorTextSpan) {
                errorTextSpan = document.createElement('span');
                errorTextSpan.className = 'error-text';
                errorMsgContainer.appendChild(errorTextSpan);
            }
            errorTextSpan.textContent = mensaje || 'Campo inválido';
            errorMsgContainer.classList.add('show');
            errorMsgContainer.style.display = 'flex';
        }
    },

    /**
     * Limpia los indicadores de error visuales de un campo determinado.
     * 
     * @param {string|HTMLElement} inputKey - Identificador o elemento del input
     */
    limpiarErrorCampo(inputKey) {
        const input = this._resolverInput(inputKey);
        if (!input) return;

        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('has-error');
            const errorMsgContainer = formGroup.querySelector('.field-error-message');
            if (errorMsgContainer) {
                errorMsgContainer.classList.remove('show');
                errorMsgContainer.style.display = 'none';
            }
        }

        input.classList.remove('is-invalid');
    },

    /**
     * Limpia todos los errores de campos individuales y las alertas globales.
     */
    limpiarErrores() {
        ['nombre', 'email', 'password', 'confirm', 'terms'].forEach(key => {
            this.limpiarErrorCampo(key);
        });
        this.limpiarErrorGlobal();

        if (this.elements.alertSuccess) {
            this.elements.alertSuccess.classList.add('hidden');
            this.elements.alertSuccess.classList.remove('show');
            this.elements.alertSuccess.style.display = 'none';
            this.elements.alertSuccess.setAttribute('aria-hidden', 'true');
        }
    },

    /**
     * Evalúa las 5 reglas visuales de contraseña contra el valor actual,
     * alternando las clases de estado ('rule-ok'/'rule-met', 'rule-fail'/'rule-unmet')
     * e iconos descriptivos en cada elemento .rule-item[data-rule].
     * 
     * @param {string} password - Valor de la contraseña a evaluar
     * @returns {boolean} True si todas las reglas se cumplen, false si no
     */
    actualizarReglasPassword(password) {
        const pass = typeof password === 'string' ? password : '';
        const tieneCaracteres = pass.length > 0;
        let todasCumplidas = tieneCaracteres;

        const ruleElements = document.querySelectorAll('.rule-item[data-rule]');
        ruleElements.forEach(item => {
            const ruleName = item.getAttribute('data-rule');
            const validador = REGLAS_PASSWORD[ruleName];
            const cumple = validador ? validador(pass) : false;
            const iconSpan = item.querySelector('.rule-icon');

            if (!tieneCaracteres) {
                item.classList.remove('rule-ok', 'rule-met', 'rule-fail', 'rule-unmet');
                if (iconSpan) iconSpan.innerHTML = ICONS.bullet;
                todasCumplidas = false;
            } else if (cumple) {
                item.classList.add('rule-ok', 'rule-met');
                item.classList.remove('rule-fail', 'rule-unmet');
                if (iconSpan) iconSpan.innerHTML = ICONS.check;
            } else {
                item.classList.add('rule-fail', 'rule-unmet');
                item.classList.remove('rule-ok', 'rule-met');
                if (iconSpan) iconSpan.innerHTML = ICONS.bullet;
                todasCumplidas = false;
            }
        });

        return todasCumplidas;
    },

    /**
     * Alterna la visibilidad entre texto plano y caracteres enmascarados para un input password.
     * 
     * @param {string|HTMLElement} targetId - ID o elemento del input de contraseña
     * @param {HTMLElement} [boton] - Botón que disparó la acción para actualizar su icono y aria-label
     */
    toggleVisibilidadPassword(targetId, boton) {
        const input = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (!input) return;

        const esPassword = input.type === 'password';
        input.type = esPassword ? 'text' : 'password';

        if (boton) {
            boton.setAttribute('aria-label', esPassword ? 'Ocultar contraseña' : 'Ver contraseña');
            boton.classList.toggle('active', esPassword);
            boton.innerHTML = esPassword ? ICONS.eyeOff : ICONS.eye;
        }
    },

    /**
     * Controla el estado visual de carga deshabilitando controles e indicando progreso.
     * 
     * @param {boolean} estaCargando - True si la solicitud está en curso
     */
    mostrarCargando(estaCargando) {
        const { submitBtn, inputNombre, inputEmail, inputPassword, inputConfirm, inputTerms } = this.elements;
        if (!submitBtn) return;

        if (estaCargando) {
            submitBtn.disabled = true;
            submitBtn.classList.add('is-loading');
            submitBtn.setAttribute('aria-busy', 'true');
            const span = submitBtn.querySelector('span');
            if (span) span.textContent = 'Creando cuenta...';
            else submitBtn.textContent = 'Creando cuenta...';

            if (inputNombre) inputNombre.disabled = true;
            if (inputEmail) inputEmail.disabled = true;
            if (inputPassword) inputPassword.disabled = true;
            if (inputConfirm) inputConfirm.disabled = true;
            if (inputTerms) inputTerms.disabled = true;
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
            submitBtn.removeAttribute('aria-busy');
            const span = submitBtn.querySelector('span');
            if (span) span.textContent = 'Crear cuenta';
            else submitBtn.textContent = 'Crear cuenta';

            if (inputNombre) inputNombre.disabled = false;
            if (inputEmail) inputEmail.disabled = false;
            if (inputPassword) inputPassword.disabled = false;
            if (inputConfirm) inputConfirm.disabled = false;
            if (inputTerms) inputTerms.disabled = false;
        }
    },

    /**
     * Extrae de forma limpia los valores ingresados en el formulario de registro.
     * 
     * @returns {{ nombre: string, email: string, password: string, confirm: string, terms: boolean }}
     */
    obtenerDatos() {
        return {
            nombre: this.elements.inputNombre?.value?.trim() || '',
            email: this.elements.inputEmail?.value?.trim() || '',
            password: this.elements.inputPassword?.value || '',
            confirm: this.elements.inputConfirm?.value || '',
            terms: Boolean(this.elements.inputTerms?.checked)
        };
    }
};

export default RegistroView;
