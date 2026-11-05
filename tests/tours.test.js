import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    formatearMonedaUSD,
    formatearFechaLarga,
    calcularPrecioConDescuento,
    esFechaPasada,
    sanitizarTelefono,
    validarFormularioReserva,
    crearReservaTour
} from '../js/models/ToursModel.js';
import {
    AdminPagosModel,
    reincorporarCuposTour,
    rechazarReserva
} from '../js/models/AdminPagosModel.js';
import { TourDetalleView } from '../js/views/TourDetalleView.js';
import { TourDetalleController } from '../js/controllers/TourDetalleController.js';
import { AuthModel } from '../js/models/AuthModel.js';

// Polyfill localStorage in Node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => store.get(k) || null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
    };
}

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

describe('Defecto 1: Reincorporación de cupos en tour_dates al rechazar una reserva (AdminPagosModel)', () => {
    it('reincorporarCuposTour debe consultar available_spots y sumar spots_reserved vía PATCH a tour_dates', async () => {
        const originalFetch = globalThis.fetch;
        let patchUrl = '';
        let patchBody = null;

        globalThis.fetch = async (url, options = {}) => {
            const method = options.method || 'GET';
            const urlStr = String(url);

            if (urlStr.includes('tour_dates') && method === 'GET') {
                return {
                    ok: true,
                    json: async () => [{ id: 'date-uuid-1', available_spots: 4 }]
                };
            }
            if (urlStr.includes('tour_dates') && method === 'PATCH') {
                patchUrl = urlStr;
                patchBody = JSON.parse(options.body);
                return {
                    ok: true,
                    json: async () => [{ id: 'date-uuid-1', available_spots: patchBody.available_spots }]
                };
            }
            return { ok: true, json: async () => [] };
        };

        try {
            const res = await reincorporarCuposTour('date-uuid-1', 3);
            assert.equal(res.ok, true);
            assert.equal(res.available_spots, 7, 'Debe sumar 4 + 3 = 7 cupos');
            assert.ok(patchUrl.includes('id=eq.date-uuid-1'));
            assert.equal(patchBody.available_spots, 7);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('rechazarReserva debe obtener tour_date_id y spots_reserved, actualizar reserva y recibo, y reincorporar cupos', async () => {
        const originalFetch = globalThis.fetch;
        let patchReservaBody = null;
        let patchReceiptBody = null;
        let patchDatesBody = null;

        globalThis.fetch = async (url, options = {}) => {
            const method = options.method || 'GET';
            const urlStr = String(url);

            if (urlStr.includes('tour_reservations') && method === 'GET') {
                return {
                    ok: true,
                    json: async () => [{
                        id: 'res-rechazo-10',
                        status: 'en_validacion',
                        tour_date_id: 'date-uuid-99',
                        spots_reserved: 2
                    }]
                };
            }
            if (urlStr.includes('tour_reservations') && method === 'PATCH') {
                patchReservaBody = JSON.parse(options.body);
                return {
                    ok: true,
                    json: async () => [{
                        id: 'res-rechazo-10',
                        status: 'rechazada',
                        tour_date_id: 'date-uuid-99',
                        spots_reserved: 2
                    }]
                };
            }
            if (urlStr.includes('payment_receipts') && method === 'PATCH') {
                patchReceiptBody = JSON.parse(options.body);
                return {
                    ok: true,
                    json: async () => [{ id: 'rec-1', status: 'rechazado' }]
                };
            }
            if (urlStr.includes('tour_dates') && method === 'GET') {
                return {
                    ok: true,
                    json: async () => [{ id: 'date-uuid-99', available_spots: 10 }]
                };
            }
            if (urlStr.includes('tour_dates') && method === 'PATCH') {
                patchDatesBody = JSON.parse(options.body);
                return {
                    ok: true,
                    json: async () => [{ id: 'date-uuid-99', available_spots: patchDatesBody.available_spots }]
                };
            }
            return { ok: true, json: async () => [] };
        };

        try {
            const res = await rechazarReserva('res-rechazo-10', 'Comprobante ilegible');
            assert.equal(res.ok, true);
            assert.equal(patchReservaBody.status, 'rechazada');
            assert.equal(patchReservaBody.rejection_reason, 'Comprobante ilegible');
            assert.equal(patchReceiptBody.status, 'rechazado');
            assert.equal(patchReceiptBody.rejection_reason, 'Comprobante ilegible');
            assert.equal(patchDatesBody.available_spots, 12, 'Debe devolver los 2 cupos a tour_dates (10 + 2 = 12)');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('rechazarReserva no debe reincorporar cupos si la reserva ya había sido procesada (control de concurrencia)', async () => {
        const originalFetch = globalThis.fetch;
        let patchDatesCalled = false;

        globalThis.fetch = async (url, options = {}) => {
            const method = options.method || 'GET';
            const urlStr = String(url);

            if (urlStr.includes('tour_reservations') && method === 'GET') {
                return {
                    ok: true,
                    json: async () => [{
                        id: 'res-ya-rechazada',
                        status: 'rechazada',
                        tour_date_id: 'date-uuid-99',
                        spots_reserved: 2
                    }]
                };
            }
            if (urlStr.includes('tour_dates') && method === 'PATCH') {
                patchDatesCalled = true;
                return { ok: true, json: async () => [] };
            }
            return { ok: true, json: async () => [] };
        };

        try {
            const res = await rechazarReserva('res-ya-rechazada', 'Intento duplicado');
            assert.equal(res.ok, false);
            assert.equal(res.concurrencia, true);
            assert.equal(patchDatesCalled, false, 'No debe llamar a PATCH tour_dates si la reserva ya fue procesada');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

describe('Defecto 2: Limpieza de formulario y bloqueo de reserva duplicada en tour-detalle', () => {
    it('TourDetalleView.limpiarFormularioReserva debe resetear el form y limpiar inputs temporales', () => {
        let formResetLlamado = false;
        const fakeElements = {
            reservationForm: { reset: () => { formResetLlamado = true; } },
            inputName: { value: 'Carlos Rivas', classList: { remove() {} } },
            inputEmail: { value: 'carlos@ejemplo.com', classList: { remove() {} } },
            inputPhone: { value: '71234567', classList: { remove() {} } },
            selectDate: { value: 'd1000001', classList: { remove() {} } },
            inputSpots: { value: '3', classList: { remove() {} } },
            errorName: { textContent: 'Error', style: { display: 'block' } },
            errorEmail: { textContent: 'Error', style: { display: 'block' } },
            errorPhone: { textContent: 'Error', style: { display: 'block' } },
            errorDate: { textContent: 'Error', style: { display: 'block' } },
            errorSpots: { textContent: 'Error', style: { display: 'block' } }
        };

        const originalElements = TourDetalleView.elements;
        TourDetalleView.elements = fakeElements;

        try {
            TourDetalleView.limpiarFormularioReserva();
            assert.equal(formResetLlamado, true, 'Debe invocar reservationForm.reset()');
            assert.equal(fakeElements.inputName.value, '', 'Debe vaciar inputName');
            assert.equal(fakeElements.inputEmail.value, '', 'Debe vaciar inputEmail');
            assert.equal(fakeElements.inputPhone.value, '', 'Debe vaciar inputPhone');
            assert.equal(fakeElements.selectDate.value, '', 'Debe vaciar selectDate');
            assert.equal(fakeElements.inputSpots.value, '1', 'Debe restablecer cupos a 1');
            assert.equal(fakeElements.errorPhone.textContent, '', 'Debe limpiar mensajes de error');
        } finally {
            TourDetalleView.elements = originalElements;
        }
    });

    it('verificarYBloquearReservaActiva debe ocultar formulario y mostrar tarjeta de reserva pendiente', async () => {
        const originalObtenerSesion = AuthModel.obtenerSesionActual;
        AuthModel.obtenerSesionActual = async () => ({ user: { id: 'turista-test-456' } });

        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (url) => {
            if (url.includes('tour_reservations')) {
                return {
                    ok: true,
                    json: async () => [{
                        id: 'res-activa-001',
                        status: 'pendiente_pago',
                        tour_id: 'a1000000-0000-0000-0000-000000000001',
                        spots_reserved: 2,
                        reservation_code: 'CM-ACT01',
                        expires_at: new Date(Date.now() + 3600000).toISOString()
                    }]
                };
            }
            return { ok: true, json: async () => [] };
        };

        let cardReservaOculta = false;
        let cardPendienteMostrada = false;
        let codigoPuesto = '';

        const fakeElements = {
            reservationForm: { reset() {} },
            reservationCard: {
                classList: {
                    add(c) { if (c === 'hidden') cardReservaOculta = true; },
                    remove() {}
                },
                style: {}
            },
            bookingCard: { classList: { add() {} }, style: {} },
            historialCard: { classList: { add() {} }, style: {} },
            reservaValidacionCard: { classList: { add() {} }, style: {} },
            reservationSuccessCard: { classList: { add() {} } },
            reservaPendienteCard: {
                classList: {
                    remove(c) { if (c === 'hidden') cardPendienteMostrada = true; }
                },
                style: {}
            },
            pendienteCodigo: { set textContent(t) { codigoPuesto = t; } },
            pendienteCupos: { set textContent(_) {} },
            pendienteFecha: { set textContent(_) {} },
            btnCompletarPago: { onclick: null },
            textoTiempoRestante: { set textContent(_) {} },
            inputName: { value: '', classList: { remove() {} } },
            inputEmail: { value: '', classList: { remove() {} } },
            inputPhone: { value: '', classList: { remove() {} } },
            selectDate: { value: '', classList: { remove() {} } },
            inputSpots: { value: '1', classList: { remove() {} } }
        };

        const originalElements = TourDetalleView.elements;
        TourDetalleView.elements = fakeElements;

        try {
            await TourDetalleController.verificarYBloquearReservaActiva();
            assert.equal(cardReservaOculta, true, 'El formulario de reserva "Reserva tu cupo" debe ocultarse');
            assert.equal(cardPendienteMostrada, true, 'La tarjeta de reserva pendiente debe mostrarse');
            assert.equal(codigoPuesto, 'CM-ACT01', 'Debe desplegar el código de la reserva activa');
        } finally {
            AuthModel.obtenerSesionActual = originalObtenerSesion;
            globalThis.fetch = originalFetch;
            TourDetalleView.elements = originalElements;
            TourDetalleView.limpiarTimer();
        }
    });
});

describe('Defecto 3: Validación y sanitización estricta de tourist_phone (CHECK ^[0-9]+$)', () => {
    describe('sanitizarTelefono', () => {
        it('debe remover guiones y espacios en blanco', () => {
            assert.equal(sanitizarTelefono('6234-5678'), '62345678');
            assert.equal(sanitizarTelefono('7123 4567'), '71234567');
            assert.equal(sanitizarTelefono(' 2250 - 1234 '), '22501234');
        });

        it('debe remover cualquier caracter no numérico (paréntesis, símbolos, letras)', () => {
            assert.equal(sanitizarTelefono('+503 (6234) 5678'), '50362345678');
            assert.equal(sanitizarTelefono('tel: 7000-1122 ext 4'), '700011224');
            assert.equal(sanitizarTelefono('abc-1234-5678-xyz'), '12345678');
        });

        it('debe retornar string vacío ante valores nulos, indefinidos o vacíos', () => {
            assert.equal(sanitizarTelefono(''), '');
            assert.equal(sanitizarTelefono(null), '');
            assert.equal(sanitizarTelefono(undefined), '');
            assert.equal(sanitizarTelefono('   '), '');
            assert.equal(sanitizarTelefono('solo-letras'), '');
        });

        it('debe manejar números (tipo number) convirtiéndolos a dígitos', () => {
            assert.equal(sanitizarTelefono(71234567), '71234567');
            assert.equal(sanitizarTelefono(22501234), '22501234');
        });
    });

    describe('validarFormularioReserva', () => {
        it('debe aceptar teléfonos salvadoreños estándar de 8 dígitos numéricos continuos', () => {
            const res1 = validarFormularioReserva({ phone: '71234567' });
            assert.equal(res1.esValido, true);
            assert.equal(res1.telefonoSanitizado, '71234567');

            const res2 = validarFormularioReserva({ telefono: '60012345' });
            assert.equal(res2.esValido, true);
            assert.equal(res2.telefonoSanitizado, '60012345');

            const res3 = validarFormularioReserva({ tourist_phone: '22501234' });
            assert.equal(res3.esValido, true);
            assert.equal(res3.telefonoSanitizado, '22501234');
        });

        it('debe aceptar teléfonos con guiones o espacios sanitizándolos internamente', () => {
            const res1 = validarFormularioReserva({ phone: '6234-5678' });
            assert.equal(res1.esValido, true);
            assert.equal(res1.telefonoSanitizado, '62345678', 'Debe quedar sanitizado a solo dígitos');

            const res2 = validarFormularioReserva({ telefono: '7123 4567' });
            assert.equal(res2.esValido, true);
            assert.equal(res2.telefonoSanitizado, '71234567');
        });

        it('debe aceptar números internacionales válidos entre 8 y 15 dígitos', () => {
            const res = validarFormularioReserva({ phone: '+503 7123-4567' });
            assert.equal(res.esValido, true);
            assert.equal(res.telefonoSanitizado, '50371234567');
        });

        it('debe rechazar teléfonos con menos de 8 dígitos numéricos con mensaje exacto', () => {
            const res1 = validarFormularioReserva({ phone: '123' });
            assert.equal(res1.esValido, false);
            assert.equal(res1.error, 'Ingresa un número de teléfono válido (mínimo 8 dígitos numéricos)');

            const res2 = validarFormularioReserva({ phone: '6234-56' });
            assert.equal(res2.esValido, false);
            assert.equal(res2.error, 'Ingresa un número de teléfono válido (mínimo 8 dígitos numéricos)');
        });

        it('debe rechazar teléfonos con más de 15 dígitos numéricos', () => {
            const res = validarFormularioReserva({ phone: '1234567890123456' });
            assert.equal(res.esValido, false);
            assert.equal(res.error, 'Ingresa un número de teléfono válido (mínimo 8 dígitos numéricos)');
        });

        it('debe rechazar entradas vacías o nulas', () => {
            const res1 = validarFormularioReserva({ phone: '' });
            assert.equal(res1.esValido, false);
            assert.equal(res1.error, 'Ingresa un número de teléfono válido (mínimo 8 dígitos numéricos)');

            const res2 = validarFormularioReserva({ phone: null });
            assert.equal(res2.esValido, false);
            assert.equal(res2.error, 'Ingresa un número de teléfono válido (mínimo 8 dígitos numéricos)');
        });
    });

    describe('crearReservaTour y sanitización en base de datos', () => {
        it('debe asegurar que tourist_phone enviado a Supabase contenga únicamente dígitos sin guiones ni espacios', async () => {
            const originalObtenerSesion = AuthModel.obtenerSesionActual;
            AuthModel.obtenerSesionActual = async () => ({
                user: { id: 'turista-uuid-123' },
                access_token: 'token-abc'
            });

            const originalFetch = globalThis.fetch;
            let payloadEnviado = null;

            globalThis.fetch = async (url, options = {}) => {
                if (url.includes('tour_reservations') && options.method === 'POST') {
                    payloadEnviado = JSON.parse(options.body);
                    return {
                        ok: true,
                        json: async () => [{ ...payloadEnviado, id: 'res-db-123' }]
                    };
                }
                return { ok: true, json: async () => [] };
            };

            try {
                const datos = {
                    tourId: 'a1000000-0000-0000-0000-000000000001',
                    tourDateId: 'd1000001',
                    tourDate: '2026-11-20',
                    nombre: 'Carlos Turista',
                    email: 'carlos@ejemplo.com',
                    telefono: '6234-5678', // Con guion
                    cuposReservados: 2
                };

                const res = await crearReservaTour(datos);
                assert.equal(res.ok, true);
                assert.equal(payloadEnviado.tourist_phone, '62345678', 'Debe enviar solo dígitos 62345678 sin guiones');
                assert.match(payloadEnviado.tourist_phone, /^[0-9]+$/, 'Cumple estrictamente CHECK (tourist_phone ~ ^[0-9]+$)');
            } finally {
                AuthModel.obtenerSesionActual = originalObtenerSesion;
                globalThis.fetch = originalFetch;
            }
        });
    });
});
