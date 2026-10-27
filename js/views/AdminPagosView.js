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
        modalQr: document.getElementById('modal-qr'),
        modalQrTitulo: document.getElementById('modal-qr-titulo'),
        modalQrImg: document.getElementById('modal-qr-img'),
        modalQrCodigo: document.getElementById('modal-qr-codigo'),
        modalQrTurista: document.getElementById('modal-qr-turista'),
        modalQrTour: document.getElementById('modal-qr-tour'),
        modalQrFecha: document.getElementById('modal-qr-fecha'),
        btnDescargarQr: document.getElementById('btn-descargar-qr'),
        btnCerrarModalQr: document.getElementById('btn-cerrar-modal-qr'),
        btnCerrarQrFooter: document.getElementById('btn-cerrar-qr-footer'),
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
                    <td colspan="11">
                        <div class="empty-state">
                            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="m9 12 2 2 4-4"></path>
                            </svg>
                            <h3 class="empty-title">No hay reservaciones pendientes</h3>
                            <p class="empty-text">No se encontraron reservaciones en espera de confirmación o validación en este momento.</p>
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
            const tieneArchivo = Boolean(r.storage_path);
            const qrThumb = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(codigo)}`;
            const qrFull = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(codigo)}`;

            let statusBadge = `<span class="badge-status-pen">Pendiente de confirmar</span>`;
            if (r.status === 'en_validacion') {
                statusBadge = `<span class="badge-status-val">En validación</span>`;
            } else if (r.status === 'pendiente_pago') {
                statusBadge = `<span class="badge-status-pen">Pendiente de pago</span>`;
            } else if (r.status === 'confirmada' || r.status === 'Confirmado') {
                statusBadge = `<span class="badge-status-conf">Confirmada</span>`;
            }

            return `
                <tr data-id="${r.id}" data-codigo="${codigo}" data-turista="${this.escaparHtml(r.tourist_name)}" data-tour="${this.escaparHtml(r.tour_name)}" data-fecha="${fechaStr}" data-qr="${qrFull}" data-storage="${r.storage_path || ''}" data-mime="${r.mime_type || ''}">
                    <td class="cell-codigo">${codigo}</td>
                    <td class="cell-qr">
                        <button type="button" class="btn-ver-qr" data-action="ver-qr" title="Ver código QR oficial de la reserva">
                            <img src="${qrThumb}" alt="QR ${codigo}" class="qr-thumbnail" loading="lazy">
                        </button>
                    </td>
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
                    <td>${statusBadge}</td>
                    <td>
                        <button type="button" class="btn-action btn-ver-comprobante" data-action="ver" ${!tieneArchivo ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>${tieneArchivo ? 'Ver' : 'Sin archivo'}</span>
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

    mostrarModalQr({ codigo, turista, tour, fecha, qrUrl }) {
        const modal = this.elements.modalQr;
        if (!modal) return;

        if (this.elements.modalQrTitulo) this.elements.modalQrTitulo.textContent = `Código QR - Reserva ${codigo || ''}`;
        if (this.elements.modalQrImg) this.elements.modalQrImg.src = qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(codigo)}`;
        if (this.elements.modalQrCodigo) this.elements.modalQrCodigo.textContent = codigo || '';
        if (this.elements.modalQrTurista) this.elements.modalQrTurista.textContent = turista || 'Turista';
        if (this.elements.modalQrTour) this.elements.modalQrTour.textContent = tour || 'Tour Oficial MITUR';
        if (this.elements.modalQrFecha) this.elements.modalQrFecha.textContent = `Fecha de salida: ${fecha || '--'}`;
        if (this.elements.btnDescargarQr) this.elements.btnDescargarQr.href = qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(codigo)}`;

        modal.classList.remove('hidden');
    },

    cerrarModalQr() {
        if (this.elements.modalQr) {
            this.elements.modalQr.classList.add('hidden');
        }
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
                <div class="preview-pdf-container" style="display:flex; flex-direction:column; gap:12px; align-items:center;">
                    <iframe src="${url}" width="100%" height="420px" style="border:1px solid #CBD5E1; border-radius:8px;"></iframe>
                    <p style="margin: 0; font-size: 0.88rem; color: #64748B;">Si el visor no carga en tu navegador, puedes abrirlo en la pestaña segura.</p>
                </div>
            `;
        } else {
            body.innerHTML = `
                <div class="preview-img-container" style="min-height:200px; display:flex; align-items:center; justify-content:center;">
                    <img src="${url}" alt="Comprobante de pago" class="preview-img" style="max-width:100%; max-height:480px; object-fit:contain; border-radius:6px;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'padding:20px; text-align:center; color:#DC2626; font-size:0.9rem; font-weight:600;\\'>No se pudo cargar la imagen desde el servidor (Error 404). El archivo no existe en el almacenamiento.</div>';">
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
        this.elements.btnCerrarModalQr?.addEventListener('click', () => this.cerrarModalQr());
        this.elements.btnCerrarQrFooter?.addEventListener('click', () => this.cerrarModalQr());

        this.elements.modalComprobante?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalComprobante) this.cerrarModalComprobante();
        });

        this.elements.modalRechazo?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalRechazo) this.cerrarModalRechazo();
        });

        this.elements.modalQr?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalQr) this.cerrarModalQr();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cerrarModalComprobante();
                this.cerrarModalRechazo();
                this.cerrarModalQr();
            }
        });
    },

    bindAccionesTabla({ onVer, onAprobar, onRechazarClick, onVerQr }) {
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
            } else if (action === 'ver-qr') {
                const turista = row.dataset.turista;
                const tour = row.dataset.tour;
                const fecha = row.dataset.fecha;
                const qrUrl = row.dataset.qr;
                if (onVerQr) onVerQr({ reservaId, codigo, turista, tour, fecha, qrUrl });
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