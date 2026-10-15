/**
 * Módulo JavaScript para la Vista de Detalle de Tour y Sistema de Reservas
 * Cumple con Casos de Prueba CP-018, CP-019, CP-020, CP-021, CP-022, CP-023, CP-024
 * Ministerio de Turismo de El Salvador (MITUR)
 */

import {
    obtenerTourPorId,
    obtenerToursActivos,
    crearReservaTour,
    actualizarCuposTour,
    formatearMonedaUSD,
    formatearFechaLarga,
    TOURS_DEMO
} from './tours-service.js';

// Failsafe obligatorio: si pasados 6 segundos el spinner sigue visible, forzar estado sin datos
const failsafeTimeout = setTimeout(() => {
    const loading = document.getElementById('state-loading');
    const content = document.getElementById('state-content');
    const error = document.getElementById('state-error');
    if (loading && (!content || content.classList.contains('hidden') || content.style.display === 'none')) {
        loading.classList.add('hidden');
        loading.style.display = 'none';
        if (error) {
            error.classList.remove('hidden');
            error.style.display = 'flex';
            const title = error.querySelector('.error-title');
            if (title) title.textContent = 'No hay datos disponibles para mostrar';
        }
    }
}, 6000);

window.addEventListener('error', (err) => {
    console.warn('Capturado error en ejecución de tour-detalle.js:', err);
    const loading = document.getElementById('state-loading');
    const content = document.getElementById('state-content');
    const error = document.getElementById('state-error');
    if (loading && (!content || content.classList.contains('hidden') || content.style.display === 'none')) {
        loading.classList.add('hidden');
        loading.style.display = 'none';
        if (error) {
            error.classList.remove('hidden');
            error.style.display = 'flex';
            const title = error.querySelector('.error-title');
            if (title) title.textContent = 'No hay datos disponibles para mostrar';
        }
    }
});

// Estado local de la vista
let currentTour = null;
let elements = {};

/**
 * Inicializa y valida las referencias a los elementos del DOM
 */
function initElements() {
    elements = {
        btnReturn: document.getElementById('btn-return'),
        stateLoading: document.getElementById('state-loading'),
        stateError: document.getElementById('state-error'),
        stateContent: document.getElementById('state-content'),

        // Badges y cabecera
        departmentBadge: document.getElementById('tour-department-badge'),
        discountBadge: document.getElementById('tour-discount-badge'),
        spotsBadge: document.getElementById('tour-spots-badge'),
        title: document.getElementById('tour-title'),
        guideName: document.getElementById('tour-guide-name'),

        // Galería
        heroImage: document.getElementById('tour-hero-image'),
        thumbnailsStrip: document.getElementById('tour-thumbnails-strip'),

        // Paneles de detalle
        fullDescription: document.getElementById('tour-full-description'),
        placesList: document.getElementById('tour-places-list'),
        departureTime: document.getElementById('tour-departure-time'),
        datesChips: document.getElementById('tour-dates-chips'),

        // Sidebar de reserva y precios
        pricingRow: document.getElementById('pricing-row'),
        availableSpots: document.getElementById('tour-available-spots'),
        btnOpenReserve: document.getElementById('btn-open-reserve'),

        // Formulario de reserva
        reservationCard: document.getElementById('reservation-card'),
        reservationForm: document.getElementById('reservation-form'),
        inputName: document.getElementById('tourist_name'),
        inputEmail: document.getElementById('tourist_email'),
        inputPhone: document.getElementById('tourist_phone'),
        selectDate: document.getElementById('tour_date'),
        inputSpots: document.getElementById('spots_reserved'),
        btnConfirmReserve: document.getElementById('btn-confirm-reserve'),

        // Spans de error individuales (CP-022 y CP-023)
        errorName: document.getElementById('error-name'),
        errorEmail: document.getElementById('error-email'),
        errorPhone: document.getElementById('error-phone'),
        errorDate: document.getElementById('error-date'),
        errorSpots: document.getElementById('error-spots'),

        // Tarjeta de éxito y resumen (CP-021)
        reservationSuccessCard: document.getElementById('reservation-success-card'),
        summaryTourName: document.getElementById('summary-tour-name'),
        summaryTourDate: document.getElementById('summary-tour-date'),
        summarySpots: document.getElementById('summary-spots'),
        summaryTouristName: document.getElementById('summary-tourist-name')
    };
}

