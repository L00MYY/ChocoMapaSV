# ADR-036: Estructuración de Repositorio por Capas Técnicas (Package-by-Layer) y Arquitectura Multi-Página

## Estado
Implementado — Sprint 1 a Sprint 4

## Contexto y Planteamiento del Problema
En el desarrollo de ChocoMapaSV, con 5 ingenieros colaborando concurrentemente y bajo la restricción de Vanilla JavaScript nativo sin empaquetadores ni bundlers (ADR-010), se requería definir una estructura de directorios y archivos que garantizara:
1. **Navegación intuitiva del código fuente alineada al patrón MVC (ADR-001):** Permitir que cualquier desarrollador o auditor ubique de forma inmediata la lógica de datos, la manipulación de interfaz o la captura de eventos.
2. **Prevención de colisiones y fragilidad en rutas relativas al importar módulos ES6 nativos:** En ausencia de aliasing provisto por herramientas como Webpack o Vite (`@/components`), los navegadores resuelven las rutas de forma literal (`import ... from '../...'`). Una estructura desordenada o de profundidad variable incrementa drásticamente los errores 404 de resolución de scripts en tiempo de ejecución.
3. **Compatibilidad directa con el servidor estático Edge de Vercel (ADR-002):** Servir páginas directamente desde la CDN sin depender de configuraciones complejas de reescritura de URLs (*rewrites*) en `vercel.json` ni capas de middleware en servidor.
4. **Separación estricta entre código de producción, suites de prueba automatizadas y gobernanza:** Aislar los scripts de validación, las 185 pruebas unitarias y los artefactos de arquitectura respecto a los activos consumidos por el cliente final.

## Opciones Consideradas
1. **Opción 1: Package-by-Feature (Estructura por Funcionalidad / Módulos):**
   * Agrupar todos los archivos pertenecientes a un mismo dominio de negocio dentro de una carpeta unificada (por ejemplo: `features/tours/`, `features/auth/`, conteniendo cada una su HTML, CSS, JS y test).
   * *Descarte:* En un entorno Vanilla JS nativo sin bundler, este enfoque complejiza enormemente las rutas relativas para utilidades compartidas (`../../utils/textUtils.js`) o modelos compartidos (`../../features/auth/AuthModel.js`), fragmenta la distribución de archivos HTML y rompe la simplicidad de acceso a rutas públicas directas.

2. **Opción 2: Single Page Application (SPA) con Enrutador Virtual en Cliente:**
   * Utilizar un único archivo `index.html` central con inyección dinámica de templates y renderizado condicional en el cliente mediante un micro-enrutador JS.
   * *Descarte:* Introduce complejidad técnica innecesaria en la manipulación del árbol del DOM sin un framework reactivo, complica la gestión manual del historial (`popstate`), perjudica el SEO nativo básico y eleva el riesgo de desbordamientos de memoria al destruir y recrear vistas complejas manualmente.

3. **Opción 3: Package-by-Layer con Enrutamiento MPA en Raíz (Opción Elegida):**
   * Organización horizontal por responsabilidades técnicas (`css/`, `js/models/`, `js/controllers/`, `js/views/`, `js/utils/`, `tests/`, `scripts/`, `docs/`) manteniendo todos los puntos de entrada HTML en el root del proyecto.
   * *Justificación:* Ofrece una separación de responsabilidades transparente, predictibilidad absoluta en la resolución de módulos ES6, rutas limpias para Vercel y desacoplamiento limpio entre frontend web y herramientas de testing en Node.js.

## Decisión de Arquitectura y Justificación
Se adoptó la arquitectura **Package-by-Layer combinada con un esquema Multi-Page Application (MPA)**:

### 1. Topología del Repositorio
```text
ChocoMapaSV/
├── admin-pagos.html           # Vista administrativa: conciliación y recibos
├── detalle-lugar.html         # Vista pública: detalle y reseñas de destino
├── index.html                 # Vista pública: landing page institucional
├── login.html                 # Vista pública: autenticación de usuarios
├── lugares-turisticos.html    # Vista pública: catálogo interactivo con filtros
├── mapa.html                  # Vista pública: mapa interactivo Mapbox
├── mis-tours.html             # Vista privada: reservas del turista
├── pago-comprobante.html      # Vista privada: pasarela de subida de comprobantes
├── registro.html              # Vista pública: registro de turistas
├── tour-detalle.html          # Vista pública: itinerario y reserva de tour
├── tours.html                 # Vista pública: catálogo de experiencias
│
├── css/                       # Hojas de estilo desacopladas por pantalla y globales
│   ├── admin-pagos.css
│   ├── auth.css
│   ├── detalle-lugar.css
│   ├── global.css
│   ├── mapa.css
│   ├── ...
│
├── js/                        # Capa lógica organizada en responsabilidades MVC puras
│   ├── config.js              # Variables de entorno y tokens ofuscados en Base64 (ADR-005)
│   ├── models/                # Única capa autorizada para Supabase y lógica de negocio
│   │   ├── AdminPagosModel.js
│   │   ├── AuthModel.js
│   │   ├── LugaresModel.js
│   │   ├── MapaModel.js
│   │   ├── PagoModel.js
│   │   ├── ResenasModel.js
│   │   └── TourModel.js
│   ├── views/                 # Manipulación exclusiva del DOM y renderizado
│   │   ├── AdminPagosView.js
│   │   ├── AuthView.js
│   │   ├── LugaresView.js
│   │   ├── MapaView.js
│   │   ├── PagoView.js
│   │   ├── ResenasView.js
│   │   └── TourView.js
│   ├── controllers/           # Orquestación, mediación y listeners de eventos
│   │   ├── AdminPagosController.js
│   │   ├── AuthController.js
│   │   ├── LugaresController.js
│   │   ├── MapaController.js
│   │   ├── PagoController.js
│   │   ├── ResenasController.js
│   │   └── TourController.js
│   └── utils/                 # Funciones puras compartidas y componentes UI globales
│       ├── navbar.js          # Componente web global de navegación
│       ├── theme.js           # Manejo global de tema claro/oscuro
│       └── textUtils.js       # Sanitización XSS (escaparHtml) y normalización
│
├── tests/                     # 185 pruebas automatizadas (Node.js test runner)
│   ├── auth.test.js
│   ├── comprobantes_y_admin.test.js
│   ├── filtros.test.js
│   ├── inicio_y_lugares.test.js
│   ├── mapa_categorias.test.js
│   ├── notificaciones.test.js
│   ├── ratings.test.js
│   ├── theme_system.test.js
│   └── tours.test.js
│
├── scripts/                   # Scripts auxiliares de build e integridad sintáctica
│   ├── build-config.cjs
│   └── check-syntax.js
│
└── docs/                      # Centralización de gobernanza y registros de decisión
    ├── ADR/                   # Architecture Decision Records (ADR-001 al ADR-036)
    ├── Estándares Técnicos.md
    └── reporte_limpieza_codigo.md
```

