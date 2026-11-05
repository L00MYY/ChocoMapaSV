# ADR-038: Estructura Estática de Shell (Navbar y Footer) en HTML Frente a Inyección Dinámica vía JavaScript

## Estado
Implementado — Sprint 1 a Sprint 4

## Contexto y Planteamiento del Problema
En una arquitectura Multi-Page Application (MPA) en Vanilla JavaScript sin plantillas del lado del servidor (SSR ni PHP), el encabezado (`navbar`) y el pie de página (`footer`) son componentes transversales a todas las vistas (`index.html`, `mapa.html`, `lugares-turisticos.html`, `tours.html`, `detalle-lugar.html`, `tour-detalle.html`, `admin-pagos.html`, `mis-tours.html`, `pago-comprobante.html`, etc.).

El equipo de desarrollo debía decidir entre dos enfoques arquitectónicos fundamentales para gestionar el cascarón (*app shell*):
- Externalizar el HTML del navbar/footer en fragmentos únicos inyectados dinámicamente mediante JavaScript (`fetch('navbar.html')` o Web Components).
- Replicar la estructura HTML estática del shell directamente dentro de cada documento `.html`.

Bajo las restricciones de rendimiento, estética institucional del Ministerio de Turismo (MITUR) y las directrices de los Core Web Vitals de Google:
1. **Riesgo de FOUC (*Flash of Unstyled Content*):** La inyección asíncrona de la cabecera provoca que la página cargue inicialmente sin navegación, desplegando un destello blanco o un contenido desalineado durante los primeros cientos de milisegundos.
2. **Penalización en CLS (*Cumulative Layout Shift*):** Cuando el HTML de la barra de navegación se inyecta tras la resolución de una promesa de red (`fetch`), el contenido principal (`<main>`) es empujado hacia abajo de forma repentina, degradando severamente la métrica de estabilidad visual CLS.
3. **Dependencia Crítica del Hilo de JavaScript:** Si la red presenta latencia o si la ejecución de un módulo de script se retrasa, el usuario queda privado de la barra de navegación institucional y de los enlaces clave del portal.

## Opciones Consideradas
1. **Inyección Dinámica en Cliente mediante Fetch / innerHTML:**
   * *Descripción:* Almacenar `navbar.html` y `footer.html` como fragmentos HTML aislados en el servidor y cargarlos asíncronamente en tiempo de ejecución insertándolos en un contenedor mediante `fetch().then(r => r.text()).then(html => container.innerHTML = html)`.
   * *Descarte:* Genera un parpadeo visual evidente (*Flash of Unstyled Content* / FOUC), desplaza el contenido bruscamente al completarse la carga (*Cumulative Layout Shift* / CLS), introduce una dependencia de red bloqueante para navegar y añade vulnerabilidades potenciales si no se sanitiza el canal de inyección.

2. **Web Components Autónomos (`<app-navbar>`, `<app-footer>`):**
   * *Descripción:* Encapsular la cabecera y el pie de página en Custom Elements nativos con Shadow DOM (`customElements.define('app-navbar', AppNavbar)`).
   * *Descarte:* Introduce sobrecarga de inicialización en el ciclo de vida del navegador, retrasa el First Contentful Paint (FCP) y dificulta el paso de estilos globales institucionales (como las variables CSS de tema oscuro/claro y el marco *Dark Anchor Frame* definido en ADR-024) a través de la barrera de encapsulación del Shadow DOM sin recurrir a técnicas complejas como `@adoptedStyleSheets`.

3. **Estructura HTML Estática Declarativa en cada Página (Opción Elegida):**
   * *Descripción:* Insertar el marcado semántico `<header>` y `<footer>` directamente en el código fuente de cada archivo HTML, delegando en los controladores (`NavbarController.js`, `NavbarView.js`) únicamente la hidratación progresiva del estado dinámico (sesión, tema claro/oscuro, avatar y menús contextuales).
   * *Justificación:* Maximiza el rendimiento de renderizado en el primer frame, garantiza un CLS igual a cero en la cabecera, proyecta la identidad institucional de forma inmediata y ofrece resiliencia absoluta ante fallos en la capa de scripts.

## Decisión de Arquitectura y Justificación
Se adoptó la **duplicación controlada del marcado estático de cabecera y pie en cada archivo HTML**:

### 1. Eliminación de FOUC y Cero Layout Shift (CLS = 0)
Al incluir el marcado semántico `<header class="app-header">` y `<footer class="app-footer">` de forma declarativa en el árbol HTML original, el motor de renderizado del navegador (Blink/WebKit/Gecko) analiza, calcula estilos y pinta el contenedor y el esquema de colores institucional (*Dark Anchor Frame*, ADR-024) en el primer ciclo de dibujado (*first paint*), antes de que se descarguen o ejecuten los módulos JavaScript.