/**
 * Inicialización al cargar el documento
 */
function iniciarVista() {
    initElements();
    configurarBotonVolver();
    cargarDetalleTour();
    configurarFormularioReserva();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarVista);
} else {
    iniciarVista();
}

/**
 * Configura la acción del enlace Volver
 */
function configurarBotonVolver() {
    const btn = elements.btnReturn || document.getElementById('btn-return');
    if (btn) {
        btn.addEventListener('click', (e) => {
            if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
                e.preventDefault();
                window.history.back();
            }
        });
    }
}

/**
 * Extrae el ID del tour de la URL y carga sus datos completos de forma resiliente
 */
async function cargarDetalleTour() {
    const urlParams = new URLSearchParams(window.location.search);
    const tourId = urlParams.get('id');

    // Límite de tiempo de seguridad de 6 segundos
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de seguridad (6s) al consultar tour')), 6000);
    });

    try {
        mostrarCargando();

        // Si no se proporcionó id en la URL, utilizar el primer tour disponible por defecto
        const cleanId = (tourId && tourId.trim()) ? tourId.trim() : 'a1000000-0000-0000-0000-000000000001';

        // 1. Consultar tour por ID compitiendo con timeout de 6s
        let tour = await Promise.race([
            obtenerTourPorId(cleanId),
            timeoutPromise
        ]);

        // 2. Si no se encontró en Supabase, resolver con los datos locales de respaldo
        if (!tour && Array.isArray(TOURS_DEMO)) {
            tour = TOURS_DEMO.find(t => t.id === cleanId) || null;
        }

        if (!tour) {
            mostrarError('No hay datos disponibles para mostrar', 'El tour solicitado no existe o no se encuentra disponible actualmente.');
            return;
        }

        currentTour = tour;
        renderizarTour(tour);
        mostrarContenido();
        clearTimeout(failsafeTimeout);
    } catch (err) {
        console.error('Error o timeout al cargar detalle del tour:', err);
        // Respaldo en datos locales ante error de red o timeout
        if (tourId && Array.isArray(TOURS_DEMO)) {
            const demoTour = TOURS_DEMO.find(t => t.id === tourId.trim());
            if (demoTour) {
                currentTour = demoTour;
                renderizarTour(demoTour);
                mostrarContenido();
                clearTimeout(failsafeTimeout);
                return;
            }
        }
        mostrarError('No hay datos disponibles para mostrar', 'Ocurrió un problema de comunicación con el servidor o se agotó el tiempo de espera.');
    } finally {
        // Regla: Siempre, sin excepción, oculta el spinner/indicador de carga al terminar
        if (elements.stateLoading) {
            elements.stateLoading.classList.add('hidden');
            elements.stateLoading.style.display = 'none';
        }
    }
}

/**
 * Renderiza todos los bloques de la página con los datos del tour
 * @param {Object} tour 
 */
function renderizarTour(tour) {
    // 1. Título y meta información en la cabecera
    if (elements.title) elements.title.textContent = tour.name || 'Tour Oficial MITUR';
    document.title = `${tour.name || 'Detalle del Tour'} | Ministerio de Turismo SV`;

    if (elements.departmentBadge) {
        elements.departmentBadge.textContent = tour.department || 'El Salvador';
    }

    if (elements.guideName) {
        elements.guideName.textContent = tour.guide_name || 'Guía Certificado MITUR';
    }

    // 2. Indicadores de cupos
    actualizarIndicadoresCupos(tour.available_spots);

    // 3. Renderizado de Precios y Oferta (CP-019)
    renderizarPrecios(tour);

    // 4. Galería de imágenes (CP-018)
    renderizarGaleria(tour);

    // 5. Descripción completa (CP-018)
    if (elements.fullDescription) {
        elements.fullDescription.textContent = tour.full_description || tour.short_description || 'Sin descripción detallada disponible.';
    }

    // 6. Lugares turísticos que incluye (CP-018 - ordenados por visit_order)
    renderizarLugaresIncluidos(tour);

    // 7. Fechas y horas de salida (CP-018)
    renderizarHorariosYFechas(tour);
}

/**
 * Actualiza los contadores de cupos disponibles en la interfaz
 * @param {number} cupos 
 */
