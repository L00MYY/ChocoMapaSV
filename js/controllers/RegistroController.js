/**
 * js/controllers/RegistroController.js
 * Controlador del Registro de Usuarios para ChocoMapaSV (MITUR)
 * Orquestador entre la vista (RegistroView) y el modelo (AuthModel).
 */

import { AuthModel } from '../models/AuthModel.js';
import { RegistroView, REGLAS_PASSWORD } from '../views/RegistroView.js';

export const RegistroController = {
    /**
     * Inicializa los listeners y el flujo del controlador
     */
    async init() {
        this.inicializarEventos();
        await this.verificarSesionExistente();
    },

    /**
     * Si el usuario ya cuenta con una sesión activa, lo redirige de inmediato
     */
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
     * Configura los escuchadores de eventos sobre los elementos de RegistroView
     */
    inicializarEventos() {
        const {
            form,
            inputNombre,
            inputEmail,
            inputPassword,
            inputConfirm,
            inputTerms
        } = RegistroView.elements;

        // Limpiar errores individuales al escribir o cambiar valores
        inputNombre?.addEventListener('input', () => {
            RegistroView.limpiarErrorCampo('inputNombre');
        });

        inputEmail?.addEventListener('input', () => {
            RegistroView.limpiarErrorCampo('inputEmail');
        });

        // Actualización en vivo de reglas de contraseña en input de password
        inputPassword?.addEventListener('input', (event) => {
            RegistroView.limpiarErrorCampo('inputPassword');
            const pass = event.target.value;
            RegistroView.actualizarReglasPassword(pass);

            // Si ya hay algo en confirmPassword, verificar si aún coinciden o limpiar
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

        // Cablear todos los botones de alternar visibilidad de contraseña
        const botonesToggle = document.querySelectorAll('.btn-toggle-password');
        botonesToggle.forEach(boton => {
            boton.addEventListener('click', (event) => {
                event.preventDefault();
                const targetId = boton.getAttribute('data-target');
                RegistroView.toggleVisibilidadPassword(targetId, boton);
            });
        });

        // Envío del formulario
        form?.addEventListener('submit', (event) => {
            this.manejarSubmit(event);
        });
    },

    /**
     * Valida los datos del formulario aplicando las reglas de negocio
     * 
     * @param {{ nombre: string, email: string, password: string, confirm: string, terms: boolean }} datos
     * @returns {Array<[string, string]>} Lista de pares [campo, mensajeError]
     */
    validar(datos) {
        const errores = [];

        // 1. Nombre completo
        if (!datos.nombre) {
            errores.push(['inputNombre', 'El nombre completo es obligatorio.']);
        } else if (datos.nombre.length < 3) {
            errores.push(['inputNombre', 'El nombre debe contener al menos 3 caracteres.']);
        }

        // 2. Correo electrónico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!datos.email) {
            errores.push(['inputEmail', 'El correo electrónico es obligatorio.']);
        } else if (!emailRegex.test(datos.email)) {
            errores.push(['inputEmail', 'Ingresa un formato de correo electrónico válido.']);
        }

        // 3. Contraseña
        if (!datos.password) {
            errores.push(['inputPassword', 'La contraseña es obligatoria.']);
        } else {
            const cumpleLongitud = REGLAS_PASSWORD.length(datos.password);
            const cumpleMayuscula = REGLAS_PASSWORD.uppercase(datos.password);
            const cumpleMinuscula = REGLAS_PASSWORD.lowercase(datos.password);
            const cumpleNumero = REGLAS_PASSWORD.number(datos.password);
            const cumpleEspecial = REGLAS_PASSWORD.special(datos.password);

            if (!cumpleLongitud || !cumpleMayuscula || !cumpleMinuscula || !cumpleNumero || !cumpleEspecial) {
                errores.push(['inputPassword', 'La contraseña no cumple con todas las reglas de seguridad requeridas.']);
            }
        }

        // 4. Confirmación de contraseña
        if (!datos.confirm) {
            errores.push(['inputConfirm', 'Debes confirmar tu contraseña.']);
        } else if (datos.password !== datos.confirm) {
            errores.push(['inputConfirm', 'Las contraseñas no coinciden. Por favor verifícalas.']);
        }

        // 5. Términos y condiciones
        if (!datos.terms) {
            errores.push(['inputTerms', 'Debes aceptar los términos y la política de privacidad.']);
        }

        return errores;
    },

    /**
     * Orquesta el flujo de envío del formulario de registro
     * 
     * @param {Event} event 
     */
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
            const resultado = await AuthModel.registrarUsuario(datos.nombre, datos.email, datos.password);

            if (resultado.sesion) {
                // Confirm email OFF: sesión iniciada automáticamente
                RegistroView.mostrarExito(
                    'Tu sesión ha sido iniciada automáticamente. Serás redirigido en un momento...',
                    '¡Tu cuenta se creó con éxito!'
                );
                setTimeout(() => {
                    this.redirigirUsuario();
                }, 1500);
            } else if (resultado.requiereConfirmacion) {
                // Confirm email ON: cuenta creada, requiere confirmar correo
                RegistroView.mostrarExito(
                    'Hemos enviado un enlace de confirmación a tu correo electrónico. Por favor verifica tu bandeja para activar tu cuenta antes de iniciar sesión.',
                    '¡Cuenta registrada! Revisa tu correo'
                );
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
                    'Este correo ya está registrado. Usa otro correo para tu nueva cuenta.'
                );
                RegistroView.mostrarErrorGlobal(
                    'Este correo ya está registrado',
                    'Ya existe una cuenta asociada a esta dirección. Puedes iniciar sesión o utilizar otro correo.'
                );
            } else if (
                codigo === 'weak_password' ||
                /password/i.test(mensaje)
            ) {
                RegistroView.mostrarErrorCampo(
                    'inputPassword',
                    'La contraseña no cumple con los requisitos mínimos de seguridad.'
                );
                RegistroView.mostrarErrorGlobal(
                    'Contraseña no válida',
                    mensaje || 'Por favor ingresa una contraseña que cumpla con los requisitos.'
                );
            } else {
                RegistroView.mostrarErrorGlobal(
                    'No fue posible crear la cuenta',
                    mensaje || 'Ocurrió un error inesperado al procesar el registro. Intenta de nuevo.'
                );
            }
        } finally {
            RegistroView.mostrarCargando(false);
        }
    },

    /**
     * Redirige al destino especificado en el parámetro ?redirect= o a mapa.html por defecto.
     * Replica exactamente la lógica de validación de origen seguro de LoginController.
     */
    redirigirUsuario() {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');

        if (redirect) {
            try {
                const urlDecodificada = decodeURIComponent(redirect);
                // Validación básica de seguridad para evitar redirecciones abiertas maliciosas
                if (urlDecodificada.startsWith('http://') || urlDecodificada.startsWith('https://')) {
                    const destinoUrl = new URL(urlDecodificada);
                    if (destinoUrl.origin === window.location.origin) {
                        window.location.href = urlDecodificada;
                        return;
                    }
                } else {
                    // Es una ruta relativa válida
                    window.location.href = urlDecodificada;
                    return;
                }
            } catch (_) {
                // Si falla la decodificación, se ignora y se redirige a la ruta por defecto
            }
        }

        // Redirección por defecto
        window.location.href = 'mapa.html';
    }
};

// Inicialización automática al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RegistroController.init(), { once: true });
} else {
    RegistroController.init();
}

export default RegistroController;
