import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularPromedioRating,
    validarScoreRating,
    evaluarElegibilidadCalificacion,
    filtrarLugaresPorRating,
    CalificacionesModel
} from '../js/models/CalificacionesModel.js';
import {
    renderizarSeccionCalificacion,
    LugarDetalleController
} from '../js/controllers/LugarDetalleController.js';
import { LugarDetalleView } from '../js/views/LugarDetalleView.js';
import { AuthModel } from '../js/models/AuthModel.js';

describe('Suite de Pruebas: Calificación de Lugares Turísticos (ChocoMapaSV)', () => {

    describe('CA-01: Cálculo y formateo de promedio de calificaciones', () => {
        it('debe retornar estado neutral sin calificaciones (0 reseñas) sin usar valores quemados', () => {
            const casosSinCalificacion = [
                [],
                null,
                undefined,
                {},
                [{ score: 0 }],
                [{ score: -1 }]
            ];

            for (const caso of casosSinCalificacion) {
                const resultado = calcularPromedioRating(caso);
                assert.equal(resultado.promedio, 0, 'El promedio debe ser estrictamente 0');
                assert.equal(resultado.total, 0, 'El total de calificaciones debe ser 0');
                assert.equal(resultado.texto, 'Sin calificaciones aún', 'Debe retornar texto neutral exacto');
                assert.equal(resultado.tieneCalificaciones, false, 'tieneCalificaciones debe ser false');
                // Asegurar que no use valores quemados como 4.8
                assert.notEqual(resultado.promedio, 4.8, 'No debe usar el valor quemado 4.8');
            }
        });

        it('debe calcular promedio con 1 decimal exacto ante varias puntuaciones', () => {
            // Caso 1: 5 y 4 -> 9 / 2 = 4.5
            const res1 = calcularPromedioRating([{ score: 5 }, { score: 4 }]);
            assert.equal(res1.promedio, 4.5);
            assert.equal(res1.total, 2);
            assert.equal(res1.texto, '4.5');
            assert.equal(res1.tieneCalificaciones, true);

            // Caso 2: 5, 5, 4 -> 14 / 3 = 4.666... -> redondeo 4.7
            const res2 = calcularPromedioRating([{ score: 5 }, { score: 5 }, { score: 4 }]);
            assert.equal(res2.promedio, 4.7);
            assert.equal(res2.total, 3);
            assert.equal(res2.texto, '4.7');
            assert.equal(res2.tieneCalificaciones, true);

            // Caso 3: 1, 2, 3 -> 6 / 3 = 2.0
            const res3 = calcularPromedioRating([{ score: 1 }, { score: 2 }, { score: 3 }]);
            assert.equal(res3.promedio, 2.0);
            assert.equal(res3.total, 3);
            assert.equal(res3.texto, '2.0');
            assert.equal(res3.tieneCalificaciones, true);

            // Caso 4: Soporte con arreglo de números primitivos
            const res4 = calcularPromedioRating([5, 5, 5, 4]);
            assert.equal(res4.promedio, 4.8);
            assert.equal(res4.total, 4);
            assert.equal(res4.texto, '4.8');
            assert.equal(res4.tieneCalificaciones, true);
        });
    });

    describe('CA-02 y CA-03: Filtro por calificación en catálogo', () => {
        const catalogoPrueba = [
            { id: 'lugar-1', name: 'Playa El Tunco', ratings: [{ score: 5 }, { score: 5 }] }, // 5.0
            { id: 'lugar-2', name: 'Volcán de Santa Ana', ratings: [{ score: 4 }, { score: 4 }] }, // 4.0
            { id: 'lugar-3', name: 'Parque El Boquerón', ratings: [{ score: 3 }, { score: 4 }] }, // 3.5
            { id: 'lugar-4', name: 'Joya de Cerén', ratings: [{ score: 3 }, { score: 3 }] }, // 3.0
            { id: 'lugar-5', name: 'Lago de Ilopango', ratings: [{ score: 2 }, { score: 2 }] }, // 2.0
            { id: 'lugar-6', name: 'Sitio Nuevo Sin Calificar', ratings: [] } // 0 (sin calificaciones)
        ];

        it('debe filtrar lugares con rating mayor o igual a 4', () => {
            const filtrados = filtrarLugaresPorRating(catalogoPrueba, 4);
            assert.equal(filtrados.length, 2);
            assert.deepEqual(filtrados.map(l => l.id), ['lugar-1', 'lugar-2']);
            filtrados.forEach(lugar => {
                const info = calcularPromedioRating(lugar.ratings);
                assert.ok(info.promedio >= 4, `El lugar ${lugar.name} debe tener promedio >= 4`);
            });
        });

        it('debe filtrar lugares con rating mayor o igual a 3', () => {
            const filtrados = filtrarLugaresPorRating(catalogoPrueba, 3);
            assert.equal(filtrados.length, 4);
            assert.deepEqual(filtrados.map(l => l.id), ['lugar-1', 'lugar-2', 'lugar-3', 'lugar-4']);
            filtrados.forEach(lugar => {
                const info = calcularPromedioRating(lugar.ratings);
                assert.ok(info.promedio >= 3, `El lugar ${lugar.name} debe tener promedio >= 3`);
            });
        });

        it('debe mantener todos los lugares cuando el filtro es "Todas"', () => {
            const casosTodas = ['Todas', 'todas', 0, null, undefined, ''];

            for (const filtro of casosTodas) {
                const filtrados = filtrarLugaresPorRating(catalogoPrueba, filtro);
                assert.equal(filtrados.length, catalogoPrueba.length, `Con filtro '${filtro}' debe devolver todos`);
                assert.deepEqual(filtrados.map(l => l.id), catalogoPrueba.map(l => l.id));
            }
        });
    });

    describe('CA-04: Validación de score y elegibilidad por reserva confirmada', () => {
        it('debe rechazar valores decimales (ej. 4.8, 3.2)', () => {
            const decimales = [4.8, 3.2, 1.5, 4.99, 2.1];
            for (const score of decimales) {
                const res = validarScoreRating(score);
                assert.equal(res.esValido, false);
                assert.equal(res.error, 'La calificación debe ser un número entero entre 1 y 5');
            }
        });

        it('debe rechazar valores fuera de rango (< 1 o > 5) o no enteros', () => {
            const invalidos = [0, -1, -5, 6, 10, 100, '5', '4', null, undefined, NaN, {}, []];
            for (const score of invalidos) {
                const res = validarScoreRating(score);
                assert.equal(res.esValido, false);
                assert.equal(res.error, 'La calificación debe ser un número entero entre 1 y 5');
            }
        });

        it('debe aprobar enteros válidos del 1 al 5', () => {
            const validos = [1, 2, 3, 4, 5];
            for (const score of validos) {
                const res = validarScoreRating(score);
                assert.equal(res.esValido, true);
                assert.equal(res.error, undefined);
            }
        });

        it('debe rechazar calificación si el usuario no tiene tour con status "confirmada" para ese lugar', () => {
            const usuario = { id: 'usr-123', email: 'turista@sv.com' };
            const placeId = 'place-volcan';

            // Subcaso 1: Sin reservas de ningún tipo
            const resVacio = evaluarElegibilidadCalificacion({
                usuario,
                reservacionesConfirmadas: [],
                placeId,
                yaCalifico: false
            });
            assert.equal(resVacio.puede, false);
            assert.equal(resVacio.razon, 'SIN_TOUR_CONFIRMADO');
            assert.equal(resVacio.mensaje, 'Solo puedes calificar lugares turísticos incluidos en tours que hayas reservado y confirmado');

            // Subcaso 2: Reservas en estado pendiente o cancelada para ese lugar
            const reservasNoConfirmadas = [
                { id: 'res-1', status: 'pendiente_pago', place_id: placeId },
                { id: 'res-2', status: 'cancelada', place_id: placeId },
                { id: 'res-3', status: 'en_validacion', place_id: placeId }
            ];
            const resStatus = evaluarElegibilidadCalificacion({
                usuario,
                reservacionesConfirmadas: reservasNoConfirmadas,
                placeId,
                yaCalifico: false
            });
            assert.equal(resStatus.puede, false);
            assert.equal(resStatus.razon, 'SIN_TOUR_CONFIRMADO');

            // Subcaso 3: Reserva confirmada pero para OTRO lugar turístico
            const reservasOtroLugar = [
                { id: 'res-4', status: 'confirmada', place_id: 'otro-lugar-distinto' }
            ];
            const resOtro = evaluarElegibilidadCalificacion({
                usuario,
                reservacionesConfirmadas: reservasOtroLugar,
                placeId,
                yaCalifico: false
            });
            assert.equal(resOtro.puede, false);
            assert.equal(resOtro.razon, 'SIN_TOUR_CONFIRMADO');
        });

        it('debe rechazar calificación si el usuario ya emitió una calificación previa (inmutabilidad)', () => {
            const usuario = { id: 'usr-123' };
            const placeId = 'place-volcan';
            const reservacionesConfirmadas = [{ id: 'res-1', status: 'confirmada', place_id: placeId }];

            const res = evaluarElegibilidadCalificacion({
                usuario,
                reservacionesConfirmadas,
                placeId,
                yaCalifico: true
            });

            assert.equal(res.puede, false);
            assert.equal(res.razon, 'YA_CALIFICADO');
            assert.equal(res.mensaje, 'Ya has calificado este lugar turístico');
        });

        it('debe permitir calificación cuando existe reserva confirmada y el usuario no ha votado antes', () => {
            const usuario = { id: 'usr-123' };
            const placeId = 'place-volcan';

            // Coincidencia directa por place_id
            const resDirecta = evaluarElegibilidadCalificacion({
                usuario,
                reservacionesConfirmadas: [
                    { id: 'res-1', status: 'confirmada', place_id: placeId, tourist_id: 'usr-123' }
                ],
                placeId,
                yaCalifico: false
            });
            assert.equal(resDirecta.puede, true);

            // Coincidencia con tour_places asociados a la reserva
            const resTourPlaces = evaluarElegibilidadCalificacion({
                usuario,
                reservacionesConfirmadas: [
                    {
                        id: 'res-2',
                        status: 'confirmada',
                        tour_places: [{ place_id: placeId }]
                    }
                ],
                placeId,
                yaCalifico: false
            });
            assert.equal(resTourPlaces.puede, true);
        });
    });

    describe('CA-05: Restricción para usuarios sin sesión y reseteo reactivo en logout', () => {
        function setupMockDom() {
            const registry = {};

            function createMockElement(tagName = 'div') {
                const children = [];
                const eventListeners = {};
                const attributes = {};
                const elem = {
                    tagName: tagName.toUpperCase(),
                    children,
                    className: '',
                    id: '',
                    textContent: '',
                    innerHTML: '',
                    classList: {
                        classes: new Set(),
                        add(...cls) { cls.forEach(c => this.classes.add(c)); },
                        remove(...cls) { cls.forEach(c => this.classes.delete(c)); },
                        toggle(cls, force) {
                            if (force === undefined) {
                                if (this.classes.has(cls)) this.classes.delete(cls); else this.classes.add(cls);
                            } else if (force) this.classes.add(cls);
                            else this.classes.delete(cls);
                        },
                        contains(cls) { return this.classes.has(cls); }
                    },
                    setAttribute(k, v) { attributes[k] = String(v); },
                    getAttribute(k) { return attributes[k] || null; },
                    append(...nodes) {
                        nodes.forEach(n => {
                            if (n) {
                                children.push(n);
                                n.parentNode = elem;
                            }
                        });
                    },
                    appendChild(node) {
                        children.push(node);
                        node.parentNode = elem;
                        return node;
                    },
                    replaceChildren(...nodes) {
                        children.length = 0;
                        this.textContent = '';
                        nodes.forEach(n => {
                            if (n) {
                                children.push(n);
                                n.parentNode = elem;
                            }
                        });
                    },
                    addEventListener(ev, fn) {
                        if (!eventListeners[ev]) eventListeners[ev] = [];
                        eventListeners[ev].push(fn);
                    },
                    click() {
                        (eventListeners['click'] || []).forEach(fn => fn({ preventDefault() {} }));
                    },
                    obtenerTextoCompleto() {
                        let txt = this.textContent || '';
                        children.forEach(c => {
                            if (c && typeof c.obtenerTextoCompleto === 'function') {
                                txt += ' ' + c.obtenerTextoCompleto();
                            } else if (c && c.textContent) {
                                txt += ' ' + c.textContent;
                            }
                        });
                        return txt;
                    }
                };
                return elem;
            }

            const container = createMockElement('div');
            container.id = 'rating-widget-container';
            registry['rating-widget-container'] = container;

            globalThis.document = {
                getElementById(id) {
                    return registry[id] || null;
                },
                createElement(tag) {
                    return createMockElement(tag);
                },
                createElementNS(ns, tag) {
                    return createMockElement(tag);
                }
            };

            if (typeof globalThis.window === 'undefined') {
                globalThis.window = {
                    addEventListener() {},
                    dispatchEvent() {},
                    location: {
                        pathname: '/detalle-lugar.html',
                        search: '?id=lugar-test'
                    }
                };
            }

            return { container, registry, createMockElement };
        }

        it('debe bloquear intento si la sesión es null, undefined, false o si los parámetros son nulos/vacíos', async () => {
            const casosSinSesion = [null, undefined, false];

            for (const usuario of casosSinSesion) {
                const res = evaluarElegibilidadCalificacion({
                    usuario,
                    reservacionesConfirmadas: [{ status: 'confirmada', place_id: 'p-1' }],
                    placeId: 'p-1',
                    yaCalifico: false
                });

                assert.equal(res.puede, false);
                assert.equal(res.razon, 'AUTH_REQUERIDA');
                assert.equal(res.mensaje, 'Debes iniciar sesión para calificar este lugar');
            }

            // Llamada directa sin parámetros
            const resVacio = evaluarElegibilidadCalificacion();
            assert.equal(resVacio.puede, false);
            assert.equal(resVacio.razon, 'AUTH_REQUERIDA');

            // Llamada pasando null como parámetro
            const resParamNull = evaluarElegibilidadCalificacion(null);
            assert.equal(resParamNull.puede, false);
            assert.equal(resParamNull.razon, 'AUTH_REQUERIDA');

            // Llamada a verificarElegibilidad con usuarioEspecifico = null
            const resModelo = await CalificacionesModel.verificarElegibilidad('lugar-1', null);
            assert.equal(resModelo.puede, false);
            assert.equal(resModelo.razon, 'AUTH_REQUERIDA');
            assert.equal(resModelo.yaCalifico, false);
            assert.equal(resModelo.usuario, null);
        });

        it('debe limpiar el estado "Ya has calificado este lugar" y renderizar el aviso para invitados al llamar renderizarSeccionCalificacion con usuario null', async () => {
            const { container, createMockElement } = setupMockDom();

            // Simular estado previo en el DOM donde el usuario anterior ya había calificado
            const previoDoneCard = createMockElement('div');
            previoDoneCard.className = 'rating-widget-done';
            previoDoneCard.textContent = 'Ya has calificado este lugar';
            container.appendChild(previoDoneCard);

            assert.ok(container.obtenerTextoCompleto().includes('Ya has calificado este lugar'), 'El DOM debe contener inicialmente el aviso previo');

            // Ejecutar renderizarSeccionCalificacion para usuario null (invitado o tras logout)
            await renderizarSeccionCalificacion('lugar-1', null);

            const textoActualizado = container.obtenerTextoCompleto();
            // Debe haber limpiado completamente el mensaje del usuario anterior
            assert.ok(!textoActualizado.includes('Ya has calificado este lugar'), 'No debe persistir el mensaje "Ya has calificado este lugar"');
            // Debe mostrar el estado para invitado
            assert.ok(textoActualizado.includes('Debes iniciar sesión para calificar este lugar'), 'Debe mostrar el mensaje de autenticación requerida');
            assert.ok(textoActualizado.includes('Inicia sesión para calificar este lugar'), 'Debe mostrar la invitación o botón para iniciar sesión');
        });

        it('debe suscribirse a eventos de AuthModel y limpiar el widget ante SIGNED_OUT', async () => {
            const { container, createMockElement } = setupMockDom();

            // Estado previo con calificación
            const previoBadge = createMockElement('div');
            previoBadge.textContent = 'Ya has calificado este lugar';
            container.appendChild(previoBadge);

            LugarDetalleController.placeIdActual = 'lugar-reactivo';
            LugarDetalleController.inicializarSuscripcionAuth();

            // Simular cierre de sesión
            await AuthModel.cerrarSesion();

            const textoFinal = container.obtenerTextoCompleto();
            assert.ok(!textoFinal.includes('Ya has calificado este lugar'), 'El aviso de calificación previa debe desaparecer tras el cierre de sesión');
            assert.ok(textoFinal.includes('Inicia sesión para calificar este lugar'), 'Debe quedar renderizado el estado bloqueado para invitados');
        });
    });
});
