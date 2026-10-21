/**
 * js/views/LoginView.js
 * Vista del Inicio de Sesión para ChocoMapaSV (MITUR)
 * Capa de presentación responsable exclusiva de la manipulación segura del DOM y captura de UI.
 * PROHIBIDO: peticiones fetch, reglas de negocio o lógica de autenticación.
 */

export const LoginView = {
    /**
     * Referencias a los elementos del DOM centralizadas
     */
    elements: {
        form: document.getElementById('login-form'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        submitBtn: document.getElementById('btn-submit'),
        errorMsgContainer: document.getElementById('error-message'),
        passwordToggleBtn: document.getElementById('btn-toggle-password')
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
     * Oculta y limpia el contenedor de mensajes de error.
     */
    limpiarError() {
        const { errorMsgContainer, emailInput, passwordInput } = this.elements;
        if (errorMsgContainer) {
            errorMsgContainer.textContent = '';
            errorMsgContainer.classList.add('hidden');
            errorMsgContainer.style.display = 'none';
            errorMsgContainer.setAttribute('aria-hidden', 'true');
        }

        emailInput?.classList.remove('is-invalid');
        passwordInput?.classList.remove('is-invalid');
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
            submitBtn.classList.add('is-loading');
            submitBtn.setAttribute('aria-busy', 'true');
            submitBtn.textContent = 'Ingresando...';

            if (emailInput) emailInput.disabled = true;
            if (passwordInput) passwordInput.disabled = true;
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
            submitBtn.removeAttribute('aria-busy');
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
