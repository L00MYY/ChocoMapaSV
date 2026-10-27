/**
 * js/models/AuthModel.js
 * Modelo de Autenticación para ChocoMapaSV (MITUR)
 * Capa de datos desacoplada del DOM que gestiona la comunicación con Supabase Auth.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const STORAGE_KEY = 'chocomapa_auth_session';
const authListeners = new Set();

/**
 * Notifica a los suscriptores registrados sobre eventos de autenticación
 * @param {'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'} evento 
 * @param {Object|null} sesion 
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
            } catch (_) {
                notificarCambio('SIGNED_OUT', null);
            }
        }
    });
}

/**
 * Autentica un usuario existente con correo electrónico y contraseña
 * utilizando el endpoint de autenticación de Supabase (GoTrue).
 * 
 * @param {string} email - Correo del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Datos de sesión y usuario autenticado
 * @throws {Error} Error tipificado si las credenciales son inválidas o hay fallo de red
 */
export async function iniciarSesion(email, password) {
    if (!email || !password) {
        const error = new Error('Todos los campos son obligatorios');
        error.code = 'missing_fields';
        throw error;
    }

    const cleanEmail = String(email).trim();
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

    const data = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        const mensajeError = data.error_description || data.msg || 'Correo o contraseña incorrectos';
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
 * Retorna la sesión activa actual del usuario si existe y no ha expirado.
 * Intenta refrescar el token de acceso automáticamente si está por expirar.
 * 
 * @returns {Promise<Object|null>} Sesión activa o null si no hay sesión válida
 */
export async function obtenerSesionActual() {
    let rawSession = null;
    try {
        rawSession = localStorage.getItem(STORAGE_KEY);
    } catch (_) {
        return null;
    }

    if (!rawSession) {
        return null;
    }

    let sesion = null;
    try {
        sesion = JSON.parse(rawSession);
    } catch (_) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
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
    } catch (_) {}
    notificarCambio('SIGNED_OUT', null);
    return null;
}

/**
 * Cierra la sesión activa actual, revoca el token en Supabase y limpia el almacenamiento local.
 * 
 * @returns {Promise<boolean>} True si el cierre de sesión fue completado
 */
export async function cerrarSesion() {
    let sesion = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) sesion = JSON.parse(raw);
    } catch (_) {}

    if (sesion?.access_token) {
        try {
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
    } catch (_) {}

    notificarCambio('SIGNED_OUT', null);
    return true;
}

/**
 * Suscribe un callback para escuchar los cambios de estado de autenticación.
 * 
 * @param {Function} callback - Función que recibe (evento, sesion)
 * @returns {Function} Función para cancelar la suscripción
 */
export function onCambioEstadoAuth(callback) {
    if (typeof callback !== 'function') {
        return () => {};
    }
    authListeners.add(callback);
    return () => authListeners.delete(callback);
}

/**
 * Registra un nuevo usuario en Supabase Auth mediante petición directa a /auth/v1/signup.
 * 
 * @param {string} fullName - Nombre completo del usuario
 * @param {string} email - Correo del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Datos devueltos por Supabase
 * @throws {Error} Error tipificado si el registro falla o el correo ya existe
 */
export async function registrarUsuario(fullName, email, password) {
  const url = `${SUPABASE_URL}/auth/v1/signup`;
  const respuesta = await fetch(url, {
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

  const data = await respuesta.json().catch(() => ({}));

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
 * Valida de forma estricta el formato de un correo electrónico.
 * @param {string} email 
 * @returns {boolean}
 */
export function validarEmail(email) {
  if (typeof email !== 'string') return false;
  const limpio = email.trim();
  if (!limpio) return false;
  if (/\s/.test(limpio) || limpio.includes('..')) return false;
  // Formato estricto: usuario@dominio.tld (sin puntos consecutivos, al menos 2 letras de TLD)
  const regex = /^[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
  return regex.test(limpio);
}

/**
 * Valida que una contraseña cumpla con criterios de seguridad mínimos:
 * longitud mínima (8 caracteres) y caracteres alfanuméricos (letras y números).
 * @param {string} password 
 * @param {Object} [opciones]
 * @param {number} [opciones.minLength=8]
 * @param {boolean} [opciones.requireAlphanumeric=true]
 * @returns {boolean}
 */
export function validarPassword(password, { minLength = 8, requireAlphanumeric = true } = {}) {
  if (typeof password !== 'string') return false;
  if (password.length < minLength || password.length > 32) return false;
  if (requireAlphanumeric) {
    const tieneLetras = /[a-zA-Z]/.test(password);
    const tieneNumeros = /[0-9]/.test(password);
    if (!tieneLetras || !tieneNumeros) return false;
  }
  return true;
}

/**
 * Valida un número telefónico salvadoreño (8 dígitos numéricos válidos).
 * En El Salvador los números fijos inician con 2 y los móviles con 6 o 7.
 * Admite formato continuo o separado por guion/espacio (ej. 7123-4567, 71234567, 22501234).
 * @param {string|number} telefono 
 * @returns {boolean}
 */
export function validarTelefonoSV(telefono) {
  if (typeof telefono !== 'string' && typeof telefono !== 'number') return false;
  const limpio = String(telefono).trim().replace(/[-\s]/g, '');
  // 8 dígitos numéricos salvadoreños con prefijos válidos (2, 6, 7)
  return /^[267]\d{7}$/.test(limpio);
}

/**
 * Sanitiza una cadena de texto (como nombre de usuario), aplicando trim.
 * @param {string} cadena 
 * @returns {string}
 */
export function sanitizarUsuario(cadena) {
  if (typeof cadena !== 'string') return '';
  return cadena.trim();
}

/**
 * Objeto AuthModel agrupando la API del modelo de autenticación
 */
export const AuthModel = {
    validarEmail,
    validarPassword,
    validarTelefonoSV,
    sanitizarUsuario,
    iniciarSesion,
    registrarUsuario,
    obtenerSesionActual,
    cerrarSesion,
    onCambioEstadoAuth,
    // Compatibilidad y alias estándar
    signInWithPassword: ({ email, password }) => iniciarSesion(email, password),
    signUp: ({ nombre, email, password }) => registrarUsuario(nombre, email, password),
    signOut: cerrarSesion,
    getSession: obtenerSesionActual
};

export default AuthModel;
