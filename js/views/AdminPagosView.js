export const AdminPagosView = {
    _mockElements: null,
    get elements() {
        if (this._mockElements) return this._mockElements;
        if (typeof document === 'undefined') return this._mockElements || {};
        return {
            vistaAdmin: document.getElementById('vista-admin'),
            vistaDenegada: document.getElementById('vista-denegada'),
            statPendientes: document.getElementById('stat-pendientes'),
            statAceptados: document.getElementById('stat-aceptados'),
            statRechazados: document.getElementById('stat-rechazados'),
            filtroPendientes: document.getElementById('filtro-pendientes'),
            filtroAceptados: document.getElementById('filtro-aceptados'),
            filtroRechazados: document.getElementById('filtro-rechazados'),
            filtrosContainer: document.getElementById('admin-stats-filtros'),
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
            modalMotivo: document.getElementById('modal-motivo'),
            modalMotivoTitulo: document.getElementById('modal-motivo-titulo'),
            textoMotivoRechazoDetalle: document.getElementById('texto-motivo-rechazo-detalle'),
            btnCerrarModalMotivo: document.getElementById('btn-cerrar-modal-motivo'),
            btnCerrarMotivoFooter: document.getElementById('btn-cerrar-motivo-footer'),
            toastContainer: document.getElementById('toast-container'),
            alertaSesionTurista: (typeof document !== 'undefined' ? document.getElementById('alerta-sesion-activa-turista') : null)
        };
    },
    set elements(val) {
        this._mockElements = val;
    },

    reservaRechazoActualId: null,
    todasLasReservas: [],
    filtroActual: 'pendientes',

    mostrarAccesoDenegado() {
        if (this.elements.vistaAdmin) {
            this.elements.vistaAdmin.classList.add('hidden');
            this.elements.vistaAdmin.style.display = 'none';
        }
        if (this.elements.vistaDenegada) {
            this.elements.vistaDenegada.classList.remove('hidden');
            this.elements.vistaDenegada.style.display = 'flex';
        }
    },

    mostrarVistaAdmin() {
        if (this.elements.vistaDenegada) {
            this.elements.vistaDenegada.classList.add('hidden');
            this.elements.vistaDenegada.style.display = 'none';
        }
        if (this.elements.vistaAdmin) {
            this.elements.vistaAdmin.classList.remove('hidden');
            this.elements.vistaAdmin.style.display = 'block';
        }
    },

    mostrarAvisoCerrarSesionTurista() {
        const alerta = this.elements.alertaSesionTurista || document.getElementById('alerta-sesion-activa-turista');
        if (alerta) {
            alerta.classList.remove('hidden');
            alerta.style.display = 'flex';
            alerta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        this.mostrarNotificacion('warning', 'Asegúrese de cerrar la sesión actual antes de intentar iniciar sesión como administrador');
    },

    clasificarCategoria(status) {
        const s = String(status || '').trim().toLowerCase();
        if (s === 'confirmada' || s === 'confirmado') {
            return 'aceptados';
        }
        if (s === 'rechazada' || s === 'rechazado') {
            return 'rechazados';
        }
        if (s === 'pendiente_pago' || s === 'en_validacion' || s === 'pendiente de confirmar') {
            return 'pendientes';
        }
        return 'pendientes';
    },

    actualizarContadores(reservas) {
        const lista = Array.isArray(reservas) ? reservas : [];
        const conteo = {
            pendientes: lista.filter(r => this.clasificarCategoria(r.status) === 'pendientes').length,
            aceptados: lista.filter(r => this.clasificarCategoria(r.status) === 'aceptados').length,
            rechazados: lista.filter(r => this.clasificarCategoria(r.status) === 'rechazados').length
        };

        if (this.elements.statPendientes) {
            this.elements.statPendientes.textContent = String(conteo.pendientes);
        }
        if (this.elements.statAceptados) {
            this.elements.statAceptados.textContent = String(conteo.aceptados);
        }
        if (this.elements.statRechazados) {
            this.elements.statRechazados.textContent = String(conteo.rechazados);
        }

        return conteo;
    },

    renderListado(reservas, filtro = null) {
        const tbody = this.elements.tablaBody;
        if (!tbody) return;

        if (Array.isArray(reservas)) {
            this.todasLasReservas = reservas;
        }

        if (filtro) {
            this.filtroActual = filtro;
        }

        this.actualizarContadores(this.todasLasReservas);

        const filtradas = this.todasLasReservas.filter(r => this.clasificarCategoria(r.status) === this.filtroActual);

        if (filtradas.length === 0) {
            let tituloVacio = 'No hay reservaciones pendientes';
            let textoVacio = 'No se encontraron reservaciones en espera de confirmación o validación en este momento.';

            if (this.filtroActual === 'aceptados') {
                tituloVacio = 'No hay reservaciones aceptadas';
                textoVacio = 'Aún no se han registrado reservaciones aprobadas o confirmadas en el sistema.';
            } else if (this.filtroActual === 'rechazados') {
                tituloVacio = 'No hay reservaciones rechazadas';
                textoVacio = 'No existen reservaciones rechazadas en el historial administrativo.';
            }

            tbody.innerHTML = `
                <tr>
                    <td colspan="10">
                        <div class="empty-state">
                            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="m9 12 2 2 4-4"></path>
                            </svg>
                            <h3 class="empty-title">${tituloVacio}</h3>
                            <p class="empty-text">${textoVacio}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtradas.map(r => {
            const codigo = r.reservation_code || `CM-${String(r.id).slice(0, 6).toUpperCase()}`;
            const monto = Number(r.total_amount) || 0;
            const fechaStr = this.formatearFecha(r.tour_date);
            const tieneArchivo = Boolean(r.storage_path);
            const statusLower = String(r.status || '').toLowerCase();
            const esConfirmada = statusLower === 'confirmada' || statusLower === 'confirmado';
            const esRechazada = statusLower === 'rechazada' || statusLower === 'rechazado';
            const puedeGestionar = tieneArchivo && r.status === 'en_validacion' && !esConfirmada && !esRechazada;

            let statusBadge = `<span class="badge-status-pen">Pendiente de confirmar</span>`;
            if (r.status === 'en_validacion') {
                statusBadge = `<span class="badge-status-val">En validación</span>`;
            } else if (r.status === 'pendiente_pago') {
                statusBadge = `<span class="badge-status-pen">Pendiente de pago</span>`;
            } else if (esConfirmada) {
                statusBadge = `<span class="badge-status-conf">Confirmada</span>`;
            } else if (esRechazada) {
                statusBadge = `<span class="badge-status-rec">Rechazada</span>`;
            }

            const comprobanteBoton = tieneArchivo
                ? `<button type="button" class="btn-action btn-ver-comprobante" data-action="ver">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>Ver</span>
                </button>`
                : `<button type="button" class="btn-action btn-ver-comprobante opacity-50 cursor-not-allowed" data-action="ver" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    <span>Sin archivo</span>
                </button>`;

            let accionesHtml = '';

            if (esConfirmada) {
                // Para reservas en estado 'confirmada': en la columna ACCIONES mostrar el texto/badge "Aprobada" y deshabilitar los botones de acción para prevenir doble procesamiento
                accionesHtml = `
                    <div class="cell-actions">
                        <span class="badge-action-aprobada">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Aprobada</span>
                        </span>
                        <button type="button" class="btn-action btn-aprobar opacity-50 cursor-not-allowed hidden" data-action="aprobar" disabled style="display:none;">Aprobar</button>
                        <button type="button" class="btn-action btn-rechazar opacity-50 cursor-not-allowed hidden" data-action="rechazar" disabled style="display:none;">Rechazar</button>
                    </div>
                `;
            } else if (esRechazada) {
                // Para reservas en estado 'rechazada': en la columna ACCIONES mostrar el badge "Rechazada", mostrar el comprobante si existe y permitir ver el motivo de rechazo (rejection_reason)
                const motivoRechazo = r.rejection_reason || '';
                const btnMotivo = motivoRechazo
                    ? `<button type="button" class="btn-action btn-ver-motivo" data-action="ver-motivo" data-motivo="${this.escaparHtml(motivoRechazo)}" title="Ver motivo del rechazo">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>Motivo</span>
                    </button>`
                    : '';

                accionesHtml = `
                    <div class="cell-actions">
                        <span class="badge-action-rechazada" title="${this.escaparHtml(motivoRechazo || 'Rechazada')}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            <span>Rechazada</span>
                        </span>
                        ${btnMotivo}
                        <button type="button" class="btn-action btn-aprobar opacity-50 cursor-not-allowed hidden" data-action="aprobar" disabled style="display:none;">Aprobar</button>
                        <button type="button" class="btn-action btn-rechazar opacity-50 cursor-not-allowed hidden" data-action="rechazar" disabled style="display:none;">Rechazar</button>
                    </div>
                `;
            } else {
                const disabledClasses = !puedeGestionar ? 'opacity-50 cursor-not-allowed' : '';
                const disabledAttr = !puedeGestionar ? 'disabled' : '';

                accionesHtml = `
                    <div class="cell-actions">
                        <button type="button" class="btn-action btn-aprobar ${disabledClasses}" data-action="aprobar" ${disabledAttr}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Aprobar</span>
                        </button>
                        <button type="button" class="btn-action btn-rechazar ${disabledClasses}" data-action="rechazar" ${disabledAttr}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            <span>Rechazar</span>
                        </button>
                    </div>
                `;
            }

            return `
                <tr data-id="${r.id}" data-codigo="${codigo}" data-storage="${r.storage_path || ''}" data-status="${r.status || ''}" data-mime="${r.mime_type || ''}" data-motivo="${this.escaparHtml(r.rejection_reason || '')}">
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
                    <td>${statusBadge}</td>
                    <td>${comprobanteBoton}</td>
                    <td>${accionesHtml}</td>
                </tr>
            `;
        }).join('');
    },

    bindFiltros(onCambioFiltro) {
        const container = this.elements.filtrosContainer || document.getElementById('admin-stats-filtros');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.stat-chip[data-filtro]');
            if (!btn) return;

            const nuevoFiltro = btn.dataset.filtro;
            if (nuevoFiltro === this.filtroActual) return;

            container.querySelectorAll('.stat-chip[data-filtro]').forEach(chip => {
                const esActivo = chip.dataset.filtro === nuevoFiltro;
                chip.classList.toggle('active', esActivo);
                chip.setAttribute('aria-selected', esActivo ? 'true' : 'false');
            });

            this.filtroActual = nuevoFiltro;
            this.renderListado(this.todasLasReservas, nuevoFiltro);

            if (typeof onCambioFiltro === 'function') {
                onCambioFiltro(nuevoFiltro);
            }
        });
    },

    actualizarReservaLocal(reservaId, nuevoStatus, motivo = null) {
        const index = this.todasLasReservas.findIndex(r => String(r.id) === String(reservaId));
        if (index !== -1) {
            this.todasLasReservas[index].status = nuevoStatus;
            if (motivo !== null) {
                this.todasLasReservas[index].rejection_reason = motivo;
            }
        }
        this.renderListado(this.todasLasReservas, this.filtroActual);
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

    mostrarModalMotivo(codigo, motivo) {
        const modal = this.elements.modalMotivo;
        const titulo = this.elements.modalMotivoTitulo;
        const texto = this.elements.textoMotivoRechazoDetalle;

        if (!modal) return;
        if (titulo) titulo.textContent = `Motivo de Rechazo - ${codigo || ''}`;
        if (texto) texto.textContent = motivo || 'No se especificó un motivo para este rechazo.';

        modal.classList.remove('hidden');
    },

    cerrarModalMotivo() {
        if (this.elements.modalMotivo) {
            this.elements.modalMotivo.classList.add('hidden');
        }
    },

    deshabilitarFilaPorConcurrencia(reservaId, mensaje) {
        const row = document.querySelector(`tr[data-id="${reservaId}"]`);
        if (!row) return;

        const buttons = row.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
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
                this.todasLasReservas = this.todasLasReservas.filter(r => String(r.id) !== String(reservaId));
                this.actualizarContadores(this.todasLasReservas);
                const restantesVisibles = document.querySelectorAll('#tabla-reservas-body tr[data-id]').length;
                if (restantesVisibles === 0) {
                    this.renderListado(this.todasLasReservas, this.filtroActual);
                }
            }, 300);
        } else {
            this.todasLasReservas = this.todasLasReservas.filter(r => String(r.id) !== String(reservaId));
            this.renderListado(this.todasLasReservas, this.filtroActual);
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
        this.elements.btnCerrarModalMotivo?.addEventListener('click', () => this.cerrarModalMotivo());
        this.elements.btnCerrarMotivoFooter?.addEventListener('click', () => this.cerrarModalMotivo());

        this.elements.modalComprobante?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalComprobante) this.cerrarModalComprobante();
        });

        this.elements.modalRechazo?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalRechazo) this.cerrarModalRechazo();
        });

        this.elements.modalMotivo?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalMotivo) this.cerrarModalMotivo();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cerrarModalComprobante();
                this.cerrarModalRechazo();
                this.cerrarModalMotivo();
            }
        });
    },

    bindAccionesTabla({ onVer, onAprobar, onRechazarClick, onVerMotivo = null }) {
        this.elements.tablaBody?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn || btn.disabled || btn.classList.contains('cursor-not-allowed') || btn.hasAttribute('disabled')) return;

            const row = btn.closest('tr[data-id]');
            if (!row) return;

            const reservaId = row.dataset.id;
            const codigo = row.dataset.codigo;
            const storagePath = row.dataset.storage;
            const mimeType = row.dataset.mime;
            const status = row.dataset.status;
            const motivo = btn.dataset.motivo || row.dataset.motivo || '';
            const action = btn.dataset.action;

            if (action === 'ver') {
                if (!storagePath) return;
                onVer({ reservaId, codigo, storagePath, mimeType });
            } else if (action === 'aprobar') {
                if (!storagePath || status !== 'en_validacion') return;
                onAprobar({ reservaId, codigo, btn });
            } else if (action === 'rechazar') {
                if (!storagePath || status !== 'en_validacion') return;
                onRechazarClick({ reservaId, codigo, btn });
            } else if (action === 'ver-motivo') {
                if (typeof onVerMotivo === 'function') {
                    onVerMotivo({ reservaId, codigo, motivo });
                } else {
                    this.mostrarModalMotivo(codigo, motivo);
                }
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
        } catch (_) { }
        return String(fechaStr);
    }
};

export default AdminPagosView;
