# ADR-015: Sanitización Canónica y Validación Regex de Teléfonos Salvadoreños e Internacionales

## Estado
Implementado — Sprint 4 (30 de octubre de 2026) / Resolución de Defecto en Jira

## Contexto y Planteamiento del Problema
En el esquema relacional de PostgreSQL en Supabase, la tabla `tour_reservations` fue configurada con una restricción de integridad formal a nivel de base de datos:
```sql
CONSTRAINT check_phone CHECK (tourist_phone ~ '^[0-9]+$')
```
Esta regla exige que cualquier valor almacenado en la columna `tourist_phone` esté compuesto exclusivamente por caracteres numéricos (dígitos del 0 al 9), sin ningún otro símbolo.

Durante las pruebas de aceptación de reservas en `tour-detalle.html`, se detectó un alto índice de fallos transaccionales (HTTP 400 Bad Request):
1. Los usuarios salvadoreños acostumbran escribir sus números móviles con guiones (`7777-8888`) o con espacios (`7777 8888`).
2. Los turistas internacionales ingresaban prefijos telefónicos con signos más o paréntesis (`+503 7123-4567` o `+1 (555) 234-5678`).
3. Al viajar estas cadenas con caracteres no numéricos hacia Supabase PostgREST, PostgreSQL abortaba inmediatamente la inserción con una violación de constraint, frustrando la experiencia del turista y bloqueando el registro de la reserva.

## Decisión de Arquitectura y Justificación
Se decide implementar una estrategia desacoplada de Sanitización Canónica y Validación Regex en dos fases:

1. **Función de Sanitización Pura (`sanitizarTelefono`):**
   Ubicada en `js/models/TourDetalleModel.js` y `js/models/AuthModel.js`. Aplica una limpieza estricta que remueve cualquier símbolo, guion, espacio, paréntesis o letra mediante una expresión regular de negación numérica:
   ```javascript
   export function sanitizarTelefono(telefono) {
       if (!telefono) return '';
       return String(telefono).replace(/\D/g, '');
   }
   ```

2. **Validación de Negocio Flexible e Inclusiva (`validarFormularioReserva`):**
   El sistema no rechaza al usuario por ingresar guiones o espacios; en su lugar, sanitiza internamente el valor y evalúa la longitud canónica de dígitos numéricos continuos:
   * **Rango Válido:** Entre 8 y 15 dígitos continuos (cumpliendo con la norma internacional de telecomunicaciones ITU-T E.164 para números nacionales e internacionales).
   * **Rechazo Preciso:** Se rechazan únicamente teléfonos con menos de 8 dígitos o más de 15 dígitos con el mensaje de error exacto requerido por el criterio de aceptación.

3. **Garantía Contractual en el Modelo de Datos (`crearReservaTour`):**
   Antes de despachar la petición `POST` hacia Supabase, el modelo asegura que `tourist_phone` sea sobreescrito con la versión sanitizada, satisfaciendo inequívocamente el constraint `CHECK ^[0-9]+$`.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Eliminación del 100% de los errores transaccionales por violación del constraint `check_phone`.
  * Experiencia de usuario altamente tolerante y amigable: el turista puede escribir en su formato habitual sin recibir bloqueos innecesarios.
  * Compatibilidad completa tanto para el mercado doméstico salvadoreño (8 dígitos) como para turistas extranjeros de Centroamérica, Norteamérica o Europa (hasta 15 dígitos).
  * Suite de pruebas automatizadas con cobertura total en `tests/comprobantes_y_admin.test.js`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Pérdida del formato visual con guiones en la base de datos cruda:* El número se almacena como una cadena plana de dígitos (`77778888`).
  * *Mitigación:* Si una vista o reporte administrativo requiere presentar el formato telefónico tradicional salvadoreño, se formatea dinámicamente en la capa de presentación (`views/`), manteniendo la persistencia limpia y normalizada.