### 2. Principios de Interconexión y Aislamiento

* **Vistas HTML en la raíz del proyecto:**
  Cada pantalla (`index.html`, `mapa.html`, `lugares-turisticos.html`, `tour-detalle.html`, `admin-pagos.html`, etc.) reside en el root. Esto permite que el servidor estático de Vercel resuelva las URLs de forma limpia (`https://chocomapasv.vercel.app/mapa.html`) sin requerir reglas de reescritura complejas ni middlewares.
  
  Cada documento HTML actúa como el punto de entrada declarativo que vincula su CSS homólogo y arranca su respectivo controlador:
  ```html
  <!-- Ejemplo en pago-comprobante.html -->
  <link rel="stylesheet" href="css/pago-comprobante.css">
  <script type="module">
      import { PagoController } from './js/controllers/PagoController.js';
      const controller = new PagoController();
      controller.init();
  </script>
  ```

* **Capa `js/` subdividida en responsabilidades MVC puras:**
  - `js/models/`: Única capa autorizada para comunicarse con Supabase y ejecutar validaciones de datos o reglas de negocio (e.g., cálculo de precios, sanitización de inputs previa al almacenamiento).
  - `js/views/`: Manipulación exclusiva del DOM, renderizado de componentes y actualización de interfaces (utilizando la estrategia híbrida de ADR-031).
  - `js/controllers/`: Orquestación y mediación; escucha eventos del DOM a través de las vistas e invoca operaciones sobre los modelos.
  - `js/utils/`: Funciones puras reutilizables (`escaparHtml`, `normalizarTextoBusqueda`) y componentes compartidos transversales (`navbar.js`, `theme.js`).

* **Resolución Simétrica de Módulos ES6:**
  Al mantener una profundidad uniforme de exactamente dos niveles para los módulos de aplicación (`js/<capa>/<Archivo>.js`), la resolución de dependencias relativas es simétrica y predecible en todo el proyecto:
  ```javascript
  // Dentro de js/controllers/PagoController.js:
  import { PagoModel } from '../models/PagoModel.js';
  import { PagoView } from '../views/PagoView.js';
  import { escaparHtml } from '../utils/textUtils.js';
  ```

* **Aislamiento de `tests/` y `scripts/`:**
  Las 185 pruebas automatizadas se ejecutan directamente con el test runner nativo de Node.js (`node --test`), y las utilidades de verificación sintáctica (`node scripts/check-syntax.js`) residen fuera del flujo web del cliente. Esto garantiza que ningún archivo de prueba ni script administrativo sea desplegado o ejecutado innecesariamente en el navegador.

* **Documentación Centralizada en `docs/`:**
  Centralización exhaustiva de la gobernanza técnica en `docs/ADR/` bajo el estándar MADR, facilitando la trazabilidad de decisiones para revisiones de código y auditorías de MITUR y ESEN.

## Consecuencias
* **Impacto Positivo:**
  - **Máxima claridad en la trazabilidad del código:** Cualquier evaluador, auditor o nuevo integrante del equipo sabe con exactitud en qué directorio reside un modelo, una vista o un controlador sin ambigüedades.
  - **Cero dependencias de configuración en Vercel:** Despliegue estático nativo y predecible sin necesidad de configuración en capas de borde para resolución de rutas.
  - **Rutas relativas uniformes y predecibles:** Los imports entre módulos ES6 siempre siguen la convención `../<capa>/<Nombre>.js`, eliminando errores de rutas relativas dispares o referencias rotas.
  - **Separación efectiva de contextos de ejecución:** Las dependencias de desarrollo y testing (Node.js) se mantienen estrictamente aisladas del entorno de ejecución de producción (Navegador Evergreen).

* **Trade-offs / Mitigaciones:**
  - *Dispersión de archivos por funcionalidad:* Implementar o modificar una característica específica involucra tocar archivos en múltiples carpetas (por ejemplo, el flujo de pagos abarca `pago-comprobante.html`, `css/pago-comprobante.css`, `PagoModel.js`, `PagoView.js` y `PagoController.js`).
  - *Mitigación:* Se mitiga mediante convenciones estrictas de nombramiento homogéneo (ADR-009) y un mapa de responsabilidades estandarizado en la guía técnica del proyecto.

