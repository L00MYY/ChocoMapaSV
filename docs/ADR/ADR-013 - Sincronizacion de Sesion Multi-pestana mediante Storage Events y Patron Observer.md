# ADR-013: Sincronización de Sesión Multi-pestaña mediante Storage Events y Patrón Observer

## Estado
Implementado — Sprint 4 (28 de octubre de 2026)

## Contexto y Planteamiento del Problema
En el flujo habitual de uso de ChocoMapaSV, tanto turistas como administradores operan abriendo múltiples pestañas del navegador en simultáneo (por ejemplo: una pestaña explorando el catálogo de tours, otra revisando el historial de `mis-tours.html`, y otra con la pasarela de subida de comprobantes en `pago-comprobante.html`).

En aplicaciones web con renderizado en cliente basadas en `localStorage`, si el usuario cierra su sesión (*logout*) o inicia sesión en una pestaña determinada:
1. Las demás pestañas abiertas permanecen en un estado "fantasma" desincronizado (conservando en memoria variables de sesión caducadas).
2. Si el usuario intenta realizar una reserva o consultar un panel privado en una pestaña obsoleta, las solicitudes fallan inesperadamente con errores 401 de red o dejan la interfaz en un estado inconsistente.
3. Forzar al usuario a refrescar manualmente cada pestaña degrada la percepción de calidad del producto.

## Decisión de Arquitectura y Justificación
Se decide implementar una arquitectura reactiva de sincronización entre pestañas en `js/models/AuthModel.js`, combinando el evento nativo del navegador `window.addEventListener('storage', ...)` con el patrón de diseño de comportamiento **Observer**:

1. **Gestor de Observadores (`authListeners`):**
   `AuthModel.js` mantiene una colección de callbacks (`const authListeners = new Set()`) y métodos de suscripción pública `onAuthStateChange(callback)`.

2. **Escucha Reactiva del Storage Event:**
   El navegador dispara el evento `storage` en todas las ventanas y pestañas del mismo dominio *excepto* en la que originó el cambio. `AuthModel` captura este evento:
   ```javascript
   if (typeof window !== 'undefined' && window.addEventListener) {
       window.addEventListener('storage', (event) => {
           if (event.key === STORAGE_KEY) {
               try {
                   const nuevaSesion = event.newValue ? JSON.parse(event.newValue) : null;
                   const evento = nuevaSesion ? 'SIGNED_IN' : 'SIGNED_OUT';
                   notificarCambio(evento, nuevaSesion);
               } catch (error) {
                   notificarCambio('SIGNED_OUT', null);
               }
           }
       });
   }
   ```

3. **Propagación Local Inmediata:**
   En los métodos `iniciarSesion` y `cerrarSesion`, se invoca inmediatamente `notificarCambio(evento, sesion)` para que la pestaña actual responda instantáneamente sin esperar eventos del sistema operativo.

4. **Reacción de Vistas y Controladores:**
   Componentes como `NavbarController`, `PagoController` y `TourDetalleController` se suscriben a estos cambios, actualizando dinámicamente el avatar del usuario, habilitando/deshabilitando botones de reserva o redirigiendo según corresponda.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Sincronización instantánea y fluida del estado de autenticación en todas las ventanas abiertas del usuario.
  * Cero discrepancias o llamadas no autorizadas originadas por estados obsoletos en pestañas secundarias.
  * Implementación limpia, ligera y sin librerías externas, aprovechando al 100% las APIs nativas del navegador web.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Sensibilidad ante corrupción de datos en localStorage:* Si una pestaña escribe una cadena mal formada en `STORAGE_KEY`, podría provocar fallos de parsing en las demás.
  * *Mitigación:* Se encapsuló la deserialización dentro de un bloque `try / catch` estricto; ante cualquier error de lectura, el sistema asume de forma segura que la sesión se cerró (`SIGNED_OUT`), protegiendo el acceso a los datos.