function actualizarIndicadoresCupos(cupos) {
    const cantidad = Number(cupos) || 0;

    if (elements.availableSpots) {
        elements.availableSpots.textContent = cantidad;
    }

    if (elements.spotsBadge) {
        if (cantidad <= 0) {
            elements.spotsBadge.textContent = 'Agotado';
            elements.spotsBadge.classList.add('sold-out');
        } else if (cantidad <= 3) {
            elements.spotsBadge.textContent = `¡Últimos ${cantidad} cupos!`;
            elements.spotsBadge.classList.remove('sold-out');
        } else {
            elements.spotsBadge.textContent = `${cantidad} cupos disponibles`;
            elements.spotsBadge.classList.remove('sold-out');
        }
    }

    // Si no hay cupos, inhabilitar botón de reservar
    if (elements.btnOpenReserve) {
        if (cantidad <= 0) {
            elements.btnOpenReserve.disabled = true;
            elements.btnOpenReserve.textContent = 'Cupos agotados';
            elements.btnOpenReserve.style.opacity = '0.6';
            elements.btnOpenReserve.style.cursor = 'not-allowed';
        } else {
            elements.btnOpenReserve.disabled = false;
            elements.btnOpenReserve.textContent = 'Reservar cupo';
            elements.btnOpenReserve.style.opacity = '1';
            elements.btnOpenReserve.style.cursor = 'pointer';
        }
    }

    // Actualizar max en el input de cupos si existe
    if (elements.inputSpots) {
        elements.inputSpots.max = cantidad;
        if (cantidad > 0 && Number(elements.inputSpots.value) > cantidad) {
            elements.inputSpots.value = cantidad;
        }
    }
}

/**
 * Renderiza la sección de precios cumpliendo estrictamente con CP-019:
 * - Si has_offer === false: muestra ÚNICAMENTE el precio normal sin porcentaje ni precio de oferta.
 * - Si has_offer === true: muestra precio original, porcentaje de descuento y precio final.
 * @param {Object} tour 
 */
function renderizarPrecios(tour) {
    const hasOffer = Boolean(tour.has_offer) && Number(tour.discount_percentage) > 0;
    const precioBase = Number(tour.price) || 0;
    const descuentoPct = Number(tour.discount_percentage) || 0;
    const precioFinal = Number(tour.final_price) || (precioBase - (precioBase * descuentoPct / 100));

    // Etiqueta flotante de descuento en el encabezado
    if (elements.discountBadge) {
        if (hasOffer) {
            elements.discountBadge.textContent = `-${descuentoPct}% Descuento`;
            elements.discountBadge.classList.remove('hidden');
        } else {
            elements.discountBadge.classList.add('hidden');
        }
    }

    // Renderizado en la tarjeta lateral de precios
    if (elements.pricingRow) {
        if (hasOffer) {
            // Con oferta: precio original tachado, badge de porcentaje y precio final destacado
            elements.pricingRow.innerHTML = `
                <div class="pricing-offer-group">
                    <span class="price-original" title="Precio regular">${formatearMonedaUSD(precioBase)}</span>
                    <span class="price-discount-tag">-${descuentoPct}% OFF</span>
                </div>
                <div class="price-final-group">
                    <span class="price-final">${formatearMonedaUSD(precioFinal)}</span>
                    <span class="price-currency-note">USD / persona</span>
                </div>
            `;
        } else {
            // Sin oferta (CP-019): ÚNICAMENTE precio regular, sin porcentajes ni descuentos
            elements.pricingRow.innerHTML = `
                <div class="price-final-group">
                    <span class="price-final">${formatearMonedaUSD(precioBase)}</span>
                    <span class="price-currency-note">USD / persona</span>
                </div>
            `;
        }
    }
}

/**
 * Renderiza la galería fotográfica del tour con visor interactivo
 * @param {Object} tour 
 */
