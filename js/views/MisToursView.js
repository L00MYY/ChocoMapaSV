/**
 * js/views/MisToursView.js
 * Vista del Historial de Tours para ChocoMapaSV (MITUR)
 * Encargada de manipular el DOM, renderizar estados (carga, error, vacío e historial)
 * y vincular eventos sin realizar llamadas a APIs.
 */

export const MisToursView = {
    get container() {
        return document.getElementById('mis-tours-content') || document.getElementById('mis-tours-container');
    },

    /**
     * Renderiza el estado visual de carga
     */
    renderLoading() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="state-box" role="status" aria-live="polite">
                <div class="loading-spinner-wrap">
                    <div class="spinner" aria-hidden="true"></div>
                    <p class="loading-text">Cargando tus reservaciones oficiales...</p>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza un mensaje de error visual amigable
     * @param {string} mensaje 
     * @param {Function} [onReintentar] 
     */
    renderError(mensaje, onReintentar) {
        if (!this.container) return;
        const msg = mensaje || 'No pudimos cargar tus reservaciones en este momento.';
        this.container.innerHTML = `
            <div class="state-box" role="alert">
                <div class="error-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h2 class="error-title">No fue posible obtener el historial</h2>
                <p class="error-message">${msg}</p>
                <button type="button" class="btn-retry" id="btn-retry-historial">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Reintentar
                </button>
            </div>
        `;

        if (onReintentar) {
            document.getElementById('btn-retry-historial')?.addEventListener('click', onReintentar);
        }
    },

    /**
     * Renderiza el estado vacío con el texto exacto obligatorio: "Aún no tienes tours"
     */
    renderEstadoVacio() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="state-box empty-state-box">
                <div class="empty-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="36" height="36" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                    </svg>
                </div>
                <!-- Criterio 2: Texto exacto "Aún no tienes tours" -->
                <h2 class="empty-title">Aún no tienes tours</h2>
                <p class="empty-description">
                    Explora los paquetes guiados del Ministerio de Turismo y reserva tu próxima aventura por El Salvador.
                </p>
                <a href="tours.html" class="btn-explore">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                    Explorar tours disponibles
                </a>
            </div>
        `;
    },

    /**
     * Genera la clase CSS y el icono SVG según el estado exacto
     * @param {'Pendiente de confirmar' | 'Confirmado' | 'Pasado'} status 
     */
    obtenerDetallesStatus(status) {
        if (status === 'Confirmado') {
            return {
                badgeClass: 'status-badge--confirmado',
                iconSvg: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `
            };
        }
        if (status === 'Pasado') {
            return {
                badgeClass: 'status-badge--pasado',
                iconSvg: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 14 14"></polyline>
                    </svg>
                `
            };
        }
        // Pendiente de confirmar (por defecto)
        return {
            badgeClass: 'status-badge--pendiente',
            iconSvg: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `
        };
    },

    /**
     * Renderiza la lista/cuadrícula de reservas del usuario
     * @param {Array<Object>} reservas 
     */
    renderHistorial(reservas) {
        if (!this.container) return;

        if (!reservas || reservas.length === 0) {
            this.renderEstadoVacio();
            return;
        }

        const cardsHtml = reservas.map(reserva => {
            const { badgeClass, iconSvg } = this.obtenerDetallesStatus(reserva.status);
            const tour = reserva.tour || {};
            const imagenUrl = tour.image_url || 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80';
            const departamento = tour.department || 'El Salvador';

            return `
                <article class="tour-history-card" 
                         data-tour-id="${reserva.tour_id}" 
                         data-reserva-id="${reserva.id}"
                         tabindex="0"
                         role="button"
                         aria-label="Ver detalles de ${tour.name || 'Tour'}">
                    
                    <div class="card-media-wrap">
                        <img src="${imagenUrl}" 
                             alt="${tour.name || 'Tour oficial'}" 
                             class="card-image" 
                             loading="lazy">
                        
                        <!-- Estado con texto exacto: "Pendiente de confirmar", "Confirmado" o "Pasado" -->
                        <span class="status-badge ${badgeClass}">
                            ${iconSvg}
                            <span>${reserva.status}</span>
                        </span>

                        <span class="card-dept-tag">${departamento}</span>
                    </div>

                    <div class="card-content">
                        <!-- Nombre del tour -->
                        <h2 class="card-tour-title">${tour.name || 'Tour Oficial MITUR'}</h2>

                        <div class="card-meta-list">
                            <!-- Fecha de salida formateada en español -->
                            <div class="card-meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span>Salida: <strong>${reserva.fecha_formateada || reserva.tour_date}</strong></span>
                            </div>

                            <!-- Cantidad de cupos reservados -->
                            <div class="card-meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span>Cupos reservados: <strong>${reserva.spots_reserved}</strong></span>
                            </div>
                        </div>

                        <div class="card-footer-action">
                            <span class="card-link-text">
                                Ver detalle del tour
                                <svg class="card-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </span>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        this.container.innerHTML = `
            <div class="mis-tours-grid" id="mis-tours-grid">
                ${cardsHtml}
            </div>
        `;
    },

    /**
     * Enlaza el evento click sobre cada tarjeta para abrir el detalle del tour
     * Redirige hacia: tour-detalle.html?id=[TOUR_ID]&from=historial&reservaId=[RESERVATION_ID]
     * 
     * @param {Function} handler - Función invocada con (tourId, reservaId)
     */
    bindVerDetalleTour(handler) {
        if (!this.container) return;
        const tarjetas = this.container.querySelectorAll('.tour-history-card');

        tarjetas.forEach(tarjeta => {
            const tourId = tarjeta.getAttribute('data-tour-id');
            const reservaId = tarjeta.getAttribute('data-reserva-id');

            const ejecutar = () => {
                if (tourId && typeof handler === 'function') {
                    handler(tourId, reservaId);
                }
            };

            tarjeta.addEventListener('click', ejecutar);

            tarjeta.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    ejecutar();
                }
            });
        });
    }
};

export default MisToursView;
