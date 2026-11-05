/**
 * @file TourDetalleView.js
 * Vista (patrón MVC) de la página de detalle de un tour (tour-detalle.html).
 *
 * Responsabilidades:
 *  - Mostrar la información del tour: galería, precios, itinerario de lugares y fechas de salida.
 *  - Gestionar el formulario de reserva (lectura de datos, errores de validación y cupos).
 *  - Mostrar la tarjeta que corresponde al estado de la reserva del usuario: pendiente de pago
 *    (con temporizador), en validación, confirmada o recién creada.
 *
 * La vista no consulta ni guarda datos: los recibe del controlador (TourDetalleController).
 */
import { formatearFechaLarga, formatearMonedaUSD, esFechaPasada } from '../models/ToursModel.js';
import { formatearHora } from '../utils/textUtils.js';

// Imágenes de respaldo: portada del tour (1200 px) y miniatura de cada lugar del itinerario (400 px).
const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80';
const LUGAR_FALLBACK = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80';

/**
 * Devuelve la fecha de hoy según la hora local del navegador.
 *
 * @returns {string} Fecha en formato AAAA-MM-DD.
 */
function obtenerFechaHoyLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/**
 * Crea el icono SVG de calendario que se usa en los chips de fechas.
 *
 * @returns {SVGElement} Elemento <svg> listo para insertarse.
 */
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

/**
 * Objeto de vista del detalle de un tour: acceso al DOM, renderizado y control de los estados de la reserva.
 */
