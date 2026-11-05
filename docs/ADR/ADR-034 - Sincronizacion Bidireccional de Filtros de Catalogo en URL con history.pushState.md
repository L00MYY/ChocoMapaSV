# ADR-034: Sincronización Bidireccional de Filtros de Catálogo en URL con history.pushState

## Estado
Implementado — Sprint 3 (27 de octubre de 2026)

## Contexto y Planteamiento del Problema
En la vista de catálogo turístico (`lugares-turisticos.html`), los usuarios interactúan dinámicamente aplicando filtros por categoría (playas, volcanes, sitios históricos), términos de búsqueda textual en tiempo real y filtros por puntuación de estrellas.

En arquitecturas cliente donde el filtrado se gestiona únicamente en variables de memoria JavaScript:
1. **Pérdida de Estado ante Recarga:** Si el turista recarga la página (`F5`), el estado se reinicia y se pierden los filtros aplicados.
2. **Enlaces no Compartibles:** Un usuario no puede copiar la URL de su navegador (`https://.../lugares-turisticos.html`) para enviársela a un amigo por WhatsApp o redes sociales con la categoría "Playas & Surf City" o el término "Santa Ana" preseleccionado.
3. **Ruptura de la Navegación del Navegador (Botones Atrás/Adelante):** Al presionar el botón "Atrás", el navegador salía completamente de la página en lugar de retroceder al filtro previamente seleccionado.

## Opciones Consideradas
1. **Recargas Completas de Página mediante Formularios Tradicionales `GET`:**
   * *Ventajas:* Sincronización natural de la URL por parte del navegador.
   * *Desventajas:* Parpadeo visual constante de pantalla blanca, recarga destructiva de hojas de estilo y scripts, y experiencia de usuario anticuada y lenta.
2. **Persistencia Exclusiva en `localStorage` o `sessionStorage`:**
   * *Ventajas:* Mantiene los filtros al recargar la pestaña.
   * *Desventajas:* No resuelve el requerimiento de compartir enlaces (la URL sigue siendo estática), y contamina la experiencia si el usuario deseaba iniciar una búsqueda nueva desde un enlace externo.
3. **Sincronización Bidireccional Reactiva mediante la API History del W3C (`history.replaceState` / `pushState`) y Eventos `popstate`:**
   * *Ventajas:* Actualiza la barra de direcciones instantáneamente sin recargar la página, genera URLs completamente compartibles con parámetros de consulta (`?categoria=...&q=...`), y permite una navegación natural con el historial del navegador mediante la captura del evento `popstate`.

## Decisión de Arquitectura y Justificación
Se decide implementar la **Sincronización Bidireccional de Filtros en URL** en `js/controllers/LugaresController.js`:

1. **Escritura Asíncrona sin Recarga (`actualizarURL`):**
   Cada vez que el turista escribe en el buscador o selecciona una categoría, el controlador actualiza el objeto `URL` en memoria y sincroniza la barra de direcciones utilizando `window.history.replaceState`:
   ```javascript
   actualizarURL(cambios = {}) {
       try {
           const url = new URL(window.location.href);
           if ('categoria' in cambios) {
               const valor = cambios.categoria;
               if (!valor || valor === 'todos' || valor === 'todas') {
                   url.searchParams.delete('categoria');
               } else {
                   url.searchParams.set('categoria', valor);
               }
           }
           if ('q' in cambios) {
               const query = (cambios.q || '').trim();
               if (query.length === 0) {
                   url.searchParams.delete('q');
               } else {
                   url.searchParams.set('q', query);
               }
           }
           window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
       } catch (error) {
           console.warn('No se pudo actualizar la URL del navegador:', error);
       }
   }
   ```

2. **Lectura e Inicialización Automática al Cargar la Vista:**
   Al ejecutarse `init()`, el controlador inspecciona `window.location.search`, extrayendo `categoria` y `q`, activando visualmente las píldoras correspondientes en la interfaz y aplicando el filtrado inmediato.

3. **Restauración Reactiva del Historial (`popstate`):**
   Se suscribe un listener al evento `window.addEventListener('popstate', ...)` para sincronizar la vista si el usuario navega utilizando los botones Atrás o Adelante del navegador.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * URLs completamente enriquecidas y compartibles: cualquier turista o campaña de marketing del MITUR puede compartir enlaces directos a categorías específicas (e.g. `lugares-turisticos.html?categoria=playas-surf-city`).
  * Cero parpadeos de recarga: la interfaz responde en tiempo real con transiciones fluidas en el DOM.
  * Preservación del estado de navegación ante recargas accidentales de página.
  * Interoperabilidad perfecta con el buscador del Hero de la portada (ADR-030).

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Ligeras discrepancias si el usuario manipula manualmente los parámetros en la barra de direcciones con valores inexistentes.*
  * *Mitigación:* Se implementó un procesamiento defensivo en `procesarParametrosURL()` que valida la existencia de la categoría y aplica un fallback automático a `'todos'` si el parámetro es inválido o no reconocido.

