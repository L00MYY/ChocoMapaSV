/**
 * js/utils/textUtils.js
 * Utilidades de normalización de cadenas, slugs y coincidencia semántica de categorías
 * para el ecosistema turístico de ChocoMapaSV (MITUR).
 */

/**
 * @description Normaliza una cadena de texto eliminando diacríticos (tildes),
 * convirtiendo a minúsculas y eliminando espacios en blanco en los extremos.
 * @param {string|*} texto - Texto de entrada a normalizar.
 * @returns {string} Cadena normalizada en minúsculas y sin acentos.
 */
export const normalizarTexto = (texto) => (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/**
 * @description Convierte un texto en un slug URL-friendly en formato kebab-case,
 * eliminando acentos y caracteres especiales no alfanuméricos.
 * @param {string|*} texto - Cadena base a transformar en slug.
 * @returns {string} Slug resultante limpio en kebab-case.
 */
export const generarSlug = (texto) => (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Mapeo de alias semánticos de categorías para flexibilizar la búsqueda y filtrado
 * entre slugs y nombres oficiales de categorías del Ministerio de Turismo.
 * @type {Record<string, string[]>}
 */
export const ALIAS_CATEGORIAS = {
    'historicos': ['historicos', 'historico', 'sitios historicos', 'sitio historico', 'sitios-historicos'],
    'sitios historicos': ['historicos', 'historico', 'sitios historicos', 'sitio historico', 'sitios-historicos'],
    'volcanes-naturaleza': ['volcanes y naturaleza', 'volcanes & naturaleza', 'volcanes-naturaleza', 'volcanes'],
    'playas-surf-city': ['playas y surf city', 'playas & surf city', 'playas-surf-city', 'surf city', 'playas'],
    'historia-arqueologia': ['historia y arqueologia', 'historia & arqueologia', 'historia-arqueologia', 'arqueologia'],
    'rutas-culturales-pueblos-vivos': ['rutas culturales y pueblos vivos', 'rutas culturales & pueblos vivos', 'rutas-culturales-pueblos-vivos', 'pueblos vivos', 'rutas culturales']
};

/**
 * @description Evalúa si la categoría de un sitio turístico coincide con la categoría
 * solicitada por un filtro, considerando nombres exactos, slugs, comodines y alias semánticos.
 * @param {string|null|undefined} categoriaLugar - Categoría del sitio turístico.
 * @param {string|null|undefined} categoriaFiltro - Categoría o comodín solicitado en el filtro.
 * @returns {boolean} True si coinciden según las reglas de negocio; de lo contrario false.
 */
export function coincideCategoria(categoriaLugar, categoriaFiltro) {
    if (!categoriaFiltro || categoriaFiltro === 'todos' || categoriaFiltro === 'todas') {
        return true;
    }
    if (!categoriaLugar) {
        return false;
    }

    const lugarNorm = normalizarTexto(categoriaLugar);
    const filtroNorm = normalizarTexto(categoriaFiltro);

    if (lugarNorm === filtroNorm) {
        return true;
    }

    const lugarSlug = generarSlug(categoriaLugar);
    const filtroSlug = generarSlug(categoriaFiltro);

    if (lugarSlug && filtroSlug && lugarSlug === filtroSlug) {
        return true;
    }

    for (const [clave, alias] of Object.entries(ALIAS_CATEGORIAS)) {
        const filtroEsAlias = filtroNorm === clave || filtroSlug === clave || alias.includes(filtroNorm) || alias.includes(filtroSlug);
        const lugarEsAlias = lugarNorm === clave || lugarSlug === clave || alias.includes(lugarNorm) || alias.includes(lugarSlug);
        if (filtroEsAlias && lugarEsAlias) {
            return true;
        }
    }

    return lugarNorm.includes(filtroNorm) || filtroNorm.includes(lugarNorm) ||
        (lugarSlug.length > 0 && filtroSlug.length > 0 && (lugarSlug.includes(filtroSlug) || filtroSlug.includes(lugarSlug)));
}

/**
 * @description Formatea una hora militar 'HH:mm' a formato estándar de 12 horas con indicador AM/PM.
 * @param {string|null|undefined} hora - Hora a formatear.
 * @param {Object} [opciones] - Opciones opcionales de formato.
 * @param {string} [opciones.fallback=''] - Cadena por defecto ante hora vacía o nula.
 * @param {boolean} [opciones.padZero=false] - Si es true, antepone un cero a horas menores a 10 (ej. '08:00 AM').
 * @returns {string} Hora formateada en formato legible de 12 horas.
 */
export function formatearHora(hora, { fallback = '', padZero = false } = {}) {
    if (!hora) return fallback;
    const [horaTexto, minutos = '00'] = String(hora).split(':');
    let numero = Number.parseInt(horaTexto, 10);
    if (Number.isNaN(numero)) return hora;
    const periodo = numero >= 12 ? 'PM' : 'AM';
    numero = numero % 12 || 12;
    const horaFormateada = padZero ? String(numero).padStart(2, '0') : String(numero);
    return `${horaFormateada}:${minutos} ${periodo}`;
}

/**
 * @description Sanitiza una cadena escapando caracteres especiales de HTML para prevenir inyecciones XSS.
 * @param {string|*} str - Cadena de entrada a sanitizar.
 * @returns {string} Cadena segura con entidades HTML escapadas.
 */
export function escaparHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
