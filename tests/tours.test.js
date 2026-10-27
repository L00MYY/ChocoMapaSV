import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    formatearMonedaUSD,
    formatearFechaLarga,
    calcularPrecioConDescuento,
    esFechaPasada
} from '../js/models/ToursModel.js';

describe('Suite de Tours - Precios, Moneda y Fechas de Salida', () => {
    describe('formatearMonedaUSD', () => {
        it('debe formatear valores enteros a formato USD con dos decimales ($XX.XX)', () => {
            assert.equal(formatearMonedaUSD(35), '$35.00');
            assert.equal(formatearMonedaUSD(28), '$28.00');
            assert.equal(formatearMonedaUSD(0), '$0.00');
        });

        it('debe redondear y formatear correctamente valores decimales', () => {
            assert.equal(formatearMonedaUSD(24.5), '$24.50');
            assert.equal(formatearMonedaUSD(24.994), '$24.99');
            assert.equal(formatearMonedaUSD(24.999), '$25.00');
            assert.equal(formatearMonedaUSD(12.345), '$12.35');
        });

        it('debe aceptar representaciones numéricas en string', () => {
            assert.equal(formatearMonedaUSD('45.50'), '$45.50');
            assert.equal(formatearMonedaUSD('100'), '$100.00');
        });

        it('debe retornar $0.00 ante valores nulos, indefinidos o no numéricos', () => {
            assert.equal(formatearMonedaUSD(null), '$0.00');
            assert.equal(formatearMonedaUSD(undefined), '$0.00');
            assert.equal(formatearMonedaUSD('no-valido'), '$0.00');
            assert.equal(formatearMonedaUSD(NaN), '$0.00');
        });
    });

    describe('formatearFechaLarga', () => {
        it('debe formatear fechas YYYY-MM-DD a texto legible en español', () => {
            const fechaFormateada = formatearFechaLarga('2026-10-18');
            assert.ok(fechaFormateada.includes('18'));
            assert.ok(fechaFormateada.includes('octubre'));
            assert.ok(fechaFormateada.includes('2026'));
        });

        it('debe procesar fechas con formato timestamp ISO', () => {
            const fechaFormateada = formatearFechaLarga('2026-11-01T12:00:00Z');
            assert.ok(fechaFormateada.includes('1'));
            assert.ok(fechaFormateada.includes('noviembre'));
            assert.ok(fechaFormateada.includes('2026'));
        });

        it('debe retornar string vacío ante valores vacíos, nulos o indefinidos', () => {
            assert.equal(formatearFechaLarga(''), '');
            assert.equal(formatearFechaLarga(null), '');
            assert.equal(formatearFechaLarga(undefined), '');
        });
    });

    describe('calcularPrecioConDescuento', () => {
        it('debe calcular el precio con descuento porcentual correctamente', () => {
            // $35 con 20% de descuento = $28.00
            assert.equal(calcularPrecioConDescuento(35, 20), 28.00);
            // $50 con 10% de descuento = $45.00
            assert.equal(calcularPrecioConDescuento(50, 10), 45.00);
        });

        it('debe redondear el resultado a 2 decimales', () => {
            // $99.99 con 15% de descuento = 99.99 * 0.85 = 84.9915 -> 84.99
            assert.equal(calcularPrecioConDescuento(99.99, 15), 84.99);
            // $33.33 con 10% de descuento = 33.33 * 0.90 = 29.997 -> 30.00
            assert.equal(calcularPrecioConDescuento(33.33, 10), 30.00);
        });

        it('debe retornar el precio original si el descuento es 0 o inválido', () => {
            assert.equal(calcularPrecioConDescuento(40, 0), 40.00);
            assert.equal(calcularPrecioConDescuento(40, -5), 40.00);
            assert.equal(calcularPrecioConDescuento(40, null), 40.00);
        });

        it('debe retornar 0 si el precio es 0, negativo o inválido', () => {
            assert.equal(calcularPrecioConDescuento(0, 20), 0);
            assert.equal(calcularPrecioConDescuento(-10, 20), 0);
            assert.equal(calcularPrecioConDescuento('invalido', 20), 0);
        });
    });

    describe('Regla cronológica de fechas de salida (esFechaPasada)', () => {
        const fechaReferencia = '2026-10-26';

        it('debe clasificar fechas anteriores a hoy como pasadas (deshabilitadas)', () => {
            assert.equal(esFechaPasada('2026-10-18', fechaReferencia), true);
            assert.equal(esFechaPasada('2026-09-30', fechaReferencia), true);
        });

        it('debe clasificar la fecha de hoy como no vigente para reservas inmediatas (pasada/cerrada)', () => {
            assert.equal(esFechaPasada('2026-10-26', fechaReferencia), true);
        });

        it('debe clasificar fechas futuras como vigentes y habilitadas para reserva', () => {
            assert.equal(esFechaPasada('2026-10-27', fechaReferencia), false);
            assert.equal(esFechaPasada('2026-11-15', fechaReferencia), false);
        });

        it('debe procesar fechas con marcas de tiempo ISO (YYYY-MM-DDTHH:mm:ss)', () => {
            assert.equal(esFechaPasada('2026-10-18T08:00:00Z', fechaReferencia), true);
            assert.equal(esFechaPasada('2026-11-01T12:00:00Z', fechaReferencia), false);
        });

        it('debe discriminar correctamente una lista de fechas de salida entre habilitadas y deshabilitadas', () => {
            const fechasTour = [
                { id: 'f1', departure_date: '2026-10-18', spots: 5 },
                { id: 'f2', departure_date: '2026-10-25', spots: 8 },
                { id: 'f3', departure_date: '2026-10-26', spots: 10 },
                { id: 'f4', departure_date: '2026-10-27', spots: 12 },
                { id: 'f5', departure_date: '2026-11-05', spots: 15 }
            ];

            const deshabilitadas = fechasTour.filter(f => esFechaPasada(f.departure_date, fechaReferencia));
            const vigentes = fechasTour.filter(f => !esFechaPasada(f.departure_date, fechaReferencia));

            assert.equal(deshabilitadas.length, 3);
            assert.deepEqual(deshabilitadas.map(f => f.id), ['f1', 'f2', 'f3']);

            assert.equal(vigentes.length, 2);
            assert.deepEqual(vigentes.map(f => f.id), ['f4', 'f5']);
        });
    });
});
