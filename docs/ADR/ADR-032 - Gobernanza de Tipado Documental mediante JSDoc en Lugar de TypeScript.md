# ADR-032: Gobernanza de Tipado Documental mediante JSDoc en Lugar de TypeScript

## Estado
Aceptado e Implementado — Sprint 1 (20 de octubre de 2026) / Ratificado en Sprint 4

## Contexto y Planteamiento del Problema
A medida que ChocoMapaSV creció hasta abarcar 49 archivos JavaScript, múltiples modelos de datos (`ToursModel`, `PagoModel`, `AdminPagosModel`, `AuthModel`, `CalificacionesModel`) y controladores con flujos asíncronos complejos, surgió la necesidad crítica de contar con seguridad de tipos:
1. Prevenir errores comunes en tiempo de ejecución por propiedades inexistentes o tipos inesperados (`TypeError: Cannot read properties of undefined`, pasar un `string` numérico donde se espera un `number`).
2. Facilitar la navegación, autocompletado inteligente (*IntelliSense*) y refactorización ágil en los editores de código (Visual Studio Code).
3. Proveer documentación técnica viva y precisa para que cualquier integrante del equipo de la ESEN pudiera defender y explicar el funcionamiento exacto de cada función en el examen oral individual ante la decana.

Sin embargo, adoptar TypeScript de manera convencional colisionaba frontalmente con la decisión arquitectónica fundamental de operar con JavaScript nativo en el navegador sin empaquetadores ni pasos de transpilación (ADR-010).

## Opciones Consideradas
1. **JavaScript Puro sin Tipado ni Anotaciones:**
   * *Ventajas:* Cero sobrecarga documental al escribir código.
   * *Desventajas:* Fragilidad técnica severa, ausencia de autocompletado inteligente en el IDE, dificultad para auditar contratos de datos entre modelos y controladores, y alto riesgo de regresiones en entregas ágiles.
2. **Migración Completa a TypeScript (`.ts`):**
   * *Ventajas:* Sistema de tipos estático líder de la industria y chequeo riguroso en tiempo de compilación.
   * *Desventajas:* Requiere introducir el compilador `tsc`, configurar empaquetadores (Webpack/Vite/Rollup) o pipelines de transpilación, gestionar sourcemaps para depuración y lidiar con dependencias pesadas en `node_modules`, violando la premisa de simplicidad y ejecución nativa en el navegador.
3. **Gobernanza de Tipado Documental con JSDoc y TypeScript Language Server:**
   * *Ventajas:* Obtiene el 90% de los beneficios de TypeScript (autocompletado, verificación estática de tipos en el editor mediante el motor TypeScript Language Server integrado en VS Code, validación de parámetros y retornos) utilizando JavaScript estándar puro (`.js`), sin requerir ningún paso de compilación, transpilación ni empaquetadores.

## Decisión de Arquitectura y Justificación
Se decide adoptar formalmente **JSDoc Estructurado** como el estándar obligatorio de tipado documental y gobernanza técnica en todos los modelos, controladores y módulos utilitarios del repositorio (`docs/Estándares Técnicos.md`, Sección 4).

Cada función o método público debe contar estrictamente con su bloque JSDoc estructurado:
* `@description`: Explicación concisa del propósito de la función y la regla de negocio que implementa.
* `@param {Tipo}`: Tipado estricto (e.g. `{string}`, `{number}`, `{Object}`, `{Array<Object>}`) y descripción de cada argumento recibido.
* `@returns {Tipo}`: Tipado y descripción del valor de retorno o promesa que resuelve (`{Promise<Object|null>}`).
* `@throws {Error}`: Excepciones tipificadas que la función puede propagar ante condiciones de fallo.

```javascript
/**
 * @description Reincorpora los cupos reservados a la tabla tour_dates cuando una reserva es rechazada.
 * @param {string} tourDateId - UUID de la fecha del tour.
 * @param {number} spotsReserved - Cantidad de cupos a reintegrar.
 * @param {Object|null} [authHeadersCustom=null] - Cabeceras de autenticación opcionales.
 * @returns {Promise<{ ok: boolean, available_spots?: number, data?: Object, error?: * }>}
 */
export async function reincorporarCuposTour(tourDateId, spotsReserved, authHeadersCustom = null) { ... }
```

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Preservación absoluta de la arquitectura sin empaquetadores (ADR-010): el código se ejecuta de forma nativa en el navegador sin pasos de compilación.
  * Autocompletado inteligente e inspección de tipos en tiempo real en Visual Studio Code y Antigravity.
  * Código auto-documentado y auditable: facilita la lectura de contratos de software para la decana y la mesa examinadora académica.
  * Integración nativa con herramientas de verificación sintáctica (`npm run check:syntax`).

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Verificación en tiempo de ejecución no coercitiva:* JSDoc no detiene la ejecución si se ignora un tipo, a diferencia de un compilador de TypeScript estricto.
  * *Mitigación:* Se compensó complementando el tipado documental con la suite de 185 pruebas unitarias automatizadas con aserciones estrictas (`node:assert/strict`, ADR-025), garantizando que las violaciones de tipo se detecten de inmediato durante la fase de pruebas.

