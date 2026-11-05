/**
 * js/models/AuthModel.js
 * Modelo de Autenticación para ChocoMapaSV (MITUR)
 * @file AuthModel.js
 * Rol en el MVC: Modelo (Model). Centraliza el acceso y persistencia de credenciales de usuario,
 * gestiona tokens JWT con Supabase GoTrue y notifica a los controladores mediante un patrón observador.
 * Capa de datos desacoplada del DOM que gestiona la comunicación con Supabase Auth.
 */

import { SUPABASE_URL_B64, SUPABASE_ANON_KEY_B64 } from '../config.js';

// Decodificación segura en memoria en tiempo de ejecución
const SUPABASE_URL = typeof atob === 'function' && !SUPABASE_URL_B64.startsWith('http')
    ? atob(SUPABASE_URL_B64)
    : SUPABASE_URL_B64;
const SUPABASE_ANON_KEY = typeof atob === 'function' && !SUPABASE_ANON_KEY_B64.startsWith('sb_')
    ? atob(SUPABASE_ANON_KEY_B64)
    : SUPABASE_ANON_KEY_B64;

/** @constant {string} STORAGE_KEY - Clave de persistencia de la sesión en el almacenamiento local del navegador */
const STORAGE_KEY = 'chocomapa_auth_session';
/** @type {Set<Function>} Conjunto de escuchadores registrados para eventos de autenticación */
const authListeners = new Set();

/**
 * Mensaje unificado de error ante fallos de autenticación o credenciales no coincidentes (Criterio 3).
 * @type {string}
 */
export const MENSAJE_ERROR_CREDENCIALES = 'Correo o contraseña incorrectos';

/**
 * @description Notifica a los observadores registrados sobre cambios en el ciclo de autenticación.
 * @param {'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'} evento - Evento de autenticación.
 * @param {Object|null} sesion - Información de sesión del usuario.
 */
function notificarCambio(evento, sesion) {
    authListeners.forEach(callback => {
        try {
            callback(evento, sesion);
        } catch (error) {
            console.error('Error en listener de cambio de estado auth:', error);
        }
    });
}

// Sincronización entre pestañas del navegador mediante el evento storage
if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
            try {
                const nuevaSesion = event.newValue ? JSON.parse(event.newValue) : null;
                const evento = nuevaSesion ? 'SIGNED_IN' : 'SIGNED_OUT';
                notificarCambio(evento, nuevaSesion);
            } catch (error) {
                console.warn('Error al parsear sesión sincronizada de storage:', error);
                notificarCambio('SIGNED_OUT', null);
            }
        }
    });
}

/**
 * @description Autentica un usuario existente con correo electrónico y contraseña
 * utilizando el endpoint de autenticación de Supabase (GoTrue).
 * @param {string} email - Correo del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<Object>} Datos de sesión y usuario autenticado.
 * @throws {Error} Error tipificado si las credenciales son inválidas o hay fallo de red.
 */
export async function iniciarSesion(email, password) {
    if (!email || !password) {
        const error = new Error('Todos los campos son obligatorios');
        error.code = 'missing_fields';
        throw error;
    }

    const cleanEmail = String(email).trim();
    // Petición REST a GoTrue endpoint de Supabase Auth con autenticación por contraseña
    const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

    let respuesta;
    try {
        respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: cleanEmail,
                password: String(password)
            })
        });
    } catch (networkError) {
        console.error('Error de red al conectar con Supabase Auth:', networkError);
        const err = new Error('No se pudo establecer conexión con el servidor. Verifica tu conexión a internet.');
        err.code = 'network_error';
        err.cause = networkError;
        throw err;
    }

    const data = await respuesta.json().catch((jsonError) => {
        console.warn('Error al deserializar respuesta JSON en iniciarSesion:', jsonError);
        return {};
    });

    if (!respuesta.ok) {
        const mensajeError = data.error_description || data.msg || MENSAJE_ERROR_CREDENCIALES;
        const err = new Error(mensajeError);
        err.status = respuesta.status;
        err.code = data.error_code || data.error || 'invalid_credentials';
        throw err;
    }

    // Calcular timestamp de expiración del token
    const ahoraSegundos = Math.floor(Date.now() / 1000);
    const expiresAt = data.expires_at || (ahoraSegundos + (data.expires_in || 3600));

    const sesion = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || 'bearer',
        expires_at: expiresAt,
        expires_in: data.expires_in || 3600,
        user: data.user || null
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    } catch (storageError) {
        console.warn('No se pudo guardar la sesión en localStorage:', storageError);
    }

    notificarCambio('SIGNED_IN', sesion);
    return sesion;
}

