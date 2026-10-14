// js/lugares-turisticos.js
import { obtenerLugaresTuristicos } from './supabase-config.js';

/**
 * Constantes y Configuraciones
 */
// Imagen de respaldo en caso de que el registro no cuente con imagen o falle la carga
const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80';

/**
 * Referencias al DOM
 */
const stateLoading = document.getElementById('state-loading');
const stateError = document.getElementById('state-error');
const stateErrorMessage = document.getElementById('state-error-message');
const stateEmpty = document.getElementById('state-empty');
const placesGrid = document.getElementById('places-grid');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const categoryPillsContainer = document.getElementById('category-pills');
const resultsCounter = document.getElementById('results-counter');
const btnRetry = document.getElementById('btn-retry');
const btnResetFilters = document.getElementById('btn-reset-filters');

/**
 * Estado en memoria de la vista
 */
let todosLosLugares = [];
let categoriaActiva = 'todos';
let terminoBusqueda = '';

/**
 * Redirige al usuario hacia la página de detalle del sitio turístico (CP-010)
 * @param {string} id - Identificador UUID del lugar turístico
 */
function redirigirADetalle(id) {
    if (!id || typeof id !== 'string') return;
    window.location.href = `detalle-lugar.html?id=${encodeURIComponent(id)}`;
}

/**
 * Crea de forma segura el elemento DOM de una tarjeta turística (CP-009 y CP-010)
 * Manipulación limpia mediante document.createElement y textContent para mitigar XSS.
 * @param {Object} lugar - Registro de lugar turístico retornado por Supabase
 * @returns {HTMLElement} Elemento article configurado como tarjeta interactiva
 */
function crearTarjetaLugar(lugar) {
    const card = document.createElement('article');
    card.className = 'place-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Ver información completa de ${lugar.name || 'sitio turístico'}`);
    card.dataset.id = lugar.id;

    // CP-010: Redirección al hacer clic en cualquier área de la tarjeta
    card.addEventListener('click', () => {
        redirigirADetalle(lugar.id);
    });

    // Accesibilidad con teclado: Enter o Barra Espaciadora activan la navegación
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            redirigirADetalle(lugar.id);
        }
    });

    // 1. Contenedor de la Imagen Principal (CP-009)
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'place-card-media';

    const img = document.createElement('img');
    img.className = 'place-card-image';
    img.alt = lugar.name ? `Fotografía de ${lugar.name}` : 'Fotografía del sitio turístico';
    img.loading = 'lazy';
    img.decoding = 'async';

    // Carga limpia con verificación y fallback
    const urlOriginal = (lugar.image_url && typeof lugar.image_url === 'string' && lugar.image_url.trim().length > 0)
        ? lugar.image_url.trim()
        : IMAGEN_FALLBACK;

    img.src = urlOriginal;

    img.addEventListener('error', () => {
        if (img.src !== IMAGEN_FALLBACK) {
            img.src = IMAGEN_FALLBACK;
        }
    });

    mediaContainer.appendChild(img);

    // Insignia de categoría flotante sobre la imagen
    if (lugar.category && typeof lugar.category === 'string') {
        const badge = document.createElement('span');
        badge.className = 'place-card-badge';
        badge.textContent = lugar.category;

        if (lugar.color && typeof lugar.color === 'string') {
            badge.style.backgroundColor = lugar.color;
        }

        mediaContainer.appendChild(badge);
    }

    // 2. Contenedor de Textos (CP-009: Nombre y Breve Descripción)
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'place-card-body';

    const title = document.createElement('h3');
    title.className = 'place-card-title';
    title.textContent = lugar.name || 'Sitio turístico sin nombre registrado';

    const description = document.createElement('p');
    description.className = 'place-card-description';
    description.textContent = lugar.description || 'No hay descripción disponible actualmente para este sitio.';

    bodyContainer.appendChild(title);
    bodyContainer.appendChild(description);

    // 3. Pie de Tarjeta con feedback visual de acción
    const footerContainer = document.createElement('div');
    footerContainer.className = 'place-card-footer';

    const actionText = document.createElement('span');
    actionText.className = 'place-card-action';
    actionText.textContent = 'Ver detalles';

    // Flecha SVG indicativa de enlace
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('class', 'place-card-arrow');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '2');
    iconSvg.setAttribute('stroke-linecap', 'round');
    iconSvg.setAttribute('stroke-linejoin', 'round');
    iconSvg.setAttribute('aria-hidden', 'true');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '5');
    line.setAttribute('y1', '12');
    line.setAttribute('x2', '19');
    line.setAttribute('y2', '12');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '12 5 19 12 12 19');

    iconSvg.appendChild(line);
    iconSvg.appendChild(polyline);

    footerContainer.appendChild(actionText);
    footerContainer.appendChild(iconSvg);

    // Ensamblaje seguro de la tarjeta
    card.appendChild(mediaContainer);
    card.appendChild(bodyContainer);
    card.appendChild(footerContainer);

    return card;
}