```html
<!-- Estructura estática presente en cada archivo HTML -->
<header class="app-header">
    <div class="header-container">
        <!-- Branding Ministerio de Turismo -->
        <a href="index.html" class="app-logo-container" aria-label="Inicio - Ministerio de Turismo de El Salvador">
            <img src="https://www.mitur.gob.sv/wp-content/uploads/2024/02/MITUR-Blanco-transparente.png" 
                 alt="Ministerio de Turismo de El Salvador" 
                 class="app-logo" 
                 decoding="async" 
                 fetchpriority="high">
        </a>

        <!-- Navegación Principal -->
        <nav class="header-navigation" aria-label="Navegación principal">
            <a href="index.html" class="nav-link" id="nav-inicio">...</a>
            <a href="mapa.html" class="nav-link" id="nav-mapa">...</a>
            <a href="lugares-turisticos.html" class="nav-link" id="nav-lugares">...</a>
            <a href="tours.html" class="nav-link" id="nav-tours">...</a>

            <!-- Controles de Autenticación y Perfil -->
            <div class="nav-auth" id="nav-auth">
                <a href="login.html" class="nav-link nav-btn-login" id="nav-btn-login">...</a>
                <div class="nav-user-dropdown-container hidden" id="nav-user-container">...</div>
            </div>
        </nav>
    </div>
</header>
```

### 2. Rendimiento Superior y Optimización de Core Web Vitals
* **First Contentful Paint (FCP):** El logotipo oficial del MITUR y los enlaces troncales son visibles de inmediato sin esperar peticiones asíncronas auxiliares ni bloqueos de red.
* **Cumulative Layout Shift (CLS):** La altura del encabezado (`var(--navbar-height, 64px)`) y del pie de página está reservada estáticamente desde el archivo CSS global (`css/global.css`), eliminando cualquier salto de diseño vertical durante la carga.

### 3. Separación Clara entre Estructura e Hidratación Progresiva
La vista HTML provee el esqueleto estructural base; JavaScript interviene únicamente de manera no intrusiva mediante el patrón de hidratación progresiva:
1. **Detección Temprana de Tema (Zero Flash Theme Toggle):**
   Un script liviano en `NavbarController.js` detecta el tema preferido (`chocomapa_theme`) y aplica `data-theme` a `document.documentElement` de inmediato para evitar parpadeos de luminosidad:
   ```javascript
   // js/controllers/NavbarController.js
   if (typeof document !== 'undefined' && document.documentElement) {
       const temaInicial = resolverTemaPreferido();
       document.documentElement.setAttribute('data-theme', temaInicial);
   }
   ```
2. **Hidratación de Estado Dinámico (`NavbarController.init()`):**
   Al dispararse `DOMContentLoaded`, el controlador consulta la sesión activa en `AuthModel` y delega en `NavbarView` la visibilidad de los controles correspondientes: alternar entre el botón "Iniciar sesión" y el menú con avatar del usuario autenticado, así como vincular el switch de tema claro/oscuro.

## Consecuencias
* **Impacto Positivo:**
  - **Renderizado instantáneo de la identidad institucional:** Cero pantallas en blanco, destellos o saltos de interfaz visual; la marca del MITUR se proyecta con total solidez desde el primer milisegundo.
  - **Resiliencia de Navegación:** Si un módulo JavaScript falla, la red colapsa o las APIs de Supabase no responden, los hipervínculos estáticos (`href="mapa.html"`, `href="tours.html"`) siguen siendo 100% funcionales mediante navegación nativa del navegador.
  - **Auditoría y Accesibilidad Semántica (WCAG AA):** Estructura semántica pura (`<header>`, `<nav>`, `<footer>`) parseable directamente por lectores de pantalla y motores de búsqueda sin depender de mutaciones del DOM.

* **Trade-offs / Deuda Técnica:**
  - *Violación técnica del principio DRY (Don't Repeat Yourself) a nivel de marcado HTML:* Cualquier modificación en la barra de enlaces estructurales o en los créditos del pie de página exige actualizar los archivos HTML del repositorio (`index.html`, `mapa.html`, etc.).
  - *Compromiso Asumido:* El equipo consideró justificada esta duplicación declarativa frente a los beneficios tangibles en velocidad de carga, estabilidad visual (CLS = 0) e independencia de empaquetadores complejos o servidores Node.js en tiempo de ejecución.

