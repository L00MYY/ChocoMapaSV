export const normalizarTexto = (texto) => (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const ALIAS_CATEGORIAS = {
    'historicos': ['historicos', 'historico', 'sitios historicos', 'sitio historico', 'sitios-historicos'],
    'sitios historicos': ['historicos', 'historico', 'sitios historicos', 'sitio historico', 'sitios-historicos']
};

export function coincideCategoria(categoriaLugar, categoriaFiltro) {
    if (!categoriaFiltro || categoriaFiltro === 'todos') {
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

    for (const [clave, alias] of Object.entries(ALIAS_CATEGORIAS)) {
        const filtroEsAlias = filtroNorm === clave || alias.includes(filtroNorm);
        const lugarEsAlias = lugarNorm === clave || alias.includes(lugarNorm);
        if (filtroEsAlias && lugarEsAlias) {
            return true;
        }
    }

    return lugarNorm.includes(filtroNorm) || filtroNorm.includes(lugarNorm);
}