/**
 * @description Retorna la sesión activa actual del usuario si existe y no ha expirado.
 * Intenta refrescar el token de acceso automáticamente si está por expirar.
 * @returns {Promise<Object|null>} Sesión activa o null si no hay sesión válida.
 */
export async function obtenerSesionActual() {
    let rawSession = null;
    try {
        rawSession = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.warn('No se pudo acceder a localStorage para leer sesión:', error);
        return null;
    }

    if (!rawSession) {
        return null;
    }

    let sesion = null;
    try {
        sesion = JSON.parse(rawSession);
    } catch (parseError) {
        console.warn('Sesión corrupta en localStorage, eliminando registro:', parseError);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (removeError) {
            console.warn('No se pudo remover clave inválida de localStorage:', removeError);
        }
        return null;
    }

    if (!sesion || !sesion.access_token) {
        return null;
    }

    const ahoraSegundos = Math.floor(Date.now() / 1000);

    // Si el token aún es válido por al menos 60 segundos
    if (sesion.expires_at && sesion.expires_at > ahoraSegundos + 60) {
        return sesion;
    }

    // Si ya expiró o está a punto de expirar pero tiene refresh_token, intentar refrescar
    if (sesion.refresh_token) {
        try {
            // Renovación proactiva del token expirado utilizando el refresh_token persistido
            const refreshUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`;
            const respuesta = await fetch(refreshUrl, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: sesion.refresh_token })
            });

            if (respuesta.ok) {
                const data = await respuesta.json();
                const nuevaSesion = {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token || sesion.refresh_token,
                    token_type: data.token_type || 'bearer',
                    expires_at: data.expires_at || (ahoraSegundos + (data.expires_in || 3600)),
                    expires_in: data.expires_in || 3600,
                    user: data.user || sesion.user
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaSesion));
                notificarCambio('TOKEN_REFRESHED', nuevaSesion);
                return nuevaSesion;
            }
        } catch (refreshErr) {
            console.warn('Error al intentar refrescar token de sesión:', refreshErr);
        }
    }

    // Si expiró y no fue posible refrescar, se invalida la sesión local
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (storageError) {
        console.warn('Advertencia al invalidar sesión expirada en storage:', storageError);
    }
    notificarCambio('SIGNED_OUT', null);
    return null;
}

/**
 * @description Cierra la sesión activa actual, revoca el token en Supabase y limpia el almacenamiento local.
 * @returns {Promise<boolean>} True si el cierre de sesión fue completado.
 */
export async function cerrarSesion() {
    let sesion = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) sesion = JSON.parse(raw);
    } catch (error) {
        console.warn('No se pudo leer la sesión activa al cerrar sesión:', error);
    }

    if (sesion?.access_token) {
        try {
            // Notificación remota a Supabase GoTrue para invalidar el token activo en el servidor
            await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${sesion.access_token}`
                }
            });
        } catch (logoutError) {
            console.warn('Advertencia al solicitar logout remoto en Supabase:', logoutError);
        }
    }

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (storageError) {
        console.warn('Advertencia al limpiar STORAGE_KEY en cerrarSesion:', storageError);
    }

    notificarCambio('SIGNED_OUT', null);
    return true;
}

/**
 * @description Suscribe un callback para escuchar los cambios de estado de autenticación.
 * @param {Function} callback - Función que recibe (evento, sesion).
 * @returns {Function} Función para cancelar la suscripción.
 */
export function onCambioEstadoAuth(callback) {
    if (typeof callback !== 'function') {
        return () => {};
    }
    authListeners.add(callback);
    return () => authListeners.delete(callback);
}

/**
 * @description Registra un nuevo usuario en Supabase Auth mediante petición directa a /auth/v1/signup.
 * @param {string} fullName - Nombre completo del usuario.
 * @param {string} email - Correo del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<Object>} Datos devueltos por Supabase.
 * @throws {Error} Error tipificado si el registro falla o el correo ya existe.
 */