/**
 * Elimina duplicados de la lista de sitios turísticos asegurando que no se omita ninguno válido (CP-009)
 * @param {Array} lista - Arreglo recibido desde Supabase
 * @returns {Array} Arreglo limpio de sitios únicos
 */
function desduplicarLugares(lista) {
    if (!Array.isArray(lista)) return [];

    const idsRegistrados = new Set();
    const resultado = [];

    for (const item of lista) {
        if (!item || typeof item !== 'object') continue;

        const id = item.id;
        if (id && !idsRegistrados.has(id)) {
            idsRegistrados.add(id);
            resultado.push(item);
        }
    }

    return resultado;
}

/**
 * Actualiza el texto del contador de resultados
 * @param {number} cantidadVisibles - Cantidad de sitios mostrados tras filtrar
 * @param {number} totalDisponibles - Total de sitios en la base de datos
 */
function actualizarContador(cantidadVisibles, totalDisponibles) {
    if (!resultsCounter) return;

    if (totalDisponibles === 0) {
        resultsCounter.textContent = 'No hay sitios turísticos disponibles';
        return;
    }

    if (cantidadVisibles === totalDisponibles) {
        resultsCounter.textContent = `Mostrando ${totalDisponibles} de ${totalDisponibles} sitios turísticos oficiales`;
    } else {
        resultsCounter.textContent = `Mostrando ${cantidadVisibles} de ${totalDisponibles} sitios turísticos`;
    }
}

/**
 * Renderiza el grid de tarjetas turísticas de forma eficiente mediante DocumentFragment
 * @param {Array} lista - Sitios a mostrar en el catálogo
 */
function renderizarGridLugares(lista) {
    if (!placesGrid) return;

    // Limpiar contenido previo del grid
    placesGrid.replaceChildren();

    actualizarContador(lista.length, todosLosLugares.length);

    if (lista.length === 0) {
        placesGrid.classList.add('hidden');
        if (stateEmpty) stateEmpty.classList.remove('hidden');
        return;
    }

    if (stateEmpty) stateEmpty.classList.add('hidden');
    placesGrid.classList.remove('hidden');

    const fragment = document.createDocumentFragment();

    lista.forEach(lugar => {
        const cardElement = crearTarjetaLugar(lugar);
        fragment.appendChild(cardElement);
    });

    placesGrid.appendChild(fragment);
}

/**
 * Normaliza un texto para comparación uniforme (minúsculas, trim y sin acentos/tildes)
 * Homogeneiza cadenas para comparación resiliente según requerimientos MITUR.
 * @param {string} texto - Cadena a normalizar
 * @returns {string} Texto normalizado
 */
