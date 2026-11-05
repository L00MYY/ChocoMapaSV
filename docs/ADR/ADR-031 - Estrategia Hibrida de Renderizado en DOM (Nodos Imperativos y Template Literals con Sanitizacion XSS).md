# ADR-031: Estrategia Híbrida de Renderizado en DOM (Nodos Imperativos y Template Literals con Sanitización XSS)

## Estado
Implementado — Sprint 3 (26 de octubre de 2026) / Ratificado en vísperas de sprint 4

## Contexto y Planteamiento del Problema
En el desarrollo de ChocoMapaSV bajo una arquitectura de Frontend Puro en Vanilla JavaScript (sin frameworks reactivos como React, Vue o Angular), la manipulación del Document Object Model (DOM) para vistas complejas —como el Bento Grid de la portada, el carrusel de tours guiados, las notificaciones toast y la tabla de 10 columnas del panel administrativo (`AdminPagosView.js`) con modales de acción— plantea una tensión constante entre:
1. **Seguridad contra Ataques de Cross-Site Scripting (XSS):** Si se inyectan cadenas HTML dinámicas que contienen datos provistos por usuarios o turistas (nombres, comentarios, correos o teléfonos), existe el riesgo de inyección de código malicioso.
2. **Gestión de Ciclo de Vida y Event Listeners:** Componentes interactivos como toasts de notificación, filas con animaciones de borrado o tarjetas interactivas requieren enlazar listeners (`click`, `error`), manipular transiciones CSS (`transition`, `opacity`, `transform`) y destruir nodos (`remove()`) tras temporizadores (`setTimeout`).
3. **Mantenibilidad, Productividad y Legibilidad del Código:** Escribir estructuras complejas de tablas o tarjetas mediante llamadas continuas a la API imperativa del DOM resulta engorroso, verboso y propenso a errores.

## Opciones Consideradas
1. **Manipulación 100% Imperativa (`document.createElement` + `appendChild` recursivo):**
   * *Ventajas:* Máxima seguridad contra XSS al asignar textos mediante `textContent` y atributos con `setAttribute`. Control total de referencias a nodos individuales para asociar event listeners.
   * *Desventajas:* Prolijidad excesiva de código boilerplate. Construir una tarjeta de tour de 15 elementos anidados exige más de 80 líneas de código repetitivo, dificultando la lectura y encareciendo el mantenimiento.
2. **Inyección Pura de Cadenas (`innerHTML` global masivo):**
   * *Ventajas:* Sintaxis declarativa rápida, legible y fácil de estructurar mediante Template Literals de ES6.
   * *Desventajas:* Destructivo para event listeners preexistentes (al reasignar `innerHTML` a un contenedor padre, se reinician todos los nodos hijos y sus listeners se pierden en memoria). Asimismo, presenta un alto riesgo de vulnerabilidad XSS si no se escapan rigurosamente todas las variables interpoladas.
3. **Estrategia Híbrida de Renderizado (Nodos Imperativos de Contenedor + Template Literals Sanitizados):**
   * *Ventajas:* Combina lo mejor de ambos mundos:
     * El nodo raíz contenedor (`article`, `tr`, `div.toast`, `li.result-item`) se crea imperativamente con `document.createElement`, permitiendo asociar listeners directos, asignar clases, manipular atributos `data-*` y controlar animaciones de ciclo de vida (`row.remove()`, transiciones).
     * El marcado interno estructurado se genera declarativamente con Template Literals, blindando obligatoriamente cada variable dinámica mediante la función utilitaria `escaparHtml()`.

## Decisión de Arquitectura y Justificación
Se decide adoptar la **Estrategia Híbrida de Renderizado en DOM** como estándar obligatorio para toda la capa de presentación (`js/views/`):

1. **Instanciación Imperativa de Nodos Contenedores:**
   Los elementos que poseen identidad interactiva, eventos o ciclo de vida dinámico se crean mediante `document.createElement`:
   ```javascript
   // Ejemplo en AdminPagosView: Toasts con ciclo de vida animado
   const toast = document.createElement('div');
   toast.className = `toast ${tipo || 'success'}`;
   toast.innerHTML = `<span>${this.escaparHtml(mensaje)}</span>`;
   container.appendChild(toast);
   setTimeout(() => {
       toast.style.transition = 'opacity 0.3s ease';
       toast.style.opacity = '0';
       setTimeout(() => toast.remove(), 300);
   }, 3500);
   ```

2. **Marcado Interno Complejo con Template Literals y Sanitización XSS Obligatoria:**
   En tablas de datos y tarjetas informativas, la estructura interna se define mediante Template Literals, aplicando la función centralizada `escaparHtml()` de `js/utils/textUtils.js` sobre todo campo proveniente de la base de datos o de inputs de usuario:
   ```javascript
   // Ejemplo en AdminPagosView: Fila de tabla protegida
   <td class="cell-tourista">
       <div class="turista-info">
           <span class="turista-nombre">${this.escaparHtml(r.tourist_name)}</span>
           <span class="turista-email">${this.escaparHtml(r.tourist_email)}</span>
       </div>
   </td>
   ```

3. **Uso de Fragmentos de Documento (`DocumentFragment`):**
   Para operaciones de renderizado en lote (listados de lugares, resultados predictivos del Hero), los nodos creados se adjuntan primero a un `document.createDocumentFragment()`, realizando una sola mutación atómica sobre el DOM real para minimizar el *reflow* y *repaint* del navegador.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Blindaje integral contra vulnerabilidades de Cross-Site Scripting (XSS).
  * Control granular del ciclo de vida de los componentes visuales: permite animaciones de salida suaves, eliminación programada de elementos y gestión limpia de event listeners.
  * Código de vistas ordenado, legible y con alta velocidad de desarrollo.
  * Optimización de rendimiento al evitar mutaciones masivas destructivas en el árbol del DOM.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Riesgo de omisión humana del helper `escaparHtml()` en nuevas interpolaciones.*
  * *Mitigación:* Se formalizó en el documento rector `docs/Estándares Técnicos.md` (Sección 5) y se incorporaron pruebas automatizadas de regresión que verifican la sanitización de cadenas en las vistas.

