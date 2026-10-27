import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    validarEmail,
    validarPassword,
    validarTelefonoSV,
    sanitizarUsuario
} from '../js/models/AuthModel.js';

describe('Suite de Autenticación y Validación de Datos (Auth)', () => {
    describe('Validación de formato estricto de correo electrónico', () => {
        it('debe validar correos con sintaxis estándar válida', () => {
            assert.equal(validarEmail('turista@mitur.gob.sv'), true);
            assert.equal(validarEmail('usuario.prueba@gmail.com'), true);
            assert.equal(validarEmail('contacto_123@empresa.com.sv'), true);
            assert.equal(validarEmail('user+tag@domain.co'), true);
        });

        it('debe rechazar correos sin @ o sin dominio', () => {
            assert.equal(validarEmail('usuariogmail.com'), false);
            assert.equal(validarEmail('usuario@'), false);
            assert.equal(validarEmail('@dominio.com'), false);
            assert.equal(validarEmail('usuario@dominio'), false);
        });

        it('debe rechazar correos con espacios intermedios o caracteres inválidos', () => {
            assert.equal(validarEmail('usuario @gmail.com'), false);
            assert.equal(validarEmail('usuario@ gmail.com'), false);
            assert.equal(validarEmail('usuario@gmail .com'), false);
            assert.equal(validarEmail('usuario@gmail..com'), false);
        });

        it('debe rechazar cadenas vacías, nulas o tipos no válidos', () => {
            assert.equal(validarEmail(''), false);
            assert.equal(validarEmail('   '), false);
            assert.equal(validarEmail(null), false);
            assert.equal(validarEmail(undefined), false);
            assert.equal(validarEmail(12345), false);
        });
    });

    describe('Validación de contraseña segura', () => {
        it('debe aceptar contraseñas con longitud mínima de 8 caracteres y caracteres alfanuméricos', () => {
            assert.equal(validarPassword('ChocoPass1'), true);
            assert.equal(validarPassword('Segura2026'), true);
            assert.equal(validarPassword('clave12345'), true);
            assert.equal(validarPassword('Admin9999'), true);
        });

        it('debe rechazar contraseñas con menos de 8 caracteres', () => {
            assert.equal(validarPassword('Pass1'), false);
            assert.equal(validarPassword('1234567'), false);
            assert.equal(validarPassword('Abc123'), false);
        });

        it('debe rechazar contraseñas que no combinan caracteres alfanuméricos (solo letras o solo números)', () => {
            assert.equal(validarPassword('sololetras'), false);
            assert.equal(validarPassword('SOLOLETRAS'), false);
            assert.equal(validarPassword('1234567890'), false);
        });

        it('debe rechazar valores vacíos, nulos o no string', () => {
            assert.equal(validarPassword(''), false);
            assert.equal(validarPassword(null), false);
            assert.equal(validarPassword(undefined), false);
            assert.equal(validarPassword(12345678), false);
        });
    });

    describe('Validación de número telefónico salvadoreño (8 dígitos numéricos)', () => {
        it('debe aceptar números telefónicos salvadoreños válidos de 8 dígitos (fijos y móviles)', () => {
            // Móviles comunes (inician con 7 o 6)
            assert.equal(validarTelefonoSV('71234567'), true);
            assert.equal(validarTelefonoSV('60012345'), true);
            assert.equal(validarTelefonoSV('78901234'), true);
            // Fijos comunes (inician con 2)
            assert.equal(validarTelefonoSV('22501234'), true);
            assert.equal(validarTelefonoSV('24401234'), true);
        });

        it('debe aceptar números con formato separado por guiones o espacios', () => {
            assert.equal(validarTelefonoSV('7123-4567'), true);
            assert.equal(validarTelefonoSV('2250 1234'), true);
            assert.equal(validarTelefonoSV('  6001-2345  '), true);
        });

        it('debe rechazar números con longitud distinta de 8 dígitos', () => {
            assert.equal(validarTelefonoSV('7123456'), false);     // 7 dígitos
            assert.equal(validarTelefonoSV('712345678'), false);   // 9 dígitos
            assert.equal(validarTelefonoSV('22'), false);
        });

        it('debe rechazar números que contengan caracteres no numéricos', () => {
            assert.equal(validarTelefonoSV('7123ABCD'), false);
            assert.equal(validarTelefonoSV('7123-456A'), false);
            assert.equal(validarTelefonoSV('telefono'), false);
        });

        it('debe rechazar prefijos telefónicos inválidos para El Salvador', () => {
            assert.equal(validarTelefonoSV('12345678'), false);
            assert.equal(validarTelefonoSV('91234567'), false);
            assert.equal(validarTelefonoSV('01234567'), false);
        });

        it('debe rechazar valores nulos, indefinidos o vacíos', () => {
            assert.equal(validarTelefonoSV(''), false);
            assert.equal(validarTelefonoSV(null), false);
            assert.equal(validarTelefonoSV(undefined), false);
        });
    });

    describe('Sanitización de cadenas (trim en nombres de usuario)', () => {
        it('debe eliminar espacios en blanco al inicio y al final de la cadena', () => {
            assert.equal(sanitizarUsuario('   Carlos Rivas   '), 'Carlos Rivas');
            assert.equal(sanitizarUsuario('Maria del Carmen '), 'Maria del Carmen');
            assert.equal(sanitizarUsuario('  Turista Salvadoreño'), 'Turista Salvadoreño');
        });

        it('debe remover tabulaciones y saltos de línea extremos', () => {
            assert.equal(sanitizarUsuario('\t\n Juan Perez \r\n'), 'Juan Perez');
        });

        it('debe preservar cadenas ya limpias sin alteraciones', () => {
            assert.equal(sanitizarUsuario('Ana Martínez'), 'Ana Martínez');
        });

        it('debe manejar entradas vacías o no string de forma segura', () => {
            assert.equal(sanitizarUsuario(''), '');
            assert.equal(sanitizarUsuario('   '), '');
            assert.equal(sanitizarUsuario(null), '');
            assert.equal(sanitizarUsuario(undefined), '');
            assert.equal(sanitizarUsuario(1234), '');
        });
    });
});