export const normalizarTexto = (texto) => (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/**
 * Mapeo explícito de categorías canónicas y sus equivalencias / alias comunes
 */
const ALIAS_CATEGORIAS = {
    'historicos': ['historicos', 'historico', 'sitios historicos', 'sitio historico', 'sitios-historicos'],
    'sitios historicos': ['historicos', 'historico', 'sitios historicos', 'sitio historico', 'sitios-historicos']
};

/**
 * Determina de forma resiliente si la categoría de un lugar coincide con la categoría del filtro
 * @param {string} categoriaLugar - Categoría proveniente del objeto de Supabase
 * @param {string} categoriaFiltro - Categoría activa seleccionada en el filtro
 * @returns {boolean} True si coincide o si el filtro es 'todos'
 */
export function coincideCategoria(categoriaLugar, categoriaFiltro) {
    if (!categoriaFiltro || categoriaFiltro === 'todos') {
        return true;
    }
    if (!categoriaLugar) {
        return false;
    }

    const lugarNorm = normalizarTexto(categoriaLugar);
    const filtroNorm = normalizarTexto(categoriaFiltro);

    // 1. Coincidencia exacta tras normalizar
    if (lugarNorm === filtroNorm) {
        return true;
    }

    // 2. Mapeo explícito de alias (soporta "historicos" <-> "sitios historicos")
    for (const [clave, alias] of Object.entries(ALIAS_CATEGORIAS)) {
        const filtroEsAlias = (filtroNorm === clave || alias.includes(filtroNorm));
        const lugarEsAlias = (lugarNorm === clave || alias.includes(lugarNorm));
        if (filtroEsAlias && lugarEsAlias) {
            return true;
        }
    }

    // 3. Coincidencia flexible por contención bidireccional
    if (lugarNorm.includes(filtroNorm) || filtroNorm.includes(lugarNorm)) {
        return true;
    }

    return false;
}

/**
 * Obtiene el parámetro 'categoria' de la URL actual
 * @returns {string|null} Valor del parámetro o null si no existe
 */
function obtenerCategoriaDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('categoria');
}

/**
 * Sincroniza la URL en la barra de direcciones con la categoría activa mediante replaceState
 * @param {string} categoria - Categoría seleccionada o 'todos'
 */
