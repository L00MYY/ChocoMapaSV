let temporizadorId = null;

export const PagoView = {
    elements: {
        reservaCodigo: document.getElementById('reserva-codigo'),
        btnCopiarCodigo: document.getElementById('btn-copiar-codigo'),
        btnCopiarTexto: document.getElementById('btn-copiar-texto'),
        resumenTourNombre: document.getElementById('resumen-tour-nombre'),
        resumenTourFecha: document.getElementById('resumen-tour-fecha'),
        resumenTourCupos: document.getElementById('resumen-tour-cupos'),
        resumenTouristaNombre: document.getElementById('resumen-tourista-nombre'),
        resumenMontoTotal: document.getElementById('resumen-monto-total'),
        reservaEstadoBadge: document.getElementById('reserva-estado-badge'),
        timerCard: document.getElementById('card-temporizador'),
        timerCountdown: document.getElementById('timer-countdown'),
        timerProgressBar: document.getElementById('timer-progress-bar'),
        alertaExpirado: document.getElementById('alerta-expirado'),
        textoAlertaExpirado: document.getElementById('texto-alerta-expirado'),
        alertaExito: document.getElementById('alerta-exito'),
        textoAlertaExito: document.getElementById('texto-alerta-exito'),
        alertaError: document.getElementById('alerta-error'),
        textoAlertaError: document.getElementById('texto-alerta-error'),
        cardSubida: document.getElementById('card-subida'),
        dropzone: document.getElementById('dropzone'),
        inputArchivo: document.getElementById('input-archivo'),
        filePreview: document.getElementById('file-preview'),
        previewNombre: document.getElementById('preview-nombre'),
        previewTamano: document.getElementById('preview-tamano'),
        btnRemoverArchivo: document.getElementById('btn-remover-archivo'),
        btnSubirComprobante: document.getElementById('btn-subir-comprobante'),
        linkVolver: document.getElementById('link-volver')
    },

    renderDetalle(reserva) {
        if (!reserva) return;

        const e = this.elements;
        const codigo = reserva.reservation_code || reserva.code || `CM-${String(reserva.id || '').slice(0, 6).toUpperCase()}`;

        if (e.reservaCodigo) e.reservaCodigo.textContent = codigo;
        if (e.resumenTourNombre) e.resumenTourNombre.textContent = reserva.tours?.name || 'Tour Oficial MITUR';
        if (e.resumenTourFecha) e.resumenTourFecha.textContent = this.formatearFecha(reserva.tour_date);
        if (e.resumenTourCupos) e.resumenTourCupos.textContent = `${reserva.spots_reserved || 1} ${Number(reserva.spots_reserved) === 1 ? 'cupo' : 'cupos'}`;
        if (e.resumenTouristaNombre) e.resumenTouristaNombre.textContent = reserva.tourist_name || 'Turista';
        if (e.resumenMontoTotal) {
            const monto = Number(reserva.total_amount) || 0;
            e.resumenMontoTotal.textContent = `$${monto.toFixed(2)}`;
        }

        this.actualizarEstadoVisual(reserva.status);
    },

    actualizarEstadoVisual(status) {
        const badge = this.elements.reservaEstadoBadge;
        if (!badge) return;

        badge.className = 'badge-estado';
        const st = String(status || '').toLowerCase();

        if (st === 'en_validacion' || st === 'en validacion') {
            badge.classList.add('validacion');
            badge.textContent = 'En validación';
        } else if (st === 'confirmada' || st === 'confirmado') {
            badge.classList.add('confirmado');
            badge.textContent = 'Confirmada';
        } else if (st === 'expirado' || st === 'vencido') {
            badge.classList.add('expirado');
            badge.textContent = 'Vencido';
        } else {
            badge.classList.add('pendiente');
            badge.textContent = 'Pendiente de pago';
        }
    },

    iniciarTemporizador(expiresAt, onExpire) {
        this.detenerTemporizador();

        const targetTime = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
        const totalDurationMs = 60 * 60 * 1000;

        const tick = () => {
            const ahora = Date.now();
            const restanteMs = Math.max(0, targetTime - ahora);

            if (restanteMs <= 0) {
                if (this.elements.timerCountdown) {
                    this.elements.timerCountdown.textContent = '00:00';
                }
                if (this.elements.timerProgressBar) {
                    this.elements.timerProgressBar.style.width = '0%';
                }
                this.detenerTemporizador();
                if (typeof onExpire === 'function') {
                    onExpire();
                }
                return;
            }

            const totalSegundos = Math.floor(restanteMs / 1000);
            const minutos = Math.floor(totalSegundos / 60);
            const segundos = totalSegundos % 60;
            const strMinutos = String(minutos).padStart(2, '0');
            const strSegundos = String(segundos).padStart(2, '0');

            if (this.elements.timerCountdown) {
                this.elements.timerCountdown.textContent = `${strMinutos}:${strSegundos}`;
            }

            if (this.elements.timerProgressBar) {
                const porcentaje = Math.min(100, Math.max(0, (restanteMs / totalDurationMs) * 100));
                this.elements.timerProgressBar.style.width = `${porcentaje}%`;
            }
        };

        tick();
        temporizadorId = setInterval(tick, 1000);
        return () => this.detenerTemporizador();
    },

    detenerTemporizador() {
        if (temporizadorId) {
            clearInterval(temporizadorId);
            temporizadorId = null;
        }
    },

    mostrarMensajeExpirado() {
        this.detenerTemporizador();

        const e = this.elements;
        if (e.timerCountdown) e.timerCountdown.textContent = '00:00';
        if (e.timerProgressBar) e.timerProgressBar.style.width = '0%';
        if (e.timerCard) e.timerCard.classList.add('expired');

        if (e.alertaExpirado) {
            e.alertaExpirado.classList.remove('hidden');
            if (e.textoAlertaExpirado) {
                e.textoAlertaExpirado.textContent = 'El tiempo para pagar esta reserva venció';
            }
        }

        if (e.alertaExito) e.alertaExito.classList.add('hidden');
        if (e.alertaError) e.alertaError.classList.add('hidden');

        this.actualizarEstadoVisual('expirado');

        if (e.btnSubirComprobante) {
            e.btnSubirComprobante.disabled = true;
            e.btnSubirComprobante.textContent = 'Tiempo vencido';
        }

        if (e.dropzone) e.dropzone.classList.add('disabled');
        if (e.inputArchivo) e.inputArchivo.disabled = true;
    },

    mostrarExito() {
        const e = this.elements;

        if (e.alertaExito) {
            e.alertaExito.classList.remove('hidden');
            if (e.textoAlertaExito) {
                e.textoAlertaExito.textContent = 'Tu comprobante fue enviado y está en validación';
            }
        }

        if (e.alertaExpirado) e.alertaExpirado.classList.add('hidden');
        if (e.alertaError) e.alertaError.classList.add('hidden');

        this.actualizarEstadoVisual('en_validacion');

        if (e.btnSubirComprobante) {
            e.btnSubirComprobante.classList.add('hidden');
            e.btnSubirComprobante.style.display = 'none';
        }

        if (e.dropzone) {
            e.dropzone.classList.add('disabled');
            e.dropzone.style.display = 'none';
        }

        if (e.filePreview) {
            e.filePreview.classList.add('hidden');
        }

        this.detenerTemporizador();
    },

    mostrarError(mensaje) {
        const e = this.elements;
        if (e.alertaError && e.textoAlertaError) {
            e.textoAlertaError.textContent = mensaje || 'Ocurrió un error. Intenta nuevamente.';
            e.alertaError.classList.remove('hidden');
        }
    },

    limpiarErrores() {
        const e = this.elements;
        if (e.alertaError) {
            e.alertaError.classList.add('hidden');
            if (e.textoAlertaError) e.textoAlertaError.textContent = '';
        }
    },

    mostrarArchivoSeleccionado(file) {
        if (!file) return;
        const e = this.elements;

        if (e.previewNombre) e.previewNombre.textContent = file.name;
        if (e.previewTamano) e.previewTamano.textContent = this.formatearTamano(file.size);
        if (e.filePreview) e.filePreview.classList.remove('hidden');
        if (e.btnSubirComprobante) e.btnSubirComprobante.disabled = false;
        this.limpiarErrores();
    },

    limpiarArchivoSeleccionado() {
        const e = this.elements;
        if (e.inputArchivo) e.inputArchivo.value = '';
        if (e.filePreview) e.filePreview.classList.add('hidden');
        if (e.previewNombre) e.previewNombre.textContent = '';
        if (e.previewTamano) e.previewTamano.textContent = '';
        if (e.btnSubirComprobante) e.btnSubirComprobante.disabled = true;
    },

    setSubiendo(cargando) {
        const btn = this.elements.btnSubirComprobante;
        if (!btn) return;
        btn.disabled = cargando;
        btn.innerHTML = cargando
            ? `<span class="spinner-inline"></span> Enviando comprobante...`
            : `<span>Enviar comprobante</span>`;
    },

    bindSubirComprobante(handler) {
        this.elements.btnSubirComprobante?.addEventListener('click', handler);
    },

    bindArchivoSeleccionado(handler) {
        const input = this.elements.inputArchivo;
        const dropzone = this.elements.dropzone;

        input?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) handler(file);
        });

        if (dropzone) {
            ['dragenter', 'dragover'].forEach(name => {
                dropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!dropzone.classList.contains('disabled')) {
                        dropzone.classList.add('drag-over');
                    }
                });
            });

            ['dragleave', 'drop'].forEach(name => {
                dropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('drag-over');
                });
            });

            dropzone.addEventListener('drop', (e) => {
                if (dropzone.classList.contains('disabled')) return;
                const file = e.dataTransfer?.files?.[0];
                if (file) {
                    if (input) {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        input.files = dt.files;
                    }
                    handler(file);
                }
            });
        }
    },

    bindRemoverArchivo(handler) {
        this.elements.btnRemoverArchivo?.addEventListener('click', handler);
    },

    bindCopiarCodigo(handler) {
        this.elements.btnCopiarCodigo?.addEventListener('click', handler);
    },

    mostrarCopiadoExitoso() {
        const btnText = this.elements.btnCopiarTexto;
        if (!btnText) return;
        const original = btnText.textContent;
        btnText.textContent = '¡Copiado!';
        setTimeout(() => {
            btnText.textContent = original;
        }, 2000);
    },

    formatearTamano(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (_) {}
        return String(fechaStr);
    }
};

export default PagoView;
