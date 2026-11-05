import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    determinarDestinatariosNotificacion,
    construirPayloadNotificacion,
    crearRegistroConfirmacionMessage,
    obtenerEmailUsuarioAuth,
    enviarEmailReal,
    enviarNotificacionesReserva,
    NotificacionesModel
} from '../js/models/NotificacionesModel.js';
import {
    EMAILJS_SERVICE_ID_B64,
    EMAILJS_TEMPLATE_ID_B64,
    EMAILJS_PUBLIC_KEY_B64
} from '../js/config.js';

import { AuthModel } from '../js/models/AuthModel.js';
import { MisToursView } from '../js/views/MisToursView.js';
import { AdminPagosView } from '../js/views/AdminPagosView.js';
import { AdminPagosModel } from '../js/models/AdminPagosModel.js';
import { PagoController } from '../js/controllers/PagoController.js';

describe('Suite de Pruebas: Motor de Notificaciones por Correo Electrónico (ChocoMapaSV)', () => {

    describe('Notificaciones: Determinación de destinatarios sin duplicados', () => {

        it('debe retornar un arreglo de exactamente 1 elemento cuando emailAuth === emailReserva', () => {
            const resultado = determinarDestinatariosNotificacion({
                emailAuth: 'turista@mitur.gob.sv',
                emailReserva: 'turista@mitur.gob.sv'
            });

            assert.equal(Array.isArray(resultado), true);
            assert.equal(resultado.length, 1);
            assert.equal(resultado[0], 'turista@mitur.gob.sv');
        });

        it('debe retornar un arreglo con ambos correos cuando emailAuth !== emailReserva', () => {
            const resultado = determinarDestinatariosNotificacion({
                emailAuth: 'usuario.cuenta@mitur.gob.sv',
                emailReserva: 'contacto.reserva@gmail.com'
            });

            assert.equal(Array.isArray(resultado), true);
            assert.equal(resultado.length, 2);
            assert.ok(resultado.includes('usuario.cuenta@mitur.gob.sv'));
            assert.ok(resultado.includes('contacto.reserva@gmail.com'));
        });

        it('debe tolerar mayúsculas y espacios en blanco accidentales (ej. " Pablo@mail.com " vs "pablo@mail.com")', () => {
            const resultado = determinarDestinatariosNotificacion({
                emailAuth: '   Pablo@mail.com  ',
                emailReserva: 'pablo@mail.com'
            });

            assert.equal(Array.isArray(resultado), true);
            assert.equal(resultado.length, 1, 'Debe desduplicar correos idénticos ignorando mayúsculas y espacios');
            assert.equal(resultado[0], 'pablo@mail.com');

            // Caso inverso con espacios y mayúsculas en la reserva
            const resultadoInverso = determinarDestinatariosNotificacion({
                emailAuth: 'carlos.rivas@gmail.com',
                emailReserva: '  CARLOS.RIVAS@GMAIL.COM  '
            });
            assert.equal(resultadoInverso.length, 1);
            assert.equal(resultadoInverso[0], 'carlos.rivas@gmail.com');
        });

        it('debe rechazar o ignorar valores nulos, vacíos o mal formados', () => {
            // Caso ambos nulos o vacíos
            assert.deepEqual(determinarDestinatariosNotificacion({ emailAuth: null, emailReserva: null }), []);
            assert.deepEqual(determinarDestinatariosNotificacion({ emailAuth: '', emailReserva: '   ' }), []);
            assert.deepEqual(determinarDestinatariosNotificacion({ emailAuth: undefined, emailReserva: undefined }), []);

            // Caso correo sin arroba (@)
            assert.deepEqual(determinarDestinatariosNotificacion({ emailAuth: 'usuariocorreo.com', emailReserva: 'sincorreo' }), []);

            // Caso un correo válido y otro nulo/inválido
            const soloAuthValido = determinarDestinatariosNotificacion({
                emailAuth: 'valido@dominio.com',
                emailReserva: null
            });
            assert.equal(soloAuthValido.length, 1);
            assert.equal(soloAuthValido[0], 'valido@dominio.com');

            const soloReservaValida = determinarDestinatariosNotificacion({
                emailAuth: 'texto-sin-formato',
                emailReserva: '  reserva@turismo.sv  '
            });
            assert.equal(soloReservaValida.length, 1);
            assert.equal(soloReservaValida[0], 'reserva@turismo.sv');
        });
    });

    describe('Notificaciones: Contenido obligatorio según estado', () => {

        it('debe validar que ante un rechazo el objeto de notificación incluya obligatoriamente el campo rejection_reason', () => {
            const payloadRechazo = construirPayloadNotificacion({
                tipo: 'rechazo_tour',
                nombreTour: 'Ruta de las Flores: Salcoatitán y Juayúa',
                fechaTour: '2026-11-20',
                horaTour: '07:30 AM',
                cupos: 2,
                montoTotal: 70,
                motivoRechazo: 'El comprobante presentado no coincide con la fecha de la transacción bancaria.'
            });

            assert.equal(payloadRechazo.tipo, 'rechazo_tour');
            assert.ok(payloadRechazo.rejection_reason, 'Debe contener el campo rejection_reason');
            assert.equal(
                payloadRechazo.rejection_reason,
                'El comprobante presentado no coincide con la fecha de la transacción bancaria.'
            );
            assert.equal(payloadRechazo.tour_name, 'Ruta de las Flores: Salcoatitán y Juayúa');
            assert.equal(payloadRechazo.spots_reserved, 2);
            assert.equal(payloadRechazo.total_amount, 70);
        });

        it('debe lanzar un error si se intenta construir una notificación de rechazo sin rejection_reason o con espacios', () => {
            assert.throws(() => {
                construirPayloadNotificacion({
                    tipo: 'rechazo_tour',
                    nombreTour: 'Volcán de Santa Ana',
                    motivoRechazo: ''
                });
            }, /El motivo de rechazo \(rejection_reason\) es obligatorio/);

            assert.throws(() => {
                construirPayloadNotificacion({
                    tipo: 'rechazo_tour',
                    nombreTour: 'Volcán de Santa Ana',
                    motivoRechazo: '     '
                });
            }, /El motivo de rechazo \(rejection_reason\) es obligatorio/);

            assert.throws(() => {
                construirPayloadNotificacion({
                    tipo: 'rechazo_tour',
                    nombreTour: 'Volcán de Santa Ana',
                    motivoRechazo: null
                });
            }, /El motivo de rechazo \(rejection_reason\) es obligatorio/);
        });

        it('debe construir el payload de confirmación con nombre de tour, fecha, hora, cupos y monto total', () => {
            const payloadConfirmacion = construirPayloadNotificacion({
                tipo: 'confirmacion_tour',
                nombreTour: 'Surf City & Playas de La Libertad',
                fechaTour: '2026-11-15',
                horaTour: '06:00 AM',
                cupos: 3,
                montoTotal: 105
            });

            assert.equal(payloadConfirmacion.tipo, 'confirmacion_tour');
            assert.equal(payloadConfirmacion.tour_name, 'Surf City & Playas de La Libertad');
            assert.equal(payloadConfirmacion.tour_date, '2026-11-15');
            assert.equal(payloadConfirmacion.departure_time, '06:00 AM');
            assert.equal(payloadConfirmacion.spots_reserved, 3);
            assert.equal(payloadConfirmacion.total_amount, 105);
            assert.equal(payloadConfirmacion.rejection_reason, undefined);
        });

        it('debe estructurar el registro para public.confirmation_messages con channel email y status enviado según esquema DDL (sin recipient ni payload)', () => {
            const registro = crearRegistroConfirmacionMessage({
                reservaId: 'res-abc-123',
                tipo: 'confirmacion_tour',
                status: 'enviado'
            });

            assert.equal(registro.reservation_id, 'res-abc-123');
            assert.equal(registro.channel, 'email');
            assert.equal(registro.message_type, 'confirmacion_tour');
            assert.equal(registro.status, 'enviado');
            assert.equal(registro.attempts, 1);
            assert.ok(registro.sent_at);
            assert.ok(registro.created_at);
            // El esquema DDL de confirmation_messages no posee columnas recipient ni payload
            assert.equal(registro.recipient, undefined);
            assert.equal(registro.payload, undefined);
        });

        it('crearRegistroConfirmacionMessage debe arrojar error si tipo es rechazo_tour y falta rejection_reason en payload', () => {
            assert.throws(() => {
                crearRegistroConfirmacionMessage({
                    reservaId: 'res-abc-123',
                    destinatario: 'turista@mitur.gob.sv',
                    tipo: 'rechazo_tour',
                    payload: { tour_name: 'Tour' }
                });
            }, /rejection_reason/);
        });
    });

    describe('Notificaciones: Resolución segura de emailAuth sin llamadas 403, 404 ni 400', () => {
        it('debe retornar el correo de la sesión activa si el usuario logueado es el dueño de la reserva', async () => {
            const originalSesion = AuthModel.obtenerSesionActual;
            AuthModel.obtenerSesionActual = async () => ({
                user: { id: 'turista-uuid-1', email: 'turista.activo@mitur.gob.sv' }
            });

            try {
                const email = await obtenerEmailUsuarioAuth('turista-uuid-1');
                assert.equal(email, 'turista.activo@mitur.gob.sv');
            } finally {
                AuthModel.obtenerSesionActual = originalSesion;
            }
        });

        it('debe invocar RPC get_tourist_auth_email de Supabase si se consulta otro usuario desde admin', async () => {
            const originalSesion = AuthModel.obtenerSesionActual;
            const originalGlobalSupabase = globalThis.supabase;
            const originalWindow = globalThis.window;

            AuthModel.obtenerSesionActual = async () => ({
                user: { id: 'admin-uuid-99', email: 'admin@mitur.gob.sv' }
            });

            let rpcNameLlamada = '';
            let rpcParamsLlamados = null;

            globalThis.window = {
                supabase: {
                    rpc: async (fn, params) => {
                        rpcNameLlamada = fn;
                        rpcParamsLlamados = params;
                        return { data: 'turista.remoto@mitur.gob.sv', error: null };
                    }
                }
            };

            try {
                const email = await obtenerEmailUsuarioAuth('turista-uuid-2');
                assert.equal(email, 'turista.remoto@mitur.gob.sv');
                assert.equal(rpcNameLlamada, 'get_tourist_auth_email');
                assert.deepEqual(rpcParamsLlamados, { target_user_id: 'turista-uuid-2' });
            } finally {
                AuthModel.obtenerSesionActual = originalSesion;
                globalThis.supabase = originalGlobalSupabase;
                globalThis.window = originalWindow;
            }
        });

        it('no debe disparar endpoints administrativos no permitidos (/auth/v1/admin/users) ni tablas inexistentes (/rest/v1/users, /rest/v1/profiles)', async () => {
            const originalSesion = AuthModel.obtenerSesionActual;
            const originalFetch = globalThis.fetch;

            AuthModel.obtenerSesionActual = async () => null;

            const urlsLlamadas = [];
            globalThis.fetch = async (url) => {
                urlsLlamadas.push(url);
                return { ok: false, status: 404, json: async () => ({}) };
            };

            try {
                const email = await obtenerEmailUsuarioAuth('turista-uuid-3');
                assert.equal(email, null, 'Debe retornar null de forma segura');
                assert.equal(
                    urlsLlamadas.some(u => u.includes('/auth/v1/admin/users/')),
                    false,
                    'No debe llamar a /auth/v1/admin/users/'
                );
                assert.equal(
                    urlsLlamadas.some(u => u.includes('/rest/v1/users')),
                    false,
                    'No debe llamar a /rest/v1/users'
                );
                assert.equal(
                    urlsLlamadas.some(u => u.includes('/rest/v1/profiles')),
                    false,
                    'No debe llamar a /rest/v1/profiles'
                );
            } finally {
                AuthModel.obtenerSesionActual = originalSesion;
                globalThis.fetch = originalFetch;
            }
        });

        it('enviarNotificacionesReserva debe insertar filas válidas según el DDL y emitir log en consola', async () => {
            const originalFetch = globalThis.fetch;
            const originalLog = console.log;

            const registrosInsertados = [];
            const logsEmitidos = [];

            globalThis.fetch = async (url, opts) => {
                if (url.includes('confirmation_messages')) {
                    registrosInsertados.push(JSON.parse(opts.body));
                    return { ok: true, json: async () => [{ id: 'msg-1' }] };
                }
                return { ok: true, json: async () => [] };
            };

            console.log = (...args) => {
                logsEmitidos.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
            };

            try {
                const res = await enviarNotificacionesReserva({
                    reservaId: 'res-rechazo-100',
                    tipo: 'rechazo_tour',
                    reserva: {
                        tour_name: 'Tour Volcán de Conchagua',
                        tour_date: '2026-12-01',
                        departure_time: '05:00 AM',
                        spots_reserved: 2,
                        total_amount: 80,
                        tourist_email: 'turista@correo.com'
                    },
                    motivoRechazo: 'El comprobante bancario no es legible'
                });

                assert.equal(res.ok, true);
                assert.equal(registrosInsertados.length, 1);
                const reg = registrosInsertados[0];
                assert.equal(reg.reservation_id, 'res-rechazo-100');
                assert.equal(reg.message_type, 'rechazo_tour');
                assert.equal(reg.channel, 'email');
                assert.equal(reg.status, 'enviado');
                assert.equal(reg.recipient, undefined, 'No debe tener recipient en la tabla DDL');
                assert.equal(reg.payload, undefined, 'No debe tener payload en la tabla DDL');

                // Verificar logs en consola
                assert.ok(logsEmitidos.some(l => l.includes('[Notificaciones]') && l.includes('El comprobante bancario no es legible')));
            } finally {
                globalThis.fetch = originalFetch;
                console.log = originalLog;
            }
        });
    });

    describe('Despacho Físico de Correo vía EmailJS REST API', () => {
        it('las constantes de EmailJS en config.js deben tener los valores oficiales del proyecto (codificadas en Base64)', () => {
            const decode = (val) => typeof atob === 'function' ? atob(val) : Buffer.from(val, 'base64').toString('utf-8');
            assert.equal(decode(EMAILJS_SERVICE_ID_B64), 'service_5fxcq7c');
            assert.equal(decode(EMAILJS_TEMPLATE_ID_B64), 'template_9uf3e0d');
            assert.equal(decode(EMAILJS_PUBLIC_KEY_B64), 'acny_NrtqcvTUzgbJ');
            assert.equal(typeof NotificacionesModel.enviarEmailReal, 'function');
        });

        it('enviarEmailReal realiza POST con cabecera application/json y payload estructurado', async () => {
            const originalFetch = globalThis.fetch;
            let endpointLlamado = '';
            let methodLlamado = '';
            let headersLlamadas = {};
            let bodyParseado = null;

            globalThis.fetch = async (url, opts) => {
                endpointLlamado = url;
                methodLlamado = opts.method;
                headersLlamadas = opts.headers;
                bodyParseado = JSON.parse(opts.body);
                return { ok: true, status: 200 };
            };

            try {
                const res = await enviarEmailReal({
                    to_email: 'turista@correo.sv',
                    to_name: 'Ana Guardado',
                    asunto: 'Confirmación de Reserva MITUR - RES-9988',
                    mensaje: 'Su reserva ha sido confirmada con éxito.',
                    tour_name: 'Tour Volcán de Santa Ana',
                    fecha: '2026-11-20',
                    cupos: 2,
                    monto: 70,
                    motivo_rechazo: null
                });

                assert.equal(res.ok, true);
                assert.equal(res.status, 200);
                assert.equal(endpointLlamado, 'https://api.emailjs.com/api/v1.0/email/send');
                assert.equal(methodLlamado, 'POST');
                assert.equal(headersLlamadas['Content-Type'], 'application/json');

                assert.equal(bodyParseado.service_id, 'service_5fxcq7c');
                assert.equal(bodyParseado.template_id, 'template_9uf3e0d');
                assert.equal(bodyParseado.user_id, 'acny_NrtqcvTUzgbJ');

                const params = bodyParseado.template_params;
                assert.equal(params.to_email, 'turista@correo.sv');
                assert.equal(params.to_name, 'Ana Guardado');
                assert.equal(params.subject, 'Confirmación de Reserva MITUR - RES-9988');
                assert.equal(params.tour_name, 'Tour Volcán de Santa Ana');
                assert.equal(params.tour_date, '2026-11-20');
                assert.equal(params.spots, 2);
                assert.equal(params.total_amount, 70);
                assert.equal(params.rejection_reason, 'N/A');
                assert.equal(params.message, 'Su reserva ha sido confirmada con éxito.');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('enviarEmailReal debe aplicar fallbacks "Turista" y "N/A" cuando to_name y motivo_rechazo son vacíos o nulos', async () => {
            const originalFetch = globalThis.fetch;
            let bodyParseado = null;

            globalThis.fetch = async (url, opts) => {
                bodyParseado = JSON.parse(opts.body);
                return { ok: true, status: 200 };
            };

            try {
                await enviarEmailReal({
                    to_email: 'viajero@correo.sv',
                    asunto: 'Aviso MITUR',
                    mensaje: 'Mensaje de prueba'
                });

                assert.equal(bodyParseado.template_params.to_name, 'Turista');
                assert.equal(bodyParseado.template_params.rejection_reason, 'N/A');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('enviarEmailReal captura excepciones de red y retorna { ok: false, status: 0 } sin lanzar excepción', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () => {
                throw new Error('Network error (proveedor no alcanzable)');
            };

            try {
                const res = await enviarEmailReal({
                    to_email: 'falla@correo.sv',
                    asunto: 'Test Falla',
                    mensaje: 'No debe romper'
                });

                assert.equal(res.ok, false);
                assert.equal(res.status, 0);
                assert.ok(res.error);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('enviarNotificacionesReserva para confirmacion_tour despacha asunto y mensaje exactos vía EmailJS', async () => {
            const originalFetch = globalThis.fetch;
            const emailsEnviados = [];
            const registrosAuditados = [];

            globalThis.fetch = async (url, opts) => {
                if (url.includes('emailjs.com')) {
                    emailsEnviados.push(JSON.parse(opts.body));
                    return { ok: true, status: 200 };
                }
                if (url.includes('confirmation_messages')) {
                    registrosAuditados.push(JSON.parse(opts.body));
                    return { ok: true, json: async () => [{ id: 'audit-1' }] };
                }
                return { ok: true, json: async () => [] };
            };

            try {
                const resultado = await enviarNotificacionesReserva({
                    reservaId: 'res-conf-555',
                    tipo: 'confirmacion_tour',
                    reserva: {
                        reservation_code: 'RES-CM-555',
                        tour_name: 'Ruta de Las Flores',
                        tour_date: '2026-11-28',
                        departure_time: '06:30 AM',
                        spots_reserved: 3,
                        total_amount: 105,
                        tourist_name: 'María Hernández',
                        tourist_email: 'maria@ejemplo.com'
                    }
                });

                assert.equal(resultado.ok, true);
                assert.equal(registrosAuditados.length, 1);
                assert.equal(emailsEnviados.length, 1);

                const email = emailsEnviados[0];
                assert.equal(email.template_params.to_email, 'maria@ejemplo.com');
                assert.equal(email.template_params.to_name, 'María Hernández');
                assert.equal(email.template_params.subject, 'Confirmación de Reserva MITUR - RES-CM-555');
                assert.equal(
                    email.template_params.message,
                    'Su reserva ha sido confirmada con éxito. Adjuntamos los detalles oficiales de su tour.'
                );
                assert.equal(email.template_params.tour_name, 'Ruta de Las Flores');
                assert.equal(email.template_params.spots, 3);
                assert.equal(email.template_params.total_amount, 105);
                assert.equal(email.template_params.rejection_reason, 'N/A');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('enviarNotificacionesReserva para rechazo_tour despacha asunto, mensaje y rejection_reason obligatorio', async () => {
            const originalFetch = globalThis.fetch;
            const emailsEnviados = [];
            const logs = [];
            const originalLog = console.log;

            console.log = (...args) => {
                logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
            };

            globalThis.fetch = async (url, opts) => {
                if (url.includes('emailjs.com')) {
                    emailsEnviados.push(JSON.parse(opts.body));
                    return { ok: true, status: 200 };
                }
                return { ok: true, json: async () => [{ id: 'audit-2' }] };
            };

            try {
                const resultado = await enviarNotificacionesReserva({
                    reservaId: 'res-rech-777',
                    tipo: 'rechazo_tour',
                    reserva: {
                        tour_name: 'Tour Suchitoto Cultural',
                        tour_date: '2026-12-05',
                        departure_time: '08:00 AM',
                        spots_reserved: 1,
                        total_amount: 35,
                        tourist_name: 'Roberto Gómez',
                        tourist_email: 'roberto@ejemplo.com',
                        rejection_reason: 'Comprobante bancario borroso e ilegible'
                    },
                    motivoRechazo: 'Comprobante bancario borroso e ilegible'
                });

                assert.equal(resultado.ok, true);
                assert.equal(emailsEnviados.length, 1);

                const email = emailsEnviados[0];
                assert.equal(email.template_params.to_email, 'roberto@ejemplo.com');
                // Al no tener reservation_code usa reservaId como fallback
                assert.equal(email.template_params.subject, 'Actualización de Reserva MITUR - res-rech-777');
                assert.equal(
                    email.template_params.message,
                    'Su comprobante de pago ha sido rechazado. Motivo: Comprobante bancario borroso e ilegible'
                );
                assert.equal(
                    email.template_params.rejection_reason,
                    'Comprobante bancario borroso e ilegible'
                );

                // Comprobar logs de auditoría y despacho físico
                assert.ok(logs.some(l => l.includes('[Auditoría]')));
                assert.ok(logs.some(l => l.includes('[EmailJS]') && l.includes('Despacho físico')));
            } finally {
                globalThis.fetch = originalFetch;
                console.log = originalLog;
            }
        });

        it('enviarNotificacionesReserva despacha a ambos correos cuando emailAuth y emailReserva son distintos', async () => {
            const originalFetch = globalThis.fetch;
            const originalSesion = AuthModel.obtenerSesionActual;
            const emailsEnviados = [];

            AuthModel.obtenerSesionActual = async () => ({
                user: { id: 'turista-usr-88', email: 'cuenta.auth@turismo.gob.sv' }
            });

            globalThis.fetch = async (url, opts) => {
                if (url.includes('emailjs.com')) {
                    emailsEnviados.push(JSON.parse(opts.body));
                    return { ok: true, status: 200 };
                }
                return { ok: true, json: async () => [{ id: 'ok' }] };
            };

            try {
                const res = await enviarNotificacionesReserva({
                    reservaId: 'res-multi-1',
                    tipo: 'confirmacion_tour',
                    reserva: {
                        tourist_id: 'turista-usr-88',
                        tourist_email: 'correo.reserva@gmail.com',
                        tour_name: 'Tour Golfo de Fonseca',
                        spots_reserved: 2,
                        total_amount: 80
                    }
                });

                assert.equal(res.ok, true);
                assert.equal(res.destinatarios.length, 2);
                assert.equal(emailsEnviados.length, 2);

                const emailsDestinatarios = emailsEnviados.map(e => e.template_params.to_email);
                assert.ok(emailsDestinatarios.includes('cuenta.auth@turismo.gob.sv'));
                assert.ok(emailsDestinatarios.includes('correo.reserva@gmail.com'));
            } finally {
                globalThis.fetch = originalFetch;
                AuthModel.obtenerSesionActual = originalSesion;
            }
        });

        it('enviarNotificacionesReserva no interrumpe el flujo si EmailJS lanza excepción de red (tolerancia a fallos)', async () => {
            const originalFetch = globalThis.fetch;
            const auditorias = [];

            globalThis.fetch = async (url, opts) => {
                if (url.includes('confirmation_messages')) {
                    auditorias.push(JSON.parse(opts.body));
                    return { ok: true, json: async () => [{ id: 'audit-safe' }] };
                }
                if (url.includes('emailjs.com')) {
                    throw new Error('Servicio EmailJS no disponible');
                }
                return { ok: true, json: async () => [] };
            };

            try {
                const res = await enviarNotificacionesReserva({
                    reservaId: 'res-safe-01',
                    tipo: 'confirmacion_tour',
                    reserva: {
                        tourist_email: 'turista@seguro.com',
                        tour_name: 'Tour Playa El Tunco'
                    }
                });

                // Debe retornar ok: true y haber registrado la auditoría
                assert.equal(res.ok, true);
                assert.equal(auditorias.length, 1);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('Protección ante Cierre de Sesión (Logout) en pago-comprobante.html', () => {
        it('debe suscribirse a onAuthStateChange y redirigir inmediatamente a login.html ante SIGNED_OUT', () => {
            let replacedUrl = '';
            let authCallback = null;
            let storageCleared = false;

            globalThis.sessionStorage = {
                clear: () => { storageCleared = true; }
            };

            globalThis.window = {
                location: {
                    replace: (url) => { replacedUrl = url; }
                },
                supabase: {
                    auth: {
                        onAuthStateChange: (cb) => { authCallback = cb; }
                    }
                }
            };

            PagoController.configurarProteccionCierreSesion();
            assert.ok(typeof authCallback === 'function', 'Debe registrar listener en onAuthStateChange');

            // Simular evento SIGNED_OUT
            authCallback('SIGNED_OUT', null);

            assert.equal(replacedUrl, 'login.html');
            assert.equal(storageCleared, true);
        });

        it('debe interceptar el clic en #nav-btn-logout, cerrar sesión y redirigir inmediatamente a login.html', async () => {
            let replacedUrl = '';
            let storageCleared = false;
            let signOutLlamado = false;
            let cerrarSesionAuthLlamado = false;
            let clickHandler = null;

            globalThis.sessionStorage = {
                clear: () => { storageCleared = true; }
            };

            globalThis.window = {
                location: {
                    replace: (url) => { replacedUrl = url; }
                },
                supabase: {
                    auth: {
                        signOut: async () => { signOutLlamado = true; }
                    }
                }
            };

            const originalCerrarSesion = AuthModel.cerrarSesion;
            AuthModel.cerrarSesion = async () => { cerrarSesionAuthLlamado = true; };

            const fakeBtn = {
                dataset: {},
                addEventListener: (event, handler, useCapture) => {
                    if (event === 'click' && useCapture === true) {
                        clickHandler = handler;
                    }
                }
            };

            globalThis.document = {
                getElementById: (id) => (id === 'nav-btn-logout' ? fakeBtn : null),
                addEventListener: () => {}
            };

            try {
                PagoController.configurarProteccionCierreSesion();
                assert.ok(typeof clickHandler === 'function', 'Debe registrar click handler en fase de captura');

                const fakeEvent = {
                    preventDefault: () => {},
                    stopPropagation: () => {}
                };

                await clickHandler(fakeEvent);

                assert.equal(signOutLlamado, true);
                assert.equal(cerrarSesionAuthLlamado, true);
                assert.equal(storageCleared, true);
                assert.equal(replacedUrl, 'login.html');
            } finally {
                AuthModel.cerrarSesion = originalCerrarSesion;
            }
        });

        it('debe redirigir a login.html si el ciclo de vida (pageshow, focus, visibilitychange) detecta sesión nula', async () => {
            let replacedUrl = '';
            let visibilityHandler = null;
            let pageshowHandler = null;

            globalThis.window = {
                location: {
                    replace: (url) => { replacedUrl = url; }
                },
                addEventListener: (event, handler) => {
                    if (event === 'pageshow') pageshowHandler = handler;
                }
            };

            globalThis.document = {
                visibilityState: 'visible',
                getElementById: () => null,
                addEventListener: (event, handler) => {
                    if (event === 'visibilitychange') visibilityHandler = handler;
                }
            };

            const originalObtenerSesion = AuthModel.obtenerSesionActual;
            AuthModel.obtenerSesionActual = async () => null;

            try {
                PagoController.configurarProteccionCierreSesion();
                assert.ok(typeof visibilityHandler === 'function', 'Debe registrar visibilitychange');
                assert.ok(typeof pageshowHandler === 'function', 'Debe registrar pageshow');

                // Simular que el usuario regresa a la pestaña sin sesión
                await visibilityHandler();
                assert.equal(replacedUrl, 'login.html');

                replacedUrl = '';
                await pageshowHandler();
                assert.equal(replacedUrl, 'login.html');
            } finally {
                AuthModel.obtenerSesionActual = originalObtenerSesion;
            }
        });
    });

    describe('Tooltips de estado en MisToursView', () => {
        it('debe generar el tooltip y title exacto cuando el estado es confirmado / confirmada', () => {
            const detalles = MisToursView.obtenerDetallesStatus('Confirmado', 'confirmada');
            assert.equal(detalles.tooltipText, 'Su reserva ha sido confirmada, los detalles fueron enviados a su correo');
            assert.equal(detalles.badgeClass, 'status-badge--confirmado');
        });

        it('debe generar el tooltip y title exacto cuando el estado es rechazado / rechazada', () => {
            const detalles = MisToursView.obtenerDetallesStatus('Rechazado', 'rechazada');
            assert.equal(detalles.tooltipText, 'Su reserva fue rechazada, los detalles fueron enviados a su correo');
            assert.equal(detalles.badgeClass, 'status-badge--rechazado');

            const detallesAlt = MisToursView.obtenerDetallesStatus('Rechazada', 'rechazada');
            assert.equal(detallesAlt.tooltipText, 'Su reserva fue rechazada, los detalles fueron enviados a su correo');
        });

        it('MisToursView.renderGrid debe renderizar title, data-tooltip y span de burbuja en tarjetas', () => {
            let gridHtml = '';
            globalThis.document = {
                getElementById: (id) => {
                    if (id === 'mis-tours-grid') {
                        return {
                            set innerHTML(val) { gridHtml = val; },
                            get innerHTML() { return gridHtml; }
                        };
                    }
                    return null;
                }
            };

            MisToursView.reservasActuales = [
                {
                    id: 'res-conf',
                    tour_id: 't-1',
                    status: 'Confirmado',
                    status_original: 'confirmada',
                    tour_date: '2026-11-20',
                    spots_reserved: 2,
                    tour: { name: 'Tour Volcanes' }
                },
                {
                    id: 'res-rech',
                    tour_id: 't-2',
                    status: 'Rechazado',
                    status_original: 'rechazada',
                    tour_date: '2026-11-25',
                    spots_reserved: 1,
                    tour: { name: 'Tour Playa' }
                }
            ];

            MisToursView.renderGrid('todos');

            assert.ok(gridHtml.includes('title="Su reserva ha sido confirmada, los detalles fueron enviados a su correo"'));
            assert.ok(gridHtml.includes('title="Su reserva fue rechazada, los detalles fueron enviados a su correo"'));
            assert.ok(gridHtml.includes('class="status-tooltip-bubble"'));
            assert.ok(gridHtml.includes('status-badge--has-tooltip'));
        });
    });

    describe('Filtros por estado en AdminPagosView y AdminPagosModel', () => {
        const reservasMuestra = [
            { id: '1', status: 'pendiente_pago', spots_reserved: 1, total_amount: 35, tourist_name: 'Turista 1' },
            { id: '2', status: 'en_validacion', storage_path: 'receipts/recibo.png', spots_reserved: 2, total_amount: 70, tourist_name: 'Turista 2' },
            { id: '3', status: 'confirmada', spots_reserved: 1, total_amount: 35, tourist_name: 'Turista 3' },
            { id: '4', status: 'rechazada', rejection_reason: 'Monto bancario incorrecto', spots_reserved: 3, total_amount: 105, tourist_name: 'Turista 4' }
        ];

        it('clasificarCategoria debe asociar cada estado a su rectángulo correspondiente', () => {
            assert.equal(AdminPagosView.clasificarCategoria('pendiente_pago'), 'pendientes');
            assert.equal(AdminPagosView.clasificarCategoria('en_validacion'), 'pendientes');
            assert.equal(AdminPagosView.clasificarCategoria('confirmada'), 'aceptados');
            assert.equal(AdminPagosView.clasificarCategoria('confirmado'), 'aceptados');
            assert.equal(AdminPagosView.clasificarCategoria('rechazada'), 'rechazados');
            assert.equal(AdminPagosView.clasificarCategoria('rechazado'), 'rechazados');
        });

        it('actualizarContadores debe calcular con precisión 2 pendientes, 1 aceptado y 1 rechazado', () => {
            let pendientesText = '', aceptadosText = '', rechazadosText = '';
            AdminPagosView.elements = {
                statPendientes: { set textContent(v) { pendientesText = v; } },
                statAceptados: { set textContent(v) { aceptadosText = v; } },
                statRechazados: { set textContent(v) { rechazadosText = v; } }
            };

            const conteo = AdminPagosView.actualizarContadores(reservasMuestra);
            assert.equal(conteo.pendientes, 2);
            assert.equal(conteo.aceptados, 1);
            assert.equal(conteo.rechazados, 1);
            assert.equal(pendientesText, '2');
            assert.equal(aceptadosText, '1');
            assert.equal(rechazadosText, '1');
        });

        it('en categoría "aceptados" debe mostrar el badge Aprobada y botones disabled', () => {
            let html = '';
            AdminPagosView.elements = {
                tablaBody: { set innerHTML(v) { html = v; } },
                statPendientes: { set textContent(_) {} },
                statAceptados: { set textContent(_) {} },
                statRechazados: { set textContent(_) {} }
            };

            AdminPagosView.renderListado(reservasMuestra, 'aceptados');
            assert.ok(html.includes('data-id="3"'));
            assert.ok(!html.includes('data-id="1"'));
            assert.ok(!html.includes('data-id="4"'));
            assert.ok(html.includes('badge-action-aprobada'));
            assert.ok(html.includes('Aprobada'));
            assert.ok(html.includes('disabled'));
        });

        it('en categoría "rechazados" debe mostrar el badge Rechazada y permitir ver motivo', () => {
            let html = '';
            AdminPagosView.elements = {
                tablaBody: { set innerHTML(v) { html = v; } },
                statPendientes: { set textContent(_) {} },
                statAceptados: { set textContent(_) {} },
                statRechazados: { set textContent(_) {} }
            };

            AdminPagosView.renderListado(reservasMuestra, 'rechazados');
            assert.ok(html.includes('data-id="4"'));
            assert.ok(!html.includes('data-id="1"'));
            assert.ok(!html.includes('data-id="3"'));
            assert.ok(html.includes('badge-action-rechazada'));
            assert.ok(html.includes('Rechazada'));
            assert.ok(html.includes('btn-ver-motivo'));
            assert.ok(html.includes('Monto bancario incorrecto'));
        });

        it('AdminPagosModel.obtenerReservasEnValidacion debe consultar la URL con los cuatro estados históricos', async () => {
            const originalFetch = globalThis.fetch;
            let urlConsultada = '';

            globalThis.fetch = async (url) => {
                if (url.includes('tour_reservations')) {
                    urlConsultada = url;
                    return { ok: true, json: async () => [] };
                }
                return { ok: true, json: async () => [] };
            };

            try {
                await AdminPagosModel.obtenerReservasEnValidacion();
                assert.ok(
                    urlConsultada.includes('status=in.(pendiente_pago,en_validacion,confirmada,rechazada)'),
                    'La URL debe incluir pendiente_pago, en_validacion, confirmada y rechazada'
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });
});