export const TourDetalleView = {
    /** Identificador del temporizador de cuenta regresiva activo (null si no hay ninguno). */
    timerId: null,

    /** Elementos del DOM inyectados manualmente (por ejemplo, en pruebas); si existen, reemplazan a los reales. */
    _mockElements: null,
    /**
     * Referencias a los nodos del DOM de tour-detalle.html (galería, precios, formulario, tarjetas de reserva, etc.).
     * Devuelve los elementos inyectados si existen; fuera del navegador devuelve un objeto vacío.
     */
    get elements() {
        if (this._mockElements) return this._mockElements;
        if (typeof document === 'undefined') return this._mockElements || {};
        return {
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
            reservationCardDefault: document.getElementById('booking-card'),
            reservaPendienteCard: document.getElementById('reserva-pendiente-card'),
            pendienteCodigo: document.getElementById('pendiente-codigo'),
            pendienteCupos: document.getElementById('pendiente-cupos'),
            pendienteFecha: document.getElementById('pendiente-fecha'),
            alertaTiempoRestante: document.getElementById('alerta-tiempo-restante'),
            textoTiempoRestante: document.getElementById('texto-tiempo-restante'),
            btnCompletarPago: document.getElementById('btn-completar-pago'),
            reservaValidacionCard: document.getElementById('reserva-validacion-card'),
            validacionCodigo: document.getElementById('validacion-codigo')
        };
    },
    /** Permite inyectar un conjunto de elementos del DOM (útil para pruebas). */
    set elements(val) {
        this._mockElements = val;
    },

    /**
     * Detiene el temporizador de cuenta regresiva, si hay uno activo.
     */
    limpiarTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    },

    /**
     * Inicia la cuenta regresiva del tiempo disponible para transferir el pago, actualizándola cada segundo.
     * Fecha límite: expiresAt si existe; si no, createdAt + 1 hora; si tampoco, una hora desde ahora.
     *
     * @param {string|null} expiresAt - Fecha y hora de expiración de la reserva.
     * @param {string|null} createdAt - Fecha y hora de creación de la reserva.
     * @param {function(): void} [onExpirado] - Se ejecuta una vez cuando el tiempo se agota.
     */
    iniciarTemporizador(expiresAt, createdAt, onExpirado) {
        this.limpiarTimer();
        const texto = this.elements.textoTiempoRestante;
        if (!texto) return;

        let target = null;
        if (expiresAt) {
            target = new Date(expiresAt).getTime();
        } else if (createdAt) {
            target = new Date(createdAt).getTime() + 3600000;
        } else {
            target = Date.now() + 3600000;
        }

        const actualizar = () => {
            const diff = target - Date.now();
            if (diff <= 0) {
                this.limpiarTimer();
                texto.textContent = 'Tiempo de reserva expirado';
                if (typeof onExpirado === 'function') {
                    onExpirado();
                }
                return;
            }

            const minutos = Math.floor(diff / 60000);
            const segundos = Math.floor((diff % 60000) / 1000);
            texto.textContent = `Tiempo restante para transferir: ${minutos}m ${String(segundos).padStart(2, '0')}s`;
        };

        actualizar();
        this.timerId = setInterval(actualizar, 1000);
    },

    /**
     * Alterna entre los estados de la página: cargando, error o contenido.
     *
     * @param {'loading'|'error'|'content'} estado - Estado a mostrar.
     * @param {string} [titulo] - Título del error (solo si estado es "error").
     * @param {string} [mensaje] - Mensaje del error (solo si estado es "error").
     */
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

    /**
     * Rellena la página con los datos del tour y delega precios, galería, lugares y fechas en sus métodos.
     *
     * @param {Object} tour - Tour con name, department, guide_name, descripciones, departure_time, precios, tour_images, tour_places y tour_dates.
     */
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

    /**
     * Actualiza los cupos disponibles: número, distintivo, botón de reservar y máximo del campo de cupos.
     * Distintivo: "Agotado" (0), "¡Últimos N cupos!" (3 o menos) o "N cupos disponibles".
     *
     * @param {number|string} cupos - Cupos disponibles de la fecha seleccionada.
     */
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

    /**
     * Dibuja el precio del tour. Si tiene oferta muestra el precio original tachado, el descuento y el precio final.
     *
     * @param {Object} tour - Tour con price, has_offer, discount_percentage y final_price.
     */
    renderizarPrecios(tour) {
        const { discountBadge, pricingRow } = this.elements;
        if (!pricingRow) return;
        pricingRow.replaceChildren();
        // Hay oferta solo si has_offer es true y el descuento es mayor a 0.
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

    /**
     * Dibuja la imagen principal y las miniaturas. Al pulsar una miniatura se cambia la imagen principal.
     * Si hay una sola imagen, la tira de miniaturas se oculta.
     *
     * @param {Object} tour - Tour con image_url y tour_images.
     */
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

    /**
     * Dibuja el itinerario: los lugares del tour ordenados por visit_order, cada uno con número, foto, nombre, departamento y descripción.
     * Si no hay lugares muestra un aviso de itinerario en actualización.
     *
     * @param {Object} tour - Tour con tour_places.
     */
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

    /**
     * Dibuja las fechas de salida como chips y como opciones del selector del formulario, ordenadas de menor a mayor.
     * Las fechas pasadas se muestran deshabilitadas. Si no hay fechas, muestra "Próximas fechas por confirmar" y deja en 0 los cupos.
     *
     * @param {Object} tour - Tour con tour_dates (id, departure_date y available_spots).
     */
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

        // Por cada fecha se crea una opción del selector y un chip. Al pulsar un chip se selecciona esa fecha en el selector.
        fechas.forEach((entry, index) => {
            const rawDate = typeof entry === 'string' ? entry : entry.departure_date;
            if (!rawDate) return;
            const dateId = entry.id || `date-${index}`;
            const spots = entry.available_spots !== undefined ? Number(entry.available_spots) : 0;
            const label = formatearFechaLarga(rawDate);
            const esPasada = esFechaPasada(rawDate);

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

    /**
     * Marca como seleccionada una fecha en el selector, en los chips y en los botones de radio (si existen).
     * Si se llama sin id, quita cualquier selección.
     *
     * @param {string|number|null} dateId - Id de la fecha a seleccionar; vacío o null para limpiar.
     */
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

    /**
     * Alias de marcarFechaSeleccionada.
     *
     * @param {string|number|null} dateId - Id de la fecha a seleccionar.
     */
    seleccionarFecha(dateId) {
        this.marcarFechaSeleccionada(dateId);
    },

    /**
     * Actualiza el dato de cupos guardado en la opción y en el chip de una fecha (no cambia lo que se ve en pantalla).
     *
     * @param {string|number} dateId - Id de la fecha.
     * @param {number} nuevosCupos - Nuevo número de cupos disponibles.
     */
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

    /**
     * Lee los datos que el usuario llenó en el formulario de reserva.
     *
     * @returns {{nombre: string, email: string, telefono: string, tour_date_id: string, tour_date: string, fecha: string, cupos: string}} Valores sin espacios; cadena vacía si el campo no se llenó.
     */
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

    /**
     * Quita los mensajes de error y el estilo de campo inválido de todo el formulario.
     */
    limpiarErrores() {
        const e = this.elements;
        [e.inputName, e.inputEmail, e.inputPhone, e.selectDate, e.inputSpots].forEach(input => input?.classList?.remove?.('is-invalid'));
        [e.errorName, e.errorEmail, e.errorPhone, e.errorDate, e.errorSpots].forEach(error => {
            if (error) {
                error.textContent = '';
                error.style.display = 'none';
            }
        });
    },

    /**
     * Marca un campo como inválido y muestra su mensaje de error.
     *
     * @param {string} campo - Nombre del campo: inputName, inputEmail, inputPhone, selectDate o inputSpots.
     * @param {string} mensaje - Texto del error.
     * @returns {HTMLElement|undefined} El campo marcado (útil para enfocarlo).
     */
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

    /**
     * Muestra el formulario de reserva, se desplaza hasta él y enfoca el campo de nombre.
     */
    mostrarFormularioReserva() {
        const e = this.elements;
        e.reservationSuccessCard?.classList.add('hidden');
        e.reservationCard?.classList.remove('hidden');
        e.reservationCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => e.inputName?.focus(), 300);
    },

    /**
     * Oculta el formulario de reserva y restaura el botón "Reservar cupo" según los cupos disponibles.
     */
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

    /**
     * Reinicia el formulario (cupos en 1, sin fecha) y limpia los errores.
     */
    limpiarFormularioReserva() {
        const e = this.elements;
        e.reservationForm?.reset();
        if (e.inputName) e.inputName.value = '';
        if (e.inputEmail) e.inputEmail.value = '';
        if (e.inputPhone) e.inputPhone.value = '';
        if (e.selectDate) e.selectDate.value = '';
        if (e.inputSpots) e.inputSpots.value = '1';
        this.limpiarErrores();
    },

    /**
     * Muestra un mensaje de error en una alerta del navegador.
     *
     * @param {string} [mensaje] - Texto del error; si falta se usa un mensaje genérico.
     */
    mostrarError(mensaje) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert(mensaje || 'Ocurrió un error inesperado.');
        }
    },

    /**
     * Muestra la tarjeta de reserva creada con el resumen (tour, fecha, cupos y nombre del turista) y oculta las demás tarjetas.
     *
     * @param {Object} datos - Reserva creada.
     * @param {Object|null} [tour] - Tour reservado.
     */
    mostrarReservacionExitosa(datos, tour = null) {
        const e = this.elements;
        let res = datos || {};
        let t = tour || {};
        // Admite los argumentos en cualquier orden: si recibe (tour, reserva), los intercambia.
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
        if (e.reservaPendienteCard) {
            e.reservaPendienteCard.classList.add('hidden');
        }
        if (e.reservaValidacionCard) {
            e.reservaValidacionCard.classList.add('hidden');
        }

        e.reservationSuccessCard?.classList.remove('hidden');
        e.reservationSuccessCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        e.reservationCard?.classList.add('hidden');
        e.reservationForm?.reset();
    },

    /**
     * Alias de mostrarReservacionExitosa, con los argumentos en orden (tour, reserva).
     *
     * @param {Object} tour - Tour reservado.
     * @param {Object} reserva - Reserva creada.
     */
    mostrarConfirmacion(tour, reserva) {
        return this.mostrarReservacionExitosa(reserva, tour);
    },

    /**
     * Da formato a la hora de salida; si falta usa "07:00 AM".
     *
     * @param {string} hora - Hora de salida.
     * @returns {string} Hora formateada.
     */
    formatearHora(hora) {
        return formatearHora(hora, { fallback: '07:00 AM' });
    },

    /**
     * Muestra la tarjeta de reserva pendiente de pago (código, cupos y fecha), oculta las demás e inicia el temporizador.
     * El botón "Completar pago" lleva a pago-comprobante.html con el id y el código de la reserva.
     *
     * @param {Object} reserva - Reserva con id, reservation_code, spots_reserved, tour_date, expires_at y created_at.
     * @param {function(): void} [onExpirado] - Se ejecuta cuando el tiempo para pagar se agota.
     */
    mostrarReservaPendientePago(reserva, onExpirado) {
        this.limpiarTimer();
        const e = this.elements;
        const codigo = reserva.reservation_code || reserva.id;
        const cupos = Number(reserva.spots_reserved) || 1;
        const fechaStr = formatearFechaLarga(reserva.tour_date) || reserva.tour_date || '--';

        if (e.bookingCard) {
            e.bookingCard.classList.add('hidden');
            e.bookingCard.style.display = 'none';
        }
        if (e.reservationCard) {
            e.reservationCard.classList.add('hidden');
            e.reservationCard.style.display = 'none';
        }
        if (e.historialCard) {
            e.historialCard.classList.add('hidden');
            e.historialCard.style.display = 'none';
        }
        if (e.reservaValidacionCard) {
            e.reservaValidacionCard.classList.add('hidden');
            e.reservaValidacionCard.style.display = 'none';
        }
        if (e.reservationSuccessCard) {
            e.reservationSuccessCard.classList.add('hidden');
        }

        if (e.reservaPendienteCard) {
            e.reservaPendienteCard.classList.remove('hidden');
            e.reservaPendienteCard.style.display = 'block';
        }

        if (e.pendienteCodigo) e.pendienteCodigo.textContent = codigo;
        if (e.pendienteCupos) e.pendienteCupos.textContent = `${cupos} ${cupos === 1 ? 'cupo' : 'cupos'}`;
        if (e.pendienteFecha) e.pendienteFecha.textContent = fechaStr;

        if (e.btnCompletarPago) {
            e.btnCompletarPago.onclick = () => {
                window.location.href = `pago-comprobante.html?reservaId=${encodeURIComponent(reserva.id)}&codigo=${encodeURIComponent(codigo)}`;
            };
        }

        this.iniciarTemporizador(reserva.expires_at, reserva.created_at, onExpirado);
    },

    /**
     * Muestra la tarjeta de reserva en validación (comprobante enviado, en revisión) con su código y oculta las demás.
     *
     * @param {Object} reserva - Reserva con id o reservation_code.
     */
    mostrarReservaEnValidacion(reserva) {
        this.limpiarTimer();
        const e = this.elements;
        const codigo = reserva.reservation_code || reserva.id;

        if (e.bookingCard) {
            e.bookingCard.classList.add('hidden');
            e.bookingCard.style.display = 'none';
        }
        if (e.reservationCard) {
            e.reservationCard.classList.add('hidden');
            e.reservationCard.style.display = 'none';
        }
        if (e.historialCard) {
            e.historialCard.classList.add('hidden');
            e.historialCard.style.display = 'none';
        }
        if (e.reservaPendienteCard) {
            e.reservaPendienteCard.classList.add('hidden');
            e.reservaPendienteCard.style.display = 'none';
        }
        if (e.reservationSuccessCard) {
            e.reservationSuccessCard.classList.add('hidden');
        }

        if (e.reservaValidacionCard) {
            e.reservaValidacionCard.classList.remove('hidden');
            e.reservaValidacionCard.style.display = 'block';
        }

        if (e.validacionCodigo) e.validacionCodigo.textContent = codigo;
    },

    /**
     * Muestra la tarjeta de reserva confirmada (estado, cupos y fecha) con un enlace de regreso a mis-tours.html.
     *
     * @param {Object} reserva - Reserva con spots_reserved y tour_date.
     */
    mostrarReservaConfirmada(reserva) {
        this.limpiarTimer();
        const e = this.elements;

        if (e.bookingCard) {
            e.bookingCard.classList.add('hidden');
            e.bookingCard.style.display = 'none';
        }
        if (e.reservationCard) {
            e.reservationCard.classList.add('hidden');
            e.reservationCard.style.display = 'none';
        }
        if (e.reservaPendienteCard) {
            e.reservaPendienteCard.classList.add('hidden');
            e.reservaPendienteCard.style.display = 'none';
        }
        if (e.reservaValidacionCard) {
            e.reservaValidacionCard.classList.add('hidden');
            e.reservaValidacionCard.style.display = 'none';
        }
        if (e.reservationSuccessCard) {
            e.reservationSuccessCard.classList.add('hidden');
        }

        if (e.historialCard) {
            e.historialCard.classList.remove('hidden');
            e.historialCard.style.display = 'block';
        }

        if (e.historialStatusBadge) {
            e.historialStatusBadge.textContent = 'Confirmado';
            e.historialStatusBadge.className = 'badge-reserva-status status-confirmado';
        }

        if (e.historialSpotsCount) {
            const cantidad = Number(reserva.spots_reserved) || 1;
            e.historialSpotsCount.textContent = `${cantidad} ${cantidad === 1 ? 'cupo' : 'cupos'}`;
        }

        if (e.historialTourDate && reserva.tour_date) {
            e.historialTourDate.textContent = formatearFechaLarga(reserva.tour_date) || reserva.tour_date;
        }

        if (e.btnVolverMisTours) {
            e.btnVolverMisTours.href = 'mis-tours.html';
        }
    },

    /**
     * Muestra la tarjeta que corresponde al estado de una reserva existente: pendiente de pago, en validación o confirmada.
     * Si se llegó desde el historial (?from=historial), el botón de regreso apunta a mis-tours.html.
     *
     * @param {Object} reserva - Reserva del usuario (usa status_original o status).
     * @param {Object} tour - Tour de la reserva.
     */
    renderizarModoHistorial(reserva, tour) {
        if (!reserva) return;
        const st = String(reserva.status_original || reserva.status || '').toLowerCase().trim();

        if (st === 'pendiente_pago') {
            this.mostrarReservaPendientePago(reserva);
        } else if (st === 'en_validacion') {
            this.mostrarReservaEnValidacion(reserva);
        } else {
            this.mostrarReservaConfirmada(reserva);
        }

        const params = new URLSearchParams(window.location.search);
        const fromHistorial = params.get('from') === 'historial';
        const btnReturn = this.elements.btnReturn;
        if (btnReturn && fromHistorial) {
            btnReturn.href = 'mis-tours.html';
            const spanText = btnReturn.querySelector('span');
            if (spanText) {
                spanText.textContent = 'Volver a mis tours';
            }
        }
    },

    /**
     * Bloquea la reserva cuando el tour ya no tiene fechas vigentes: cupos en 0, botón deshabilitado y formulario oculto.
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
     * Vuelve a la vista pública del tour: oculta las tarjetas de reserva, limpia el formulario y recalcula los cupos.
     *
     * @param {Object} tour - Tour mostrado, con sus fechas de salida.
     */
    restablecerModoPublico(tour) {
        this.limpiarTimer();
        const e = this.elements;

        if (e.historialCard) {
            e.historialCard.classList.add('hidden');
            e.historialCard.style.display = 'none';
        }
        if (e.reservaPendienteCard) {
            e.reservaPendienteCard.classList.add('hidden');
            e.reservaPendienteCard.style.display = 'none';
        }
        if (e.reservaValidacionCard) {
            e.reservaValidacionCard.classList.add('hidden');
            e.reservaValidacionCard.style.display = 'none';
        }

        this.ocultarFormularioReserva();
        this.limpiarFormularioReserva();

        if (e.reservationSuccessCard) {
            e.reservationSuccessCard.classList.add('hidden');
            e.reservationSuccessCard.style.display = 'none';
        }

        const cardDefault = e.reservationCardDefault || e.bookingCard;
        if (cardDefault) {
            cardDefault.classList.remove('hidden');
            cardDefault.style.display = '';
        }

        const btnOpen = e.btnOpenReserve;
        if (btnOpen) {
            btnOpen.disabled = false;
            btnOpen.classList.remove('hidden');
            btnOpen.style.display = '';
            btnOpen.textContent = 'Reservar cupo';
        }

        const btnReturn = e.btnReturn;
        if (btnReturn) {
            btnReturn.href = 'tours.html';
            const spanText = btnReturn.querySelector('span');
            if (spanText) {
                spanText.textContent = 'Volver';
            }
        }

        // Recalcula los cupos: usa la fecha ya seleccionada o, si no hay, selecciona la próxima fecha futura.
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

        // Si el tour tiene fechas pero ninguna es futura, se bloquea la reserva.
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

// Se exporta también como exportación por defecto.
export default TourDetalleView;