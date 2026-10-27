import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    filtrarCatalogoTours,
    filtrarPorDepartamento,
    filtrarPorOferta,
    buscarPorTitulo,
    ToursModel
} from '../js/models/ToursModel.js';

describe('Suite de Filtros del Catálogo de Tours', () => {
    const catalogoMuestra = [
        {
            id: 't-01',
            name: 'Ruta de la Historia & Joyas del Centro',
            department: 'San Salvador',
            has_offer: true,
            discount_percentage: 20,
            tour_dates: [{ departure_date: '2026-11-01' }]
        },
        {
            id: 't-02',
            name: 'Aventura en Volcán de Santa Ana & Coatepeque',
            department: 'Santa Ana',
            has_offer: false,
            discount_percentage: 0,
            tour_dates: [{ departure_date: '2026-11-05' }]
        },
        {
            id: 't-03',
            name: 'Surf City & Playas de La Libertad',
            department: 'La Libertad',
            has_offer: true,
            discount_percentage: 15,
            tour_dates: [{ departure_date: '2026-11-10' }]
        },
        {
            id: 't-04',
            name: 'Ruta de las Flores: Salcoatitán y Juayúa',
            department: 'Sonsonate',
            has_offer: false,
            discount_percentage: 0,
            tour_dates: [{ departure_date: '2026-11-12' }]
        },
        {
            id: 't-05',
            name: 'Senderismo en Parque Nacional El Boquerón',
            department: 'San Salvador',
            has_offer: false,
            discount_percentage: 0,
            tour_dates: [{ departure_date: '2026-11-15' }]
        }
    ];

    describe('Función pura filtrarCatalogoTours', () => {
        it('debe filtrar tours por departamento con coincidencia exacta e insensible a mayúsculas', () => {
            const resultado = filtrarCatalogoTours(catalogoMuestra, { departamento: 'Santa Ana' });
            assert.equal(resultado.length, 1);
            assert.equal(resultado[0].id, 't-02');

            const min = filtrarCatalogoTours(catalogoMuestra, { departamento: 'san salvador' });
            assert.equal(min.length, 2);
            assert.deepEqual(min.map(t => t.id), ['t-01', 't-05']);
        });

        it('debe filtrar exclusivamente tours en oferta ("oferta") y sin oferta ("sin_oferta")', () => {
            const enOferta = filtrarCatalogoTours(catalogoMuestra, { oferta: 'oferta' });
            assert.equal(enOferta.length, 2);
            assert.deepEqual(enOferta.map(t => t.id), ['t-01', 't-03']);

            const sinOferta = filtrarCatalogoTours(catalogoMuestra, { oferta: 'sin_oferta' });
            assert.equal(sinOferta.length, 3);
            assert.deepEqual(sinOferta.map(t => t.id), ['t-02', 't-04', 't-05']);
        });

        it('debe filtrar por búsqueda de texto parcial en el título', () => {
            const resultado = filtrarCatalogoTours(catalogoMuestra, { busqueda: 'Centro' });
            assert.equal(resultado.length, 1);
            assert.equal(resultado[0].id, 't-01');

            const multi = filtrarCatalogoTours(catalogoMuestra, { busqueda: 'Ruta' });
            assert.equal(multi.length, 2);
            assert.deepEqual(multi.map(t => t.id), ['t-01', 't-04']);
        });

        it('debe combinar múltiples criterios de filtro simultáneamente', () => {
            const filtrados = filtrarCatalogoTours(catalogoMuestra, {
                departamento: 'San Salvador',
                oferta: 'oferta'
            });
            assert.equal(filtrados.length, 1);
            assert.equal(filtrados[0].id, 't-01');

            const filtradosTexto = filtrarCatalogoTours(catalogoMuestra, {
                departamento: 'San Salvador',
                busqueda: 'Boquerón'
            });
            assert.equal(filtradosTexto.length, 1);
            assert.equal(filtradosTexto[0].id, 't-05');
        });

        it('debe retornar catálogo completo cuando los filtros están vacíos o no coinciden con criterios', () => {
            assert.equal(filtrarCatalogoTours(catalogoMuestra, {}).length, catalogoMuestra.length);
            assert.equal(filtrarCatalogoTours(catalogoMuestra).length, catalogoMuestra.length);
        });

        it('debe retornar array vacío cuando la combinación de filtros no produce coincidencias', () => {
            const resultado = filtrarCatalogoTours(catalogoMuestra, {
                departamento: 'Santa Ana',
                oferta: 'oferta'
            });
            assert.equal(resultado.length, 0);
        });

        it('debe manejar entradas seguras si el catálogo es inválido o no es array', () => {
            assert.deepEqual(filtrarCatalogoTours(null), []);
            assert.deepEqual(filtrarCatalogoTours(undefined), []);
            assert.deepEqual(filtrarCatalogoTours('no-array'), []);
        });
    });

    describe('Funciones atómicas de filtrado', () => {
        it('filtrarPorDepartamento debe ignorar mayúsculas y recortar espacios', () => {
            const res = filtrarPorDepartamento(catalogoMuestra, '  La Libertad  ');
            assert.equal(res.length, 1);
            assert.equal(res[0].id, 't-03');
        });

        it('filtrarPorOferta debe retornar catálogo completo si la condición es vacía o "todas"', () => {
            assert.equal(filtrarPorOferta(catalogoMuestra, '').length, catalogoMuestra.length);
            assert.equal(filtrarPorOferta(catalogoMuestra, 'todas').length, catalogoMuestra.length);
        });

        it('buscarPorTitulo debe ignorar mayúsculas y manejar términos vacíos', () => {
            assert.equal(buscarPorTitulo(catalogoMuestra, '   ').length, catalogoMuestra.length);
            assert.equal(buscarPorTitulo(catalogoMuestra, null).length, catalogoMuestra.length);
            assert.equal(buscarPorTitulo(catalogoMuestra, 'Inexistente').length, 0);
        });
    });

    describe('Integración en ToursModel.getToursFiltrados invocando filtrarCatalogoTours', () => {
        beforeEach(() => {
            ToursModel.setTours(catalogoMuestra);
        });

        it('debe delegar el filtrado a filtrarCatalogoTours y producir los mismos resultados', () => {
            const filtros = {
                departamento: 'San Salvador',
                oferta: 'oferta'
            };
            const resultadoModelo = ToursModel.getToursFiltrados(filtros);
            const resultadoPuro = filtrarCatalogoTours(catalogoMuestra, filtros);

            assert.deepEqual(resultadoModelo, resultadoPuro);
            assert.equal(resultadoModelo.length, 1);
            assert.equal(resultadoModelo[0].id, 't-01');
        });

        it('debe combinar departamento y búsqueda libre de texto a través del modelo', () => {
            const filtrados = ToursModel.getToursFiltrados({
                departamento: 'San Salvador',
                busqueda: 'Boquerón'
            });
            assert.equal(filtrados.length, 1);
            assert.equal(filtrados[0].id, 't-05');
        });

        it('debe retornar vacío si la combinación de filtros no produce coincidencias', () => {
            const filtrados = ToursModel.getToursFiltrados({
                departamento: 'Santa Ana',
                oferta: 'oferta'
            });
            assert.equal(filtrados.length, 0);
        });
    });
});
