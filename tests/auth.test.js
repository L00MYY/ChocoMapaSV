import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    validarNombre,
    validarEmail,
    validarPassword,
    validarConfirmacionPassword,
    validarTerminos,
    validarFormularioRegistro,
    puedeReservarTour,
    validarTelefonoSV,
    sanitizarUsuario,
    validarFormularioLogin,
    formatearPerfilSesion,
    requiereIniciarSesionParaReserva,
    MENSAJE_ERROR_CREDENCIALES
} from '../js/models/AuthModel.js';

describe('Historia de Usuario: Registro de Turista con Correo Electrónico', () => {

    describe('Criterio 4.2: Nombre completo', () => {
        it('debe aceptar nombres completos válidos con al menos 3 caracteres tras eliminar espacios', () => {
            assert.equal(validarNombre('Ana'), true);
            assert.equal(validarNombre('Carlos Rivas'), true);
            assert.equal(validarNombre('  María López  '), true);
            assert.equal(validarNombre('José'), true);
            assert.equal(validarNombre('Ale'), true);
        });

        it('debe rechazar nombres con menos de 3 caracteres tras sanitizar', () => {
            assert.equal(validarNombre('Al'), false);
            assert.equal(validarNombre(' A '), false);
            assert.equal(validarNombre('b'), false);
            assert.equal(validarNombre('  ab  '), false);
        });

        it('debe rechazar cadenas vacías o compuestas exclusivamente por espacios', () => {
            assert.equal(validarNombre(''), false);
            assert.equal(validarNombre('   '), false);
            assert.equal(validarNombre('\t\n  \r'), false);
        });

        it('debe rechazar valores nulos, indefinidos o tipos no válidos (casos límite)', () => {
            assert.equal(validarNombre(null), false);
            assert.equal(validarNombre(undefined), false);
            assert.equal(validarNombre(12345), false);
            assert.equal(validarNombre({}), false);
            assert.equal(validarNombre([]), false);
        });
    });

    describe('Criterio 4.3: Formato de correo electrónico', () => {
        it('debe validar correos electrónicos con sintaxis estándar válida (usuario@dominio.ext)', () => {
            assert.equal(validarEmail('turista@mitur.gob.sv'), true);
            assert.equal(validarEmail('usuario.prueba@gmail.com'), true);
            assert.equal(validarEmail('contacto_123@empresa.com.sv'), true);
            assert.equal(validarEmail('turista+sv@dominio.org'), true);
            assert.equal(validarEmail('pablo@chocomapa.com'), true);
        });

        it('debe rechazar correos sin arroba (@) o sin dominio', () => {
            assert.equal(validarEmail('usuariogmail.com'), false);
            assert.equal(validarEmail('usuario@'), false);
            assert.equal(validarEmail('@dominio.com'), false);
            assert.equal(validarEmail('usuario@dominio'), false);
            assert.equal(validarEmail('usuario'), false);
        });

        it('debe rechazar correos con espacios intermedios o puntos consecutivos', () => {
            assert.equal(validarEmail('usuario @gmail.com'), false);
            assert.equal(validarEmail('usuario@ gmail.com'), false);
            assert.equal(validarEmail('usuario@gmail .com'), false);
            assert.equal(validarEmail('usuario@gmail..com'), false);
            assert.equal(validarEmail('usuario..nombre@gmail.com'), false);
        });

        it('debe rechazar entradas vacías, nulas, indefinidas o tipos no string (casos límite)', () => {
            assert.equal(validarEmail(''), false);
            assert.equal(validarEmail('   '), false);
            assert.equal(validarEmail(null), false);
            assert.equal(validarEmail(undefined), false);
            assert.equal(validarEmail(123456), false);
            assert.equal(validarEmail(true), false);
            assert.equal(validarEmail({}), false);
        });
    });

    describe('Criterio 4.4: Complejidad de contraseña (8-32 chars, A-Z, a-z, 0-9, símbolos)', () => {
        it('debe aceptar contraseñas válidas que cumplan todas las reglas de complejidad y longitud (8-32 caracteres)', () => {
            assert.equal(validarPassword('ChocoPass1!'), true);
            assert.equal(validarPassword('Segura2026@'), true);
            assert.equal(validarPassword('Clave#2026'), true);
            assert.equal(validarPassword('Admin$9999'), true);
            assert.equal(validarPassword('Test%1234'), true);
            assert.equal(validarPassword('Prueba^123'), true);
            assert.equal(validarPassword('Mitur&2026'), true);
            assert.equal(validarPassword('Turista*99'), true);
            assert.equal(validarPassword('User_2026'), true);
            assert.equal(validarPassword('Mi-Clave1'), true);
        });

        it('debe validar exactamente los límites de longitud (8 caracteres mínimo y 32 caracteres máximo)', () => {
            // Límite inferior exacto (8 caracteres)
            assert.equal(validarPassword('Abc123!4'), true);
            // Límite inferior fallido (7 caracteres)
            assert.equal(validarPassword('Abc123!'), false);

            // Límite superior exacto (32 caracteres: 3 chars fijos + 29 chars 'a')
            const pass32 = 'A1!' + 'a'.repeat(29);
            assert.equal(pass32.length, 32);
            assert.equal(validarPassword(pass32), true);

            // Límite superior fallido (33 caracteres: 3 chars fijos + 30 chars 'a')
            const pass33 = 'A1!' + 'a'.repeat(30);
            assert.equal(pass33.length, 33);
            assert.equal(validarPassword(pass33), false);
        });

        it('debe rechazar contraseñas a las que les falte al menos una categoría de carácter obligatoria', () => {
            // Sin mayúscula
            assert.equal(validarPassword('chocopass1!'), false);
            // Sin minúscula
            assert.equal(validarPassword('CHOCOPASS1!'), false);
            // Sin número
            assert.equal(validarPassword('ChocoPass!!'), false);
            // Sin símbolo especial permitido
            assert.equal(validarPassword('ChocoPass12'), false);
        });

        it('debe rechazar contraseñas que contengan símbolos no permitidos o espacios en blanco (casos límite)', () => {
            // Símbolos no permitidos fuera de [!@#$%^&*_\-]
            assert.equal(validarPassword('ChocoPass1?'), false);
            assert.equal(validarPassword('ChocoPass1+'), false);
            assert.equal(validarPassword('ChocoPass1='), false);
            assert.equal(validarPassword('ChocoPass1~'), false);
            assert.equal(validarPassword('ChocoPass1<'), false);
            assert.equal(validarPassword('ChocoPass1>'), false);
            assert.equal(validarPassword('ChocoPass1:'), false);
            assert.equal(validarPassword('ChocoPass1/'), false);

            // Espacios en blanco intermedios o extremos
            assert.equal(validarPassword('Choco Pass1!'), false);
            assert.equal(validarPassword(' ChocoPass1!'), false);
            assert.equal(validarPassword('ChocoPass1! '), false);

            // Mezcla de símbolo válido con símbolo no permitido
            assert.equal(validarPassword('ChocoPass1!?'), false);
        });

        it('debe rechazar valores nulos, indefinidos, vacíos o tipos no válidos (casos límite)', () => {
            assert.equal(validarPassword(''), false);
            assert.equal(validarPassword('        '), false);
            assert.equal(validarPassword(null), false);
            assert.equal(validarPassword(undefined), false);
            assert.equal(validarPassword(12345678), false);
            assert.equal(validarPassword({}), false);
        });
    });

    describe('Criterio 4.5: Confirmación de contraseña', () => {
        it('debe retornar true cuando la confirmación coincide exactamente con la contraseña', () => {
            assert.equal(validarConfirmacionPassword('ChocoPass1!', 'ChocoPass1!'), true);
            assert.equal(validarConfirmacionPassword('Segura2026@', 'Segura2026@'), true);
            assert.equal(validarConfirmacionPassword('Clave#2026', 'Clave#2026'), true);
        });

        it('debe retornar false si las contraseñas difieren en caracteres o mayúsculas/minúsculas', () => {
            assert.equal(validarConfirmacionPassword('ChocoPass1!', 'chocopass1!'), false);
            assert.equal(validarConfirmacionPassword('ChocoPass1!', 'ChocoPass2!'), false);
            assert.equal(validarConfirmacionPassword('ChocoPass1!', 'ChocoPass1! '), false);
            assert.equal(validarConfirmacionPassword('ChocoPass1!', 'ChocoPass1'), false);
        });

        it('debe retornar false ante valores vacíos, nulos, indefinidos o tipos no válidos (casos límite)', () => {
            assert.equal(validarConfirmacionPassword('', ''), false);
            assert.equal(validarConfirmacionPassword('ChocoPass1!', ''), false);
            assert.equal(validarConfirmacionPassword('', 'ChocoPass1!'), false);
            assert.equal(validarConfirmacionPassword(null, null), false);
            assert.equal(validarConfirmacionPassword(undefined, undefined), false);
            assert.equal(validarConfirmacionPassword('ChocoPass1!', null), false);
            assert.equal(validarConfirmacionPassword(null, 'ChocoPass1!'), false);
            assert.equal(validarConfirmacionPassword(12345, 12345), false);
        });
    });

    describe('Criterio 4.6: Casilla de términos y condiciones', () => {
        it('debe retornar true si el valor es estrictamente el booleano true', () => {
            assert.equal(validarTerminos(true), true);
        });

        it('debe retornar false cuando la casilla no está marcada (false)', () => {
            assert.equal(validarTerminos(false), false);
        });

        it('debe rechazar valores no booleanos o truthy ambiguos (casos límite: strings, números, objetos, null, undefined)', () => {
            assert.equal(validarTerminos('true'), false);
            assert.equal(validarTerminos('1'), false);
            assert.equal(validarTerminos(1), false);
            assert.equal(validarTerminos(0), false);
            assert.equal(validarTerminos(null), false);
            assert.equal(validarTerminos(undefined), false);
            assert.equal(validarTerminos({}), false);
            assert.equal(validarTerminos([]), false);
        });
    });

    describe('Criterios 4.1 y 5: Validación integral del formulario y mapa de errores', () => {
        it('debe validar con éxito un formulario con todos los datos correctos y retornar esValido: true con errores vacío', () => {
            const datosValidos = {
                nombre: 'Carlos Rivas',
                email: 'turista@mitur.gob.sv',
                password: 'Password123!',
                confirm: 'Password123!',
                terms: true
            };
            const resultado = validarFormularioRegistro(datosValidos);

            assert.equal(resultado.esValido, true);
            assert.deepEqual(resultado.errores, {});
            assert.equal(Object.keys(resultado.errores).length, 0);
        });

        it('debe bloquear el registro y generar mapa de errores específicos por campo si todos los campos faltan (Criterio 4.1 y 5)', () => {
            const resultado = validarFormularioRegistro({});

            assert.equal(resultado.esValido, false);
            assert.equal(resultado.errores.nombre, 'El nombre completo es obligatorio.');
            assert.equal(resultado.errores.email, 'El correo electrónico es obligatorio.');
            assert.equal(resultado.errores.password, 'La contraseña es obligatoria.');
            assert.equal(resultado.errores.confirmacion, 'La confirmación de contraseña es obligatoria.');
            assert.equal(resultado.errores.terminos, 'Debe aceptar obligatoriamente los términos y condiciones.');
            assert.equal(Object.keys(resultado.errores).length, 5);
        });

        it('debe generar error específico si solo el nombre no cumple la regla de longitud (< 3 caracteres)', () => {
            const datos = {
                nombre: 'Al',
                email: 'turista@mitur.gob.sv',
                password: 'Password123!',
                confirm: 'Password123!',
                terms: true
            };
            const resultado = validarFormularioRegistro(datos);

            assert.equal(resultado.esValido, false);
            assert.equal(resultado.errores.nombre, 'El nombre completo debe tener al menos 3 caracteres tras eliminar espacios.');
            assert.equal(resultado.errores.email, undefined);
            assert.equal(resultado.errores.password, undefined);
            assert.equal(resultado.errores.confirmacion, undefined);
            assert.equal(resultado.errores.terminos, undefined);
        });

        it('debe generar error específico si solo el correo tiene formato inválido', () => {
            const datos = {
                nombre: 'Carlos Rivas',
                email: 'correo-invalido@',
                password: 'Password123!',
                confirm: 'Password123!',
                terms: true
            };
            const resultado = validarFormularioRegistro(datos);

            assert.equal(resultado.esValido, false);
            assert.equal(resultado.errores.email, 'El correo electrónico debe tener un formato válido (usuario@dominio.ext).');
            assert.equal(resultado.errores.nombre, undefined);
        });

        it('debe generar error específico si la contraseña no cumple la complejidad o longitud requerida', () => {
            const datos = {
                nombre: 'Carlos Rivas',
                email: 'turista@mitur.gob.sv',
                password: 'chocosinglesa',
                confirm: 'chocosinglesa',
                terms: true
            };
            const resultado = validarFormularioRegistro(datos);

            assert.equal(resultado.esValido, false);
            assert.equal(
                resultado.errores.password,
                'La contraseña debe tener entre 8 y 32 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 símbolo especial (!@#$%^&*_-).'
            );
        });

        it('debe generar error específico si la confirmación no coincide con la contraseña', () => {
            const datos = {
                nombre: 'Carlos Rivas',
                email: 'turista@mitur.gob.sv',
                password: 'Password123!',
                confirm: 'OtraClaveDistinta99!',
                terms: true
            };
            const resultado = validarFormularioRegistro(datos);

            assert.equal(resultado.esValido, false);
            assert.equal(
                resultado.errores.confirmacion,
                'La confirmación de contraseña debe coincidir exactamente con la contraseña.'
            );
            assert.equal(resultado.errores.confirm, resultado.errores.confirmacion);
        });

        it('debe generar error específico si no se aceptan los términos y condiciones', () => {
            const datos = {
                nombre: 'Carlos Rivas',
                email: 'turista@mitur.gob.sv',
                password: 'Password123!',
                confirm: 'Password123!',
                terms: false
            };
            const resultado = validarFormularioRegistro(datos);

            assert.equal(resultado.esValido, false);
            assert.equal(
                resultado.errores.terminos,
                'Debe aceptar obligatoriamente los términos y condiciones.'
            );
            assert.equal(resultado.errores.terms, resultado.errores.terminos);
        });

        it('debe manejar entradas nulas, indefinidas o tipos no objeto de forma segura bloqueando el registro (casos límite)', () => {
            const resNull = validarFormularioRegistro(null);
            assert.equal(resNull.esValido, false);
            assert.ok(resNull.errores.nombre);
            assert.ok(resNull.errores.email);

            const resUndef = validarFormularioRegistro(undefined);
            assert.equal(resUndef.esValido, false);
            assert.ok(resUndef.errores.password);

            const resString = validarFormularioRegistro('datos-corruptos');
            assert.equal(resString.esValido, false);
            assert.ok(resString.errores.terminos);
        });
    });

    describe('Criterio 8: Control de acceso a reservas según estado de autenticación', () => {
        it('debe permitir acceso al formulario de reserva cuando existe una sesión con usuario activo', () => {
            const sesionActivaConToken = {
                access_token: 'jwt-access-token-12345',
                user: { id: 'usr-guid-001', email: 'turista@mitur.gob.sv' }
            };
            assert.equal(puedeReservarTour(sesionActivaConToken), true);

            const sesionConIdUsuario = {
                user: { id: 'usr-guid-002' }
            };
            assert.equal(puedeReservarTour(sesionConIdUsuario), true);

            const sesionConEmailUsuario = {
                user: { email: 'viajero@sv.com' }
            };
            assert.equal(puedeReservarTour(sesionConEmailUsuario), true);
        });

        it('debe denegar acceso (retornar false) cuando la sesión es null o undefined', () => {
            assert.equal(puedeReservarTour(null), false);
            assert.equal(puedeReservarTour(undefined), false);
        });

        it('debe denegar acceso cuando la sesión no tiene un usuario activo o es un objeto vacío', () => {
            assert.equal(puedeReservarTour({}), false);
            assert.equal(puedeReservarTour({ user: null }), false);
            assert.equal(puedeReservarTour({ user: undefined }), false);
            assert.equal(puedeReservarTour({ user: {} }), false);
            assert.equal(puedeReservarTour({ access_token: 'token-valido-sin-user' }), false);
        });

        it('debe denegar acceso ante tipos de datos no válidos (casos límite: strings, números, booleanos)', () => {
            assert.equal(puedeReservarTour('sesion-invalida'), false);
            assert.equal(puedeReservarTour(12345), false);
            assert.equal(puedeReservarTour(true), false);
            assert.equal(puedeReservarTour(false), false);
        });
    });

    describe('Funciones auxiliares del modelo de autenticación (Teléfono SV y Sanitización)', () => {
        it('debe aceptar números telefónicos salvadoreños válidos de 8 dígitos', () => {
            assert.equal(validarTelefonoSV('71234567'), true);
            assert.equal(validarTelefonoSV('60012345'), true);
            assert.equal(validarTelefonoSV('22501234'), true);
            assert.equal(validarTelefonoSV('7123-4567'), true);
            assert.equal(validarTelefonoSV('2250 1234'), true);
        });

        it('debe rechazar números telefónicos salvadoreños inválidos', () => {
            assert.equal(validarTelefonoSV('7123456'), false);
            assert.equal(validarTelefonoSV('712345678'), false);
            assert.equal(validarTelefonoSV('12345678'), false);
            assert.equal(validarTelefonoSV('telefono'), false);
            assert.equal(validarTelefonoSV(null), false);
            assert.equal(validarTelefonoSV(undefined), false);
        });

        it('debe sanitizar cadenas eliminando espacios en blanco y caracteres de control extremos', () => {
            assert.equal(sanitizarUsuario('   Carlos Rivas   '), 'Carlos Rivas');
            assert.equal(sanitizarUsuario('\t\n Juan Perez \r\n'), 'Juan Perez');
            assert.equal(sanitizarUsuario('Ana Martínez'), 'Ana Martínez');
            assert.equal(sanitizarUsuario(null), '');
            assert.equal(sanitizarUsuario(undefined), '');
            assert.equal(sanitizarUsuario(1234), '');
        });
    });
});

