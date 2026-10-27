export const AdminPagosView = {
    elements: {
        vistaAdmin: document.getElementById('vista-admin'),
        vistaDenegada: document.getElementById('vista-denegada'),
        statPendientes: document.getElementById('stat-pendientes'),
        tablaBody: document.getElementById('tabla-reservas-body'),
        modalComprobante: document.getElementById('modal-comprobante'),
        modalComprobanteTitulo: document.getElementById('modal-comprobante-titulo'),
        modalComprobanteBody: document.getElementById('modal-comprobante-body'),
        btnAbrirPestanaComprobante: document.getElementById('btn-abrir-pestana-comprobante'),
        btnCerrarModalComprobante: document.getElementById('btn-cerrar-modal-comprobante'),
        btnCerrarComprobanteFooter: document.getElementById('btn-cerrar-comprobante-footer'),
        modalRechazo: document.getElementById('modal-rechazo'),
        modalRechazoTitulo: document.getElementById('modal-rechazo-titulo'),
        textareaMotivoRechazo: document.getElementById('textarea-motivo-rechazo'),
        errorMotivoRechazo: document.getElementById('error-motivo-rechazo'),
        btnCerrarModalRechazo: document.getElementById('btn-cerrar-modal-rechazo'),
        btnCancelarRechazo: document.getElementById('btn-cancelar-rechazo'),
        btnConfirmarRechazo: document.getElementById('btn-confirmar-rechazo'),
        toastContainer: document.getElementById('toast-container')
    },

    reservaRechazoActualId: null,

    mostrarAccesoDenegado() {
        if (this.elements.vistaAdmin) this.elements.vistaAdmin.classList.add('hidden');
        if (this.elements.vistaDenegada) this.elements.vistaDenegada.classList.remove('hidden');
    },

    renderListado(reservas) {
        const tbody = this.elements.tablaBody;
        if (!tbody) return;

        const count = Array.isArray(reservas) ? reservas.length : 0;
        if (this.elements.statPendientes) {
            this.elements.statPendientes.textContent = String(count);
        }

        if (!Array.isArray(reservas) || reservas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="m9 12 2 2 4-4"></path>
                            </svg>
                            <h3 class="empty-title">No hay comprobantes pendientes</h3>
                            <p class="empty-text">Todas las reservaciones han sido procesadas o no existen comprobantes en estado de validación en este momento.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = reservas.map(r => {
            const codigo = r.reservation_code || `CM-${String(r.id).slice(0, 6).toUpperCase()}`;
            const monto = Number(r.total_amount) || 0;
            const fechaStr = this.formatearFecha(r.tour_date);

            return `
                <tr data-id="${r.id}" data-codigo="${codigo}" data-storage="${r.storage_path || ''}" data-mime="${r.mime_type || ''}">
                    <td class="cell-codigo">${codigo}</td>
                    <td>
                        <div class="cell-turista">
                            <span class="turista-nombre">${this.escaparHtml(r.tourist_name)}</span>
                            <span class="turista-email">${this.escaparHtml(r.tourist_email)}</span>
                        </div>
                    </td>
                    <td>${this.escaparHtml(r.tourist_phone)}</td>
                    <td class="cell-tour" title="${this.escaparHtml(r.tour_name)}">${this.escaparHtml(r.tour_name)}</td>
                    <td>${fechaStr}</td>
                    <td><strong>${r.spots_reserved}</strong></td>
                    <td class="cell-monto">$${monto.toFixed(2)}</td>
                    <td>
                        <button type="button" class="btn-action btn-ver-comprobante" data-action="ver">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>Ver</span>
                        </button>
                    </td>
                    <td>
                        <div class="cell-actions">
                            <button type="button" class="btn-action btn-aprobar" data-action="aprobar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Aprobar</span>
                            </button>
                            <button type="button" class="btn-action btn-rechazar" data-action="rechazar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                <span>Rechazar</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    mostrarModalComprobante(url, mimeType, codigo) {
        const modal = this.elements.modalComprobante;
        const body = this.elements.modalComprobanteBody;
        const titulo = this.elements.modalComprobanteTitulo;
        const btnLink = this.elements.btnAbrirPestanaComprobante;

        if (!modal || !body) return;

        if (titulo) titulo.textContent = `Comprobante - Reserva ${codigo || ''}`;
        if (btnLink) btnLink.href = url || '#';

        const isPdf = (mimeType && mimeType.includes('pdf')) || (url && url.toLowerCase().includes('.pdf'));

        if (isPdf) {
            body.innerHTML = `
                <div class="preview-pdf-container">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="1.8" width="64" height="64" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <p style="margin: 0; font-weight: 700; color: #1E293B;">Documento de comprobante en formato PDF</p>
                    <p style="margin: 0; font-size: 0.88rem; color: #64748B;">Para mayor seguridad y resolución, puedes visualizarlo directamente en una pestaña protegida.</p>
                </div>
            `;
        } else {
            body.innerHTML = `
                <div class="preview-img-container">
                    <img src="${url}" alt="Comprobante de pago" class="preview-img" loading="lazy">
                </div>
            `;
        }

        modal.classList.remove('hidden');
    },

    cerrarModalComprobante() {
        if (this.elements.modalComprobante) {
            this.elements.modalComprobante.classList.add('hidden');
            if (this.elements.modalComprobanteBody) {
                this.elements.modalComprobanteBody.innerHTML = '';
            }
        }
    },

    mostrarModalRechazo(reservaId, codigo) {
        this.reservaRechazoActualId = reservaId;
        const modal = this.elements.modalRechazo;
        const titulo = this.elements.modalRechazoTitulo;
        const textarea = this.elements.textareaMotivoRechazo;
        const error = this.elements.errorMotivoRechazo;

        if (!modal) return;

        if (titulo) titulo.textContent = `Rechazar Comprobante - ${codigo || ''}`;
        if (textarea) textarea.value = '';
        if (error) error.classList.add('hidden');

        modal.classList.remove('hidden');
        textarea?.focus();
    },

    cerrarModalRechazo() {
        this.reservaRechazoActualId = null;
        if (this.elements.modalRechazo) {
            this.elements.modalRechazo.classList.add('hidden');
        }
    },

    deshabilitarFilaPorConcurrencia(reservaId, mensaje) {
        const row = document.querySelector(`tr[data-id="${reservaId}"]`);
        if (!row) return;

        const buttons = row.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
        });

        row.style.opacity = '0.6';
        row.style.background = '#FEF2F2';

        this.mostrarNotificacion('warning', mensaje || 'Esta reserva ya fue validada previamente por otro administrador');
    },

    removerFila(reservaId) {
        const row = document.querySelector(`tr[data-id="${reservaId}"]`);
        if (row) {
            row.style.transition = 'all 0.3s ease-out';
            row.style.opacity = '0';
            row.style.transform = 'translateX(20px)';
            setTimeout(() => {
                row.remove();
                const totalRestantes = document.querySelectorAll('#tabla-reservas-body tr[data-id]').length;
                if (this.elements.statPendientes) {
                    this.elements.statPendientes.textContent = String(totalRestantes);
                }
                if (totalRestantes === 0) {
                    this.renderListado([]);
                }
            }, 300);
        }
    },

    mostrarNotificacion(tipo, mensaje) {
        const container = this.elements.toastContainer;
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${tipo || 'success'}`;
        toast.innerHTML = `<span>${this.escaparHtml(mensaje)}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    bindEventosModales() {
        this.elements.btnCerrarModalComprobante?.addEventListener('click', () => this.cerrarModalComprobante());
        this.elements.btnCerrarComprobanteFooter?.addEventListener('click', () => this.cerrarModalComprobante());
        this.elements.btnCerrarModalRechazo?.addEventListener('click', () => this.cerrarModalRechazo());
        this.elements.btnCancelarRechazo?.addEventListener('click', () => this.cerrarModalRechazo());

        this.elements.modalComprobante?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalComprobante) this.cerrarModalComprobante();
        });

        this.elements.modalRechazo?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalRechazo) this.cerrarModalRechazo();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cerrarModalComprobante();
                this.cerrarModalRechazo();
            }
        });
    },

    bindAccionesTabla({ onVer, onAprobar, onRechazarClick }) {
        this.elements.tablaBody?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn || btn.disabled) return;

            const row = btn.closest('tr[data-id]');
            if (!row) return;

            const reservaId = row.dataset.id;
            const codigo = row.dataset.codigo;
            const storagePath = row.dataset.storage;
            const mimeType = row.dataset.mime;
            const action = btn.dataset.action;

            if (action === 'ver') {
                onVer({ reservaId, codigo, storagePath, mimeType });
            } else if (action === 'aprobar') {
                onAprobar({ reservaId, codigo, btn });
            } else if (action === 'rechazar') {
                onRechazarClick({ reservaId, codigo, btn });
            }
        });
    },

    bindConfirmarRechazo(handler) {
        this.elements.btnConfirmarRechazo?.addEventListener('click', () => {
            const textarea = this.elements.textareaMotivoRechazo;
            const motivo = textarea?.value?.trim() || '';
            const error = this.elements.errorMotivoRechazo;

            if (!motivo) {
                if (error) error.classList.remove('hidden');
                textarea?.focus();
                return;
            }

            if (error) error.classList.add('hidden');
            handler({
                reservaId: this.reservaRechazoActualId,
                motivo,
                btn: this.elements.btnConfirmarRechazo
            });
        });
    },

    escaparHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    formatearFecha(fechaStr) {
        if (!fechaStr) return '--';
        try {
            const partes = String(fechaStr).split('T')[0].split('-');
            if (partes.length === 3) {
                const anio = parseInt(partes[0], 10);
                const mes = parseInt(partes[1], 10) - 1;
                const dia = parseInt(partes[2], 10);
                const f = new Date(anio, mes, dia);
                return f.toLocaleDateString('es-ES', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (_) {}
        return String(fechaStr);
    }
};

export default AdminPagosView;
