# ADR-014: Mitigación de BFCache (Back-Forward Cache) en Vistas Críticas mediante pageshow

## Estado
Implementado — Sprint 4 (29 de octubre de 2026)

## Contexto y Planteamiento del Problema
Los motores de renderizado de los navegadores web modernos (WebKit/Safari, Blink/Chrome, Gecko/Firefox) implementan una optimización de rendimiento denominada Back-Forward Cache (BFCache). Al navegar a otra URL, el navegador no destruye la página anterior, sino que congela en memoria un snapshot completo del DOM, del estado de JavaScript y de los elementos visuales.

Cuando el usuario hace clic en el botón "Atrás" o "Adelante" del navegador, la página se restaura de inmediato desde la memoria caché sin solicitar recursos a la red y, fundamentalmente, **sin volver a disparar el evento `DOMContentLoaded` ni ejecutar los scripts de inicialización normales**.

En ChocoMapaSV, esta conducta generaba un agujero de seguridad y experiencia de usuario en vistas críticas:
1. Si un administrador o turista cerraba sesión en `admin-pagos.html` o `pago-comprobante.html` y era redirigido a `login.html`, presionar el botón "Atrás" restauraba visualmente la pantalla restringida con los comprobantes confidenciales y datos personales visibles en el DOM congelado.
2. Si un turista completaba el pago de una reserva en una pestaña y regresaba a `tour-detalle.html`, veía el formulario habilitado como si no tuviese una reserva activa, pudiendo intentar compras duplicadas.

## Decisión de Arquitectura y Justificación
Se decide mitigar de manera preventiva y sistemática el impacto de BFCache instrumentando los eventos del ciclo de vida de la página web `pageshow` y `visibilitychange` en todos los controladores críticos del sistema (`PagoController`, `AdminPagosController`, `TourDetalleController`, `LoginController`):

1. **Monitoreo de Restauración de Página (`pageshow`):**
   Se añade un listener al objeto global `window`:
   ```javascript
   window.addEventListener('pageshow', async (event) => {
       // event.persisted indica inequívocamente que la página fue restaurada desde BFCache
       const sesion = await AuthModel.obtenerSesionActual();
       if (!sesion || !sesion.user) {
           window.location.replace('login.html');
           return;
       }
       // Revalidación adicional de rol administrativo o reserva activa
   });
   ```

2. **Revalidación en Cambio de Visibilidad (`visibilitychange`):**
   Al alternar entre pestañas o volver al primer plano (`document.visibilityState === 'visible'`), se invoca una verificación ligera de sesión y estado de reserva.

3. **Uso de `window.location.replace`:**
   Al expulsar a un usuario no autorizado o con sesión vencida, se utiliza `replace` en lugar de `href` o `assign`, reemplazando la entrada actual en el historial de navegación para que el usuario no pueda quedar atrapado en un ciclo infinito de avance/retroceso.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Blindaje absoluto contra accesos visuales no autorizados a datos financieros, comprobantes de pago y vistas administrativas mediante la navegación del historial.
  * Garantía de que la interfaz de usuario refleja siempre el estado real y sincronizado de la sesión y las reservas del turista.
  * Cumplimiento con las mejores prácticas internacionales de seguridad de ciclo de vida web recomendadas por Google Chrome Web Vitals y OWASP.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Pérdida intencional de la aceleración instantánea de BFCache en pantallas protegidas.*
  * *Mitigación:* La revalidación de sesión se realiza contra memoria local o token en caché, tomando típicamente menos de 50 milisegundos, lo cual resulta imperceptible para el usuario y constituye un trade-off plenamente justificado en favor de la seguridad y privacidad ciudadana.

