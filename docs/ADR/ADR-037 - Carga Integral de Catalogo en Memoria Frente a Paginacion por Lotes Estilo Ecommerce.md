# ADR-037: Carga Integral de Catálogo en Memoria Frente a Paginación por Lotes Estilo Ecommerce

## Estado
Implementado — Sprint 2

## Contexto y Planteamiento del Problema
En las interfaces de exploración (`lugares-turisticos.html` y `tours.html`), el equipo debía decidir la estrategia de entrega y navegación de las tarjetas (cards):
- Dividir la colección en lotes discretos con barra de paginación numerada tradicional (estilo Amazon: páginas 1, 2, 3... 20).
- Cargar la totalidad de destinos registrados y delegar la visualización/filtrado al navegador en una sola vista continua.

Bajo la arquitectura de ChocoMapaSV, caracterizada por la ausencia de empaquetadores (ADR-010) y la integración directa con Supabase PostgREST (ADR-011):
1. **Patrones de Interacción del Turista:** A diferencia de una plataforma de comercio electrónico con cientos de miles de artículos donde el usuario busca ítems específicos por SKU o paginación profunda, el turista que explora El Salvador navega por afinidad temática o geográfica (playas, volcanes, sitios arqueológicos, pueblos vivos), conmutando constantemente entre categorías, términos de búsqueda textual y visualización en mapa.
2. **Latencia Acumulada de Red:** En esquemas con paginación en servidor (limit/offset), cada transición de página o ajuste de filtro desencadena una petición HTTP (`GET /places?offset=18&limit=9`), introduciendo una penalización de latencia de red recurrente (150 ms a 400 ms) y provocando parpadeos visuales en la interfaz.
3. **Desincronización con el Motor de Búsqueda y Coherencia Geoespacial:** Una paginación particionada en servidor fragmenta la correlación entre los marcadores visibles en el mapa (`mapa.html`) y las tarjetas de la vista de catálogo (`lugares-turisticos.html`), dificultando además la normalización Unicode instantánea en búsquedas predictivas (ADR-030) y la sincronización bidireccional de parámetros en URL (ADR-034).

## Opciones Consideradas
1. **Paginación Servidor Tradicional (Limit / Offset):**
   * *Descripción:* Dividir el catálogo en páginas fijas (ej. 9 destinos por página) solicitadas bajo demanda (`?page=1&limit=9` o encabezados `Range: 0-8` en PostgREST).
   * *Descarte:* Introduce latencia de red en cada cambio de página, genera estados vacíos artificiales cuando se combinan filtros restrictivos, rompe la fluidez de búsqueda predictiva en cliente y complica la correlación de marcadores visibles en el mapa interactivo.

2. **Scroll Infinito con Carga Diferida (Infinite Scroll / Virtual Scroll):**
   * *Descripción:* Cargar lotes adicionales conforme el usuario se desplaza hacia el pie de página mediante `IntersectionObserver`.
   * *Descarte:* Introduce complejidad técnica innecesaria en la gestión de eventos de scroll y en la reconciliación del DOM sin frameworks reactivos. Además, "atrapa" al usuario e impide acceder con facilidad al pie de página institucional (`footer`), donde residen enlaces institucionales críticos y avisos de autoría del MITUR.

3. **Carga Integral en Memoria con Filtrado Reactivo en Cliente (Opción Elegida):**
   * *Descripción:* Obtener el dataset completo curado por el MITUR en una sola petición inicial y realizar las operaciones de filtrado (categorías, búsqueda por texto, estrellas) en memoria mediante métodos nativos (`Array.prototype.filter`).
   * *Justificación:* Ofrece una respuesta instantánea (0 ms) ante cualquier combinación de filtros, simplifica radicalmente la arquitectura de controladores y vistas, y optimiza el consumo de cuota en Supabase al evitar cientos de consultas repetitivas.

## Decisión de Arquitectura y Justificación
Se adoptó la **carga integral del catálogo en memoria**:

### 1. Volumetría Acotada del Dominio Institucional
A diferencia de un ecommerce con millones de productos, ChocoMapaSV administra un catálogo institucional representativo de El Salvador:
* 28 destinos oficiales curados y certificados por el Ministerio de Turismo (MITUR).
* Decenas de paquetes de experiencias de tours oficiales operados por guías certificados.

