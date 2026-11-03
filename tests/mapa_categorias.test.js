import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    MapaModel,
    extraerCategorias,
    filtrarLugaresPorCategoria
} from '../js/models/MapaModel.js';

describe('Suite de Pruebas: Categorías Dinámicas y Filtros del Mapa (ChocoMapaSV)', () => {
    const muestraLugares = [
        {
            id: 'l-01',
            name: 'Volcán de Santa Ana (Ilamatepec)',
            category: 'Volcanes & Naturaleza',
            category_slug: 'volcanes-naturaleza',
            color: '#10B981',
            coords: [-89.63, 13.85]
        },
        {
            id: 'l-02',
            name: 'Playa El Tunco',
            category: 'Playas & Surf City',
            category_slug: 'playas-surf-city',
            color: '#06B6D4',
            coords: [-89.38, 13.49]
        },
        {
            id: 'l-03',
            name: 'Joya de Cerén',
            category: 'Historia & Arqueología',
            category_slug: 'historia-arqueologia',
            color: '#F59E0B',
            coords: [-89.36, 13.82]
        },
        {
            id: 'l-04',
            name: 'Volcán de Izalco',
            category: 'Volcanes & Naturaleza',
            category_slug: 'volcanes-naturaleza',
            color: '#10B981',
            coords: [-89.63, 13.81]
        },
        {
            id: 'l-05',
            name: 'Playa El Zonte',
            category: 'Playas & Surf City',
            category_slug: 'playas-surf-city',
            color: '#06B6D4',
            coords: [-89.43, 13.49]
        }
    ];

    describe('1. Extracción dinámica de categorías reales', () => {
        it('debe extraer el listado único de categorías preservando nombre oficial, slug y color', () => {
            const categorias = extraerCategorias(muestraLugares);

            assert.equal(categorias.length, 3);
            const nombres = categorias.map(c => c.name);
            assert.deepEqual(nombres, [
                'Volcanes & Naturaleza',
                'Playas & Surf City',
                'Historia & Arqueología'
            ]);

            const volcanes = categorias.find(c => c.name === 'Volcanes & Naturaleza');
            assert.equal(volcanes.color, '#10B981');
            assert.equal(volcanes.slug, 'volcanes-naturaleza');

            const playas = categorias.find(c => c.name === 'Playas & Surf City');
            assert.equal(playas.color, '#06B6D4');
        });

        it('debe manejar listas vacías o valores nulos sin lanzar excepción', () => {
            assert.deepEqual(extraerCategorias([]), []);
            assert.deepEqual(extraerCategorias(null), []);
            assert.deepEqual(extraerCategorias(undefined), []);
        });

        it('debe asignar slug generado y color por defecto si están ausentes', () => {
            const lugaresIncompletos = [
                { id: 'x-1', name: 'Lugar X', category: 'Miradores Espectaculares' }
            ];
            const cats = extraerCategorias(lugaresIncompletos);
            assert.equal(cats.length, 1);
            assert.equal(cats[0].name, 'Miradores Espectaculares');
            assert.equal(cats[0].slug, 'miradores-espectaculares');
            assert.ok(cats[0].color);
        });
    });

    describe('2. Filtrado de lugares por categoría', () => {
        it('debe retornar el 100% de los lugares si la categoría es "todos", "todas" o vacía', () => {
            const todos = filtrarLugaresPorCategoria(muestraLugares, 'todos');
            assert.equal(todos.length, 5);

            const todas = filtrarLugaresPorCategoria(muestraLugares, 'todas');
            assert.equal(todas.length, 5);

            const vacio = filtrarLugaresPorCategoria(muestraLugares, '');
            assert.equal(vacio.length, 5);

            const nulo = filtrarLugaresPorCategoria(muestraLugares, null);
            assert.equal(nulo.length, 5);
        });

        it('debe filtrar de forma exacta por el nombre de categoría', () => {
            const filtrados = filtrarLugaresPorCategoria(muestraLugares, 'Volcanes & Naturaleza');
            assert.equal(filtrados.length, 2);
            assert.deepEqual(filtrados.map(l => l.id), ['l-01', 'l-04']);
        });

        it('debe filtrar por slug de categoría de manera insensible a mayúsculas y acentos', () => {
            const filtradosPlayas = filtrarLugaresPorCategoria(muestraLugares, 'playas-surf-city');
            assert.equal(filtradosPlayas.length, 2);
            assert.deepEqual(filtradosPlayas.map(l => l.id), ['l-02', 'l-05']);

            const filtradosHistoria = filtrarLugaresPorCategoria(muestraLugares, 'historia & arqueologia');
            assert.equal(filtradosHistoria.length, 1);
            assert.equal(filtradosHistoria[0].id, 'l-03');
        });

        it('debe soportar el método MapaModel.filtrarPorCategoria cuando los datos están precargados', () => {
            MapaModel.setLugares(muestraLugares);
            const res = MapaModel.filtrarPorCategoria('Playas & Surf City');
            assert.equal(res.length, 2);
        });
    });

    describe('3. Búsqueda combinada con categorías', () => {
        it('debe buscar por texto respetando o no el filtro de categoría', () => {
            MapaModel.setLugares(muestraLugares);

            const resGeneral = MapaModel.buscarLugares('Volcan');
            assert.equal(resGeneral.length, 2);

            const resPlaya = MapaModel.buscarLugares('El Zonte', 'Playas & Surf City');
            assert.equal(resPlaya.length, 1);
            assert.equal(resPlaya[0].id, 'l-05');
        });
    });
});

