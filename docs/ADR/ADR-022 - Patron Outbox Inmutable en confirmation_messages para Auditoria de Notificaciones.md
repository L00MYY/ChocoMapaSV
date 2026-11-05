# ADR-022: Patrón Outbox Inmutable en confirmation_messages para Auditoría de Notificaciones

## Estado
Implementado — Vísperas de sprint 4 (2 de noviembre de 2026)

## Contexto y Planteamiento del Problema
Cuando el panel administrativo de ChocoMapaSV aprueba o rechaza una reserva de tour, se desencadena el envío de un correo electrónico al turista. No obstante, las comunicaciones en redes distribuidas son inherentemente no deterministas:
1. La API de correo puede experimentar caídas temporales, agotamiento de cuotas o cortes de red.
2. Si la notificación solo se despachara "al vuelo" en memoria, no existiría ningún registro histórico que certifique si el mensaje fue enviado, qué plantilla se utilizó, cuántos intentos se realizaron o cuál fue el motivo formal del rechazo transmitido al ciudadano.
3. Para fines de auditoría gubernamental del MITUR, es mandatorio contar con una bitácora inalterable de todas las comunicaciones oficiales emitidas por la plataforma.

## Decisión de Arquitectura y Justificación
Se decide implementar una adaptación del patrón transaccional **Transactional Outbox**, persistiendo cada evento de notificación en la tabla relacional `public.confirmation_messages` de PostgreSQL antes o simultáneamente al despacho físico:

1. **Estructura DDL Conforme al Esquema Oficial:**
   El registro en base de datos se genera mediante `crearRegistroConfirmacionMessage` en `NotificacionesModel.js`:
   ```javascript
   export function crearRegistroConfirmacionMessage({ reservaId, tipo, status = 'enviado' }) {
       return {
           reservation_id: reservaId,
           channel: 'email',
           message_type: tipo, // 'confirmacion_tour' | 'rechazo_tour'
           status: status,     // 'enviado' | 'fallido'
           attempts: 1,
           sent_at: new Date().toISOString(),
           created_at: new Date().toISOString()
       };
   }
   ```
   *Nota de diseño:* Se respeta estrictamente el esquema DDL oficial de PostgreSQL, omitiendo campos no presentes en la tabla (como `recipient` o `payload`) para prevenir errores de esquema en PostgREST.

2. **Validación Previa Obligatoria en Rechazos:**
   Si el tipo de mensaje es `rechazo_tour`, el modelo exige estrictamente la presencia del argumento `rejection_reason` no vacío. Si el funcionario no ingresó un motivo formal, el sistema lanza una excepción y aborta la transacción antes de persistir el mensaje.

3. **Inmutabilidad y Auditoría:**
   Los registros en `confirmation_messages` son estrictamente de inserción (*append-only*); ninguna operación de usuario o administrador puede modificarlos o eliminarlos, garantizando la cadena de custodia de las notificaciones institucionales.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Trazabilidad y auditoría completa.
  * Capacidad técnica de implementar mecanismos de reintento (*retry policies*) para mensajes con estado `'fallido'`.
  * Desacoplamiento entre el ciclo de vida de la reserva (`tour_reservations`) y el canal de mensajería (`confirmation_messages`).
  * Respaldado por aserciones estrictas en `tests/notificaciones.test.js`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Sobrecarga de una llamada HTTP adicional a PostgREST por cada notificación enviada.*
  * *Mitigación:* La inserción de una fila individual en PostgreSQL toma entre 20 y 40 milisegundos, una penalización insignificante frente a los beneficios de gobernanza y respaldo probatorio gubernamental.

