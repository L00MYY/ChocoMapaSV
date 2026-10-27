import { formatearFechaLarga, formatearMonedaUSD, esFechaPasada } from '../models/ToursModel.js';

const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80';
const LUGAR_FALLBACK = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80';

/**
 * Normaliza la fecha actual local a formato ISO YYYY-MM-DD
 * para comparaciones seguras de fechas sin distorsión horaria.
 * @returns {string} Fecha local en formato 'YYYY-MM-DD'
 */
function obtenerFechaHoyLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function crearIconoCalendario() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('aria-hidden', 'true');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '3');
    rect.setAttribute('y', '4');
    rect.setAttribute('width', '18');
    rect.setAttribute('height', '18');
    rect.setAttribute('rx', '2');
    const lineOne = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineOne.setAttribute('x1', '16');
    lineOne.setAttribute('y1', '2');
    lineOne.setAttribute('x2', '16');
    lineOne.setAttribute('y2', '6');
    const lineTwo = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineTwo.setAttribute('x1', '8');
    lineTwo.setAttribute('y1', '2');
    lineTwo.setAttribute('x2', '8');
    lineTwo.setAttribute('y2', '6');
    svg.append(rect, lineOne, lineTwo);
    return svg;
}

export const TourDetalleView = {
    elements: {
        btnReturn: document.getElementById('btn-return'),
        stateLoading: document.getElementById('state-loading'),
        stateError: document.getElementById('state-error'),
        stateContent: document.getElementById('state-content'),
        departmentBadge: document.getElementById('tour-department-badge'),
        discountBadge: document.getElementById('tour-discount-badge'),
        spotsBadge: document.getElementById('tour-spots-badge'),
        title: document.getElementById('tour-title'),
        guideName: document.getElementById('tour-guide-name'),
        heroImage: document.getElementById('tour-hero-image'),
        thumbnailsStrip: document.getElementById('tour-thumbnails-strip'),
        fullDescription: document.getElementById('tour-full-description'),
        placesList: document.getElementById('tour-places-list'),
        departureTime: document.getElementById('tour-departure-time'),
        datesChips: document.getElementById('tour-dates-chips'),
        pricingRow: document.getElementById('pricing-row'),
        availableSpots: document.getElementById('tour-available-spots'),
        btnOpenReserve: document.getElementById('btn-open-reserve'),
        reservationCard: document.getElementById('reservation-card'),
        reservationForm: document.getElementById('reservation-form'),
        inputName: document.getElementById('tourist_name'),
        inputEmail: document.getElementById('tourist_email'),
        inputPhone: document.getElementById('tourist_phone'),
        selectDate: document.getElementById('tour_date'),
        inputSpots: document.getElementById('spots_reserved'),
        btnConfirmReserve: document.getElementById('btn-confirm-reserve'),
        errorName: document.getElementById('error-name'),
        errorEmail: document.getElementById('error-email'),
        errorPhone: document.getElementById('error-phone'),
        errorDate: document.getElementById('error-date'),
        errorSpots: document.getElementById('error-spots'),
        reservationSuccessCard: document.getElementById('reservation-success-card'),
        summaryTourName: document.getElementById('summary-tour-name'),
        summaryTourDate: document.getElementById('summary-tour-date'),
        summarySpots: document.getElementById('summary-spots'),
        summaryTouristName: document.getElementById('summary-tourist-name'),
        historialCard: document.getElementById('historial-reservation-card'),
        historialStatusBadge: document.getElementById('historial-status-badge'),
        historialSpotsCount: document.getElementById('historial-spots-count'),
        historialTourDate: document.getElementById('historial-tour-date'),
        btnVolverMisTours: document.getElementById('btn-volver-mis-tours'),
        bookingCard: document.getElementById('booking-card'),
        reservationCardDefault: document.getElementById('booking-card')
    },

    mostrarEstado(estado, titulo, mensaje) {
        const e = this.elements;
        const loading = estado === 'loading';
        e.stateLoading?.classList.toggle('hidden', !loading);
        e.stateLoading?.style && (e.stateLoading.style.display = loading ? '' : 'none');
        e.stateError?.classList.toggle('hidden', estado !== 'error');
        e.stateError?.style && (e.stateError.style.display = estado === 'error' ? 'flex' : 'none');
        e.stateContent?.classList.toggle('hidden', estado !== 'content');
        e.stateContent?.style && (e.stateContent.style.display = estado === 'content' ? 'block' : 'none');
        if (estado === 'error') {
            const titleElement = e.stateError?.querySelector('.error-title');
            const messageElement = e.stateError?.querySelector('.error-message');
            if (titleElement && titulo) titleElement.textContent = titulo;
            if (messageElement && mensaje) messageElement.textContent = mensaje;
        }
    },

    renderizarTour(tour) {
        const e = this.elements;
        const nombre = tour.name || 'Tour Oficial MITUR';
        if (e.title) e.title.textContent = nombre;
        document.title = `${nombre} | Ministerio de Turismo SV`;
        if (e.departmentBadge) e.departmentBadge.textContent = tour.department || 'El Salvador';
        if (e.guideName) e.guideName.textContent = tour.guide_name || 'Guía Certificado MITUR';
        if (e.fullDescription) e.fullDescription.textContent = tour.full_description || tour.short_description || 'Sin descripción detallada disponible.';
        if (e.departureTime) e.departureTime.textContent = this.formatearHora(tour.departure_time);
        this.renderizarPrecios(tour);
        this.renderizarGaleria(tour);
        this.renderizarLugares(tour);
        this.renderizarFechas(tour);
    },

    actualizarCupos(cupos) {
        const e = this.elements;
        const cantidad = Number(cupos) || 0;
        if (e.availableSpots) e.availableSpots.textContent = String(cantidad);
        if (e.spotsBadge) {
            e.spotsBadge.textContent = cantidad <= 0 ? 'Agotado' : cantidad <= 3 ? `¡Últimos ${cantidad} cupos!` : `${cantidad} cupos disponibles`;
            e.spotsBadge.classList.toggle('sold-out', cantidad <= 0);
        }
        if (e.btnOpenReserve) {
            e.btnOpenReserve.disabled = cantidad <= 0;
            e.btnOpenReserve.textContent = cantidad <= 0 ? 'Cupos agotados' : 'Reservar cupo';
        }
        if (e.inputSpots) {
            e.inputSpots.max = String(cantidad);
            if (cantidad > 0 && Number(e.inputSpots.value) > cantidad) {
                e.inputSpots.value = String(cantidad);
            } else if (cantidad <= 0) {
                e.inputSpots.value = '0';
            }
        }
    },

    renderizarPrecios(tour) {
        const { discountBadge, pricingRow } = this.elements;
        if (!pricingRow) return;
        pricingRow.replaceChildren();
        const oferta = tour.has_offer === true && Number(tour.discount_percentage) > 0;
        discountBadge?.classList.toggle('hidden', !oferta);
        if (oferta && discountBadge) discountBadge.textContent = `-${tour.discount_percentage}% Descuento`;

        const grupoFinal = document.createElement('div');
        grupoFinal.className = 'price-final-group';
        if (oferta) {
            const grupoOferta = document.createElement('div');
            grupoOferta.className = 'pricing-offer-group';
            const original = document.createElement('span');
            original.className = 'price-original';
            original.title = 'Precio regular';
            original.textContent = formatearMonedaUSD(tour.price);
            const descuento = document.createElement('span');
            descuento.className = 'price-discount-tag';
            descuento.textContent = `-${tour.discount_percentage}% OFF`;
            grupoOferta.append(original, descuento);
            pricingRow.appendChild(grupoOferta);
        }

        const precio = document.createElement('span');
        precio.className = 'price-final';
        const finalPrice = oferta
            ? tour.final_price ?? Number(tour.price) * (1 - Number(tour.discount_percentage) / 100)
            : tour.price;
        precio.textContent = formatearMonedaUSD(finalPrice);
        const nota = document.createElement('span');
        nota.className = 'price-currency-note';
        nota.textContent = 'USD / persona';
        grupoFinal.append(precio, nota);
        pricingRow.appendChild(grupoFinal);
    },

    renderizarGaleria(tour) {
        const e = this.elements;
        const principal = tour.image_url || IMAGEN_FALLBACK;
        if (e.heroImage) {
            e.heroImage.src = principal;
            e.heroImage.alt = `Fotografía de ${tour.name || 'tour'}`;
            e.heroImage.onerror = () => { e.heroImage.src = IMAGEN_FALLBACK; };
        }
        if (!e.thumbnailsStrip) return;
        e.thumbnailsStrip.replaceChildren();
        const imagenes = [principal];
        (tour.tour_images || []).forEach(item => {
            const url = typeof item === 'string' ? item : item.image_url;
            if (url && !imagenes.includes(url)) imagenes.push(url);
        });
        e.thumbnailsStrip.style.display = imagenes.length > 1 ? 'grid' : 'none';
        imagenes.slice(1).forEach((url, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'thumbnail-btn';
            button.setAttribute('aria-label', `Ver fotografía ${index + 2} de ${tour.name || 'tour'}`);
            const image = document.createElement('img');
            image.src = url;
            image.alt = `Miniatura ${index + 2}`;
            image.loading = 'lazy';
            button.appendChild(image);
            button.addEventListener('click', () => {
                if (e.heroImage) e.heroImage.src = url;
                e.thumbnailsStrip.querySelectorAll('.thumbnail-btn').forEach(item => item.classList.remove('active'));
                button.classList.add('active');
            });
            e.thumbnailsStrip.appendChild(button);
        });
    },

    renderizarLugares(tour) {
        const list = this.elements.placesList;
        if (!list) return;
        list.replaceChildren();
        const places = [...(tour.tour_places || [])].sort((a, b) => (Number(a.visit_order) || 0) - (Number(b.visit_order) || 0));
        if (!places.length) {
            const item = document.createElement('li');
            item.className = 'places-empty-notice';
            item.textContent = 'Información del itinerario en proceso de actualización por el Ministerio de Turismo.';
            list.appendChild(item);
            return;
        }
        places.forEach((entry, index) => {
            const place = entry.places || {};
            const item = document.createElement('li');
            item.className = 'place-item-card tour-place-item itinerary-item itinerary-card';
            
            const number = document.createElement('span');
            number.className = 'step-num tour-place-order place-step-badge place-order-badge';
            number.textContent = String(entry.visit_order || index + 1);
            number.setAttribute('aria-label', `Parada número ${entry.visit_order || index + 1}`);
            
            const image = document.createElement('img');
            image.className = 'place-item-thumb tour-place-thumb tour-place-image';
            image.src = place.image_url || LUGAR_FALLBACK;
            image.alt = place.name || `Parada ${index + 1}`;
            image.loading = 'lazy';
            image.onerror = () => { image.src = LUGAR_FALLBACK; };

            const headerInfo = document.createElement('div');
            headerInfo.className = 'tour-place-header-info place-info-wrap place-header-info';

            const title = document.createElement('h4');
            title.className = 'place-name tour-place-title';
            title.textContent = place.name || `Parada ${index + 1}`;

            const department = document.createElement('span');
            department.className = 'place-depto-tag place-badge tour-place-badge';
            department.textContent = place.department || tour.department || 'El Salvador';

            headerInfo.append(title, department);

            const description = document.createElement('p');
            description.className = 'place-desc tour-place-desc tour-place-description';
            description.textContent = place.short_description || 'Visita guiada oficial y tiempo libre para exploración.';

            item.append(number, image, headerInfo, description);
            list.appendChild(item);
        });
    },

    renderizarFechas(tour) {
        const e = this.elements;
        const fechas = [...(tour.tour_dates || [])].sort((a, b) => new Date(a.departure_date) - new Date(b.departure_date));
        e.datesChips?.replaceChildren();
        if (e.selectDate) e.selectDate.replaceChildren(new Option('Selecciona una fecha de salida', ''));
        if (!fechas.length) {
            const message = document.createElement('span');
            message.className = 'no-dates-notice';
            message.textContent = 'Próximas fechas por confirmar';
            e.datesChips?.appendChild(message);
            this.actualizarCupos(0);
            return;
        }

        const hoyStr = obtenerFechaHoyLocal();

        fechas.forEach((entry, index) => {
            const rawDate = typeof entry === 'string' ? entry : entry.departure_date;
            if (!rawDate) return;
            const dateId = entry.id || `date-${index}`;
            const spots = entry.available_spots !== undefined ? Number(entry.available_spots) : 0;
            const label = formatearFechaLarga(rawDate);
            const esPasada = esFechaPasada(rawDate);

            // Opción en el selector con value = tour_dates.id
            const option = document.createElement('option');
            option.value = dateId;
            option.dataset.departureDate = rawDate;
            option.dataset.spots = String(spots);
            if (esPasada) {
                option.disabled = true;
                option.textContent = `${label} (${rawDate}) - Fecha pasada`;
            } else {
                option.textContent = `${label} (${rawDate})`;
            }
            e.selectDate?.appendChild(option);

            // Chip interactivo para selección visual rápida
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'date-chip';
            chip.dataset.dateId = dateId;
            chip.dataset.departureDate = rawDate;
            chip.dataset.spots = String(spots);
            chip.append(crearIconoCalendario());
            const chipText = document.createElement('span');
            chipText.textContent = esPasada ? `${label} (Pasada)` : label;
            chip.appendChild(chipText);

            if (esPasada) {
                chip.disabled = true;
                chip.setAttribute('aria-disabled', 'true');
                chip.classList.add('disabled', 'date-chip-disabled');
                chip.setAttribute('aria-label', `${label}, fecha no disponible por haber pasado`);
            } else {
                chip.setAttribute('aria-label', `${label}, ${spots} cupos disponibles`);
                chip.addEventListener('click', () => {
                    this.marcarFechaSeleccionada(dateId);
                    if (e.selectDate) {
                        e.selectDate.value = dateId;
                        e.selectDate.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }

            e.datesChips?.appendChild(chip);
        });
    },

    marcarFechaSeleccionada(dateId) {
        const e = this.elements;
        if (!dateId) {
            if (e.selectDate) e.selectDate.value = '';
            if (e.datesChips) {
                e.datesChips.querySelectorAll('.date-chip').forEach(chip => {
                    chip.classList.remove('active');
                    chip.setAttribute('aria-pressed', 'false');
                });
            }
            const radios = document.querySelectorAll('input[name="tour_date"], input[name="tour_date_id"]');
            radios.forEach(r => { r.checked = false; });
            return;
        }
        if (e.selectDate && e.selectDate.value !== String(dateId)) {
            e.selectDate.value = String(dateId);
        }
        if (e.datesChips) {
            e.datesChips.querySelectorAll('.date-chip').forEach(chip => {
                const isMatching = chip.dataset.dateId === String(dateId);
                const isActive = isMatching && !chip.disabled && !chip.classList.contains('disabled');
                chip.classList.toggle('active', isActive);
                chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        }
        const radio = document.querySelector(`input[name="tour_date"][value="${dateId}"], input[name="tour_date_id"][value="${dateId}"]`);
        if (radio && !radio.disabled) {
            radio.checked = true;
        }
    },

    seleccionarFecha(dateId) {
        this.marcarFechaSeleccionada(dateId);
    },

    actualizarCuposEnOpcion(dateId, nuevosCupos) {
        const e = this.elements;
        if (e.selectDate) {
            const opt = Array.from(e.selectDate.options).find(o => o.value === String(dateId));
            if (opt) {
                opt.dataset.spots = String(nuevosCupos);
            }
        }
        if (e.datesChips) {
            const chip = e.datesChips.querySelector(`[data-date-id="${dateId}"]`);
            if (chip) {
                chip.dataset.spots = String(nuevosCupos);
            }
        }
    },

    obtenerDatosReserva() {
        const e = this.elements;
        const radioChecked = document.querySelector('input[name="tour_date"]:checked, input[name="tour_date_id"]:checked');
        const selectedDateId = e.selectDate?.value.trim() || radioChecked?.value.trim() || '';

        let rawDate = '';
        if (e.selectDate && e.selectDate.selectedIndex >= 0) {
            const opt = e.selectDate.options[e.selectDate.selectedIndex];
            rawDate = opt?.dataset?.departureDate || '';
        }
        if (!rawDate && radioChecked) {
            rawDate = radioChecked.dataset?.departureDate || '';
        }

        return {
            nombre: e.inputName?.value.trim() || '',
            email: e.inputEmail?.value.trim() || '',
            telefono: e.inputPhone?.value.trim() || '',
            tour_date_id: selectedDateId,
            tour_date: rawDate,
            fecha: rawDate || selectedDateId,
            cupos: e.inputSpots?.value.trim() || ''
        };
    },

    limpiarErrores() {
        const e = this.elements;
        [e.inputName, e.inputEmail, e.inputPhone, e.selectDate, e.inputSpots].forEach(input => input?.classList.remove('is-invalid'));
        [e.errorName, e.errorEmail, e.errorPhone, e.errorDate, e.errorSpots].forEach(error => {
            if (error) {
                error.textContent = '';
                error.style.display = 'none';
            }
        });
    },

    mostrarErrorCampo(campo, mensaje) {
        const input = this.elements[campo];
        const erroresPorCampo = {
            inputName: 'errorName',
            inputEmail: 'errorEmail',
            inputPhone: 'errorPhone',
            selectDate: 'errorDate',
            inputSpots: 'errorSpots'
        };
        const error = this.elements[erroresPorCampo[campo]];
        input?.classList.add('is-invalid');
        if (error) {
            error.textContent = mensaje;
            error.style.display = 'block';
        }
        return input;
    },

    mostrarFormularioReserva() {
        const e = this.elements;
        e.reservationSuccessCard?.classList.add('hidden');
        e.reservationCard?.classList.remove('hidden');
        e.reservationCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => e.inputName?.focus(), 300);
    },

    ocultarFormularioReserva() {
        const e = this.elements;
        e.reservationCard?.classList.add('hidden');
        if (e.btnOpenReserve) {
            e.btnOpenReserve.classList.remove('hidden');
            e.btnOpenReserve.style.display = '';
            const cantidad = Number(e.availableSpots?.textContent) || 0;
            e.btnOpenReserve.disabled = cantidad <= 0;
            e.btnOpenReserve.textContent = cantidad <= 0 ? 'Cupos agotados' : 'Reservar cupo';
        }
    },

    limpiarFormularioReserva() {
        const e = this.elements;
        e.reservationForm?.reset();
        this.limpiarErrores();
    },

    mostrarError(mensaje) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert(mensaje || 'Ocurrió un error inesperado.');
        }
    },

    /**
     * Muestra la tarjeta de confirmación de reserva exitosa.
     * Debe ser invocada única y exclusivamente si la promesa del controlador se resolvió con éxito.
     * @param {Object} datos - Datos de la reservación confirmada
     * @param {Object} [tour] - Datos del tour asociado
     */
    mostrarReservacionExitosa(datos, tour = null) {
        const e = this.elements;
        let res = datos || {};
        let t = tour || {};
        if (datos && datos.id && !datos.spots_reserved && tour && tour.spots_reserved) {
            t = datos;
            res = tour;
        }

        const tourNombre = t.name || res.tour_name || res.tourName || (res.tours && res.tours.name) || 'Tour Oficial MITUR';
        const fecha = res.tour_date || res.tourDate;
        const cupos = res.spots_reserved ?? res.cuposReservados ?? 1;
        const nombreTurista = res.tourist_name || res.nombre || '--';

        if (e.summaryTourName) e.summaryTourName.textContent = tourNombre;
        if (e.summaryTourDate) e.summaryTourDate.textContent = formatearFechaLarga(fecha) || fecha;
        if (e.summarySpots) e.summarySpots.textContent = `${cupos} cupo(s)`;
        if (e.summaryTouristName) e.summaryTouristName.textContent = nombreTurista;

        if (e.historialCard) {
            e.historialCard.classList.add('hidden');
        }

        e.reservationSuccessCard?.classList.remove('hidden');
        e.reservationSuccessCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        e.reservationCard?.classList.add('hidden');
        e.reservationForm?.reset();
    },

    mostrarConfirmacion(tour, reserva) {
        return this.mostrarReservacionExitosa(reserva, tour);
    },

    formatearHora(hora) {
        if (!hora) return '07:00 AM';
        const [h, minutes] = hora.split(':');
        const numeric = Number.parseInt(h, 10);
        if (Number.isNaN(numeric)) return hora;
        return `${numeric % 12 || 12}:${minutes || '00'} ${numeric >= 12 ? 'PM' : 'AM'}`;
    },

    /**
     * Renderiza la vista en modo historial:
     * - Muestra el bloque informativo con el estado ("Pendiente de confirmar", "Confirmado" o "Pasado")
     *   y los cupos reservados (Criterio 3).
     * - Configura el botón o enlace con el texto exacto: "Volver a mis tours" (Criterio 3).
     * - Oculta el formulario o botón de "Reservar cupo" (Criterio 4).
     * 
     * @param {Object} reserva - { status, spots_reserved, tour_date }
     * @param {Object} [tour] - Objeto del tour
     */
    renderizarModoHistorial(reserva, tour) {
        const e = this.elements;
        const card = e.historialCard || document.getElementById('historial-reservation-card');
        const badge = e.historialStatusBadge || document.getElementById('historial-status-badge');
        const spots = e.historialSpotsCount || document.getElementById('historial-spots-count');
        const dateEl = e.historialTourDate || document.getElementById('historial-tour-date');
        const btnVolver = e.btnVolverMisTours || document.getElementById('btn-volver-mis-tours');
        const btnReturn = e.btnReturn || document.getElementById('btn-return');

        if (card) {
            card.classList.remove('hidden');
        }

        if (badge && reserva) {
            const estado = reserva.status || 'Confirmado';
            badge.textContent = estado;
            badge.classList.remove('status-confirmado', 'status-pendiente', 'status-pasado');
            if (estado === 'Confirmado') {
                badge.classList.add('status-confirmado');
            } else if (estado === 'Pasado') {
                badge.classList.add('status-pasado');
            } else {
                badge.classList.add('status-pendiente');
            }
        }

        if (spots && reserva) {
            const cantidad = reserva.spots_reserved || 1;
            spots.textContent = `${cantidad} ${cantidad === 1 ? 'cupo' : 'cupos'}`;
        }

        if (dateEl && reserva?.tour_date) {
            dateEl.textContent = formatearFechaLarga(reserva.tour_date) || reserva.tour_date;
        }

        // Criterio 3: Enlace exacto hacia mis-tours.html
        if (btnVolver) {
            btnVolver.href = 'mis-tours.html';
        }

        // Adaptar botón superior de retorno si viene explícitamente desde historial
        const params = new URLSearchParams(window.location.search);
        const fromHistorial = params.get('from') === 'historial';
        if (btnReturn && fromHistorial) {
            btnReturn.href = 'mis-tours.html';
            const spanText = btnReturn.querySelector('span');
            if (spanText) {
                spanText.textContent = 'Volver a mis tours';
            }
        }

        // Criterio 4: Ocultar o deshabilitar botón y formulario de reserva
        if (e.btnOpenReserve) {
            e.btnOpenReserve.classList.add('hidden');
            e.btnOpenReserve.style.display = 'none';
        }

        if (e.reservationCard) {
            e.reservationCard.classList.add('hidden');
            e.reservationCard.style.display = 'none';
        }

        if (e.reservationSuccessCard) {
            e.reservationSuccessCard.classList.add('hidden');
        }
    },

    /**
     * Criterio 4: Si el tour ya pasó o no tiene fechas futuras vigentes, no permitir reservar cupos
     */
    deshabilitarReservaPorTourPasado() {
        const e = this.elements;
        if (e.availableSpots) {
            e.availableSpots.textContent = '0';
        }
        if (e.btnOpenReserve) {
            e.btnOpenReserve.disabled = true;
            e.btnOpenReserve.classList.add('disabled');
            e.btnOpenReserve.textContent = 'Tour sin fechas vigentes';
        }
        if (e.spotsBadge) {
            e.spotsBadge.textContent = 'Sin fechas vigentes';
            e.spotsBadge.classList.add('sold-out');
        }
        if (e.reservationCard) {
            e.reservationCard.classList.add('hidden');
        }
    },

    /**
     * Restablece la vista al modo público del tour al cerrar sesión (SIGNED_OUT)
     * o ante ausencia de sesión de usuario:
     * 1. Oculta la tarjeta de reservación oficial / historial (historialCard).
     * 2. Oculta formularios o confirmaciones y limpia los campos.
     * 3. Muestra y rehabilita la tarjeta estándar de reserva y precio.
     * 4. Actualiza los cupos visibles según la fecha seleccionada.
     * 
     * @param {Object} [tour] - Datos del tour actual
     */
    restablecerModoPublico(tour) {
        const e = this.elements;

        // 1. Ocultar la tarjeta de reservación oficial/historial
        const historialCard = e.historialCard || document.getElementById('historial-reservation-card');
        if (historialCard) {
            historialCard.classList.add('hidden');
            historialCard.style.display = 'none';
        }

        // 2. Ocultar formularios o confirmaciones
        this.ocultarFormularioReserva();
        this.limpiarFormularioReserva();

        const successCard = e.reservationSuccessCard || document.getElementById('reservation-success-card');
        if (successCard) {
            successCard.classList.add('hidden');
            successCard.style.display = 'none';
        }

        // 3. Mostrar y rehabilitar la tarjeta estándar de reserva y precio
        const cardDefault = e.reservationCardDefault || e.bookingCard || document.getElementById('booking-card');
        if (cardDefault) {
            cardDefault.classList.remove('hidden');
            cardDefault.style.display = '';
        }

        const btnOpen = e.btnOpenReserve || document.getElementById('btn-open-reserve');
        if (btnOpen) {
            btnOpen.disabled = false;
            btnOpen.classList.remove('hidden');
            btnOpen.style.display = '';
            btnOpen.textContent = 'Reservar cupo';
        }

        // Restablecer botón superior de retorno si había sido adaptado para historial
        const btnReturn = e.btnReturn || document.getElementById('btn-return');
        if (btnReturn) {
            btnReturn.href = 'tours.html';
            const spanText = btnReturn.querySelector('span');
            if (spanText) {
                spanText.textContent = 'Volver';
            }
        }

        // 4. Actualizar cupos visibles según la fecha seleccionada
        let cupos = 0;
        const hoyStr = obtenerFechaHoyLocal();

        if (e.selectDate && e.selectDate.value) {
            const selectedOpt = Array.from(e.selectDate.options).find(o => o.value === e.selectDate.value && !o.disabled);
            if (selectedOpt && selectedOpt.dataset.spots !== undefined) {
                cupos = Number(selectedOpt.dataset.spots) || 0;
            } else {
                this.marcarFechaSeleccionada(null);
            }
        } else if (tour && Array.isArray(tour.tour_dates) && tour.tour_dates.length > 0) {
            const fechasOrdenadas = [...tour.tour_dates].sort((a, b) => new Date(a.departure_date || a) - new Date(b.departure_date || b));
            const proxima = fechasOrdenadas.find(f => String(f.departure_date || f).split('T')[0] > hoyStr) || null;
            if (proxima) {
                this.marcarFechaSeleccionada(proxima.id);
                cupos = Number(proxima.available_spots) || 0;
            } else {
                this.marcarFechaSeleccionada(null);
                cupos = 0;
            }
        }

        this.actualizarCupos(cupos);

        // Si el tour ya pasó completamente (no tiene fechas futuras vigentes), deshabilitar reserva
        const fechas = tour?.tour_dates || [];
        const tieneFechasFuturas = fechas.some(d => {
            const fechaStr = typeof d === 'string' ? d : d.departure_date;
            return String(fechaStr).split('T')[0] > hoyStr;
        });
        if (fechas.length > 0 && !tieneFechasFuturas) {
            this.deshabilitarReservaPorTourPasado();
        }
    }
};