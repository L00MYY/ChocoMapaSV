import { formatearMonedaUSD } from '../models/ToursModel.js';
import { calcularPromedioRating } from '../models/CalificacionesModel.js';

const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80';
const TOUR_IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80';

function formatearHora(hora) {
    if (!hora) return '';
    const [horaTexto, minutos = '00'] = hora.split(':');
    let numero = Number.parseInt(horaTexto, 10);
    if (Number.isNaN(numero)) return hora;
    const periodo = numero >= 12 ? 'PM' : 'AM';
    numero = numero % 12 || 12;
    return `${String(numero).padStart(2, '0')}:${minutos} ${periodo}`;
}

export const LugarDetalleView = {
    get elements() {
        if (typeof document === 'undefined') return {};
        return {
            loading: document.getElementById('state-loading'),
            error: document.getElementById('state-error'),
            errorMessage: document.getElementById('error-message'),
            content: document.getElementById('state-content'),
            returnButton: document.getElementById('btn-return-map'),
            title: document.getElementById('place-title'),
            category: document.getElementById('place-category-badge'),
            location: document.getElementById('place-location-text'),
            heroImage: document.getElementById('place-hero-image'),
            mediaRegion: document.getElementById('place-media-region'),
            description: document.getElementById('place-description'),
            department: document.getElementById('attr-department'),
            region: document.getElementById('attr-region'),
            status: document.getElementById('attr-status'),
            rating: document.getElementById('rating-numeric-value'),
            stars: document.getElementById('rating-stars-graphic'),
            ratingCaptionLabel: document.getElementById('rating-caption-label'),
            ratingActionPanel: document.getElementById('rating-action-panel'),
            ratingWidgetContainer: document.getElementById('rating-widget-container'),
            services: document.getElementById('services-badges-grid'),
            scheduleDays: document.getElementById('schedule-days-value'),
            scheduleHours: document.getElementById('schedule-hours-value'),
            scheduleNote: document.getElementById('schedule-note-text'),
            dateFilter: document.getElementById('place-tour-date'),
            clearDate: document.getElementById('btn-clear-place-date'),
            toursEmpty: document.getElementById('place-tours-empty'),
            toursEmptyText: document.getElementById('place-empty-text'),
            toursGrid: document.getElementById('place-tours-grid')
        };
    },

    mostrarEstado(estado, mensaje = '') {
        const { loading, error, errorMessage, content } = this.elements;
        loading?.classList.toggle('hidden', estado !== 'loading');
        error?.classList.toggle('hidden', estado !== 'error');
        content?.classList.toggle('hidden', estado !== 'content');
        if (estado === 'error' && errorMessage && mensaje) errorMessage.textContent = mensaje;
    },

    renderizarRatingCabecera(ratings) {
        const e = this.elements;
        const infoRating = calcularPromedioRating(ratings);
        const caption = e.ratingCaptionLabel || document.querySelector('.rating-caption-label');

        if (e.rating) {
            e.rating.textContent = infoRating.tieneCalificaciones ? infoRating.texto : 'Sin calificaciones aún';
        }

        if (caption) {
            caption.textContent = infoRating.tieneCalificaciones
                ? `(${infoRating.total} valoración${infoRating.total !== 1 ? 'es' : ''})`
                : 'Sin calificaciones aún';
        }

        if (e.stars) {
            e.stars.replaceChildren();
            for (let index = 1; index <= 5; index++) {
                const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                star.setAttribute('viewBox', '0 0 24 24');
                star.classList.add('star-icon');
                const isFilled = infoRating.tieneCalificaciones && (
                    index <= Math.floor(infoRating.promedio) ||
                    (index === Math.floor(infoRating.promedio) + 1 && (infoRating.promedio % 1) >= 0.4)
                );
                if (!isFilled) {
                    star.classList.add('empty');
                }
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
                star.appendChild(polygon);
                e.stars.appendChild(star);
            }
        }
    },

    renderizarLugar(lugar) {
        const e = this.elements;
        const nombre = lugar.name || 'Sitio turístico';
        if (e.title) e.title.textContent = nombre;
        document.title = `${nombre} | Tours por El Salvador`;

        if (e.category) {
            e.category.textContent = lugar.categories?.name || 'Turismo';
            if (lugar.categories?.color) e.category.style.backgroundColor = lugar.categories.color;
        }
        const ubicacion = [lugar.department, lugar.region ? `Región ${lugar.region}` : ''].filter(Boolean).join(' • ');
        if (e.location) e.location.textContent = ubicacion || 'El Salvador';
        if (e.heroImage) {
            e.heroImage.src = lugar.image_url || IMAGEN_FALLBACK;
            e.heroImage.alt = `Fotografía de ${nombre}`;
            e.heroImage.onerror = () => { e.heroImage.src = IMAGEN_FALLBACK; };
        }
        if (e.mediaRegion) e.mediaRegion.textContent = lugar.department ? `${lugar.department}, El Salvador` : 'El Salvador';
        if (e.description) e.description.textContent = lugar.description || lugar.short_description || 'No hay descripción disponible para este sitio turístico.';
        if (e.department) e.department.textContent = lugar.department || 'Nacional';
        if (e.region) e.region.textContent = lugar.region || 'El Salvador';
        if (e.status) e.status.textContent = lugar.is_active === false ? 'Temporalmente inactivo' : 'Sitio Activo';

        // Renderizado consistente y dinámico sin valores quemados (CA-01)
        this.renderizarRatingCabecera(lugar.ratings);

        if (e.services) {
            e.services.replaceChildren();
            const servicios = (lugar.place_services || []).map(item => item.services?.name).filter(Boolean);
            (servicios.length ? servicios : ['Parqueo vigilado', 'Servicios sanitarios', 'Guías turísticos', 'Senderos señalizados', 'Accesibilidad', 'Áreas de descanso']).forEach(nombreServicio => {
                const item = document.createElement('div');
                item.className = 'service-badge-item';
                const label = document.createElement('span');
                label.className = 'service-name-text';
                label.textContent = nombreServicio;
                item.appendChild(label);
                e.services.appendChild(item);
            });
        }

        const dias = lugar.opening_days?.trim() || 'Martes a Domingo';
        if (e.scheduleDays) e.scheduleDays.textContent = dias;
        if (e.scheduleHours) e.scheduleHours.textContent = lugar.opening_time && lugar.closing_time
            ? `${formatearHora(lugar.opening_time)} – ${formatearHora(lugar.closing_time)}`
            : '08:00 AM – 05:00 PM';
        if (e.scheduleNote) e.scheduleNote.textContent = dias.toLowerCase().includes('martes')
            ? 'Nota oficial: Cerrado los días lunes por labores de mantenimiento y preservación ecológica.'
            : 'Nota oficial: Se recomienda ingresar al menos una hora antes del cierre institucional.';
    },

    renderizarTours(tours, fecha, onSelectTour) {
        const { toursGrid, toursEmpty, toursEmptyText, clearDate } = this.elements;
        if (!toursGrid) return;
        toursGrid.replaceChildren();
        clearDate?.classList.toggle('hidden', !fecha);

        const filtrados = fecha
            ? tours.filter(tour => tour.tour_dates?.some(item => item.departure_date === fecha))
            : tours;
        if (!filtrados.length) {
            toursGrid.classList.add('hidden');
            toursEmpty?.classList.remove('hidden');
            if (toursEmptyText) toursEmptyText.textContent = fecha
                ? 'No hay tours disponibles para la fecha seleccionada'
                : 'No hay datos disponibles para mostrar';
            return;
        }

        toursEmpty?.classList.add('hidden');
        toursGrid.classList.remove('hidden');
        const fragment = document.createDocumentFragment();
        filtrados.forEach(tour => {
            const card = document.createElement('article');
            card.className = 'tour-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `Ver información completa de ${tour.name || 'tour oficial'}`);
            card.dataset.id = tour.id;
            card.addEventListener('click', () => onSelectTour(tour.id));
            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectTour(tour.id);
                }
            });

            // 1. Contenedor Multimedia
            const media = document.createElement('div');
            media.className = 'tour-card-media';

            const image = document.createElement('img');
            image.className = 'tour-card-image';
            image.alt = `Fotografía de ${tour.name || 'Tour oficial'}`;
            image.loading = 'lazy';
            image.decoding = 'async';
            image.src = tour.image_url?.trim() || TOUR_IMAGEN_FALLBACK;
            image.onerror = () => { image.src = TOUR_IMAGEN_FALLBACK; };
            media.appendChild(image);

            const conOferta = tour.has_offer === true && Number(tour.discount_percentage) > 0;
            if (conOferta) {
                const badge = document.createElement('span');
                badge.className = 'tour-card-discount-badge';
                badge.textContent = `-${tour.discount_percentage}% Descuento`;
                media.appendChild(badge);
            }
            card.appendChild(media);

            // 2. Cuerpo de la tarjeta
            const body = document.createElement('div');
            body.className = 'tour-card-body';

            const title = document.createElement('h3');
            title.className = 'tour-card-title';
            title.textContent = tour.name || 'Tour turístico';
            body.appendChild(title);

            const description = document.createElement('p');
            description.className = 'tour-card-description';
            description.textContent = tour.short_description || 'Sin descripción disponible para este tour.';
            body.appendChild(description);

            // 3. Metadatos de guía y precios
            const meta = document.createElement('div');
            meta.className = 'tour-card-meta';

            const guide = document.createElement('span');
            guide.className = 'tour-card-guide';
            guide.textContent = `Guía: ${tour.guide_name || 'Guía Oficial MITUR'}`;
            meta.appendChild(guide);

            const pricing = document.createElement('div');
            pricing.className = 'tour-card-pricing';

            if (conOferta) {
                const original = document.createElement('span');
                original.className = 'price-original';
                original.textContent = formatearMonedaUSD(tour.price);
                pricing.appendChild(original);

                const discounted = document.createElement('strong');
                discounted.className = 'price-amount price-discounted';
                const finalPrice = tour.final_price ?? (Number(tour.price) * (1 - Number(tour.discount_percentage) / 100));
                discounted.textContent = formatearMonedaUSD(finalPrice);
                pricing.appendChild(discounted);
            } else {
                const regular = document.createElement('strong');
                regular.className = 'price-amount';
                regular.textContent = formatearMonedaUSD(tour.price ?? 0);
                pricing.appendChild(regular);
            }

            meta.appendChild(pricing);
            body.appendChild(meta);
            card.appendChild(body);

            // 4. Pie de tarjeta con acción y flecha
            const footer = document.createElement('div');
            footer.className = 'tour-card-footer';

            const action = document.createElement('span');
            action.className = 'tour-card-action';
            action.textContent = 'Ver tour completo';
            footer.appendChild(action);

            const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrowSvg.setAttribute('viewBox', '0 0 24 24');
            arrowSvg.setAttribute('fill', 'none');
            arrowSvg.setAttribute('stroke', 'currentColor');
            arrowSvg.setAttribute('stroke-width', '2');
            arrowSvg.setAttribute('width', '16');
            arrowSvg.setAttribute('height', '16');
            arrowSvg.setAttribute('aria-hidden', 'true');
            arrowSvg.classList.add('tour-card-arrow');
            const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            arrowLine.setAttribute('x1', '5');
            arrowLine.setAttribute('y1', '12');
            arrowLine.setAttribute('x2', '19');
            arrowLine.setAttribute('y2', '12');
            const arrowPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            arrowPoly.setAttribute('points', '12 5 19 12 12 19');
            arrowSvg.appendChild(arrowLine);
            arrowSvg.appendChild(arrowPoly);
            footer.appendChild(arrowSvg);

            card.appendChild(footer);

            fragment.appendChild(card);
        });
        toursGrid.appendChild(fragment);
    },

    renderizarSeccionCalificacion({ elegibilidad, onCalificar, onLogin }) {
        const container = this.elements.ratingWidgetContainer;
        if (!container) return;
        container.replaceChildren();

        // CA-05: Restricción para usuarios no autenticados
        if (elegibilidad?.razon === 'AUTH_REQUERIDA' || !elegibilidad?.usuario) {
            const authCard = document.createElement('div');
            authCard.className = 'rating-widget-auth';

            const msg = document.createElement('p');
            msg.className = 'rating-auth-msg';
            msg.textContent = elegibilidad?.mensaje || 'Debes iniciar sesión para calificar este lugar';

            // Estrellas interactivas que invitan a iniciar sesión al interactuar
            const starsContainer = document.createElement('div');
            starsContainer.className = 'rating-stars-interactive rating-stars-guest';
            starsContainer.setAttribute('role', 'group');
            starsContainer.setAttribute('aria-label', 'Inicia sesión para calificar este lugar');

            for (let i = 1; i <= 5; i++) {
                const starBtn = document.createElement('button');
                starBtn.type = 'button';
                starBtn.className = 'star-btn-interactive star-btn-guest';
                starBtn.setAttribute('aria-label', `Calificar con ${i} estrellas (requiere iniciar sesión)`);
                starBtn.title = 'Inicia sesión para calificar este lugar';
                starBtn.addEventListener('click', () => onLogin?.());

                const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                star.setAttribute('viewBox', '0 0 24 24');
                star.classList.add('star-icon', 'empty');
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
                star.appendChild(poly);
                starBtn.appendChild(star);
                starsContainer.appendChild(starBtn);
            }

            const sub = document.createElement('p');
            sub.className = 'rating-auth-sub';
            sub.textContent = 'Inicia sesión para calificar este lugar y compartir tu experiencia tras confirmar tus visitas guiadas.';

            const loginBtn = document.createElement('button');
            loginBtn.type = 'button';
            loginBtn.className = 'btn-rating-action btn-rating-login';
            loginBtn.id = 'btn-rating-login';
            loginBtn.textContent = 'Inicia sesión para calificar este lugar';
            loginBtn.setAttribute('aria-label', 'Inicia sesión para calificar este lugar');
            loginBtn.addEventListener('click', () => onLogin?.());

            authCard.append(msg, starsContainer, sub, loginBtn);
            container.appendChild(authCard);
            return;
        }

        // CA-04: Usuario ya calificó previamente (Inmutabilidad / voto único)
        if (elegibilidad?.yaCalifico || elegibilidad?.razon === 'YA_CALIFICADO') {
            const doneCard = document.createElement('div');
            doneCard.className = 'rating-widget-done';

            const badge = document.createElement('div');
            badge.className = 'rating-done-badge';
            badge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="done-check-icon"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Ya has calificado este lugar</span>`;

            const scoreContainer = document.createElement('div');
            scoreContainer.className = 'rating-stars-fixed';
            const fixedScore = elegibilidad.calificacionPrevia || 5;

            for (let i = 1; i <= 5; i++) {
                const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                star.setAttribute('viewBox', '0 0 24 24');
                star.classList.add('star-icon');
                if (i > fixedScore) star.classList.add('empty');
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
                star.appendChild(poly);
                scoreContainer.appendChild(star);
            }

            const notice = document.createElement('p');
            notice.className = 'rating-immutable-notice';
            notice.textContent = 'Tu calificación es única e inmutable para garantizar la autenticidad de la comunidad.';

            doneCard.append(badge, scoreContainer, notice);
            container.appendChild(doneCard);
            return;
        }

        // CA-04: Usuario no tiene tour confirmado para este lugar
        if (elegibilidad?.razon === 'SIN_TOUR_CONFIRMADO' || !elegibilidad?.puede) {
            const lockedCard = document.createElement('div');
            lockedCard.className = 'rating-widget-locked';

            const warning = document.createElement('div');
            warning.className = 'rating-warning-box';
            warning.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="warning-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><p class="rating-warning-text">${elegibilidad?.mensaje || 'Solo puedes calificar lugares turísticos incluidos en tours que hayas reservado y confirmado'}</p>`;

            const hint = document.createElement('p');
            hint.className = 'rating-locked-hint';
            hint.textContent = 'Reserva uno de los tours oficiales disponibles abajo para este sitio para poder emitir tu calificación una vez confirmada la reserva.';

            lockedCard.append(warning, hint);
            container.appendChild(lockedCard);
            return;
        }

        // CA-04: Usuario elegible para calificar
        const formCard = document.createElement('div');
        formCard.className = 'rating-widget-form';

        const prompt = document.createElement('p');
        prompt.className = 'rating-form-prompt';
        prompt.textContent = 'Selecciona tu calificación de 1 a 5 estrellas:';

        const starSelector = document.createElement('div');
        starSelector.className = 'rating-stars-interactive';
        starSelector.setAttribute('role', 'radiogroup');
        starSelector.setAttribute('aria-label', 'Selecciona una puntuación del 1 al 5');

        let scoreSeleccionado = 0;
        const starButtons = [];

        const etiquetasScore = ['', '1 estrella - Mala', '2 estrellas - Regular', '3 estrellas - Buena', '4 estrellas - Muy buena', '5 estrellas - Excelente'];

        const scoreDesc = document.createElement('span');
        scoreDesc.className = 'rating-score-description';
        scoreDesc.textContent = 'Haz clic en una estrella';

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'btn-rating-action btn-rating-submit';
        submitBtn.id = 'btn-rating-submit';
        submitBtn.textContent = 'Enviar calificación';
        submitBtn.disabled = true;

        const feedbackMsg = document.createElement('div');
        feedbackMsg.className = 'rating-widget-feedback hidden';
        feedbackMsg.id = 'rating-widget-feedback';

        function actualizarEstrellasInteractivas(scoreHover) {
            starButtons.forEach((btn, idx) => {
                const starSvg = btn.querySelector('.star-icon');
                if (starSvg) {
                    starSvg.classList.toggle('empty', (idx + 1) > scoreHover);
                }
            });
        }

        for (let i = 1; i <= 5; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'star-btn-interactive';
            btn.dataset.score = String(i);
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', 'false');
            btn.setAttribute('aria-label', `${i} estrellas`);

            const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            star.setAttribute('viewBox', '0 0 24 24');
            star.classList.add('star-icon', 'empty');
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
            star.appendChild(poly);
            btn.appendChild(star);

            btn.addEventListener('mouseenter', () => {
                actualizarEstrellasInteractivas(i);
                scoreDesc.textContent = etiquetasScore[i];
            });

            btn.addEventListener('mouseleave', () => {
                actualizarEstrellasInteractivas(scoreSeleccionado);
                scoreDesc.textContent = scoreSeleccionado > 0 ? etiquetasScore[scoreSeleccionado] : 'Haz clic en una estrella';
            });

            btn.addEventListener('click', () => {
                scoreSeleccionado = i;
                starButtons.forEach((b, idx) => {
                    b.setAttribute('aria-checked', (idx + 1) === i ? 'true' : 'false');
                });
                actualizarEstrellasInteractivas(scoreSeleccionado);
                scoreDesc.textContent = etiquetasScore[scoreSeleccionado];
                submitBtn.disabled = false;
                feedbackMsg.classList.add('hidden');
            });

            starButtons.push(btn);
            starSelector.appendChild(btn);
        }

        submitBtn.addEventListener('click', async () => {
            if (scoreSeleccionado < 1 || scoreSeleccionado > 5) return;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            try {
                await onCalificar?.(scoreSeleccionado);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar calificación';
            }
        });

        formCard.append(prompt, starSelector, scoreDesc, submitBtn, feedbackMsg);
        container.appendChild(formCard);
    },

    mostrarCalificacionExitosa(score) {
        const container = this.elements.ratingWidgetContainer;
        if (!container) return;
        container.replaceChildren();

        const successCard = document.createElement('div');
        successCard.className = 'rating-widget-done';

        const badge = document.createElement('div');
        badge.className = 'rating-done-badge';
        badge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="done-check-icon"><polyline points="20 6 9 17 4 12"></polyline></svg><span>¡Calificación enviada con éxito!</span>`;

        const starsFixed = document.createElement('div');
        starsFixed.className = 'rating-stars-fixed';
        for (let i = 1; i <= 5; i++) {
            const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            star.setAttribute('viewBox', '0 0 24 24');
            star.classList.add('star-icon');
            if (i > score) star.classList.add('empty');
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
            star.appendChild(poly);
            starsFixed.appendChild(star);
        }

        const notice = document.createElement('p');
        notice.className = 'rating-immutable-notice';
        notice.textContent = 'Ya has calificado este lugar. Tu valoración es inmutable y ayuda a otros turistas.';

        successCard.append(badge, starsFixed, notice);
        container.appendChild(successCard);
    },

    mostrarErrorCalificacion(mensaje) {
        const feedback = document.getElementById('rating-widget-feedback');
        if (feedback) {
            feedback.textContent = mensaje;
            feedback.classList.remove('hidden');
        }
    }
};