describe('HU: Inicio de Sesión de Turista - Criterios de Aceptación', () => {

    describe('Criterio 1 y 3: Campos obligatorios y validación previa de formulario', () => {
        it('debe rechazar cuando el correo está vacío, nulo o solo contiene espacios', () => {
            const casosCorreo = ['', '   ', '\t\n  \r', null, undefined];
            casosCorreo.forEach(email => {
                const res = validarFormularioLogin({ email, password: 'Password123!' });
                assert.equal(res.esValido, false);
                assert.equal(res.errores.email, 'El correo electrónico es obligatorio');
            });
        });

        it('debe rechazar cuando la contraseña está vacía, nula o solo contiene espacios', () => {
            const casosClave = ['', '   ', '\t\n  \r', null, undefined];
            casosClave.forEach(password => {
                const res = validarFormularioLogin({ email: 'turista@mitur.gob.sv', password });
                assert.equal(res.esValido, false);
                assert.equal(res.errores.password, 'La contraseña es obligatoria');
            });
        });

        it('debe rechazar cuando el correo tiene formato inválido', () => {
            const correosInvalidos = [
                'turista',
                'turista@',
                '@dominio.com',
                'turista@dominio',
                'turista @gmail.com',
                'turista..correo@gmail.com'
            ];
            correosInvalidos.forEach(email => {
                const res = validarFormularioLogin({ email, password: 'Password123!' });
                assert.equal(res.esValido, false);
                assert.equal(res.errores.email, 'Ingresa un formato de correo válido');
            });
        });

        it('debe retornar el mapa de errores con los mensajes exactos por campo', () => {
            const resVacio = validarFormularioLogin({});
            assert.equal(resVacio.esValido, false);
            assert.deepEqual(resVacio.errores, {
                email: 'El correo electrónico es obligatorio',
                password: 'La contraseña es obligatoria'
            });

            const resEspacios = validarFormularioLogin({ email: '   ', password: '   ' });
            assert.equal(resEspacios.esValido, false);
            assert.deepEqual(resEspacios.errores, {
                email: 'El correo electrónico es obligatorio',
                password: 'La contraseña es obligatoria'
            });

            const resFormatoYClaveVacia = validarFormularioLogin({ email: 'correo-sin-arroba', password: '' });
            assert.equal(resFormatoYClaveVacia.esValido, false);
            assert.deepEqual(resFormatoYClaveVacia.errores, {
                email: 'Ingresa un formato de correo válido',
                password: 'La contraseña es obligatoria'
            });
        });

        it('debe aprobar cuando ambos campos son válidos (esValido: true, errores: {})', () => {
            const res = validarFormularioLogin({
                email: 'turista@mitur.gob.sv',
                password: 'Password123!'
            });
            assert.equal(res.esValido, true);
            assert.deepEqual(res.errores, {});
            assert.equal(Object.keys(res.errores).length, 0);
        });
    });

    describe('Criterio 3: Mensaje ante credenciales incorrectas', () => {
        it('debe verificar que el mensaje unificado de error sea exactamente "Correo o contraseña incorrectos"', () => {
            assert.equal(MENSAJE_ERROR_CREDENCIALES, 'Correo o contraseña incorrectos');
        });
    });

    describe('Criterio 2: Formateo de estado de sesión para interfaz', () => {
        it('debe evaluar que un usuario autenticado devuelva { logueado: true, nombreMostrado: "...", email: "..." }', () => {
            const sesionConUsuario = {
                user: {
                    id: 'usr-123',
                    email: 'carlos.rivas@mitur.gob.sv',
                    user_metadata: {
                        full_name: 'Carlos Rivas'
                    }
                }
            };
            const perfil = formatearPerfilSesion(sesionConUsuario);
            assert.equal(perfil.logueado, true);
            assert.equal(perfil.nombreMostrado, 'Carlos Rivas');
            assert.equal(perfil.email, 'carlos.rivas@mitur.gob.sv');

            // Caso con usuario plano sin sesión envolvente
            const usuarioPlano = {
                id: 'usr-456',
                email: 'maria.lopez@sv.com',
                nombre: 'María López'
            };
            const perfilPlano = formatearPerfilSesion(usuarioPlano);
            assert.equal(perfilPlano.logueado, true);
            assert.equal(perfilPlano.nombreMostrado, 'María López');
            assert.equal(perfilPlano.email, 'maria.lopez@sv.com');

            // Caso sin nombre explícito (se extrae del prefijo del correo)
            const sesionSinNombre = {
                user: {
                    id: 'usr-789',
                    email: 'turista2026@gmail.com'
                }
            };
            const perfilSinNombre = formatearPerfilSesion(sesionSinNombre);
            assert.equal(perfilSinNombre.logueado, true);
            assert.equal(perfilSinNombre.nombreMostrado, 'turista2026');
            assert.equal(perfilSinNombre.email, 'turista2026@gmail.com');
        });

        it('debe evaluar que una sesión ausente devuelva { logueado: false }', () => {
            const casosSinSesion = [null, undefined, {}, { user: null }, { user: {} }, 'invalido', 9999];
            casosSinSesion.forEach(sesion => {
                const perfil = formatearPerfilSesion(sesion);
                assert.equal(perfil.logueado, false);
                assert.equal(perfil.nombreMostrado, '');
                assert.equal(perfil.email, '');
            });
        });
    });

    describe('Criterio 5: Interceptor de reserva según estado de autenticación', () => {
        it('debe verificar que requiereIniciarSesionParaReserva(null) devuelva true', () => {
            assert.equal(requiereIniciarSesionParaReserva(null), true);
            assert.equal(requiereIniciarSesionParaReserva(undefined), true);
            assert.equal(requiereIniciarSesionParaReserva({}), true);
            assert.equal(requiereIniciarSesionParaReserva({ user: null }), true);
            assert.equal(requiereIniciarSesionParaReserva({ user: {} }), true);
        });

        it('debe verificar que requiereIniciarSesionParaReserva({ user: { id: "123" } }) devuelva false', () => {
            assert.equal(requiereIniciarSesionParaReserva({ user: { id: '123' } }), false);
            assert.equal(requiereIniciarSesionParaReserva({ user: { id: '123', email: 'turista@mitur.gob.sv' } }), false);
            assert.equal(requiereIniciarSesionParaReserva({ user: { email: 'turista@mitur.gob.sv' } }), false);
        });
    });
});
