# Estándares Técnicos y Acuerdos de Calidad

---

## 1. Modularidad y Entorno de Ejecución (Vanilla JS)
- **Módulos ES6 Nativos:** Uso estricto de `import` y `export` directos en el navegador. Prohibido el uso de `var` o contaminar el ámbito global (`window`).
- **Rutas Relativas Explícitas:** Todo import interno incluye la extensión `.js` obligatoria para compatibilidad directa con el motor de módulos nativo sin empaquetadores (evitando dependencias como Webpack o Vite).

## 2. Convenciones de Nomenclatura Unificadas
- **`camelCase`:** Variables, parámetros, atributos de objetos y funciones/métodos (`obtenerSesionActual`, `calcularAforoDisponible`).
- **`PascalCase`:** Clases, objetos de vista, controlador y modelo (`AuthModel`, `ToursController`, `LugaresView`).
- **`UPPER_SNAKE_CASE`:** Constantes de configuración globales del archivo (`STORAGE_KEY`, `MAX_FILE_SIZE_BYTES`).
- **`kebab-case`:** Nombres de archivos y clases CSS (`detalle-lugar.html`, `tours.css`, `.filters-card`).

## 3. Manejo Seguro de Operaciones Asíncronas
- **`async / await` con bloques `try / catch`:** Obligatorio en toda interacción con Supabase (PostgREST, Auth, Storage) y servicios externos (EmailJS, Mapbox).
- **Manejo de Errores Predictible:** Los modelos retornan objetos estandarizados (`{ ok: true, data }` o `{ ok: false, error }`) o lanzan excepciones descriptivas; los controladores capturan los errores y muestran mensajes amigables al usuario sin congelar la interfaz ni dejar promesas sin capturar.

## 4. Tipado Documental con JSDoc
- Cada función pública en controladores y modelos cuenta con su bloque JSDoc estructurado:
  - `@description`: Propósito conciso y regla de negocio implementada.
  - `@param {Tipo}`: Tipado y descripción de argumentos recibidos.
  - `@returns {Tipo}`: Valor o promesa que resuelve.
  - Permite que cualquier integrante del equipo audite y defienda el código en el examen oral individual sin ambigüedades.

## 5. Arquitectura MVC y Manipulación Segura del DOM
- **Separación de Responsabilidades:**
  - `models/`: Lógica de negocio y consultas HTTP/PostgREST. Agnósticos de `document` y `window`.
  - `views/`: Manipulación exclusiva del DOM, eventos de interfaz y renderizado seguro.
  - `controllers/`: Orquestación y mediación entre vista y modelo.
- **Seguridad en DOM:** Preferencia por `textContent`, atributos explícitos y templates/fragmentos para prevenir inyecciones y fallas de renderizado.