import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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

import {
    obtenerDetalleReserva,
    subirComprobanteStorage,
    notificarComprobante,
    PagoModel
} from '../js/models/PagoModel.js';
import { PagoController } from '../js/controllers/PagoController.js';
import { PagoView } from '../js/views/PagoView.js';
import { NavbarView } from '../js/views/NavbarView.js';
import { MisToursModel } from '../js/models/MisToursModel.js';
import { MisToursView } from '../js/views/MisToursView.js';
import { TourDetalleModel } from '../js/models/TourDetalleModel.js';
import { AdminPagosView } from '../js/views/AdminPagosView.js';
import { AdminPagosModel } from '../js/models/AdminPagosModel.js';
import { AdminPagosController } from '../js/controllers/AdminPagosController.js';
import { LoginController } from '../js/controllers/LoginController.js';
import { LoginView } from '../js/views/LoginView.js';
import { AuthModel } from '../js/models/AuthModel.js';

describe('Suite de Pruebas: Defectos de Pago, Administración y Reservas (ChocoMapaSV)', () => {

    describe('Defecto 1: Validación y subida a Supabase Storage en pago-comprobante', () => {
        it('debe validar formatos MIME permitidos y rechazar otros con mensaje exacto', () => {
            const archivosValidos = [
                { name: 'recibo.jpg', type: 'image/jpeg', size: 1024 },
                { name: 'recibo.png', type: 'image/png', size: 2048 },
                { name: 'recibo.pdf', type: 'application/pdf', size: 4096 }
            ];

            archivosValidos.forEach(f => {
                assert.equal(PagoController.validarArchivo(f), true, `El archivo ${f.name} debe ser aceptado`);
            });

            let mensajeError = '';
            PagoView.mostrarError = (msg) => { mensajeError = msg; };

            const archivosInvalidos = [
                { name: 'recibo.txt', type: 'text/plain', size: 1024 },
                { name: 'recibo.exe', type: 'application/x-msdownload', size: 1024 },
                { name: 'recibo.zip', type: 'application/zip', size: 1024 },
                { name: 'recibo.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 }
            ];

            archivosInvalidos.forEach(f => {
                const res = PagoController.validarArchivo(f);
                assert.equal(res, false, `El archivo ${f.name} debe ser rechazado`);
                assert.equal(mensajeError, 'Formato no permitido. Solo se aceptan archivos JPG, PNG o PDF');
            });
        });

        it('debe validar el límite máximo estricto de 5 MB (5,242,880 bytes)', () => {
            let mensajeError = '';
            PagoView.mostrarError = (msg) => { mensajeError = msg; };

            const archivoLimiteExacto = { name: 'recibo.png', type: 'image/png', size: 5242880 };
            assert.equal(PagoController.validarArchivo(archivoLimiteExacto), true, '5 MB exactos deben ser permitidos');

            const archivoExcedido = { name: 'recibo.png', type: 'image/png', size: 5242881 };
            const res = PagoController.validarArchivo(archivoExcedido);
            assert.equal(res, false, '5 MB + 1 byte debe ser rechazado');
            assert.equal(mensajeError, 'El archivo supera el tamaño máximo permitido de 5 MB');
        });

        it('debe estructurar la subida hacia storage receipts/{reservationId}_{timestamp}.{ext}', async () => {
            let storageLlamado = false;
            let bucketLlamado = '';
            let pathSubido = '';

            globalThis.window = {
                supabase: {
                    createClient: () => ({
                        storage: {
                            from: (bucket) => {
                                bucketLlamado = bucket;
                                return {
                                    upload: async (fPath, fileObj) => {
                                        storageLlamado = true;
                                        pathSubido = fPath;
                                        return { data: { path: fPath }, error: null };
                                    }
                                };
                            }
                        }
                    })
                }
            };

            const mockFile = { name: 'comprobante_banco.jpg', type: 'image/jpeg', size: 1000 };
            const resultado = await subirComprobanteStorage('res-xyz-123', mockFile);

            assert.equal(storageLlamado, true);
            assert.equal(bucketLlamado, 'payment_receipts');
            assert.ok(pathSubido.startsWith('receipts/res-xyz-123_'));
            assert.ok(pathSubido.endsWith('.jpg'));
            assert.equal(resultado.ok, true);
        });
    });

    describe('Defecto 2: Sincronización real con BD y cálculo de expiración con expires_at', () => {
        it('MisToursModel no debe retornar registros de localStorage ni mock cuando BD retorna vacío', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                if (url.includes('tour_reservations')) {
                    return {
                        ok: true,
                        json: async () => []
                    };
                }
                return { ok: true, json: async () => [] };
            };

            try {
                const historial = await MisToursModel.obtenerHistorial('tourist-test-id');
                assert.equal(Array.isArray(historial), true);
                assert.equal(historial.length, 0, 'Debe retornar un arreglo vacío [] sin reservas simuladas');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('TourDetalleModel.obtenerReservaUsuarioPorTour debe retornar null si BD retorna vacío', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                if (url.includes('tour_reservations')) {
                    return {
                        ok: true,
                        json: async () => []
                    };
                }
                return { ok: true, json: async () => [] };
            };

            try {
                const reserva = await TourDetalleModel.obtenerReservaUsuarioPorTour('tourist-test-id', 'tour-1');
                assert.equal(reserva, null, 'Debe retornar estrictamente null sin recurrir a datos mock');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('MisToursView debe renderizar el título "No tienes reservaciones activas" en estado vacío', () => {
            let innerHtmlSet = '';
            MisToursView.container = {
                set innerHTML(val) { innerHtmlSet = val; },
                get innerHTML() { return innerHtmlSet; }
            };

            MisToursView.renderEstadoVacio();
            assert.ok(innerHtmlSet.includes('No tienes reservaciones activas'), 'El estado vacío debe decir "No tienes reservaciones activas"');
        });

        it('PagoView debe detener temporizador y mostrar mensaje si el tiempo venció', () => {
            let clockText = '';
            let alertaMostrada = false;
            let alertaTexto = '';
            let btnDisabled = false;

            PagoView.elements = {
                timerCountdown: { set textContent(t) { clockText = t; } },
                timerProgressBar: { style: {} },
                timerCard: { classList: { add() {} } },
                alertaExpirado: { classList: { remove() { alertaMostrada = true; }, add() {} } },
                textoAlertaExpirado: { set textContent(t) { alertaTexto = t; } },
                alertaExito: { classList: { add() {} } },
                alertaError: { classList: { add() {} } },
                reservaEstadoBadge: { classList: { add() {} }, set textContent(_) {} },
                btnSubirComprobante: {
                    set disabled(val) { btnDisabled = val; },
                    classList: { add() {} },
                    set textContent(_) {}
                },
                dropzone: { classList: { add() {} }, style: {} },
                inputArchivo: { disabled: false }
            };

            PagoView.mostrarMensajeExpirado();

            assert.equal(clockText, '00:00');
            assert.equal(alertaMostrada, true);
            assert.equal(alertaTexto, 'El tiempo para pagar esta reserva venció');
            assert.equal(btnDisabled, true);
        });
    });

    describe('Defecto 3: Avatar de usuario en el Navbar de pago-comprobante.html', () => {
        it('pago-comprobante.html debe contener el contenedor nav-auth y nav-user-container', () => {
            const html = fs.readFileSync(path.join(process.cwd(), 'pago-comprobante.html'), 'utf8');
            assert.ok(html.includes('id="nav-auth"'), 'Debe contener id="nav-auth"');
            assert.ok(html.includes('id="nav-user-container"'), 'Debe contener id="nav-user-container"');
            assert.ok(html.includes('id="nav-user-avatar"'), 'Debe contener id="nav-user-avatar"');
            assert.ok(html.includes('id="nav-user-btn"'), 'Debe contener id="nav-user-btn"');
            assert.ok(html.includes('id="nav-user-dropdown"'), 'Debe contener id="nav-user-dropdown"');
            assert.ok(html.includes('id="nav-btn-logout"'), 'Debe contener id="nav-btn-logout"');
        });

        it('NavbarView.obtenerInicialUsuario debe extraer la inicial mayúscula del correo o nombre', () => {
            const user1 = { email: 'turista@mitur.gob.sv' };
            assert.equal(NavbarView.obtenerInicialUsuario(user1), 'T');

            const user2 = { email: 'pablo@gmail.com', user_metadata: { full_name: 'Carlos Rivas' } };
            assert.equal(NavbarView.obtenerInicialUsuario(user2), 'C');

            const user3 = { email: 'ana@gmail.com', user_metadata: { nombre: 'ana' } };
            assert.equal(NavbarView.obtenerInicialUsuario(user3), 'A');
        });
    });

    describe('Defecto 4: Control de acciones de Administrador en admin-pagos', () => {
        it('debe deshabilitar Aprobar y Rechazar si está en pendiente_pago o no tiene archivo', () => {
            const reservas = [
                {
                    id: 'res-1',
                    reservation_code: 'CM-0001',
                    status: 'pendiente_pago',
                    storage_path: null,
                    tour_date: '2026-11-10',
                    spots_reserved: 2,
                    total_amount: 70
                },
                {
                    id: 'res-2',
                    reservation_code: 'CM-0002',
                    status: 'en_validacion',
                    storage_path: null,
                    tour_date: '2026-11-11',
                    spots_reserved: 1,
                    total_amount: 35
                },
                {
                    id: 'res-3',
                    reservation_code: 'CM-0003',
                    status: 'en_validacion',
                    storage_path: 'receipts/recibo.png',
                    tour_date: '2026-11-12',
                    spots_reserved: 3,
                    total_amount: 105
                }
            ];

            let htmlTabla = '';
            AdminPagosView.elements = {
                tablaBody: { set innerHTML(val) { htmlTabla = val; } },
                statPendientes: { set textContent(_) {} }
            };

            AdminPagosView.renderListado(reservas);

            // res-1: pendiente_pago y sin archivo -> botones deshabilitados
            assert.ok(htmlTabla.includes('data-id="res-1"'));
            // res-3: en_validacion y con archivo -> botones habilitados
            assert.ok(htmlTabla.includes('data-id="res-3"'));

            // Separar filas
            const filas = htmlTabla.split('<tr data-id=');
            const fila1 = filas.find(f => f.startsWith('"res-1"'));
            const fila2 = filas.find(f => f.startsWith('"res-2"'));
            const fila3 = filas.find(f => f.startsWith('"res-3"'));

            // Fila 1 (pendiente_pago y sin archivo) debe tener botones disabled y opacity-50
            assert.ok(fila1.includes('disabled'), 'Fila 1 debe tener botones disabled');
            assert.ok(fila1.includes('opacity-50 cursor-not-allowed'), 'Fila 1 debe tener clase de opacidad');
            assert.ok(fila1.includes('Sin archivo'), 'Fila 1 debe decir Sin archivo');

            // Fila 2 (en_validacion pero sin archivo) debe tener botones disabled
            assert.ok(fila2.includes('disabled'), 'Fila 2 debe tener botones disabled por falta de comprobante');
            assert.ok(fila2.includes('opacity-50 cursor-not-allowed'));

            // Fila 3 (en_validacion con archivo) NO debe tener botones disabled en acciones
            const fila3Acciones = fila3.split('class="cell-actions"')[1];
            assert.ok(!fila3Acciones.includes('disabled'), 'Fila 3 debe tener botones de acción habilitados');
            assert.ok(!fila3Acciones.includes('opacity-50'), 'Fila 3 no debe tener opacity-50 en acciones');
        });
    });

    describe('Defecto 5 y 6: Estilos de layout y tabla en admin-pagos.css', () => {
        const css = fs.readFileSync(path.join(process.cwd(), 'css/admin-pagos.css'), 'utf8');

        it('Defecto 5: debe incluir la estructura CSS de sticky footer', () => {
            assert.ok(css.includes('min-height: 100vh;'), 'Debe incluir min-height: 100vh');
            assert.ok(css.includes('flex-direction: column;'), 'Debe ser flex column');
            assert.ok(css.includes('flex: 1 0 auto;'), 'main debe ser flex: 1 0 auto');
            assert.ok(css.includes('flex-shrink: 0;'), 'footer debe ser flex-shrink: 0');
        });

        it('Defecto 6: debe configurar ancho fluido max-width: 1440px y overflow-x: auto', () => {
            assert.ok(css.includes('max-width: 1440px;'), 'Contenedor principal debe tener max-width: 1440px');
            assert.ok(css.includes('padding: 0 1.5rem;'), 'Debe incluir padding: 0 1.5rem');
            assert.ok(css.includes('overflow-x: auto;'), 'Debe incluir overflow-x: auto');
        });
    });

    describe('Defecto 7: Visibilidad de dimensiones explícitas en SVG de botones admin', () => {
        it('los botones Aprobar, Rechazar y Sin archivo deben tener atributos width="16" height="16" y viewBox', () => {
            const reservas = [{
                id: 'res-sin-archivo',
                reservation_code: 'CM-TEST',
                status: 'pendiente_pago',
                storage_path: null,
                tour_date: '2026-11-10',
                spots_reserved: 1,
                total_amount: 35
            }];

            let htmlTabla = '';
            AdminPagosView.elements = {
                tablaBody: { set innerHTML(val) { htmlTabla = val; } },
                statPendientes: { set textContent(_) {} }
            };

            AdminPagosView.renderListado(reservas);

            // Verificar etiqueta 'Sin archivo'
            assert.ok(htmlTabla.includes('width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'));
            // Verificar botón Aprobar
            assert.ok(htmlTabla.includes('btn-aprobar'));
            // Verificar botón Rechazar
            assert.ok(htmlTabla.includes('btn-rechazar'));
        });
    });

    describe('Defecto 8: Cierre de sesión y protección de ruta en admin-pagos', () => {
        it('verificarRolAdmin debe rechazar usuarios que no pertenezcan a admin_users', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                if (url.includes('admin_users')) {
                    return { ok: true, json: async () => [] };
                }
                return { ok: false };
            };

            localStorage.setItem('chocomapa_auth_session', JSON.stringify({
                access_token: 'fake-token',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { id: 'tourist-user-123', email: 'turista@gmail.com' }
            }));

            try {
                const res = await AdminPagosModel.verificarRolAdmin();
                assert.equal(res.esAdmin, false, 'Usuario no registrado en admin_users debe ser rechazado');
                assert.equal(res.razon, 'not_admin');
            } finally {
                globalThis.fetch = originalFetch;
                localStorage.removeItem('chocomapa_auth_session');
            }
        });

        it('verificarRolAdmin debe permitir usuarios presentes en admin_users', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                if (url.includes('admin_users')) {
                    return { ok: true, json: async () => [{ id: 'admin-1', user_id: 'admin-user-999', role: 'admin' }] };
                }
                return { ok: false };
            };

            localStorage.setItem('chocomapa_auth_session', JSON.stringify({
                access_token: 'fake-token-admin',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { id: 'admin-user-999', email: 'admin@mitur.gob.sv' }
            }));

            try {
                const res = await AdminPagosModel.verificarRolAdmin();
                assert.equal(res.esAdmin, true, 'Usuario presente en admin_users debe ser admitido');
            } finally {
                globalThis.fetch = originalFetch;
                localStorage.removeItem('chocomapa_auth_session');
            }
        });
    });

    describe('Defecto 9: Intercepción de login de administrador ante sesión activa de turista', () => {
        it('admin-pagos.html debe contener el aviso de cierre de sesión previa', () => {
            const html = fs.readFileSync(path.join(process.cwd(), 'admin-pagos.html'), 'utf8');
            assert.ok(html.includes('id="btn-login-admin"'), 'Debe contener el id="btn-login-admin"');
            assert.ok(html.includes('id="alerta-sesion-activa-turista"'), 'Debe contener el contenedor alerta-sesion-activa-turista');
            assert.ok(html.includes('Asegúrese de cerrar la sesión actual antes de intentar iniciar sesión como administrador'));
        });

        it('AdminPagosView.mostrarAvisoCerrarSesionTurista debe hacer visible el contenedor de alerta', () => {
            let classRemoved = false;
            let displayStyle = '';
            let notificacionMostrada = '';

            AdminPagosView.elements = {
                alertaSesionTurista: {
                    classList: {
                        remove(cls) { if (cls === 'hidden') classRemoved = true; }
                    },
                    style: {
                        set display(d) { displayStyle = d; }
                    },
                    scrollIntoView() {}
                }
            };

            AdminPagosView.mostrarNotificacion = (tipo, msg) => {
                notificacionMostrada = msg;
            };

            AdminPagosView.mostrarAvisoCerrarSesionTurista();

            assert.equal(classRemoved, true, 'Debe remover la clase hidden');
            assert.equal(displayStyle, 'flex', 'Debe desplegar con display flex');
            assert.equal(notificacionMostrada, 'Asegúrese de cerrar la sesión actual antes de intentar iniciar sesión como administrador');
        });
    });

    describe('Punto 1: Navegación hacia atrás y persistencia de sesión en login.html', () => {
        it('debe redirigir a URL de redirect con window.location.replace si no apunta a login', async () => {
            let replacedUrl = '';
            globalThis.window = {
                location: {
                    search: '?redirect=pago-comprobante.html',
                    origin: 'http://localhost',
                    replace: (url) => { replacedUrl = url; }
                },
                addEventListener: () => {}
            };

            LoginController.redirigirUsuario();
            assert.equal(replacedUrl, 'pago-comprobante.html');
        });

        it('debe redirigir a mapa.html si el parámetro redirect apunta a login.html', async () => {
            let replacedUrl = '';
            globalThis.window = {
                location: {
                    search: '?redirect=login.html',
                    origin: 'http://localhost',
                    replace: (url) => { replacedUrl = url; }
                },
                addEventListener: () => {}
            };

            LoginController.redirigirUsuario();
            assert.equal(replacedUrl, 'mapa.html');
        });

        it('debe redirigir a mapa.html por defecto cuando no hay parámetro redirect', async () => {
            let replacedUrl = '';
            globalThis.window = {
                location: {
                    search: '',
                    origin: 'http://localhost',
                    replace: (url) => { replacedUrl = url; }
                },
                addEventListener: () => {}
            };

            LoginController.redirigirUsuario();
            assert.equal(replacedUrl, 'mapa.html');
        });

        it('debe limpiar el formulario y restaurar el botón de submit a habilitado "Ingresar" tras login exitoso', async () => {
            let formResetCalled = false;
            let botonHabilitado = false;
            let textoBoton = '';

            LoginView.elements = {
                form: { reset: () => { formResetCalled = true; } },
                emailInput: { value: 'test@turismo.gob.sv', disabled: true, classList: { remove: () => {} } },
                passwordInput: { value: 'Secret123$', disabled: true, classList: { remove: () => {} } },
                submitBtn: {
                    set disabled(val) { botonHabilitado = !val; },
                    classList: { add: () => {}, remove: () => {} },
                    removeAttribute: () => {},
                    setAttribute: () => {},
                    set textContent(txt) { textoBoton = txt; }
                }
            };

            const originalIniciarSesion = AuthModel.iniciarSesion;
            AuthModel.iniciarSesion = async () => ({ user: { id: 'u1' } });

            let redirected = false;
            const originalRedirigir = LoginController.redirigirUsuario;
            LoginController.redirigirUsuario = () => { redirected = true; };

            try {
                await LoginController.manejarSubmit({ preventDefault: () => {} });
                assert.equal(formResetCalled, true, 'El formulario debe resetearse');
                assert.equal(botonHabilitado, true, 'El botón debe quedar habilitado');
                assert.equal(textoBoton, 'Ingresar', 'El texto del botón debe ser "Ingresar"');
                assert.equal(redirected, true, 'Debe llamar a redirigirUsuario');
            } finally {
                AuthModel.iniciarSesion = originalIniciarSesion;
                LoginController.redirigirUsuario = originalRedirigir;
            }
        });
    });

    describe('Punto 2: Protección de acceso en pago-comprobante.html', () => {
        it('debe redirigir a login.html?redirect=pago-comprobante.html si no hay sesión activa', async () => {
            const originalObtenerSesion = AuthModel.obtenerSesionActual;
            AuthModel.obtenerSesionActual = async () => null;

            let redirectedUrl = '';
            globalThis.window = {
                location: {
                    search: '',
                    replace: (url) => { redirectedUrl = url; }
                }
            };

            try {
                await PagoController.init();
                assert.equal(redirectedUrl, 'login.html?redirect=pago-comprobante.html');
            } finally {
                AuthModel.obtenerSesionActual = originalObtenerSesion;
            }
        });

        it('si usuario no tiene reserva activa, debe redirigir a mis-tours.html con alerta y mostrar estado vacío', async () => {
            const originalObtenerSesion = AuthModel.obtenerSesionActual;
            const originalObtenerDetalle = PagoModel.obtenerDetalleReserva;
            const originalObtenerActiva = PagoModel.obtenerReservaActivaUsuario;

            AuthModel.obtenerSesionActual = async () => ({ user: { id: 'turista-1' } });
            PagoModel.obtenerDetalleReserva = async () => null;
            PagoModel.obtenerReservaActivaUsuario = async () => null;

            let redirectedUrl = '';
            let emptyStateMsg = '';
            PagoView.mostrarEstadoVacio = (msg) => { emptyStateMsg = msg; };

            globalThis.window = {
                location: {
                    search: '?id=non-existent-reserva',
                    replace: (url) => { redirectedUrl = url; }
                }
            };

            try {
                await PagoController.init();
                assert.ok(redirectedUrl.includes('mis-tours.html?alerta='), 'Debe redirigir a mis-tours.html con parámetro alerta');
                assert.ok(decodeURIComponent(redirectedUrl).includes('No tienes ninguna reserva pendiente de pago por procesar'));
                assert.equal(emptyStateMsg, 'No tienes ninguna reserva pendiente de pago por procesar');
            } finally {
                AuthModel.obtenerSesionActual = originalObtenerSesion;
                PagoModel.obtenerDetalleReserva = originalObtenerDetalle;
                PagoModel.obtenerReservaActivaUsuario = originalObtenerActiva;
            }
        });
    });

    describe('Punto 3: Estados visuales post-subida en pago-comprobante.html', () => {
        it('mostrarComprobanteEnValidacion debe ocultar subida, temporizador y mostrar tarjeta destacada', () => {
            let cardSubidaHidden = false;
            let timerCardHidden = false;
            let cardInfoVisible = false;
            let cardInfoTitulo = '';
            let cardInfoMensaje = '';

            PagoView.elements = {
                cardSubida: { classList: { add: (c) => { if (c === 'hidden') cardSubidaHidden = true; } }, style: {} },
                timerCard: { classList: { add: (c) => { if (c === 'hidden') timerCardHidden = true; } }, style: {} },
                cardInfoEstado: { classList: { remove: (c) => { if (c === 'hidden') cardInfoVisible = true; } }, style: {}, set className(_) {} },
                estadoInfoTitulo: { set textContent(t) { cardInfoTitulo = t; } },
                estadoInfoMensaje: { set textContent(m) { cardInfoMensaje = m; } },
                estadoInfoBadge: { set className(_) {}, set textContent(_) {} },
                estadoInfoIconBox: { set innerHTML(_) {} },
                reservaEstadoBadge: { set className(_) {}, set textContent(_) {} },
                alertaExpirado: { classList: { add: () => {} } },
                alertaError: { classList: { add: () => {} } }
            };

            PagoView.mostrarComprobanteEnValidacion();

            assert.equal(cardSubidaHidden, true, 'Card subida debe estar oculta');
            assert.equal(timerCardHidden, true, 'Timer card debe estar oculta');
            assert.equal(cardInfoVisible, true, 'Card estado informativo debe estar visible');
            assert.equal(cardInfoTitulo, 'Comprobante en Validación');
            assert.equal(cardInfoMensaje, 'Tu comprobante de transferencia ha sido enviado con éxito. El equipo del Ministerio de Turismo está verificando la información. Te notificaremos una vez sea confirmado de forma definitiva.');
        });

        it('mostrarReservaConfirmada debe ocultar subida, temporizador y mostrar tarjeta de confirmación', () => {
            let cardSubidaHidden = false;
            let timerCardHidden = false;
            let cardInfoVisible = false;
            let cardInfoTitulo = '';

            PagoView.elements = {
                cardSubida: { classList: { add: (c) => { if (c === 'hidden') cardSubidaHidden = true; } }, style: {} },
                timerCard: { classList: { add: (c) => { if (c === 'hidden') timerCardHidden = true; } }, style: {} },
                cardInfoEstado: { classList: { remove: (c) => { if (c === 'hidden') cardInfoVisible = true; } }, style: {}, set className(_) {} },
                estadoInfoTitulo: { set textContent(t) { cardInfoTitulo = t; } },
                estadoInfoMensaje: { set textContent(_) {} },
                estadoInfoBadge: { set className(_) {}, set textContent(_) {} },
                estadoInfoIconBox: { set innerHTML(_) {} },
                reservaEstadoBadge: { set className(_) {}, set textContent(_) {} },
                alertaExpirado: { classList: { add: () => {} } },
                alertaError: { classList: { add: () => {} } }
            };

            PagoView.mostrarReservaConfirmada();

            assert.equal(cardSubidaHidden, true);
            assert.equal(timerCardHidden, true);
            assert.equal(cardInfoVisible, true);
            assert.equal(cardInfoTitulo, 'Reserva Confirmada');
        });
    });

    describe('Punto 4: Ancho horizontal fluido de la tabla en admin-pagos.html', () => {
        const css = fs.readFileSync(path.join(process.cwd(), 'css/admin-pagos.css'), 'utf8');

        it('debe contener la regla @media (min-width: 1024px) con ancho fluido 96% y max-width 1600px', () => {
            assert.ok(css.includes('@media (min-width: 1024px)'));
            assert.ok(css.includes('width: 96%;'));
            assert.ok(css.includes('max-width: 1600px;'));
            assert.ok(css.includes('padding: 0 1rem;'));
        });

        it('debe reducir el padding de celdas a 0.75rem 0.5rem en pantallas de escritorio', () => {
            assert.ok(css.includes('padding: 0.75rem 0.5rem;'));
        });

        it('debe permitir clamp de 2 líneas compactas para títulos de tour y turista', () => {
            assert.ok(css.includes('-webkit-line-clamp: 2;'));
        });
    });

    describe('Punto 5: Corrección de ruta y visualización de comprobantes en Storage', () => {
        it('AdminPagosModel no debe mutilar carpetas internas en storagePath', async () => {
            let pathConsultado = '';
            let expiresInConsultado = 0;

            globalThis.window = {
                supabase: {
                    createClient: () => ({
                        storage: {
                            from: (bucket) => {
                                return {
                                    createSignedUrl: async (path, exp) => {
                                        pathConsultado = path;
                                        expiresInConsultado = exp;
                                        return { data: { signedUrl: `https://storage.supabase.co/${bucket}/${path}?token=abc` }, error: null };
                                    }
                                };
                            }
                        }
                    })
                }
            };

            const pathOriginal = 'receipts/res-999_123456789.png';
            const resultado = await AdminPagosModel.obtenerUrlFirmada(pathOriginal);

            assert.equal(resultado.ok, true);
            assert.equal(pathConsultado, 'receipts/res-999_123456789.png', 'No debe eliminar el prefijo receipts/');
            assert.equal(expiresInConsultado, 300, 'El tiempo de expiración firmado debe ser 300 segundos');
            assert.ok(resultado.signedUrl.includes('receipts/res-999_123456789.png'));
        });
    });
});
