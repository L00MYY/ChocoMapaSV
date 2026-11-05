function esFechaPasada(fechaStr) {
    if (!fechaStr) return false;
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const hoyStr = `${anio}-${mes}-${dia}`;
    const f = String(fechaStr).split('T')[0];
    return f < hoyStr;
}

export const MisToursView = {
    reservasActuales: [],
    filtroActual: 'todos',
    onVerDetalleHandler: null,

    _container: null,
    get container() {
        if (this._container) return this._container;
        if (typeof document === 'undefined') return null;
        return document.getElementById('mis-tours-content') || document.getElementById('mis-tours-container');
    },
    set container(val) {
        this._container = val;
    },

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

    renderEstadoVacio(alerta) {
        if (!this.container) return;
        const alertaBanner = alerta ? `
            <div class="alert-box alert-warning" id="alerta-mis-tours" role="alert" style="margin: 0 auto 24px; padding: 14px 20px; background: #FFFBEB; border: 1.5px solid #F59E0B; border-radius: 12px; color: #92400E; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 12px; max-width: 600px; text-align: left;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span id="texto-alerta-mis-tours">${alerta}</span>
            </div>
        ` : '';

        this.container.innerHTML = `
            ${alertaBanner}
            <div class="state-box empty-state-box">
                <div class="empty-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="36" height="36" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                    </svg>
                </div>
                <h2 class="empty-title">No tienes reservaciones activas</h2>
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

    obtenerDetallesStatus(status, statusOriginal = null) {
        const sLower = String(statusOriginal || status || '').trim().toLowerCase();
        const esConfirmado = status === 'Confirmado' || sLower === 'confirmada' || sLower === 'confirmado';
        const esRechazado = status === 'Rechazada' || status === 'Rechazado' || sLower === 'rechazada' || sLower === 'rechazado';

        if (esConfirmado) {
            return {
                badgeClass: 'status-badge--confirmado',
                badgeStyle: '',
                iconSvg: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `,
                tooltipText: 'Su reserva ha sido confirmada, los detalles fueron enviados a su correo'
            };
        }
        if (status === 'Pasado') {
            return {
                badgeClass: 'status-badge--pasado',
                badgeStyle: '',
                iconSvg: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `,
                tooltipText: null
            };
        }
        if (status === 'Cancelado') {
            return {
                badgeClass: 'status-badge--cancelado',
                badgeStyle: '',
                iconSvg: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                `,
                tooltipText: null
            };
        }
        if (esRechazado) {
            return {
                badgeClass: 'status-badge--rechazado',
                badgeStyle: 'background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.4);',
                iconSvg: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                `,
                tooltipText: 'Su reserva fue rechazada, los detalles fueron enviados a su correo'
            };
        }
        if (status === 'En validación') {
            return {
                badgeClass: 'status-badge--validacion',
                badgeStyle: 'background: rgb(248 248 248 / 1); color: #0284c7; border: 1px solid rgba(27, 152, 224, 0.4);',
                iconSvg: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                `,
                tooltipText: null
            };
        }
        if (status === 'Expirada') {
            return {
                badgeClass: 'status-badge--expirada',
                badgeStyle: 'background: rgba(108, 122, 137, 0.9); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.25);',
                iconSvg: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                `,
                tooltipText: null
            };
        }
        return {
            badgeClass: 'status-badge--pendiente',
            badgeStyle: '',
            iconSvg: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `,
            tooltipText: null
        };
    },

    clasificarCategoria(r) {
        const esPasado = r.status === 'Pasado' || r.status_original === 'Pasado' || esFechaPasada(r.tour_date);
        if (esPasado) {
            return 'pasados';
        }

        const statusLower = String(r.status_original || r.status || '').toLowerCase();
        const esPendiente = r.status === 'Pendiente de pago' || r.status === 'En validación' || r.status === 'Pendiente de confirmar' ||
            statusLower === 'pendiente_pago' || statusLower === 'en_validacion' || statusLower === 'pendiente de confirmar';
        if (esPendiente) {
            return 'pendientes';
        }

        const esConfirmado = (r.status === 'Confirmado' || statusLower === 'confirmada' || statusLower === 'confirmado') && !esFechaPasada(r.tour_date);
        if (esConfirmado) {
            return 'confirmados';
        }

        return 'otros';
    },

    filtrarReservas(reservas, filtro) {
        if (!Array.isArray(reservas)) return [];
        if (filtro === 'todos') return reservas;
        if (filtro === 'pendientes') {
            return reservas.filter(r => this.clasificarCategoria(r) === 'pendientes');
        }
        if (filtro === 'confirmados') {
            return reservas.filter(r => this.clasificarCategoria(r) === 'confirmados');
        }
        if (filtro === 'pasados') {
            return reservas.filter(r => this.clasificarCategoria(r) === 'pasados');
        }
        return reservas;
    },

    renderHistorial(reservas, alerta) {
        if (!this.container) return;

        if (!reservas || reservas.length === 0) {
            this.renderEstadoVacio(alerta);
            return;
        }

        this.reservasActuales = reservas;

        const alertaBanner = alerta ? `
            <div class="alert-box alert-warning" id="alerta-mis-tours" role="alert" style="margin: 0 0 24px; padding: 14px 20px; background: #FFFBEB; border: 1.5px solid #F59E0B; border-radius: 12px; color: #92400E; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 12px; text-align: left;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span id="texto-alerta-mis-tours">${alerta}</span>
            </div>
        ` : '';

        const conteo = {
            todos: reservas.length,
            pendientes: reservas.filter(r => this.clasificarCategoria(r) === 'pendientes').length,
            confirmados: reservas.filter(r => this.clasificarCategoria(r) === 'confirmados').length,
            pasados: reservas.filter(r => this.clasificarCategoria(r) === 'pasados').length
        };

        const tabsHtml = `
            ${alertaBanner}
            <div class="mis-tours-tabs" id="mis-tours-tabs" role="tablist" aria-label="Filtrar reservaciones">
                <button type="button" class="mis-tours-tab-btn ${this.filtroActual === 'todos' ? 'active' : ''}" data-tab="todos" role="tab" aria-selected="${this.filtroActual === 'todos'}">
                    <span>Todos</span>
                    <span class="tab-counter">${conteo.todos}</span>
                </button>
                <button type="button" class="mis-tours-tab-btn ${this.filtroActual === 'pendientes' ? 'active' : ''}" data-tab="pendientes" role="tab" aria-selected="${this.filtroActual === 'pendientes'}">
                    <span>Pendientes</span>
                    <span class="tab-counter">${conteo.pendientes}</span>
                </button>
                <button type="button" class="mis-tours-tab-btn ${this.filtroActual === 'confirmados' ? 'active' : ''}" data-tab="confirmados" role="tab" aria-selected="${this.filtroActual === 'confirmados'}">
                    <span>Confirmados</span>
                    <span class="tab-counter">${conteo.confirmados}</span>
                </button>
                <button type="button" class="mis-tours-tab-btn ${this.filtroActual === 'pasados' ? 'active' : ''}" data-tab="pasados" role="tab" aria-selected="${this.filtroActual === 'pasados'}">
                    <span>Pasados</span>
                    <span class="tab-counter">${conteo.pasados}</span>
                </button>
            </div>
            <div class="mis-tours-grid" id="mis-tours-grid"></div>
        `;

        this.container.innerHTML = tabsHtml;
        this.renderGrid(this.filtroActual);
        this.bindTabs();
    },

    renderGrid(filtro) {
        const grid = document.getElementById('mis-tours-grid');
        if (!grid) return;

        const filtradas = this.filtrarReservas(this.reservasActuales, filtro);

        if (filtradas.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; color: #a4c2cb; background: rgba(19, 41, 61, 0.45); border-radius: 14px; border: 1px dashed rgba(232, 241, 242, 0.2);">
                    <p style="margin: 0; font-size: 1.05rem; font-weight: 600;">No tienes reservaciones en esta categoría.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtradas.map(reserva => {
            const { badgeClass, badgeStyle, iconSvg, tooltipText } = this.obtenerDetallesStatus(reserva.status, reserva.status_original);
            const tour = reserva.tour || {};
            const imagenUrl = tour.image_url || 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80';
            const departamento = tour.department || 'El Salvador';
            const codigo = reserva.reservation_code || '';

            const esPendientePago = reserva.status === 'Pendiente de pago' || String(reserva.status_original || '').toLowerCase() === 'pendiente_pago';

            const botonSubirComprobante = esPendientePago ? `
                <div style="margin-top: 12px;">
                    <a href="pago-comprobante.html?reservaId=${encodeURIComponent(reserva.id)}&codigo=${encodeURIComponent(codigo)}" 
                       class="btn-subir-comprobante" 
                       data-action="subir-comprobante"
                       style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px 16px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 0.88rem; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35); box-sizing: border-box;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Subir comprobante</span>
                    </a>
                </div>
            ` : '';

            const tooltipAttrs = tooltipText
                ? `class="status-badge ${badgeClass} status-badge--has-tooltip" style="${badgeStyle}" title="${tooltipText}" data-tooltip="${tooltipText}" tabindex="0"`
                : `class="status-badge ${badgeClass}" style="${badgeStyle}"`;

            const tooltipSpan = tooltipText
                ? `<span class="status-tooltip-bubble" role="tooltip">${tooltipText}</span>`
                : '';

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
                        
                        <span ${tooltipAttrs}>
                            ${iconSvg}
                            <span>${reserva.status}</span>
                            ${tooltipSpan}
                        </span>

                        <span class="card-dept-tag">${departamento}</span>
                    </div>

                    <div class="card-content">
                        <h2 class="card-tour-title">${tour.name || 'Tour Oficial MITUR'}</h2>

                        <div class="card-meta-list">
                            <div class="card-meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span>Salida: <strong>${reserva.fecha_formateada || reserva.tour_date}</strong></span>
                            </div>

                            <div class="card-meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span>Cupos reservados: <strong>${reserva.spots_reserved}</strong></span>
                            </div>

                            ${codigo ? `
                                <div class="card-meta-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                    <span>Código: <strong>${codigo}</strong></span>
                                </div>
                            ` : ''}
                        </div>

                        ${botonSubirComprobante}

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

        if (this.onVerDetalleHandler) {
            this.bindVerDetalleTour(this.onVerDetalleHandler);
        }
    },

    bindTabs() {
        const containerTabs = document.getElementById('mis-tours-tabs');
        if (!containerTabs) return;

        containerTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-tab]');
            if (!btn) return;

            const tab = btn.dataset.tab;
            if (tab === this.filtroActual) return;

            this.filtroActual = tab;

            containerTabs.querySelectorAll('.mis-tours-tab-btn').forEach(b => {
                const isActive = b.dataset.tab === tab;
                b.classList.toggle('active', isActive);
                b.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            this.renderGrid(this.filtroActual);
        });
    },

    bindVerDetalleTour(handler) {
        this.onVerDetalleHandler = handler;
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

            tarjeta.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="subir-comprobante"]')) {
                    e.stopPropagation();
                    return;
                }
                ejecutar();
            });

            tarjeta.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    if (event.target.closest('[data-action="subir-comprobante"]')) {
                        return;
                    }
                    event.preventDefault();
                    ejecutar();
                }
            });
        });
    },

    limpiar() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
};

export default MisToursView;