function renderizarGaleria(tour) {
    const defaultPlaceholder = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=1200&q=80';
    const mainImgUrl = tour.image_url || defaultPlaceholder;

    // Foto principal
    if (elements.heroImage) {
        elements.heroImage.src = mainImgUrl;
        elements.heroImage.alt = `Fotografía de ${tour.name}`;
        elements.heroImage.onerror = () => {
            elements.heroImage.src = defaultPlaceholder;
        };
    }

    // Construir lista única de imágenes
    const todasLasImagenes = [mainImgUrl];
    if (Array.isArray(tour.tour_images)) {
        tour.tour_images.forEach(imgObj => {
            const url = typeof imgObj === 'string' ? imgObj : imgObj.image_url;
            if (url && !todasLasImagenes.includes(url)) {
                todasLasImagenes.push(url);
            }
        });
    }

    // Renderizar miniaturas (solo si el tour tiene más de una imagen)
    if (elements.thumbnailsStrip) {
        elements.thumbnailsStrip.innerHTML = '';

        if (todasLasImagenes.length <= 1) {
            elements.thumbnailsStrip.style.display = 'none';
            return;
        }

        elements.thumbnailsStrip.style.display = 'grid';

        todasLasImagenes.forEach((url, idx) => {
            const thumbBtn = document.createElement('button');
            thumbBtn.type = 'button';
            thumbBtn.className = `thumbnail-btn ${idx === 0 ? 'active' : ''}`;
            thumbBtn.setAttribute('aria-label', `Ver fotografía ${idx + 1} de ${tour.name}`);

            const thumbImg = document.createElement('img');
            thumbImg.src = url;
            thumbImg.alt = `Miniatura ${idx + 1}`;
            thumbImg.loading = 'lazy';
            thumbImg.onerror = () => {
                thumbImg.src = defaultPlaceholder;
            };

            thumbBtn.appendChild(thumbImg);

            thumbBtn.addEventListener('click', () => {
                // Cambiar imagen principal con transición
                if (elements.heroImage) {
                    elements.heroImage.style.opacity = '0.5';
                    elements.heroImage.src = url;
                    setTimeout(() => {
                        elements.heroImage.style.opacity = '1';
                    }, 150);
                }
                // Actualizar estado activo en miniaturas
                elements.thumbnailsStrip.querySelectorAll('.thumbnail-btn').forEach(btn => btn.classList.remove('active'));
                thumbBtn.classList.add('active');
            });

            elements.thumbnailsStrip.appendChild(thumbBtn);
        });
    }
}

/**
 * Renderiza la lista de lugares turísticos incluidos ordenados por visit_order (CP-018)
 * @param {Object} tour 
 */
function renderizarLugaresIncluidos(tour) {
    if (!elements.placesList) return;

    elements.placesList.innerHTML = '';

    const tourPlaces = Array.isArray(tour.tour_places) ? [...tour.tour_places] : [];

    // Ordenar explícitamente por visit_order ascendente
    tourPlaces.sort((a, b) => (Number(a.visit_order) || 0) - (Number(b.visit_order) || 0));

    if (tourPlaces.length === 0) {
        elements.placesList.innerHTML = `
            <li class="places-empty-notice">
                Información del itinerario en proceso de actualización por el Ministerio de Turismo.
            </li>
        `;
        return;
    }

    tourPlaces.forEach((item, index) => {
        const place = item.places || {};
        const nombre = place.name || `Parada ${index + 1}`;
        const depto = place.department || tour.department || 'El Salvador';
        const desc = place.short_description || 'Visita guiada oficial y tiempo libre para exploración.';
        const img = place.image_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80';
        const orden = item.visit_order || (index + 1);

        const li = document.createElement('li');
        li.className = 'place-item-card';
        li.innerHTML = `
            <div class="place-step-badge" aria-label="Parada número ${orden}">
                <span class="step-num">${orden}</span>
            </div>
            <div class="place-thumb-wrap">
                <img src="${img}" 
                     alt="${nombre}" 
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80'">
            </div>
            <div class="place-info-wrap">
                <div class="place-title-bar">
                    <h3 class="place-name">${nombre}</h3>
                    <span class="place-depto-tag">${depto}</span>
                </div>
                <p class="place-desc">${desc}</p>
            </div>
        `;
        elements.placesList.appendChild(li);
    });
}

/**
 * Renderiza las fechas de salida y la hora (CP-018)
 * @param {Object} tour 
 */
