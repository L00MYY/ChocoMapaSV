/**
 * js/views/LoginView.js
 * Vista del Inicio de Sesión para ChocoMapaSV (MITUR)
 * Capa de presentación responsable exclusiva de la manipulación segura del DOM y captura de UI.
 * PROHIBIDO: peticiones fetch, reglas de negocio o lógica de autenticación.
 */

export const LoginView = {
    _mockElements: null,
    /**
     * Referencias a los elementos del DOM centralizadas
     */
    get elements() {
        if (this._mockElements) return this._mockElements;
        if (typeof document === 'undefined') return this._mockElements || {};
        return {
            form: document.getElementById('login-form'),
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),
            submitBtn: document.getElementById('btn-submit'),
            errorMsgContainer: document.getElementById('error-message'),
            passwordToggleBtn: document.getElementById('btn-toggle-password')
        };
    },
    set elements(val) {
        this._mockElements = val;
    },

    /**
     * Renderiza de manera segura el mensaje de error en el contenedor correspondiente.
     * Utiliza textContent para prevenir vulnerabilidades XSS.
     * 
     * @param {string} mensaje - Texto descriptivo del error a presentar al usuario
     */
    mostrarError(mensaje) {
        const { errorMsgContainer } = this.elements;
        if (!errorMsgContainer) return;

        errorMsgContainer.textContent = mensaje || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
        errorMsgContainer.classList.remove('hidden');
        errorMsgContainer.style.display = 'flex';
        errorMsgContainer.setAttribute('aria-hidden', 'false');

        // Scroll suave hacia el error si es necesario en pantallas pequeñas
        errorMsgContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Resuelve el elemento de entrada correspondiente a una clave o id
     * @private
     */
    _resolverInput(inputKey) {
        if (!inputKey) return null;
        if (typeof inputKey !== 'string') return inputKey;

        const mapa = {
            email: this.elements.emailInput,
            emailInput: this.elements.emailInput,
            password: this.elements.passwordInput,
            passwordInput: this.elements.passwordInput
        };

        return mapa[inputKey] || document.getElementById(inputKey) || null;
    },

    /**
     * Muestra un mensaje de error específico debajo de un campo individual.
     * 
     * @param {'email' | 'password' | string} campo - Identificador del campo
     * @param {string} mensaje - Mensaje de validación
     */
    mostrarErrorCampo(campo, mensaje) {
        const input = this._resolverInput(campo);
        if (!input) return;

        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        formGroup.classList.add('has-error');
        input.classList.add('is-invalid');

        let errorContainer = formGroup.querySelector('.field-error-message');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'field-error-message show';
            errorContainer.setAttribute('role', 'alert');
            formGroup.appendChild(errorContainer);
        }

        let errorTextSpan = errorContainer.querySelector('.error-text');
        if (!errorTextSpan) {
            errorTextSpan = document.createElement('span');
            errorTextSpan.className = 'error-text';
            errorContainer.appendChild(errorTextSpan);
        }

        errorTextSpan.textContent = mensaje || 'Campo obligatorio';
        errorContainer.classList.add('show');
        errorContainer.classList.remove('hidden');
        errorContainer.style.display = 'flex';
    },

    /**
     * Limpia los indicadores visuales y el mensaje de error de un campo individual.
     * 
     * @param {'email' | 'password' | string} campo
     */
    limpiarErrorCampo(campo) {
        const input = this._resolverInput(campo);
        if (!input) return;

        const formGroup = typeof input.closest === 'function' ? input.closest('.form-group') : null;
        if (formGroup) {
            formGroup.classList.remove('has-error');
            const errorContainer = formGroup.querySelector('.field-error-message');
            if (errorContainer) {
                errorContainer.classList.remove('show');
                errorContainer.style.display = 'none';
                const textSpan = errorContainer.querySelector('.error-text');
                if (textSpan) textSpan.textContent = '';
            }
        }

        if (input.classList?.remove) input.classList.remove('is-invalid');
    },

    /**
     * Oculta y limpia el contenedor de mensajes de error global y por campo.
     */
    limpiarError() {
        const { errorMsgContainer, emailInput, passwordInput } = this.elements;
        if (errorMsgContainer) {
            errorMsgContainer.textContent = '';
            errorMsgContainer.classList.add('hidden');
            errorMsgContainer.style.display = 'none';
            errorMsgContainer.setAttribute('aria-hidden', 'true');
        }

        if (emailInput?.classList?.remove) emailInput.classList.remove('is-invalid');
        if (passwordInput?.classList?.remove) passwordInput.classList.remove('is-invalid');

        this.limpiarErrorCampo('email');
        this.limpiarErrorCampo('password');
    },

    /**
     * Limpia todos los errores tanto por campo como alertas globales.
     */
    limpiarErrores() {
        this.limpiarError();
    },

    /**
     * Controla el estado visual de carga en el botón de submit e inputs.
     * Deshabilita el botón "Ingresar" mientras la petición está en curso.
     * 
     * @param {boolean} estaCargando - True si la autenticación está en progreso
     */
    mostrarCargando(estaCargando) {
        const { submitBtn, emailInput, passwordInput } = this.elements;
        if (!submitBtn) return;

        if (estaCargando) {
            submitBtn.disabled = true;
            if (submitBtn.classList?.add) submitBtn.classList.add('is-loading');
            if (submitBtn.setAttribute) submitBtn.setAttribute('aria-busy', 'true');
            submitBtn.textContent = 'Ingresando...';

            if (emailInput) emailInput.disabled = true;
            if (passwordInput) passwordInput.disabled = true;
        } else {
            submitBtn.disabled = false;
            if (submitBtn.classList?.remove) submitBtn.classList.remove('is-loading');
            if (submitBtn.removeAttribute) submitBtn.removeAttribute('aria-busy');
            submitBtn.textContent = 'Ingresar';

            if (emailInput) emailInput.disabled = false;
            if (passwordInput) passwordInput.disabled = false;
        }
    },

    /**
     * Extrae los valores ingresados en los campos del formulario.
     * 
     * @returns {{ email: string, password: string }}
     */
    obtenerCredenciales() {
        return {
            email: this.elements.emailInput?.value?.trim() || '',
            password: this.elements.passwordInput?.value || ''
        };
    },

    /**
     * Marca o desmarca visualmente un campo con error de validación
     * 
     * @param {'emailInput' | 'passwordInput'} campo 
     * @param {boolean} esInvalido 
     */
    marcarCampoInvalido(campo, esInvalido = true) {
        const input = this.elements[campo];
        if (input) {
            input.classList.toggle('is-invalid', esInvalido);
            if (esInvalido) {
                input.focus();
            }
        }
    },

    /**
     * Limpia los valores de los inputs del formulario
     */
    limpiarFormulario() {
        this.elements.form?.reset();
        this.limpiarError();
    }
};

export default LoginView;
