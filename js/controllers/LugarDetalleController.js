import { LugarDetalleModel } from '../models/LugarDetalleModel.js';
import { LugarDetalleView } from '../views/LugarDetalleView.js';
import { AuthModel } from '../models/AuthModel.js';
import { CalificacionesModel } from '../models/CalificacionesModel.js';
import { NavbarController } from './NavbarController.js';

const DEFAULT_FALLBACK_ID = '9506d663-3b09-4430-860d-dbb336c18295';

/**
 * Función dedicada y desacoplada para renderizar el bloque de calificación (CA-05).
 * Si no hay usuario autenticado (!usuarioActual), limpia inmediatamente los textos
 * y badges previos (como "Ya has calificado este lugar") y renderiza el componente
 * en modo bloqueado para invitados, invitando a iniciar sesión.
 * 
 * @param {string} placeId - Identificador del sitio turístico
 * @param {Object|null} usuarioActual - Datos del usuario autenticado o null si es invitado
 */
export async function renderizarSeccionCalificacion(placeId, usuarioActual) {
    if (!placeId) return;

    // Caso 1: Invitado / Anónimo o inmediatamente posterior a cerrar sesión
    if (!usuarioActual) {
        const elegibilidadInvitado = CalificacionesModel.evaluarElegibilidadCalificacion({ usuario: null });

        LugarDetalleView.renderizarSeccionCalificacion({
            elegibilidad: {
                ...elegibilidadInvitado,
                yaCalifico: false,
                calificacionPrevia: null,
                usuario: null
            },
            onLogin: () => {
                const currentUrl = (typeof window !== 'undefined' && window.location)
                    ? (window.location.pathname.split('/').pop() || 'detalle-lugar.html') + window.location.search
                    : `detalle-lugar.html?id=${encodeURIComponent(placeId)}`;
                if (typeof window !== 'undefined') {
                    window.location.href = `login.html?redirect=${encodeURIComponent(currentUrl)}`;
                }
            }
        });
        return;
    }

    // Caso 2: Usuario autenticado -> Evaluar elegibilidad en el modelo
    try {
        const elegibilidad = await LugarDetalleModel.verificarElegibilidad(placeId, usuarioActual);

        LugarDetalleView.renderizarSeccionCalificacion({
            elegibilidad,
            onLogin: () => {
                const currentUrl = (typeof window !== 'undefined' && window.location)
                    ? (window.location.pathname.split('/').pop() || 'detalle-lugar.html') + window.location.search
                    : `detalle-lugar.html?id=${encodeURIComponent(placeId)}`;
                if (typeof window !== 'undefined') {
                    window.location.href = `login.html?redirect=${encodeURIComponent(currentUrl)}`;
                }
            },
            onCalificar: async (score) => {
                const resultado = await LugarDetalleModel.guardarCalificacion({
                    placeId,
                    score
                });

                if (resultado.ok) {
                    const lugar = LugarDetalleController.lugarActual;
                    if (lugar) {
                        if (!Array.isArray(lugar.ratings)) {
                            lugar.ratings = [];
                        }
                        lugar.ratings.push({ score });

                        // Refrescar estrellas y promedio de la cabecera dinámicamente
                        LugarDetalleView.renderizarRatingCabecera(lugar.ratings);
                    }
                    // Mostrar estado de éxito y fijar estrellas como voto inmutable
                    LugarDetalleView.mostrarCalificacionExitosa(score);
                } else {
                    LugarDetalleView.mostrarErrorCalificacion(
                        resultado.error || 'No se pudo guardar la calificación. Inténtalo de nuevo.'
                    );
                }
            }
        });
    } catch (error) {
        console.error('Error al inicializar módulo de calificación:', error);
    }
}

