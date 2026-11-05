# ADR-017: Temporizador de Reserva Basado en Servidor (expires_at UTC a 60 Minutos)

## Estado
Implementado — Sprint 4 (30 de octubre de 2026)

## Contexto y Planteamiento del Problema
Para que el turista pueda salir de la plataforma web, ingresar a la aplicación móvil de su banco (Banco Agrícola, BAC, Cuscatlán, Chivo Wallet), efectuar la transferencia interbancaria y descargar o capturar el comprobante, es indispensable otorgar una ventana de tiempo razonable donde sus cupos permanezcan apartados.

Si el tiempo de expiración de la reserva se calculara o controlara exclusivamente en el lado del cliente (por ejemplo, con un `setTimeout` o variables en `sessionStorage`):
1. El usuario podría manipular fácilmente el reloj de su computadora, pausar la ejecución en DevTools o limpiar el almacenamiento para extender artificialmente su reserva por días.
2. Si el turista cambiaba de dispositivo o cerraba el navegador para revisar su banca en línea y luego regresaba desde su teléfono móvil, el temporizador local se reiniciaba o desaparecía.
3. Se generaban desajustes de zona horaria entre usuarios en el extranjero y la hora oficial de El Salvador (UTC-6).

## Decisión de Arquitectura y Justificación
Se decide gobernar la expiración de reservas de forma estricta mediante marcas de tiempo universales emitidas por el servidor en la base de datos de Supabase:

1. **Columna Canónica `expires_at` en Formato UTC (ISO 8601):**
   Al generarse una nueva fila en `tour_reservations`, se calcula y persiste la columna `expires_at` sumando exactamente 60 minutos (3600 segundos) a la marca de tiempo de creación:
   ```javascript
   expires_at: item.expires_at || new Date(new Date(item.created_at).getTime() + 3600000).toISOString()
   ```

2. **Cálculo de Tiempo Restante Agnóstico al Cliente:**
   En `PagoView.js` y `PagoModel.js`, el temporizador de cuenta regresiva en pantalla se calcula exclusivamente como la diferencia diferencial entre la hora actual de referencia y `reserva.expires_at`:
   ```javascript
   const deltaMs = new Date(reserva.expires_at).getTime() - Date.now();
   ```

3. **Bloqueo Inmediato ante Vencimiento:**
   Si `deltaMs <= 0`, la interfaz detiene la cuenta regresiva, deshabilita el botón de subida de archivos, oculta el formulario de comprobante, despliega la alerta visual de expiración y actualiza el distintivo de la reserva a `'expirada'`.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Imposibilidad de fraude o manipulación del reloj por parte del usuario en su terminal local.
  * Consistencia total entre múltiples dispositivos: si el usuario inicia la reserva en una laptop y la abre en un smartphone, ambas pantallas muestran exactamente el mismo tiempo restante sincronizado en UTC.
  * Respeto a las políticas operativas del MITUR: los 60 minutos otorgan holgura suficiente para transferencias bancarias sin perjudicar la disponibilidad de cupos para otros ciudadanos.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Desincronización por descalibración extrema del reloj del cliente.*
  * *Mitigación:* La evaluación final de validez de la reserva se realiza a nivel de servidor en las consultas de PostgREST, garantizando que el estado de base de datos prevalezca sobre cualquier anomalía visual local.