function actualizarURLConCategoria(categoria) {
    try {
        const url = new URL(window.location.href);
        if (!categoria || categoria === 'todos') {
            url.searchParams.delete('categoria');
        } else {
            url.searchParams.set('categoria', categoria);
        }
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch (e) {
        console.warn('No se pudo actualizar la URL del navegador:', e);
    }
}

/**
 * Aplica los filtros de búsqueda en texto y de categoría activa
 */
export function aplicarFiltros() {
    let filtrados = todosLosLugares;

    // Filtro por categoría seleccionada con coincidencia flexible y resiliente
    if (categoriaActiva && categoriaActiva !== 'todos') {
        filtrados = filtrados.filter(lugar =>
            coincideCategoria(lugar.category, categoriaActiva)
        );
    }

    // Filtro por texto ingresado en el buscador
    if (terminoBusqueda && terminoBusqueda.length > 0) {
        const busquedaNorm = normalizarTexto(terminoBusqueda);
        filtrados = filtrados.filter(lugar => {
            const nombre = normalizarTexto(lugar.name || '');
            const descripcion = normalizarTexto(lugar.description || '');
            const categoria = normalizarTexto(lugar.category || '');

            return nombre.includes(busquedaNorm) ||
                descripcion.includes(busquedaNorm) ||
                categoria.includes(busquedaNorm);
        });
    }

    renderizarGridLugares(filtrados);
}

/**
 * Inicializa dinámicamente los botones de filtrado por categoría según los datos retornados
 * @param {Array} lista - Sitios cargados de la base de datos
 */
function inicializarFiltrosCategorias(lista) {
    if (!categoryPillsContainer) return;

    const categoriasMap = new Map();

    lista.forEach(lugar => {
        if (lugar.category && typeof lugar.category === 'string') {
            const cat = lugar.category.trim();
            if (cat && !categoriasMap.has(cat)) {
                categoriasMap.set(cat, lugar.color || null);
            }
        }
    });

    // Limpiar botones previos excepto "Todos" (soporta data-category y data-categoria)
    categoryPillsContainer.querySelectorAll('.pill-btn:not([data-category="todos"]):not([data-categoria="todos"])').forEach(el => el.remove());

    // Configurar listener y estado inicial del botón "Todos"
    const btnTodos = categoryPillsContainer.querySelector('[data-category="todos"], [data-categoria="todos"]');
    const esTodosActivo = (categoriaActiva === 'todos');
    if (btnTodos) {
        btnTodos.classList.toggle('active', esTodosActivo);
        btnTodos.setAttribute('aria-checked', esTodosActivo ? 'true' : 'false');
        btnTodos.onclick = () => {
            seleccionarCategoria('todos', btnTodos, true);
        };
    }

    categoriasMap.forEach((color, categoria) => {
        const catNorm = normalizarTexto(categoria);
        const esActivo = (categoriaActiva !== 'todos' && coincideCategoria(categoria, categoriaActiva));

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pill-btn ${esActivo ? 'active' : ''}`;
        btn.dataset.category = catNorm;
        btn.dataset.categoria = catNorm;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', esActivo ? 'true' : 'false');

        if (color) {
            const dot = document.createElement('span');
            dot.className = 'pill-dot';
            dot.style.color = color;
            btn.appendChild(dot);
        }

        const label = document.createElement('span');
        label.textContent = categoria;
        btn.appendChild(label);

        btn.addEventListener('click', () => {
            seleccionarCategoria(catNorm, btn, true, categoria.toLowerCase());
        });

        categoryPillsContainer.appendChild(btn);
    });
}

/**
 * Cambia la categoría activa, actualiza estilos de píldoras y sincroniza la URL
 * @param {string} categoria - Nombre normalizado de la categoría o 'todos'
 * @param {HTMLElement} [btnSeleccionado] - Botón presionado
 * @param {boolean} [sincronizarURL=true] - Si se debe actualizar la URL con replaceState
 * @param {string} [categoriaOriginal] - Valor original para la query string
 */
function seleccionarCategoria(categoria, btnSeleccionado, sincronizarURL = true, categoriaOriginal = '') {
    categoriaActiva = categoria;

    // Actualizar estados visuales de las píldoras
    if (categoryPillsContainer) {
        categoryPillsContainer.querySelectorAll('.pill-btn').forEach(btn => {
            const btnCat = btn.dataset.category || btn.dataset.categoria || '';
            const esActivo = btnSeleccionado
                ? (btn === btnSeleccionado)
                : ((categoria === 'todos' && btnCat === 'todos') || (categoria !== 'todos' && coincideCategoria(btnCat, categoria)));
            btn.classList.toggle('active', esActivo);
            btn.setAttribute('aria-checked', esActivo ? 'true' : 'false');
        });
    }

    if (sincronizarURL) {
        const valorURL = (categoria === 'todos') ? 'todos' : (categoriaOriginal || categoria);
        actualizarURLConCategoria(valorURL);
    }

    aplicarFiltros();
}

/**
 * Muestra el estado de carga (skeletons) y oculta otros contenedores
 */
function mostrarCargando() {
    if (stateLoading) stateLoading.classList.remove('hidden');
    if (stateError) stateError.classList.add('hidden');
    if (stateEmpty) stateEmpty.classList.add('hidden');
    if (placesGrid) placesGrid.classList.add('hidden');
    if (resultsCounter) resultsCounter.textContent = 'Cargando sitios turísticos oficiales...';
}

/**
 * Muestra el estado de error con mensaje explicativo
 * @param {string} [mensaje] - Detalle opcional del error
 */
function mostrarError(mensaje) {
    if (stateLoading) stateLoading.classList.add('hidden');
    if (placesGrid) placesGrid.classList.add('hidden');
    if (stateEmpty) stateEmpty.classList.add('hidden');
    if (stateError) {
        stateError.classList.remove('hidden');
        if (stateErrorMessage && mensaje) {
            stateErrorMessage.textContent = mensaje;
        }
    }
    if (resultsCounter) resultsCounter.textContent = 'Error al consultar datos';
}

/**
 * Consulta la base de datos de Supabase y controla el ciclo de carga y renderizado
 */
async function cargarLugares() {
    mostrarCargando();

    try {
        const respuesta = await obtenerLugaresTuristicos();

        if (!respuesta || !Array.isArray(respuesta)) {
            throw new Error('La respuesta de Supabase no tiene el formato esperado.');
        }

        if (respuesta.length === 0) {
            // Caso en el que la vista esté vacía o la consulta haya retornado []
            todosLosLugares = [];
            if (stateLoading) stateLoading.classList.add('hidden');
            if (stateEmpty) stateEmpty.classList.remove('hidden');
            actualizarContador(0, 0);
            return;
        }

        // Desduplicar y guardar en memoria para filtrado instantáneo
        todosLosLugares = desduplicarLugares(respuesta);

        // Paso 1 y 2: Leer y normalizar parámetro 'categoria' de la URL al iniciar
        const paramURL = obtenerCategoriaDesdeURL();
        if (paramURL) {
            const paramNorm = normalizarTexto(paramURL);
            const coincidencia = todosLosLugares.find(l =>
                coincideCategoria(l.category, paramNorm)
            );

            if (coincidencia) {
                // Sincronizamos con la categoría canónica normalizada
                categoriaActiva = normalizarTexto(coincidencia.category);
            } else {
                categoriaActiva = 'todos';
            }
        } else {
            categoriaActiva = 'todos';
        }

        // Inicializar categorías y renderizar listado
        inicializarFiltrosCategorias(todosLosLugares);
        if (stateLoading) stateLoading.classList.add('hidden');
        aplicarFiltros();

    } catch (error) {
        console.error('Error al obtener lugares turísticos:', error);
        mostrarError('No se pudo conectar con el servidor de Supabase. Revisa tu conexión a internet e inténtalo de nuevo.');
    }
}

/**
 * Inicialización de Event Listeners
 */
function inicializarEventos() {
    // 1. Buscador con filtrado en tiempo real
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            terminoBusqueda = event.target.value.toLowerCase().trim();

            if (searchClearBtn) {
                searchClearBtn.classList.toggle('hidden', terminoBusqueda.length === 0);
            }

            aplicarFiltros();
        });
    }

    // 2. Botón para limpiar búsqueda
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                terminoBusqueda = '';
                searchClearBtn.classList.add('hidden');
                searchInput.focus();
                aplicarFiltros();
            }
        });
    }

    // 3. Botón de reintento en caso de error
    if (btnRetry) {
        btnRetry.addEventListener('click', () => {
            cargarLugares();
        });
    }

    // 4. Botón de restablecer filtros en caso de búsqueda sin resultados
    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                terminoBusqueda = '';
            }
            if (searchClearBtn) {
                searchClearBtn.classList.add('hidden');
            }

            const btnTodos = categoryPillsContainer?.querySelector('[data-category="todos"], [data-categoria="todos"]');
            seleccionarCategoria('todos', btnTodos, true);
        });
    }

    // 5. Soporte para navegación con historial (botones atrás/adelante)
    window.addEventListener('popstate', () => {
        const catURL = obtenerCategoriaDesdeURL();
        const catNorm = catURL ? normalizarTexto(catURL) : 'todos';
        let catFinal = 'todos';

        if (catNorm !== 'todos') {
            const lugarMatch = todosLosLugares.find(l => coincideCategoria(l.category, catNorm));
            if (lugarMatch) {
                catFinal = normalizarTexto(lugarMatch.category);
            }
        }

        const btnMatch = categoryPillsContainer?.querySelector(`[data-category="${catFinal}"], [data-categoria="${catFinal}"]`);
        seleccionarCategoria(catFinal, btnMatch, false);
    });
}

// Iniciar aplicación una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventos();
    cargarLugares();
});