export async function registrarUsuario(fullName, email, password) {
    const url = `${SUPABASE_URL}/auth/v1/signup`;
    let respuesta;
    try {
        respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: String(email).trim(),
                password: String(password),
                data: {
                    full_name: String(fullName).trim()
                }
            })
        });
    } catch (networkError) {
        console.error('Error de red al conectar con Supabase Auth en registro:', networkError);
        const err = new Error('No se pudo establecer conexión con el servidor. Verifica tu conexión a internet.');
        err.code = 'network_error';
        err.cause = networkError;
        throw err;
    }

    const data = await respuesta.json().catch((jsonError) => {
        console.warn('Error al parsear respuesta JSON de registro:', jsonError);
        return {};
    });

    if (!respuesta.ok) {
        const mensaje = data.msg || data.error_description || data.message || 'Error al registrar la cuenta';
        const err = new Error(mensaje);
        err.status = respuesta.status;
        err.code = data.error_code || data.code || (/already registered/i.test(mensaje) ? 'user_already_exists' : 'signup_failed');
        throw err;
    }

    // Asegurar que data.user esté disponible tanto si Supabase lo devuelve anidado o en la raíz
    if (!data.user && (data.id || data.email)) {
        data.user = { ...data };
    }

    // Si la respuesta incluye sesión / token activo, almacenar la sesión localmente
    const accessToken = data.access_token || data.session?.access_token;
    const refreshToken = data.refresh_token || data.session?.refresh_token;
    if (accessToken && data.user) {
        const ahoraSegundos = Math.floor(Date.now() / 1000);
        const expiresAt = data.expires_at || (ahoraSegundos + (data.expires_in || 3600));

        const sesion = {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: data.token_type || data.session?.token_type || 'bearer',
            expires_at: expiresAt,
            expires_in: data.expires_in || 3600,
            user: data.user
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
        } catch (storageError) {
            console.warn('No se pudo guardar la sesión en localStorage:', storageError);
        }

        notificarCambio('SIGNED_IN', sesion);
        data.sesion = sesion;
    }

    return data;
}

/**
 * @description Valida que un nombre completo tenga al menos 3 caracteres tras sanitizarlo (Criterio 4.2).
 * @param {string} nombre - Nombre a evaluar.
 * @returns {boolean} True si cumple la regla de longitud mínima.
 */
export function validarNombre(nombre) {
    if (typeof nombre !== 'string') return false;
    const limpio = sanitizarUsuario(nombre);
    return limpio.length >= 3;
}

/**
 * @description Valida de forma estricta el formato de un correo electrónico (Criterio 4.3).
 * @param {string} email - Correo a validar.
 * @returns {boolean} True si cumple con la sintaxis estándar usuario@dominio.ext.
 */
