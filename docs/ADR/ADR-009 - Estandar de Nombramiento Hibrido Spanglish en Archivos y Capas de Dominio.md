# ADR-009: Estándar de Nombramiento Híbrido Spanglish en Archivos y Capas de Dominio

## Estado
Aceptado — Sprint 1 (20 de octubre de 2026) / Ratificado en vísperas de Sprint 4

## Contexto y Planteamiento del Problema
Durante las primeras iteraciones de diseño de software de ChocoMapaSV, el equipo de desarrollo se enfrentó a un dilema continuo de nomenclatura:
1. La adopción purista del inglés obligaba a traducir términos legales, gubernamentales y geográficos salvadoreños a conceptos anglosajones artificiales (por ejemplo, traducir "cupos" como `spots` vs `quotas`, "comprobante" como `voucher` vs `receipt`, o "lugar turístico" como `tourist_place`), lo que generaba pérdida de riqueza semántica y desalineación con las actas de requerimientos de Jira.
2. La adopción purista del español rompía con las convenciones universales de la ingeniería de software y de las bibliotecas del ecosistema JavaScript (generando anomalías como `ControladorLugares.js`, `VistaInicio.js`, o `utilidadesTexto.js`).
3. La falta de un criterio unificado provocaba combinaciones arbitrarias y desordenadas en variables como `tourist_email`, `reservaId`, `cuposDisponibles` y `paymentReceipt`.

## Decisión de Arquitectura y Justificación
Se formaliza y adopta un Estándar de Nombramiento Híbrido Gobernado ("Spanglish Técnico Arquitectónico") en todo el repositorio:

* **Inglés para Roles Arquitectónicos, Patrones y Tipos Universales:**
  * Sufijos de clases y módulos arquitectónicos: `Controller`, `Model`, `View`, `Utils`.
  * Metadatos técnicos universales: `id`, `status`, `created_at`, `expires_at`, `token`, `headers`, `payload`, `attempts`.
* **Español para Sustantivos de Negocio, Dominio MITUR y Métodos de Aplicación:**
  * Entidades y conceptos salvadoreños: `Lugar`, `Turista`, `Pago`, `Cupos`, `Comprobante`, `Calificaciones`, `MisTours`, `AdminPagos`.
  * Nombres de archivos fuente: `InicioView.js`, `LugarDetalleController.js`, `PagoModel.js`, `AdminPagosModel.js`, `RegistroView.js`.
  * Métodos de negocio en controladores y modelos: `obtenerDetalleReserva`, `reincorporarCuposTour`, `subirComprobanteStorage`, `evaluarElegibilidadCalificacion`.

Las convenciones ortotipográficas de mayúsculas y minúsculas se rigen estrictamente por:
- **`camelCase`:** Variables, parámetros, atributos de objetos y funciones/métodos (`obtenerSesionActual`, `calcularAforoDisponible`).
- **`PascalCase`:** Clases, objetos de vista, controlador y modelo (`AuthModel`, `ToursController`, `LugaresView`).
- **`UPPER_SNAKE_CASE`:** Constantes de configuración globales del archivo (`STORAGE_KEY`, `MAX_FILE_SIZE_BYTES`).
- **`kebab-case`:** Nombres de archivos y clases CSS (`detalle-lugar.html`, `tours.css`, `.filters-card`).

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Trazabilidad directa y sin ambigüedades entre los tickets de Jira (`JUL-XX`), las especificaciones del MITUR y los archivos del código fuente.
  * Legibilidad inmediata para evaluadores académicos y auditores gubernamentales durante la defensa técnica del proyecto.
  * Coherencia arquitectónica al mantener el patrón MVC reconocible internacionalmente con sus sufijos `Model`, `View` y `Controller`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Discrepancia léxica con desarrolladores externos que exigen código 100% en inglés.*
  * *Mitigación:* Se formalizó la regla en el documento rector `docs/Estándares Técnicos.md`, incorporando validaciones de sintaxis (`npm run check:syntax`) y tipado documental con JSDoc en todas las firmas públicas para evitar confusiones de tipo o alcance.