export const LugarDetalleController = {
    placeIdActual: null,
    lugarActual: null,
    unsubscribeAuth: null,
    unsubscribeNavbar: null,
    renderizarSeccionCalificacion,

    async init() {
        const { returnButton, dateFilter, clearDate } = LugarDetalleView.elements;
        returnButton?.addEventListener('click', event => {
            event.preventDefault();
            window.location.href = (typeof document !== 'undefined' && document.referrer.includes('lugares-turisticos.html'))
                ? 'lugares-turisticos.html'
                : 'mapa.html';
        });

        LugarDetalleView.mostrarEstado('loading');
        const id = (typeof window !== 'undefined' && window.location)
            ? (new URLSearchParams(window.location.search).get('id')?.trim() || DEFAULT_FALLBACK_ID)
            : DEFAULT_FALLBACK_ID;
        this.placeIdActual = id;

        const lugar = await LugarDetalleModel.obtenerPorId(id);
        if (!lugar) {
            LugarDetalleView.mostrarEstado('error', 'El sitio turístico solicitado no existe o no se encuentra registrado en el sistema del Ministerio de Turismo.');
            return;
        }

        this.lugarActual = lugar;
        LugarDetalleView.renderizarLugar(lugar);
        LugarDetalleView.mostrarEstado('content');

        // CA-04 y CA-05: Suscripción a eventos de autenticación e inicialización reactiva
        this.inicializarSuscripcionAuth();
        await this.inicializarModuloCalificacion(lugar);

        let tours = [];
        try {
            tours = await Promise.race([
                LugarDetalleModel.obtenerTours(lugar.id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), 6000))
            ]);
        } catch (error) {
            console.warn('Error al cargar tours del sitio:', error);
        }

        const renderTours = () => LugarDetalleView.renderizarTours(tours, dateFilter?.value.trim() || '', idTour => {
            window.location.href = `tour-detalle.html?id=${encodeURIComponent(idTour)}`;
        });
        dateFilter?.addEventListener('change', renderTours);
        clearDate?.addEventListener('click', () => {
            if (dateFilter) dateFilter.value = '';
            renderTours();
        });
        renderTours();
    },

    async inicializarModuloCalificacion(lugar) {
        const id = lugar?.id || this.placeIdActual;
        if (!id) return;
        this.placeIdActual = id;

        try {
            const sesion = await AuthModel.obtenerSesionActual();
            const usuarioActual = sesion?.user || null;
            await this.renderizarSeccionCalificacion(id, usuarioActual);
        } catch (error) {
            console.warn('Error al verificar sesión para calificación:', error);
            await this.renderizarSeccionCalificacion(id, null);
        }
    },

    /**
     * Escucha los eventos de cambio de sesión (AuthModel, NavbarController y eventos DOM)
     * para reaccionar inmediatamente limpiando el estado de calificación si el usuario cierra sesión.
     */
    inicializarSuscripcionAuth() {
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
        }
        if (this.unsubscribeNavbar) {
            this.unsubscribeNavbar();
        }

        const manejarCambioSesion = async (evento, sesion) => {
            const id = this.placeIdActual || this.lugarActual?.id;
            if (!id) return;

            const usuario = sesion?.user || null;
            if (evento === 'SIGNED_OUT' || !usuario) {
                await this.renderizarSeccionCalificacion(id, null);
            } else if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
                await this.renderizarSeccionCalificacion(id, usuario);
            }
        };

        // 1. Suscripción a eventos de AuthModel
        this.unsubscribeAuth = AuthModel.onCambioEstadoAuth(manejarCambioSesion);

        // 2. Suscripción al callback de logout de NavbarController
        if (typeof NavbarController !== 'undefined' && typeof NavbarController.onLogout === 'function') {
            this.unsubscribeNavbar = NavbarController.onLogout(() => {
                const id = this.placeIdActual || this.lugarActual?.id;
                if (id) {
                    this.renderizarSeccionCalificacion(id, null);
                }
            });
        }

        // 3. Suscripción al evento DOM personalizado auth:logout
        if (typeof window !== 'undefined' && window.addEventListener) {
            const onCustomLogout = () => {
                const id = this.placeIdActual || this.lugarActual?.id;
                if (id) {
                    this.renderizarSeccionCalificacion(id, null);
                }
            };
            window.addEventListener('auth:logout', onCustomLogout);
        }
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LugarDetalleController.init(), { once: true });
    } else {
        LugarDetalleController.init();
    }
}

export default LugarDetalleController;