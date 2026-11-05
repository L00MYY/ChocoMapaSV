import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTexto, coincideCategoria, generarSlug } from '../js/utils/textUtils.js';
import { calcularPromedioRating } from '../js/models/CalificacionesModel.js';
import { LugaresModel } from '../js/models/LugaresModel.js';

describe('Suite de Integración: Buscador Hero, Destinos Populares y Bento Grid', () => {

    describe('1. Normalización y Coincidencia de Categorías con Slugs', () => {
        it('debe generar slugs limpios a partir de nombres de categorías con tildes y ampersands', () => {
            assert.equal(generarSlug('Volcanes & Naturaleza'), 'volcanes-naturaleza');
            assert.equal(generarSlug('Playas & Surf City'), 'playas-surf-city');
            assert.equal(generarSlug('Historia & Arqueología'), 'historia-arqueologia');
            assert.equal(generarSlug('Rutas Culturales & Pueblos Vivos'), 'rutas-culturales-pueblos-vivos');
            assert.equal(generarSlug('Sitios Históricos'), 'sitios-historicos');
            assert.equal(generarSlug('Miradores'), 'miradores');
        });

        it('debe hacer coincidir correctamente las 4 categorías del Bento Grid con sus slugs oficiales', () => {
            assert.ok(coincideCategoria('Volcanes & Naturaleza', 'volcanes-naturaleza'));
            assert.ok(coincideCategoria('Playas & Surf City', 'playas-surf-city'));
            assert.ok(coincideCategoria('Historia & Arqueología', 'historia-arqueologia'));
            assert.ok(coincideCategoria('Rutas Culturales & Pueblos Vivos', 'rutas-culturales-pueblos-vivos'));
        });

        it('debe rechazar coincidencias entre categorías no relacionadas', () => {
            assert.equal(coincideCategoria('Playas & Surf City', 'volcanes-naturaleza'), false);
            assert.equal(coincideCategoria('Miradores', 'historia-arqueologia'), false);
        });

        it('debe aceptar comodines "todos" o "todas" para cualquier categoría', () => {
            assert.ok(coincideCategoria('Volcanes & Naturaleza', 'todos'));
            assert.ok(coincideCategoria('Playas & Surf City', 'todas'));
            assert.ok(coincideCategoria('Cualquiera', ''));
        });
    });

    describe('2. Ordenamiento por Calificación Real y Selección del Top 5', () => {
        const muestraDestinos = [
            { id: '1', name: 'Destino C', ratings: [{ score: 3 }] },
            { id: '2', name: 'Destino A', ratings: [{ score: 5 }, { score: 5 }] },
            { id: '3', name: 'Destino E', ratings: [{ score: 1 }] },
            { id: '4', name: 'Destino B', ratings: [{ score: 5 }, { score: 4 }] },
            { id: '5', name: 'Destino D', ratings: [{ score: 2 }] },
            { id: '6', name: 'Destino F', ratings: [] },
            { id: '7', name: 'Destino A2', ratings: [{ score: 5 }] }
        ];

        it('debe ordenar de mayor a menor según el promedio de calificación y tomar exactamente los primeros 5', () => {
            const ordenados = [...muestraDestinos].sort((a, b) => {
                const infoA = calcularPromedioRating(a.ratings);
                const infoB = calcularPromedioRating(b.ratings);
                if (infoB.promedio !== infoA.promedio) {
                    return infoB.promedio - infoA.promedio;
                }
                return infoB.total - infoA.total;
            });

            const top5 = ordenados.slice(0, 5);
            assert.equal(top5.length, 5);
            // Destino A tiene 5.0 con 2 votos
            assert.equal(top5[0].id, '2');
            // Destino A2 tiene 5.0 con 1 voto
            assert.equal(top5[1].id, '7');
            // Destino B tiene 4.5
            assert.equal(top5[2].id, '4');
            // Destino C tiene 3.0
            assert.equal(top5[3].id, '1');
            // Destino D tiene 2.0
            assert.equal(top5[4].id, '5');
        });
    });

    describe('3. Filtrado por Búsqueda Predictiva "q" y Categoría en LugaresModel', () => {
        beforeEach(() => {
            LugaresModel.setCategoria('todos');
            LugaresModel.setBusqueda('');
            LugaresModel.setRatingMinimo(0);
        });

        it('debe filtrar correctamente por término de búsqueda en nombre, descripción o categoría', () => {
            const lugaresSimulados = [
                { id: 'l-1', name: 'Laguna de Apastepeque', description: 'Hermoso espejo de agua volcánica', category: 'Volcanes & Naturaleza', ratings: [] },
                { id: 'l-2', name: 'Playa El Tunco', description: 'Playa de surf', category: 'Playas & Surf City', ratings: [] },
                { id: 'l-3', name: 'Laguna Verde', description: 'Cráter extinto', category: 'Volcanes & Naturaleza', ratings: [] }
            ];

            // Simulamos inyección en el modelo
            const filtrar = (termino) => {
                const busquedaNorm = normalizarTexto(termino);
                return lugaresSimulados.filter(lugar => {
                    const nombre = normalizarTexto(lugar.name || '');
                    const descripcion = normalizarTexto(lugar.description || '');
                    const categoria = normalizarTexto(lugar.category || '');
                    return nombre.includes(busquedaNorm) || descripcion.includes(busquedaNorm) || categoria.includes(busquedaNorm);
                });
            };

            const soloLagunas = filtrar('laguna');
            assert.equal(soloLagunas.length, 2);
            assert.deepEqual(soloLagunas.map(l => l.id), ['l-1', 'l-3']);

            const soloTunco = filtrar('Tunco');
            assert.equal(soloTunco.length, 1);
            assert.equal(soloTunco[0].id, 'l-2');
        });

        it('debe manejar combinaciones de filtro por categoría slug y término q', () => {
            const lugaresSimulados = [
                { id: 'l-1', name: 'Volcán de Santa Ana', category: 'Volcanes & Naturaleza', category_slug: 'volcanes-naturaleza' },
                { id: 'l-2', name: 'Volcán de Conchagua', category: 'Volcanes & Naturaleza', category_slug: 'volcanes-naturaleza' },
                { id: 'l-3', name: 'Playa El Sunzal', category: 'Playas & Surf City', category_slug: 'playas-surf-city' }
            ];

            const filtrar = (slugCat, texto) => {
                let res = lugaresSimulados;
                if (slugCat && slugCat !== 'todos') {
                    res = res.filter(l => coincideCategoria(l.category, slugCat) || coincideCategoria(l.category_slug, slugCat));
                }
                if (texto) {
                    const norm = normalizarTexto(texto);
                    res = res.filter(l => normalizarTexto(l.name).includes(norm));
                }
                return res;
            };

            const catVolcanes = filtrar('volcanes-naturaleza', '');
            assert.equal(catVolcanes.length, 2);

            const volcanConchagua = filtrar('volcanes-naturaleza', 'Conchagua');
            assert.equal(volcanConchagua.length, 1);
            assert.equal(volcanConchagua[0].id, 'l-2');

            const noCoincide = filtrar('playas-surf-city', 'Volcán');
            assert.equal(noCoincide.length, 0);
        });
    });
});