function renderizarHorariosYFechas(tour) {
    // 1. Hora de salida
    if (elements.departureTime) {
        elements.departureTime.textContent = formatearHora(tour.departure_time);
    }

    // 2. Chips de fechas y selector del formulario
    const dates = Array.isArray(tour.tour_dates) ? tour.tour_dates : [];

    // Limpiar contenedor de chips y select
    if (elements.datesChips) elements.datesChips.innerHTML = '';
    if (elements.selectDate) {
        elements.selectDate.innerHTML = '<option value="">Selecciona una fecha de salida</option>';
    }

    if (dates.length === 0) {
        if (elements.datesChips) {
            elements.datesChips.innerHTML = '<span class="no-dates-notice">Próximas fechas por confirmar</span>';
        }
        return;
    }

    // Ordenar fechas cronológicamente
    const fechasOrdenadas = [...dates].sort((a, b) => {
        const da = a.departure_date || a;
        const db = b.departure_date || b;
        return new Date(da) - new Date(db);
    });

    fechasOrdenadas.forEach(dateObj => {
        const rawDate = typeof dateObj === 'string' ? dateObj : dateObj.departure_date;
        if (!rawDate) return;

        const fechaFormateada = formatearFechaLarga(rawDate);

        // Chip en la sección de información
        if (elements.datesChips) {
            const chip = document.createElement('div');
            chip.className = 'date-chip';
            chip.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                </svg>
                <span>${fechaFormateada}</span>
            `;
            elements.datesChips.appendChild(chip);
        }

        // Opción en el select del formulario de reserva
        if (elements.selectDate) {
            const option = document.createElement('option');
            option.value = rawDate;
            option.textContent = `${fechaFormateada} (${rawDate})`;
            elements.selectDate.appendChild(option);
        }
    });
}

/**
 * Formatea una hora en string HH:MM:SS a formato amigable 12h
 * @param {string} timeStr 
 * @returns {string}
 */
function formatearHora(timeStr) {
    if (!timeStr) return '07:00 AM';
    const partes = timeStr.split(':');
    if (partes.length < 2) return timeStr;

    let horas = parseInt(partes[0], 10);
    const minutos = partes[1];
    const ampm = horas >= 12 ? 'PM' : 'AM';

    horas = horas % 12;
    if (horas === 0) horas = 12;

    return `${horas}:${minutos} ${ampm}`;
}

/**
 * Configuración de interacción del formulario de reserva y validaciones estrictas
 * Casos de Prueba: CP-020, CP-021, CP-022, CP-023, CP-024
 */
function configurarFormularioReserva() {
    // 1. Apertura del formulario al hacer clic en "Reservar cupo" (CP-020)
    if (elements.btnOpenReserve) {
        elements.btnOpenReserve.addEventListener('click', () => {
            if (!currentTour || currentTour.available_spots <= 0) return;

            // Mostrar el formulario
            if (elements.reservationCard) {
                elements.reservationCard.classList.remove('hidden');
                elements.reservationCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            // Ocultar tarjeta de confirmación previa si estaba abierta
            if (elements.reservationSuccessCard) {
                elements.reservationSuccessCard.classList.add('hidden');
            }

            // Foco en el primer campo
            setTimeout(() => {
                if (elements.inputName) elements.inputName.focus();
            }, 300);
        });
    }

    // 2. Limpieza de errores en tiempo real al escribir o cambiar
    configurarLimpiezaErroresEnTiempoReal();

    // 3. Envío del formulario y validación campo por campo (CP-022, CP-023)
    if (elements.reservationForm) {
        elements.reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await procesarEnvioReserva();
        });
    }
}

/**
 * Limpia los errores visuales cuando el usuario interactúa con los campos
 */
function configurarLimpiezaErroresEnTiempoReal() {
    const campos = [
        { input: elements.inputName, error: elements.errorName },
        { input: elements.inputEmail, error: elements.errorEmail },
        { input: elements.inputPhone, error: elements.errorPhone },
        { input: elements.selectDate, error: elements.errorDate },
        { input: elements.inputSpots, error: elements.errorSpots }
    ];

    campos.forEach(({ input, error }) => {
        if (!input || !error) return;
        const evento = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(evento, () => {
            limpiarErrorCampo(input, error);
        });
    });
}

/**
 * Valida los 5 campos obligatorios y envía a Supabase si todo es correcto
 * Cumple con CP-021, CP-022, CP-023
 */
async function procesarEnvioReserva() {
    if (!currentTour) return;

    // Limpiar todos los errores previos
    limpiarTodosLosErrores();

    let esValido = true;
    let primerElementoInvalido = null;

    // 1. Nombre completo (obligatorio)
    const nombre = (elements.inputName ? elements.inputName.value : '').trim();
    if (!nombre) {
        marcarErrorCampo(elements.inputName, elements.errorName, 'Este campo es obligatorio');
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.inputName;
    }

    // 2. Correo electrónico (obligatorio + formato regex) - CP-023
    const email = (elements.inputEmail ? elements.inputEmail.value : '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        marcarErrorCampo(elements.inputEmail, elements.errorEmail, 'Este campo es obligatorio');
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.inputEmail;
    } else if (!emailRegex.test(email)) {
        marcarErrorCampo(elements.inputEmail, elements.errorEmail, 'Ingresa un correo electrónico con formato válido');
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.inputEmail;
    }

    // 3. Teléfono de contacto (obligatorio + solo números /^\d+$/) - CP-023
    const telefono = (elements.inputPhone ? elements.inputPhone.value : '').trim();
    const phoneRegex = /^\d+$/;
    if (!telefono) {
        marcarErrorCampo(elements.inputPhone, elements.errorPhone, 'Este campo es obligatorio');
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.inputPhone;
    } else if (!phoneRegex.test(telefono)) {
        marcarErrorCampo(elements.inputPhone, elements.errorPhone, 'El teléfono debe contener solo números');
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.inputPhone;
    }

    // 4. Fecha del tour (obligatorio)
    const fecha = (elements.selectDate ? elements.selectDate.value : '').trim();
    if (!fecha) {
        marcarErrorCampo(elements.selectDate, elements.errorDate, 'Este campo es obligatorio');
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.selectDate;
    }

    // 5. Cantidad de cupos (obligatorio, >= 1 y <= cupos disponibles) - CP-023
    const cuposStr = (elements.inputSpots ? elements.inputSpots.value : '').trim();
    const cuposDisponibles = Number(currentTour.available_spots) || 0;
    const cupos = parseInt(cuposStr, 10);

    if (!cuposStr) {
        marcarErrorCampo(elements.inputSpots, elements.errorSpots, 'Este campo es obligatorio');
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.inputSpots;
    } else if (isNaN(cupos) || cupos < 1) {
        marcarErrorCampo(elements.inputSpots, elements.errorSpots, 'Ingresa al menos 1 cupo');
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.inputSpots;
    } else if (cupos > cuposDisponibles) {
        marcarErrorCampo(elements.inputSpots, elements.errorSpots, `La cantidad de cupos no puede superar los cupos disponibles (${cuposDisponibles})`);
        esValido = false;
        if (!primerElementoInvalido) primerElementoInvalido = elements.inputSpots;
    }

    // Si falló alguna validación: detener envío, no mostrar éxito, mantener foco
    if (!esValido) {
        if (primerElementoInvalido) {
            primerElementoInvalido.focus();
        }
        return;
    }

    // Si todas las validaciones pasaron: Enviar a Supabase (CP-021)
    await ejecutarGuardadoReserva({
        tour_id: currentTour.id,
        tourist_name: nombre,
        tourist_email: email,
        tourist_phone: telefono,
        tour_date: fecha,
        spots_reserved: cupos
    });
}

/**
 * Inserta la reserva en Supabase y actualiza los cupos disponibles
 * @param {Object} reservaData 
 */
async function ejecutarGuardadoReserva(reservaData) {
    if (!elements.btnConfirmReserve) return;

    const textoOriginal = elements.btnConfirmReserve.textContent;
    elements.btnConfirmReserve.disabled = true;
    elements.btnConfirmReserve.textContent = 'Confirmando reserva...';

    try {
        // 1. Insertar registro en Supabase tour_reservations
        await crearReservaTour(reservaData);

        // 2. Actualizar cupos en base de datos y memoria local
        const nuevosCupos = Math.max(0, currentTour.available_spots - reservaData.spots_reserved);
        await actualizarCuposTour(currentTour.id, nuevosCupos);
        currentTour.available_spots = nuevosCupos;

        // 3. Actualizar la interfaz de cupos
        actualizarIndicadoresCupos(nuevosCupos);

        // 4. Mostrar confirmación de éxito con el mensaje exacto requerido (CP-021):
        // "Tu reserva se realizó con éxito" y el resumen obligatorio
        mostrarConfirmacionExito(reservaData);

        // 5. Limpiar el formulario
        if (elements.reservationForm) elements.reservationForm.reset();
        if (elements.reservationCard) elements.reservationCard.classList.add('hidden');

    } catch (err) {
        console.error('Error al guardar la reserva:', err);
        // Mostrar error en el botón o campo
        alert('Ocurrió un error al procesar tu reserva con el servidor. Por favor intenta nuevamente.');
    } finally {
        if (elements.btnConfirmReserve) {
            elements.btnConfirmReserve.disabled = false;
            elements.btnConfirmReserve.textContent = textoOriginal;
        }
    }
}

/**
 * Muestra la tarjeta de éxito con el resumen exacto (CP-021)
 * @param {Object} reservaData 
 */
function mostrarConfirmacionExito(reservaData) {
    if (!elements.reservationSuccessCard) return;

    if (elements.summaryTourName) {
        elements.summaryTourName.textContent = currentTour.name || 'Tour Oficial MITUR';
    }

    if (elements.summaryTourDate) {
        elements.summaryTourDate.textContent = formatearFechaLarga(reservaData.tour_date);
    }

    if (elements.summarySpots) {
        elements.summarySpots.textContent = `${reservaData.spots_reserved} cupo(s)`;
    }

    if (elements.summaryTouristName) {
        elements.summaryTouristName.textContent = reservaData.tourist_name;
    }

    elements.reservationSuccessCard.classList.remove('hidden');
    elements.reservationSuccessCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Marca visualmente un campo con error y muestra el mensaje
 */
function marcarErrorCampo(input, errorElement, mensaje) {
    if (input) input.classList.add('is-invalid');
    if (errorElement) {
        errorElement.textContent = mensaje;
        errorElement.style.display = 'block';
    }
}

/**
 * Limpia el error de un campo individual
 */
function limpiarErrorCampo(input, errorElement) {
    if (input) input.classList.remove('is-invalid');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

/**
 * Limpia todos los errores del formulario
 */
function limpiarTodosLosErrores() {
    [elements.inputName, elements.inputEmail, elements.inputPhone, elements.selectDate, elements.inputSpots].forEach(input => {
        if (input) input.classList.remove('is-invalid');
    });

    [elements.errorName, elements.errorEmail, elements.errorPhone, elements.errorDate, elements.errorSpots].forEach(span => {
        if (span) {
            span.textContent = '';
            span.style.display = 'none';
        }
    });
}

/**
 * Muestra el estado de carga
 */
function mostrarCargando() {
    if (elements.stateLoading) elements.stateLoading.classList.remove('hidden');
    if (elements.stateError) elements.stateError.classList.add('hidden');
    if (elements.stateContent) elements.stateContent.classList.add('hidden');
}

/**
 * Muestra el estado de error / sin datos (texto exacto requerido: "No hay datos disponibles para mostrar")
 * @param {string} [titulo]
 * @param {string} [mensaje]
 */
function mostrarError(titulo = 'No hay datos disponibles para mostrar', mensaje = 'El tour solicitado no existe o no se encuentra disponible actualmente.') {
    clearTimeout(failsafeTimeout);
    if (elements.stateLoading) {
        elements.stateLoading.classList.add('hidden');
        elements.stateLoading.style.display = 'none';
    }
    if (elements.stateContent) {
        elements.stateContent.classList.add('hidden');
        elements.stateContent.style.display = 'none';
    }
    if (elements.stateError) {
        elements.stateError.classList.remove('hidden');
        elements.stateError.style.display = 'flex';
        const titleEl = elements.stateError.querySelector('.error-title');
        const msgEl = elements.stateError.querySelector('.error-message');
        if (titleEl) titleEl.textContent = titulo;
        if (msgEl && mensaje) msgEl.textContent = mensaje;
    }
}

/**
 * Muestra el contenido del tour cargado
 */
function mostrarContenido() {
    clearTimeout(failsafeTimeout);
    if (elements.stateLoading) {
        elements.stateLoading.classList.add('hidden');
        elements.stateLoading.style.display = 'none';
    }
    if (elements.stateError) {
        elements.stateError.classList.add('hidden');
        elements.stateError.style.display = 'none';
    }
    if (elements.stateContent) {
        elements.stateContent.classList.remove('hidden');
        elements.stateContent.style.display = 'block';
    }
}