export function validarEmail(email) {
    if (typeof email !== 'string') return false;
    const limpio = email.trim();
    if (!limpio) return false;
    if (/\s/.test(limpio) || limpio.includes('..')) return false;
    const regex = /^[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
    return regex.test(limpio);
}

/**
 * @description Valida que una contraseña cumpla estrictamente con la política de seguridad (Criterio 4.4):
 * longitud 8-32 caracteres, mayúscula, minúscula, número y símbolo permitido.
 * @param {string} password - Contraseña a evaluar.
 * @returns {boolean} True si satisface todos los requisitos de seguridad.
 */
export function validarPassword(password) {
    if (typeof password !== 'string') return false;
    if (password.length < 8 || password.length > 32) return false;
    if (!/^[a-zA-Z0-9!@#$%^&*_\-]+$/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*_\-]/.test(password)) return false;
    return true;
}

/**
 * @description Valida que la confirmación de contraseña coincida exactamente con la contraseña (Criterio 4.5).
 * @param {string} pass - Contraseña original.
 * @param {string} confirmPass - Contraseña de confirmación.
 * @returns {boolean} True si ambas coinciden exactamente.
 */
export function validarConfirmacionPassword(pass, confirmPass) {
    if (typeof pass !== 'string' || typeof confirmPass !== 'string') return false;
    if (pass.length === 0 || confirmPass.length === 0) return false;
    return pass === confirmPass;
}

/**
 * @description Valida que la casilla de términos y condiciones haya sido aceptada (Criterio 4.6).
 * @param {*} terminosAceptados - Valor booleano de la casilla.
 * @returns {boolean} True si es estrictamente el booleano true.
 */
export function validarTerminos(terminosAceptados) {
    return terminosAceptados === true;
}

/**
 * @description Orquesta la validación integral del formulario de registro y genera el mapa de errores
 * específicos por campo si alguna regla falla (Criterios 4.1 y 5).
 * @param {Object} datos - Objeto con datos del formulario { nombre, email, password, confirm, terms }.
 * @returns {{ esValido: boolean, errores: Object }} Resultado y detalle de errores de validación.
 */
export function validarFormularioRegistro(datos) {
    const payload = datos && typeof datos === 'object' ? datos : {};
    const errores = {};

    const nombreRaw = payload.nombre ?? payload.name;
    const emailRaw = payload.email ?? payload.correo;
    const passwordRaw = payload.password ?? payload.clave;
    const confirmRaw = payload.confirm ?? payload.confirmPassword ?? payload.confirmacion;
    const termsRaw = payload.terms ?? payload.terminos ?? payload.terminosAceptados;

    // Criterios 4.1 y 4.2: Nombre completo
    if (nombreRaw === undefined || nombreRaw === null || typeof nombreRaw !== 'string' || nombreRaw.trim().length === 0) {
        errores.nombre = 'El nombre completo es obligatorio.';
    } else if (!validarNombre(nombreRaw)) {
        errores.nombre = 'El nombre completo debe tener al menos 3 caracteres tras eliminar espacios.';
    }

    // Criterios 4.1 y 4.3: Correo electrónico
    if (emailRaw === undefined || emailRaw === null || typeof emailRaw !== 'string' || emailRaw.trim().length === 0) {
        errores.email = 'El correo electrónico es obligatorio.';
    } else if (!validarEmail(emailRaw)) {
        errores.email = 'El correo electrónico debe tener un formato válido (usuario@dominio.ext).';
    }

    // Criterios 4.1 y 4.4: Contraseña segura
    if (passwordRaw === undefined || passwordRaw === null || typeof passwordRaw !== 'string' || passwordRaw.length === 0) {
        errores.password = 'La contraseña es obligatoria.';
    } else if (!validarPassword(passwordRaw)) {
        errores.password = 'La contraseña debe tener entre 8 y 32 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 símbolo especial (!@#$%^&*_-).';
    }

    // Criterios 4.1 y 4.5: Confirmación de contraseña
    if (confirmRaw === undefined || confirmRaw === null || typeof confirmRaw !== 'string' || confirmRaw.length === 0) {
        errores.confirmacion = 'La confirmación de contraseña es obligatoria.';
    } else if (!validarConfirmacionPassword(passwordRaw, confirmRaw)) {
        errores.confirmacion = 'La confirmación de contraseña debe coincidir exactamente con la contraseña.';
    }

    // Criterios 4.1 y 4.6: Casilla de términos y condiciones
    if (!validarTerminos(termsRaw)) {
        errores.terminos = 'Debe aceptar obligatoriamente los términos y condiciones.';
    }

    // Definir propiedades no enumerables para compatibilidad con accesos tipo errores.confirm o errores.terms
    if (errores.confirmacion) {
        Object.defineProperty(errores, 'confirm', {
            value: errores.confirmacion,
            writable: true,
            enumerable: false,
            configurable: true
        });
    }
    if (errores.terminos) {
        Object.defineProperty(errores, 'terms', {
            value: errores.terminos,
            writable: true,
            enumerable: false,
            configurable: true
        });
    }

    return {
        esValido: Object.keys(errores).length === 0,
        errores
    };
}

/**
 * @description Control de acceso a reservas según estado de autenticación (Criterio 8).
 * @param {Object|null|undefined} sesion - Objeto de sesión a evaluar.
 * @returns {boolean} True si cuenta con sesión válida y usuario activo.
 */
export function puedeReservarTour(sesion) {
    if (!sesion || typeof sesion !== 'object') return false;
    if (!sesion.user || typeof sesion.user !== 'object') return false;
    if (!sesion.user.id && !sesion.user.email) return false;
    return true;
}

/**
 * @description Valida un número telefónico salvadoreño (8 dígitos numéricos con prefijo 2, 6 o 7).
 * @param {string|number} telefono - Teléfono a validar.
 * @returns {boolean} True si cumple el formato salvadoreño estándar.
 */
export function validarTelefonoSV(telefono) {
    if (typeof telefono !== 'string' && typeof telefono !== 'number') return false;
    const limpio = String(telefono).trim().replace(/[-\s]/g, '');
    return /^[267]\d{7}$/.test(limpio);
}

/**
 * @description Sanitiza una cadena de texto recortando espacios al inicio y final.
 * @param {string} cadena - Texto a sanitizar.
 * @returns {string} Cadena sanitizada.
 */
export function sanitizarUsuario(cadena) {
    if (typeof cadena !== 'string') return '';
    return cadena.trim();
}

/**
 * @description Valida los campos del formulario de inicio de sesión (Criterios 1 y 3).
 * @param {Object} datos - Objeto con { email, password }.
 * @returns {{ esValido: boolean, errores: { email?: string, password?: string } }} Resultado de validación.
 */
export function validarFormularioLogin(datos) {
    const payload = datos && typeof datos === 'object' ? datos : {};
    const errores = {};

    const emailRaw = payload.email ?? payload.correo;
    const passwordRaw = payload.password ?? payload.clave;

    if (emailRaw === undefined || emailRaw === null || typeof emailRaw !== 'string' || emailRaw.trim().length === 0) {
        errores.email = 'El correo electrónico es obligatorio';
    } else if (!validarEmail(emailRaw)) {
        errores.email = 'Ingresa un formato de correo válido';
    }

    if (passwordRaw === undefined || passwordRaw === null || typeof passwordRaw !== 'string' || passwordRaw.trim().length === 0) {
        errores.password = 'La contraseña es obligatoria';
    }

    return {
        esValido: Object.keys(errores).length === 0,
        errores
    };
}

/**
 * @description Formatea los datos de sesión activa para ser consumidos por el navbar y vistas (Criterio 2).
 * @param {Object|null|undefined} usuario - Objeto de usuario o sesión.
 * @returns {{ logueado: boolean, nombreMostrado: string, email: string }} Perfil preparado para la vista.
 */
export function formatearPerfilSesion(usuario) {
    if (!usuario || typeof usuario !== 'object') {
        return { logueado: false, nombreMostrado: '', email: '' };
    }

    const user = usuario.user && typeof usuario.user === 'object' ? usuario.user : usuario;

    if (!user || typeof user !== 'object') {
        return { logueado: false, nombreMostrado: '', email: '' };
    }

    const email = typeof user.email === 'string' ? user.email.trim() : '';
    const id = user.id !== undefined && user.id !== null ? String(user.id) : '';

    if (!email && !id) {
        return { logueado: false, nombreMostrado: '', email: '' };
    }

    const meta = user.user_metadata || user.raw_user_meta_data || {};
    const nombreCandidato =
        meta.full_name ||
        meta.nombre ||
        meta.name ||
        user.full_name ||
        user.nombre ||
        user.name ||
        user.nombreMostrado ||
        '';

    let nombreMostrado = '';
    if (typeof nombreCandidato === 'string' && nombreCandidato.trim().length > 0) {
        nombreMostrado = nombreCandidato.trim();
    } else if (email) {
        nombreMostrado = email.split('@')[0];
    } else {
        nombreMostrado = 'Usuario';
    }

    return {
        logueado: true,
        nombreMostrado,
        email
    };
}

/**
 * @description Valida si se exige inicio de sesión antes de permitir reservar cupos en un tour (Criterio 5).
 * @param {Object|null|undefined} sesion - Sesión actual.
 * @returns {boolean} True si se requiere iniciar sesión.
 */
export function requiereIniciarSesionParaReserva(sesion) {
    return !puedeReservarTour(sesion);
}

/**
 * @namespace AuthModel
 * Objeto AuthModel agrupando la API del modelo de autenticación
 */
export const AuthModel = {
    validarNombre,
    validarEmail,
    validarPassword,
    validarConfirmacionPassword,
    validarTerminos,
    validarFormularioRegistro,
    validarFormularioLogin,
    formatearPerfilSesion,
    requiereIniciarSesionParaReserva,
    MENSAJE_ERROR_CREDENCIALES,
    puedeReservarTour,
    validarTelefonoSV,
    sanitizarUsuario,
    iniciarSesion,
    registrarUsuario,
    obtenerSesionActual,
    cerrarSesion,
    onCambioEstadoAuth,
    signInWithPassword: ({ email, password }) => iniciarSesion(email, password),
    signUp: ({ nombre, email, password }) => registrarUsuario(nombre, email, password),
    signOut: cerrarSesion,
    getSession: obtenerSesionActual
};

export default AuthModel;
