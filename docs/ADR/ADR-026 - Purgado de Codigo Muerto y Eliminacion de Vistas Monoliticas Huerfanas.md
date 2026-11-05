# ADR-026: Purgado de Código Muerto y Eliminación de Vistas Monolíticas Huérfanas

## Estado
Implementado — Vísperas de sprint 4 (3 de noviembre de 2026) / Auditoría de Calidad y Cierre de Proyecto

## Contexto y Planteamiento del Problema
A lo largo de las múltiples ramas de Git, fusiones de equipo y la transición desde el Esqueleto 1.0 monolítico hacia el MVC formal en Vanilla JS (ADR-001), el repositorio acumuló pasivos técnicos y residuos de desarrollo:
1. **Archivos Huérfanos Obsoletos:** Existía el archivo `js/views/RegistroViews.js` (518 líneas de código con nombre en plural) que no era importado por ningún controlador ni referenciado en `registro.html`, siendo un duplicado en desuso del componente oficial `RegistroView.js`. Asimismo, el archivo `scripts/build-config.js` utilizaba sintaxis CommonJS (`require('fs')`), fallando en ejecución tras la adopción de `"type": "module"` en `package.json`.
2. **Duplicidad de Funciones Utilitarias:** Funciones críticas como `formatearHora`, `escaparHtml`, `formatearFechaLarga` y `formatearMonedaUSD` se encontraban duplicadas y reimplementadas con ligeras variantes en múltiples vistas (`LugarDetalleView.js`, `TourDetalleView.js`, `PagoView.js`, `AdminPagosView.js`).
3. **Sentencias `import` Huérfanas:** Módulos que importaban constantes y funciones que nunca utilizaban (e.g. `REGLAS_PASSWORD` en `RegistroController.js`, `normalizarTexto` en `LugaresView.js`, o `ALIAS_CATEGORIAS` en pruebas).
4. **Residuos en Estilos CSS:** Bloques redefinidos y propiedades sobreescritas redundantes en `styles.css`, `index-style.css` y comentarios obsoletos en `registro.css`.

Estos residuos introducían confusión en el equipo, elevaban el riesgo de editar el archivo equivocado durante la resolución de defectos y restaban pulcritud técnica ante la auditoría de la cátedra de la ESEN.

## Decisión de Arquitectura y Justificación
Se decide ejecutar una jornada integral de auditoría, purgado de código muerto (*Dead Code Elimination*) y consolidación utilitaria, documentada formalmente en `docs/reporte_limpieza_codigo.md`:

1. **Eliminación Física de Componentes Huérfanos:**
   * Purgado de `js/views/RegistroViews.js` (518 líneas eliminadas).
   * Purgado de `scripts/build-config.js` (211 líneas eliminadas), consolidando la construcción exclusivamente en `scripts/build-config.cjs`.
   * Remoción de la función muerta `calcularPromedioRatings` en `MapaView.js`.

2. **Consolidación de Utilidades Compartidas en `js/utils/textUtils.js`:**
   * Centralización de `formatearHora(hora, { fallback, padZero })` para parsing unificado de hora militar a formato 12 horas AM/PM.
   * Centralización de `escaparHtml(str)` para prevención sistemática de inyecciones XSS en el renderizado dinámico del DOM.
   * Delegación en `MisToursModel`, `PagoView` y `AdminPagosView` hacia las funciones utilitarias compartidas en `ToursModel.js` y `textUtils.js`.

3. **Depuración de Imports y Verificación de Ámbito Global:**
   * Limpieza de todas las declaraciones `import` innecesarias en controladores y pruebas.
   * Verificación estricta de que ninguna variable contamine el objeto `window` y que los únicos `console.log` presentes pertenezcan al subsistema auditado de `NotificacionesModel.js`.

4. **Validación Automatizada de la Limpieza:**
   Verificación formal con `npm run check:syntax` validando los **49 archivos JavaScript** del proyecto con 0 errores de sintaxis, complementado con la ejecución exitosa del 100% de la suite de pruebas unitarias (`npm test`: 185 pruebas superadas en verde).

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Repositorio optimizado, limpio, profesional y 100% auditable.
  * Eliminación de riesgos de desincronización entre archivos gemelos u obsoletos.
  * Mejora notable en la mantenibilidad futura para el personal del MITUR.
  * Cero regresiones funcionales: las 185 pruebas automatizadas confirmaron la integridad absoluta de los contratos de software.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Riesgo inicial de romper dependencias transitivas durante el borrado.*
  * *Mitigación:* Se ejecutaron `npm run check:syntax` y `npm test` antes y después de cada eliminación, garantizando contractualmente la estabilidad del sistema.

