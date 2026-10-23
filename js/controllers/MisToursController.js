/**
 * js/controllers/MisToursController.js
 * Controlador del Historial de Tours para ChocoMapaSV (MITUR)
 * Orquestador entre el modelo (MisToursModel) y la vista (MisToursView).
 * Aplica guardias de autenticación y gestiona el flujo de navegación.
 */

import { MisToursModel } from '../models/MisToursModel.js';
import { MisToursView } from '../views/MisToursView.js';

export const MisToursController = {
    usuarioActual: null,

    /**
     * Inicializa el controlador y valida la sesión del usuario
     */
    async init() {
        try {
            MisToursView.renderLoading();

            // Criterio 1: Guardia de autenticación
            // Si NO ha iniciado sesión, redirige inmediatamente a login.html?redirect=mis-tours.html
            const usuario = await MisToursModel.verificarSesion();
            if (!usuario) {
                window.location.href = 'login.html?redirect=mis-tours.html';
                return;
            }

            this.usuarioActual = usuario;
            await this.cargarHistorial();
        } catch (error) {
            console.error('Error durante la inicialización de MisToursController:', error);
            MisToursView.renderError(
                'Ocurrió un problema de comunicación con el servidor de autenticación.',
                () => this.init()
            );
        }
    },

    /**
     * Carga el historial de reservaciones desde el modelo y solicita a la vista renderizarlo
     */
    async cargarHistorial() {
        if (!this.usuarioActual) return;

        try {
            MisToursView.renderLoading();
            const reservas = await MisToursModel.obtenerHistorial(this.usuarioActual.id);

            // Criterio 2: Si no tiene reservas, muestra "Aún no tienes tours"
            if (!reservas || reservas.length === 0) {
                MisToursView.renderEstadoVacio();
                return;
            }

            // Renderizar tarjetas con sus estados normalizados ("Pendiente de confirmar", "Confirmado", "Pasado")
            MisToursView.renderHistorial(reservas);

            // Criterio 3: Enlace de navegación hacia tour-detalle.html?id=[TOUR_ID]&from=historial&reservaId=[RESERVATION_ID]
            MisToursView.bindVerDetalleTour((tourId, reservaId) => {
                const params = new URLSearchParams({
                    id: tourId,
                    from: 'historial',
                    reservaId: reservaId
                });
                window.location.href = `tour-detalle.html?${params.toString()}`;
            });
        } catch (error) {
            console.error('Error al cargar historial en MisToursController:', error);
            MisToursView.renderError(
                'No fue posible obtener las reservas desde la base de datos.',
                () => this.cargarHistorial()
            );
        }
    }
};

// Inicialización automática
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MisToursController.init(), { once: true });
} else {
    MisToursController.init();
}

export default MisToursController;
