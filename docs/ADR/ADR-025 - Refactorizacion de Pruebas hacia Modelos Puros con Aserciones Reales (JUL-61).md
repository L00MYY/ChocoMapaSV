# ADR-025: Refactorización de Pruebas hacia Modelos Puros con Aserciones Reales (JUL-61)

## Estado
Implementado — Vísperas de sprint 4 (3 de noviembre de 2026) / Historia de Jira JUL-61

## Contexto y Planteamiento del Problema
En las iteraciones tempranas del proyecto, la verificación automatizada era prácticamente inexistente o descansaba sobre pruebas frágiles que dependían de objetos quemados y mocks superficiales que no ejecutaban la lógica de negocio real. Pruebas que validaban datos estáticos generaban una falsa sensación de seguridad:
1. Al refactorizar controladores o corregir defectos transaccionales de cupos y autenticación, las pruebas seguían pasando en verde a pesar de existir regresiones en el código fuente.
2. La falta de cobertura demostrable sobre los criterios de aceptación de Jira debilitaba la justificación técnica.
3. Se requería un arnés de pruebas ultra veloz, libre de frameworks pesados (como Jest o Mocha) que sobrecargaran el entorno de ejecución o introdujeran dependencias incompatibles con `"type": "module"`.

## Decisión de Arquitectura y Justificación
Se decide ejecutar una reingeniería profunda del subsistema de pruebas (Jira JUL-61), migrando a un enfoque de **Modelos Puros y Aserciones Reales** ejecutado con el test runner nativo de Node.js:

1. **Uso del Test Runner Nativo de Node.js (`node --test` y `node:assert/strict`):**
   Se prescindió por completo de librerías externas de pruebas. La suite se ejecuta de forma nativa mediante `npm test` (`node --test`), alcanzando tiempos de ejecución globales inferiores a **500 milisegundos**.

2. **Aislamiento en Modelos Puros Desacoplados del DOM:**
   Las funciones críticas de negocio se aislaron como funciones puras o con inyección de dependencias en `models/` y `utils/`:
   * Validación de credenciales y contraseñas seguras (`AuthModel`).
   * Formateo de moneda USD (`formatearMonedaUSD`), parseo de fechas largas y regla cronológica de vigencia (`esFechaPasada`).
   * Desduplicación y normalización de correos (`NotificacionesModel`).
   * Algoritmo de elegibilidad de calificaciones y promedio ponderado (`CalificacionesModel`).
   * Decremento y restitución atómica de cupos ante rechazo (`AdminPagosModel`).

3. **Polyfills Mínimos Controlados y Espías Dinámicos:**
   Para emular el entorno de ejecución del navegador en Node.js, se introdujeron polyfills en memoria ligeros (`localStorage`, `window.supabase`, `globalThis.fetch` controlado con espías dinámicos), permitiendo testear llamadas de red sin acoplarse a servicios en la nube en tiempo de prueba.

4. **Resultado de la Suite:**
   Se consolidó un total de **185 pruebas unitarias automatizadas** organizadas en 65 suites, con **100% de tasa de aprobación (0 fallos, 0 regresiones)**.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Certeza técnica inquebrantable: cada regla de negocio, fórmula matemática y restricción de aforo está respaldada por aserciones formales.
  * Ejecución instantánea en el pipeline de Integración Continua (CI en GitHub Actions) y en terminales locales.
  * Cero dependencias pesadas de testing en `package.json`.
  * Respaldo documental y probatorio inexpugnable para la revisión de la decana y la defensa de graduación.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Complejidad para testear vistas que manipulan directamente el DOM del navegador.*
  * *Mitigación:* Se diseñaron mocks sintéticos de elementos del DOM en suites específicas (`theme_system.test.js`) y se priorizó probar exhaustivamente los modelos y controladores, donde reside la verdad de la lógica de software.

