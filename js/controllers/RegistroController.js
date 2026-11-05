/**
 * js/controllers/RegistroController.js
 * Controlador del Registro de Usuarios para ChocoMapaSV (MITUR)
 * Orquestador entre la vista (RegistroView) y el modelo (AuthModel).
 */

import { AuthModel, validarFormularioRegistro, sanitizarUsuario } from '../models/AuthModel.js';
import { RegistroView, REGLAS_PASSWORD } from '../views/RegistroView.js';

/**
 * Objeto controlador que gestiona el registro de nuevos turistas y validaciones en tiempo real
 */
export const RegistroController = {
    /**
     * @description Inicializa los listeners y el flujo del controlador de registro.
     * @returns {Promise<void>}
     */
     * @returns {Promise<void>}
    async init() {
        this.inicializarEventos();
        await this.verificarSesionExistente();
    },

    /**
     * @description Si el usuario ya cuenta con una sesión activa, lo redirige de inmediato.
     * @returns {Promise<void>}
     */
     * @returns {Promise<void>}
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
     * @description Configura los escuchadores de eventos sobre los elementos de RegistroView.
     */
     * @returns {void}
    inicializarEventos() {
        const {
            form,
            inputNombre,
            inputEmail,
            inputPassword,
            inputConfirm,
            inputTerms
        } = RegistroView.elements;

        inputNombre?.addEventListener('input', () => {
            RegistroView.limpiarErrorCampo('inputNombre');
        });

        inputEmail?.addEventListener('input', () => {
            RegistroView.limpiarErrorCampo('inputEmail');
        });

        inputPassword?.addEventListener('input', (event) => {
            RegistroView.limpiarErrorCampo('inputPassword');
            const pass = event.target.value;
            RegistroView.actualizarReglasPassword(pass);

            if (inputConfirm?.value) {
                if (pass === inputConfirm.value) {
                    RegistroView.limpiarErrorCampo('inputConfirm');
                }
            }
        });

        inputConfirm?.addEventListener('input', () => {
            RegistroView.limpiarErrorCampo('inputConfirm');
        });

        inputTerms?.addEventListener('change', () => {
            RegistroView.limpiarErrorCampo('inputTerms');
        });

        const botonesToggle = document.querySelectorAll('.btn-toggle-password');
        botonesToggle.forEach(boton => {
            boton.addEventListener('click', (event) => {
                event.preventDefault();
                const targetId = boton.getAttribute('data-target');
                RegistroView.toggleVisibilidadPassword(targetId, boton);
            });
        });

        form?.addEventListener('submit', (event) => {
            this.manejarSubmit(event);
        });
    },

    /**
     * @description Valida los datos del formulario aplicando las reglas de negocio del modelo.
     * @param {{ nombre: string, email: string, password: string, confirm: string, terms: boolean }} datos - Datos del formulario.
     * @returns {Array<[string, string]>} Lista de pares [campo, mensajeError].
     */
    validar(datos) {
        const { errores: errs } = validarFormularioRegistro(datos);
        const errores = [];

        if (errs.nombre) errores.push(['inputNombre', errs.nombre]);
        if (errs.email) errores.push(['inputEmail', errs.email]);
        if (errs.password) errores.push(['inputPassword', errs.password]);
        if (errs.confirmacion) errores.push(['inputConfirm', errs.confirmacion]);
        if (errs.terminos) errores.push(['inputTerms', errs.terminos]);

        return errores;
    },

    /**
     * @description Orquesta el flujo de envío del formulario de registro y creación de cuenta en Supabase.
     * @param {Event} event - Evento submit.
     * @returns {Promise<void>}
     */
     * @returns {Promise<void>}
    async manejarSubmit(event) {
        event.preventDefault();
        RegistroView.limpiarErrores();

        const datos = RegistroView.obtenerDatos();
        const errores = this.validar(datos);

        if (errores.length > 0) {
            errores.forEach(([campo, mensaje]) => {
                RegistroView.mostrarErrorCampo(campo, mensaje);
            });
            RegistroView.mostrarErrorGlobal(
                'No fue posible crear la cuenta',
                'Por favor revisa los errores señalados en los campos del formulario.'
            );
            return;
        }

        RegistroView.mostrarCargando(true);

        try {
            const nombreSanitizado = sanitizarUsuario(datos.nombre);
            const data = await AuthModel.registrarUsuario(nombreSanitizado, datos.email.trim(), datos.password);

            if (data && data.user) {
                if (data.access_token || data.sesion) {
                    RegistroView.mostrarExito(
                        'Tu sesión ha sido iniciada automáticamente. Serás redirigido en un momento...',
                        '¡Tu cuenta se creó con éxito!'
                    );
                    setTimeout(() => {
                        this.redirigirUsuario();
                    }, 1500);
                } else {
                    RegistroView.mostrarExito(
                        'Hemos enviado un enlace de confirmación a tu correo electrónico. Por favor verifica tu bandeja para activar tu cuenta antes de iniciar sesión.',
                        '¡Tu cuenta se creó con éxito!'
                    );
                }
            } else {
                throw new Error('No se recibió la confirmación del usuario registrado');
            }
        } catch (error) {
            console.error('Error durante el registro de usuario:', error);

            const mensaje = error.message || '';
            const codigo = error.code || '';

            if (
                codigo === 'user_already_exists' ||
                /already/i.test(mensaje) ||
                /registered/i.test(mensaje) ||
                /ya está registrado/i.test(mensaje)
            ) {
                RegistroView.mostrarErrorCampo(
                    'inputEmail',
                    'Este correo ya está registrado.'
                );
                RegistroView.mostrarError('Este correo ya está registrado');
            } else if (
                codigo === 'weak_password' ||
                /password/i.test(mensaje)
            ) {
                RegistroView.mostrarErrorCampo(
                    'inputPassword',
                    'La contraseña no cumple con los requisitos mínimos de seguridad.'
                );
                RegistroView.mostrarError(mensaje || 'La contraseña no cumple con los requisitos mínimos de seguridad.');
            } else {
                RegistroView.mostrarError(mensaje || 'Error al registrar la cuenta');
            }
        } finally {
            RegistroView.mostrarCargando(false);
        }
    },

    /**
     * @description Redirige al destino especificado en el parámetro ?redirect= o a mapa.html por defecto,
     * aplicando validación de origen contra redirecciones abiertas maliciosas.
     */
     * @returns {void}
    redirigirUsuario() {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');

        if (redirect) {
            try {
                const urlDecodificada = decodeURIComponent(redirect);
                if (urlDecodificada.startsWith('http://') || urlDecodificada.startsWith('https://')) {
                    const destinoUrl = new URL(urlDecodificada);
                    if (destinoUrl.origin === window.location.origin) {
                        window.location.href = urlDecodificada;
                        return;
                    }
                } else {
                    window.location.href = urlDecodificada;
                    return;
                }
            } catch (error) {
                console.warn('Advertencia al decodificar URL de redirección en RegistroController:', error);
            }
        }

        window.location.href = 'mapa.html';
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => RegistroController.init(), { once: true });
    } else {
        RegistroController.init();
    }
}

export default RegistroController;
