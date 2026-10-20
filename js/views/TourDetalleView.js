import { formatearFechaLarga, formatearMonedaUSD } from '../models/ToursModel.js';

const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80';
const LUGAR_FALLBACK = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80';

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
        summaryTouristName: document.getElementById('summary-tourist-name')
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
        this.actualizarCupos(tour.available_spots);
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
            if (cantidad > 0 && Number(e.inputSpots.value) > cantidad) e.inputSpots.value = String(cantidad);
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
            item.className = 'place-item-card';
            const number = document.createElement('span');
            number.className = 'step-num';
            number.textContent = String(entry.visit_order || index + 1);
            number.setAttribute('aria-label', `Parada número ${entry.visit_order || index + 1}`);
            const image = document.createElement('img');
            image.src = place.image_url || LUGAR_FALLBACK;
            image.alt = place.name || `Parada ${index + 1}`;
            image.loading = 'lazy';
            image.onerror = () => { image.src = LUGAR_FALLBACK; };
            const title = document.createElement('h3');
            title.className = 'place-name';
            title.textContent = place.name || `Parada ${index + 1}`;
            const department = document.createElement('span');
            department.className = 'place-depto-tag';
            department.textContent = place.department || tour.department || 'El Salvador';
            const description = document.createElement('p');
            description.className = 'place-desc';
            description.textContent = place.short_description || 'Visita guiada oficial y tiempo libre para exploración.';
            item.append(number, image, title, department, description);
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
            return;
        }
        fechas.forEach(entry => {
            const rawDate = typeof entry === 'string' ? entry : entry.departure_date;
            if (!rawDate) return;
            const label = formatearFechaLarga(rawDate);
            const chip = document.createElement('div');
            chip.className = 'date-chip';
            chip.append(crearIconoCalendario());
            const chipText = document.createElement('span');
            chipText.textContent = label;
            chip.appendChild(chipText);
            e.datesChips?.appendChild(chip);
            e.selectDate?.appendChild(new Option(`${label} (${rawDate})`, rawDate));
        });
    },

    obtenerDatosReserva() {
        const e = this.elements;
        return {
            nombre: e.inputName?.value.trim() || '',
            email: e.inputEmail?.value.trim() || '',
            telefono: e.inputPhone?.value.trim() || '',
            fecha: e.selectDate?.value.trim() || '',
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

    mostrarConfirmacion(tour, reserva) {
        const e = this.elements;
        if (e.summaryTourName) e.summaryTourName.textContent = tour.name || 'Tour Oficial MITUR';
        if (e.summaryTourDate) e.summaryTourDate.textContent = formatearFechaLarga(reserva.tour_date);
        if (e.summarySpots) e.summarySpots.textContent = `${reserva.spots_reserved} cupo(s)`;
        if (e.summaryTouristName) e.summaryTouristName.textContent = reserva.tourist_name;
        e.reservationSuccessCard?.classList.remove('hidden');
        e.reservationSuccessCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        e.reservationCard?.classList.add('hidden');
        e.reservationForm?.reset();
    },

    formatearHora(hora) {
        if (!hora) return '07:00 AM';
        const [h, minutes] = hora.split(':');
        const numeric = Number.parseInt(h, 10);
        if (Number.isNaN(numeric)) return hora;
        return `${numeric % 12 || 12}:${minutes || '00'} ${numeric >= 12 ? 'PM' : 'AM'}`;
    }
};