El tamaño total de la transferencia de datos en formato JSON para el catálogo completo de lugares es inferior a **80 KB sin comprimir**, lo que representa apenas unos **~18 KB gzipped** transferidos por la red. Este costo de transferencia inicial es marginal y se amortiza completamente tras la primera petición HTTP.

### 2. Experiencia de Usuario Instantánea (Cero Latencia)
Al mantener la colección íntegra en la memoria del navegador (`todosLosLugares`), las operaciones multidimensionales de filtrado y ordenamiento se resuelven en el hilo principal del cliente sin sobrecarga ni llamadas de red adicionales:

```javascript
// js/models/LugaresModel.js
getLugaresFiltrados() {
    let filtrados = todosLosLugares;

    if (categoriaActiva && categoriaActiva !== 'todos' && categoriaActiva !== 'todas') {
        filtrados = filtrados.filter(lugar =>
            coincideCategoria(lugar.category, categoriaActiva) ||
            coincideCategoria(lugar.category_slug, categoriaActiva)
        );
    }

    if (terminoBusqueda.length > 0) {
        const busquedaNorm = normalizarTexto(terminoBusqueda);
        filtrados = filtrados.filter(lugar => {
            const nombre = normalizarTexto(lugar.name || '');
            const descripcion = normalizarTexto(lugar.description || '');
            const categoria = normalizarTexto(lugar.category || '');
            const depto = normalizarTexto(lugar.department || '');

            return nombre.includes(busquedaNorm) ||
                descripcion.includes(busquedaNorm) ||
                categoria.includes(busquedaNorm) ||
                depto.includes(busquedaNorm);
        });
    }

    if (ratingMinimoActivo > 0) {
        filtrados = filtrarLugaresPorRating(filtrados, ratingMinimoActivo);
    }

    return filtrados;
}
```

* **Respuesta en 0 milisegundos:** El motor de búsqueda predictiva con normalización Unicode NFD (ADR-030) evalúa y filtra el listado mientras el usuario escribe, con tiempos de cómputo inferiores a 2 ms.
* **Cero llamadas adicionales a Supabase:** Se preserva la cuota de peticiones del plan BaaS y se elimina el riesgo de cuellos de botella por concurrencia.

### 3. Coherencia Geoespacial
* Facilita mantener sincronizados los marcadores del mapa (`MapaModel.js`, `mapa.html`) con las tarjetas visibles del catálogo sin discrepancias de estado entre páginas.
* Permite la sincronización limpia de parámetros en la URL con la API de historial (`history.pushState` / `replaceState`, ADR-034), garantizando que las URLs compartidas reflejen el estado exacto sin importar la página en la que se encuentre el turista.

## Consecuencias
* **Impacto Positivo:**
  - **Cero latencia en filtrado y ordenamiento interactivo:** La re-evaluación de filtros sobre el arreglo en memoria ocurre en tiempo real y sin estados de carga intermedios.
  - **Cero peticiones redundantes a la base de datos tras la carga inicial:** Reducción drástica del ancho de banda y del consumo de la API de Supabase.
  - **Interfaz simple y limpia sin controles de paginación numerada:** Experiencia fluida para el turista, quien puede explorar y comparar destinos sin interrupciones artificiales.
  - **Resiliencia ante desconexiones:** Permite al usuario continuar interactuando con el catálogo ya descargado incluso ante pérdidas transitorias de señal en zonas rurales.

* **Trade-offs / Mitigaciones:**
  - *Consumo inicial de memoria en el navegador y coste de renderizado del DOM:*
    * **Mitigación de medios:** Se implementa de forma estricta el atributo `loading="lazy"` y `decoding="async"` en todas las etiquetas `<img>` de las tarjetas generadas (`LugaresView.js` y `ToursView.js`), garantizando que las imágenes no se descarguen hasta aproximarse al viewport del usuario.
    * **Mitigación de memoria:** Al operar con Vanilla JS nativo sin capas de abstracción pesadas ni Virtual DOM, el impacto en memoria RAM del dataset completo es despreciable (< 1 MB), asegurando un rendimiento óptimo en dispositivos móviles de gama de entrada.

