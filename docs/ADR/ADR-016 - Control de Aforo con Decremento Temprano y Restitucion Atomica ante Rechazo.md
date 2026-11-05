# ADR-016: Control de Aforo con Decremento Temprano y Restitución Atómica ante Rechazo

## Estado
Implementado — Sprint 4 (30 de octubre de 2026) / Defecto 1 de Jira

## Contexto y Planteamiento del Problema
En las rutas y tours guiados gestionados por el MITUR, los cupos disponibles por fecha (`available_spots` en la tabla `tour_dates`) representan una restricción física ineludible por razones de capacidad del transporte turístico y conservación ambiental de las áreas protegidas (como el cráter del Volcán de Santa Ana o el Parque Nacional El Imposible).

Existía un dilema crítico de consistencia transaccional y sobreventa (*overbooking*):
1. **Riesgo de Sobreventa con Decremento Tardío:** Si el descuento de cupos se posponía hasta el momento en que un administrador aprobara el comprobante en la mesa de control, dos o más turistas podían reservar simultáneamente los últimos 2 cupos para la misma fecha. Al aprobarse los comprobantes, se generaba un exceso inmanejable de pasajeros.
2. **Fuga Permanente de Cupos ante Rechazo:** Si se aplicaba un decremento inmediato pero la reserva era rechazada por un comprobante ilegible, falso o no coincidente, los cupos quedaban bloqueados permanentemente en el sistema sin regresar al catálogo público si no se diseñaba una restitución atómica.

## Decisión de Arquitectura y Justificación
Se decide implementar una estrategia transaccional de dos tiempos basada en Decremento Temprano (*Pessimistic Early Lock*) y Restitución Atómica Idempotente:

1. **Decremento Temprano al Crear la Reserva (`TourDetalleModel`):**
   En el momento exacto en que el turista envía el formulario de reserva (`crearReservaTour`), el sistema consulta los cupos disponibles y actualiza de inmediato la fila en `tour_dates`:
   ```javascript
   available_spots: actualAvailableSpots - spots_reserved
   ```
   Esto bloquea físicamente los cupos frente a cualquier otro turista que intente reservar esa misma fecha en paralelo, erradicando por diseño la posibilidad de sobreventa.

2. **Restitución Atómica e Idempotente ante Rechazo o Cancelación (`AdminPagosModel`):**
   En `AdminPagosModel.rechazarReserva` y `reincorporarCuposTour`, si un funcionario administrativo rechaza el comprobante con un motivo justificado:
   * Se verifica el estado de la reserva mediante control de concurrencia (`verificarEstadoReserva`) para garantizar que no haya sido procesada previamente.
   * Se actualiza el estado de la reserva a `'rechazada'` y el recibo a `'rechazado'`.
   * Se ejecuta una consulta atómica de `available_spots` en `tour_dates` y se restituyen los `spots_reserved` mediante una operación HTTP `PATCH`:
     ```javascript
     const nuevoAvailableSpots = Number(spotsActuales) + Number(spotsReserved);
     // PATCH tour_dates con available_spots: nuevoAvailableSpots
     ```
   * Se envía una notificación por correo al turista explicando el motivo formal del rechazo.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Garantía matemática de cero sobreventa (*zero overbooking*) en todos los tours del MITUR.
  * Reincorporación automática y transparente de cupos al catálogo sin requerir intervención manual de bases de datos.
  * Idempotencia comprobada: reservas ya procesadas no pueden inflar artificialmente los cupos disponibles ante clics duplicados en la interfaz de administración.
  * Validado con pruebas unitarias exhaustivas en `tests/comprobantes_y_admin.test.js`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Riesgo de bloqueo temporal de cupos por reservas abandonadas:* Un usuario podría crear una reserva, descontar cupos y nunca transferir el dinero.
  * *Mitigación:* Se implementó el ADR-017 (Temporizador gobernado por servidor a 60 minutos), liberando la reserva automáticamente si el comprobante no es adjuntado dentro de la ventana de tiempo reglamentaria.

