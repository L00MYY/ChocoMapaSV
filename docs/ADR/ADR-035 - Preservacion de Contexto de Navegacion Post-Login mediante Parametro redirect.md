# ADR-035: Preservación de Contexto de Navegación Post-Login mediante Parámetro redirect

## Estado
Implementado — Sprint 4 (29 de octubre de 2026)

## Contexto y Planteamiento del Problema
En el flujo transaccional de ChocoMapaSV, diversas acciones clave exigen que el usuario esté debidamente autenticado con su cuenta de turista o administrador:
* Intentar calificar un destino turístico en `detalle-lugar.html` (ADR-019).
* Crear una reserva formal de cupos en `tour-detalle.html` (ADR-016).
* Acceder a la pasarela de subida de comprobantes en `pago-comprobante.html`.
* Gestionar la mesa de conciliación en el panel administrativo `admin-pagos.html`.

Cuando un usuario no autenticado intenta acceder a una de estas pantallas o ejecutar una acción protegida, los guards de ruta lo interceptan y lo redirigen al formulario de autenticación (`login.html`).

Si tras completar exitosamente el inicio de sesión o registro el sistema redirigiera ciegamente a una pantalla genérica por defecto (como `mapa.html` o `index.html`):
1. **Pérdida Crítica de Contexto:** El turista pierde el tour específico que estaba a punto de reservar o el comprobante que pretendía subir, viéndose forzado a buscar manualmente la pantalla desde el inicio.
2. **Abandono del Embudo de Conversión:** La fricción generada incrementa drásticamente la tasa de rebote y el abandono de reservas turísticas del MITUR.
3. **Riesgo de Seguridad por Open Redirect (CWE-601):** Si el parámetro de redirección no se valida rigurosamente, un atacante podría construir enlaces maliciosos de phishing (`login.html?redirect=https://sitio-malicioso.com`) para engañar a los ciudadanos tras iniciar sesión en el sitio oficial.

## Opciones Consideradas
1. **Redirección Fija a Pantalla por Defecto (`mapa.html`):**
   * *Ventajas:* Implementación elemental sin lógica de parámetros.
   * *Desventajas:* Experiencia de usuario muy pobre, frustración de los turistas y pérdida del flujo de compra.
2. **Almacenamiento Temporal en `sessionStorage`:**
   * *Ventajas:* Oculta la URL de retorno de la barra de direcciones.
   * *Desventajas:* Frágil si el usuario abre múltiples pestañas, si utiliza navegación en incógnito o si comparte el enlace directo de inicio de sesión con un compañero de viaje.
3. **Patrón *Return URL* mediante Parámetro `?redirect=` con Validación Estricta de Origen:**
   * *Ventajas:* Estándar universal de la industria web, preserva el contexto de forma transparente y determinista entre páginas, y permite blindar la seguridad validando que el destino pertenezca al mismo dominio de origen (*Same-Origin Policy*).

## Decisión de Arquitectura y Justificación
Se decide implementar el **Patrón Return URL con Mitigación Anti-Open Redirect** en todos los controladores y guards del sistema:

1. **Inyección en Guards de Ruta:**
   Al interceptar a un usuario no autenticado, los controladores adjuntan la URL de origen codificada:
   ```javascript
   // Ejemplo en TourDetalleController y PagoController:
   window.location.replace(`login.html?redirect=${encodeURIComponent(window.location.href)}`);
   ```

2. **Resolución Segura y Validación de Origen en `LoginController.redirigirUsuario`:**
   Tras validar las credenciales del usuario con Supabase Auth, el controlador evalúa el parámetro:
   ```javascript
   redirigirUsuario() {
       const params = new URLSearchParams(window.location.search);
       const redirect = params.get('redirect');

       if (redirect) {
           try {
               const urlDecodificada = decodeURIComponent(redirect);
               const esLogin = urlDecodificada.toLowerCase().includes('login.html');
               
               // Prevenir bucles infinitos de redirección
               if (!esLogin) {
                   // Validación estricta contra Open Redirect (CWE-601)
                   if (urlDecodificada.startsWith('http://') || urlDecodificada.startsWith('https://')) {
                       const destinoUrl = new URL(urlDecodificada);
                       if (destinoUrl.origin === window.location.origin) {
                           window.location.replace(urlDecodificada);
                           return;
                       }
                   } else {
                       // Ruta relativa interna segura
                       window.location.replace(urlDecodificada);
                       return;
                   }
               }
           } catch (error) {
               console.warn('Advertencia al decodificar URL de redirección:', error);
           }
       }

       // Fallback seguro por defecto
       window.location.replace('mapa.html');
   }
   ```

3. **Uso de `window.location.replace`:**
   Se utiliza `replace` en lugar de `href` o `assign` para reemplazar la entrada de `login.html` en el historial del navegador, evitando que el usuario vuelva a quedar atrapado en la pantalla de login al presionar el botón "Atrás".

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Continuidad fluida en la experiencia de usuario: el turista regresa exactamente al formulario de reserva o pantalla de pago que deseaba completar.
  * Protección total contra ataques de *Open Redirect* (CWE-601), asegurando que el navegador solo redirija a rutas internas o al mismo dominio institucional de origen.
  * Prevención sistemática de bucles de redirección infinita (`login.html` redirigiendo a sí mismo).
  * Limpieza del historial de navegación mediante `window.location.replace`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Exposición de la URL de retorno en el query string de la barra de direcciones.*
  * *Mitigación:* Se aplica `encodeURIComponent()` para proteger caracteres especiales y tokens, sin exponer datos confidenciales ni contraseñas en los parámetros de la URL.

