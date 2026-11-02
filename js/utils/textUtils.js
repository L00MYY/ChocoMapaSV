export const normalizarTexto = (texto) => (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const generarSlug = (texto) => (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const ALIAS_CATEGORIAS = {
    'historicos': ['historicos', 'historico', 'sitios historicos', 'sitio historico', 'sitios-historicos'],
    'sitios historicos': ['historicos', 'historico', 'sitios historicos', 'sitio historico', 'sitios-historicos'],
    'volcanes-naturaleza': ['volcanes y naturaleza', 'volcanes & naturaleza', 'volcanes-naturaleza', 'volcanes'],
    'playas-surf-city': ['playas y surf city', 'playas & surf city', 'playas-surf-city', 'surf city', 'playas'],
    'historia-arqueologia': ['historia y arqueologia', 'historia & arqueologia', 'historia-arqueologia', 'arqueologia'],
    'rutas-culturales-pueblos-vivos': ['rutas culturales y pueblos vivos', 'rutas culturales & pueblos vivos', 'rutas-culturales-pueblos-vivos', 'pueblos vivos', 'rutas culturales']
};

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
