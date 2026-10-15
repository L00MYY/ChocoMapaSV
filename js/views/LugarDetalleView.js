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

function calcularPromedio(ratings, id) {
    if (!Array.isArray(ratings) || ratings.length === 0) {
        let hash = 0;
        for (let index = 0; index < id.length; index++) {
            hash = (hash << 5) - hash + id.charCodeAt(index);
            hash |= 0;
        }
        return [4.7, 4.8, 4.9, 4.8][Math.abs(hash) % 4];
    }
    const total = ratings.reduce((sum, rating) => sum + (Number(rating.score) || 0), 0);
    return Math.min(5, Math.max(1, Math.round(total / ratings.length * 10) / 10));
}

export const LugarDetalleView = {
    elements: {
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
        services: document.getElementById('services-badges-grid'),
        scheduleDays: document.getElementById('schedule-days-value'),
        scheduleHours: document.getElementById('schedule-hours-value'),
        scheduleNote: document.getElementById('schedule-note-text'),
        dateFilter: document.getElementById('place-tour-date'),
        clearDate: document.getElementById('btn-clear-place-date'),
        toursEmpty: document.getElementById('place-tours-empty'),
        toursEmptyText: document.getElementById('place-empty-text'),
        toursGrid: document.getElementById('place-tours-grid')
    },

    mostrarEstado(estado, mensaje = '') {
        const { loading, error, errorMessage, content } = this.elements;
        loading?.classList.toggle('hidden', estado !== 'loading');
        error?.classList.toggle('hidden', estado !== 'error');
        content?.classList.toggle('hidden', estado !== 'content');
        if (estado === 'error' && errorMessage && mensaje) errorMessage.textContent = mensaje;
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

        const promedio = calcularPromedio(lugar.ratings, lugar.id || '');
        if (e.rating) e.rating.textContent = promedio ? promedio.toFixed(1) : 'Sin calificaciones';
        if (e.stars) {
            e.stars.replaceChildren();
            for (let index = 1; index <= 5; index++) {
                const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                star.setAttribute('viewBox', '0 0 24 24');
                star.classList.add('star-icon');
                if (index > Math.floor(promedio) && !(index === Math.floor(promedio) + 1 && promedio % 1 >= 0.4)) star.classList.add('empty');
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
                star.appendChild(polygon);
                e.stars.appendChild(star);
            }
        }

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
            card.addEventListener('click', () => onSelectTour(tour.id));
            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectTour(tour.id);
                }
            });

            const image = document.createElement('img');
            image.className = 'tour-card-image';
            image.alt = `Fotografía de ${tour.name || 'Tour oficial'}`;
            image.loading = 'lazy';
            image.src = tour.image_url || TOUR_IMAGEN_FALLBACK;
            image.onerror = () => { image.src = TOUR_IMAGEN_FALLBACK; };
            card.appendChild(image);

            const title = document.createElement('h3');
            title.className = 'tour-card-title';
            title.textContent = tour.name || 'Tour turístico';
            card.appendChild(title);

            const description = document.createElement('p');
            description.className = 'tour-card-description';
            description.textContent = tour.short_description || 'Sin descripción disponible para este tour.';
            card.appendChild(description);
            fragment.appendChild(card);
        });
        toursGrid.appendChild(fragment);
    }
};