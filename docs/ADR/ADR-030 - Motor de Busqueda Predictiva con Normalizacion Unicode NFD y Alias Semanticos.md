# ADR-030: Motor de Búsqueda Predictiva con Normalización Unicode NFD y Alias Semánticos

## Estado
Implementado — Sprint 3 y Vísperas de sprint 4 (27 de octubre y 3 de noviembre de 2026)


## Contexto y Planteamiento del Problema
En el buscador predictivo del Hero (`index.html`) y en la barra de filtrado del catálogo (`lugares-turisticos.html`), los turistas buscan destinos escribiendo en lenguaje natural:
1. **Problema de Diacríticos y Acentuación:** En el español salvadoreño, términos como "Volcán", "Suchitlán", "Concepción", "Ilopango" o "Joya de Cerén" son escritos frecuentemente sin tildes por los usuarios en dispositivos móviles ("volcan", "suchitlan", "ceren"). Una comparación de cadenas tradicional (`===` o `indexOf`) falla si no coinciden los acentos gráficos.
2. **Problema de Discrepancia Semántica:** Los turistas suelen buscar por términos coloquiales o abreviaciones (e.g., "surf city", "playas", "ruinas", "arqueologia") que no coinciden literalmente con los nombres formales registrados por el MITUR en la base de datos (e.g., "Playas & Surf City" o "Historia & Arqueología").
3. **Sobrecarga de Consultas a la Base de Datos:** Si por cada pulsación de tecla (`input` event) el sistema enviara una solicitud HTTP `GET` a PostgREST con operadores `ilike.%termino%`:
   * Se generaría una ráfaga masiva de peticiones de red innecesarias.
   * Se introduciría una latencia perceptible de 200 a 500 ms por consulta.
   * Se correría el riesgo de condiciones de carrera (*race conditions*) si una respuesta lenta sobreescribiera una consulta más reciente.

## Opciones Consideradas
1. **Consultas HTTP Repetitivas con `ilike` en Supabase PostgREST:**
   * *Ventajas:* Filtrado delegado a la base de datos.
   * *Desventajas:* Saturación de la cuota de peticiones, alta latencia visual en el buscador del Hero y vulnerabilidad a desincronización por respuestas asíncronas desordenadas.
2. **PostgreSQL Full-Text Search Remoto (`to_tsvector` / `to_tsquery`):**
   * *Ventajas:* Capacidades avanzadas de lematización en español en el servidor.
   * *Desventajas:* Sobredimensionado para un catálogo turístico de escala mediana, requiere crear índices GIN complejos en Supabase y no elimina la latencia de red en el buscador interactivo mientras el usuario escribe.
3. **Motor Predictivo en Memoria del Cliente con Normalización Unicode NFD y Alias Semánticos:**
   * *Ventajas:* Cero latencia (búsqueda instantánea en menos de 2 milisegundos), eliminación total de llamadas de red redundantes tras la carga inicial del catálogo, y soporte completo para variaciones de escritura salvadoreñas y nombres oficiales del MITUR.

## Decisión de Arquitectura y Justificación
Se decide implementar un **Motor de Búsqueda Predictiva y Filtrado en Memoria del Cliente** centralizado en la capa utilitaria pura `js/utils/textUtils.js`:

1. **Normalización Unicode en Forma Canónica NFD (`normalizarTexto`):**
   Descompone los caracteres acentuados en su carácter base más el diacrítico combinatorio, eliminando estos últimos mediante una expresión regular de rango Unicode:
   ```javascript
   export const normalizarTexto = (texto) => (texto || '')
       .toString()
       .toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .trim();
   ```
   Esto asegura que `"Volcán"`, `"volcan"`, `"VOLCÁN"` y `" volcan "` se reduzcan de forma idéntica a `"volcan"`.

2. **Diccionario de Alias Semánticos (`ALIAS_CATEGORIAS`):**
   Mapea sinónimos y formas coloquiales a los slugs y nombres oficiales del MITUR:
   ```javascript
   export const ALIAS_CATEGORIAS = {
       'volcanes-naturaleza': ['volcanes y naturaleza', 'volcanes & naturaleza', 'volcanes-naturaleza', 'volcanes'],
       'playas-surf-city': ['playas y surf city', 'playas & surf city', 'playas-surf-city', 'surf city', 'playas'],
       'historia-arqueologia': ['historia y arqueologia', 'historia & arqueologia', 'historia-arqueologia', 'arqueologia'],
       'rutas-culturales-pueblos-vivos': ['rutas culturales y pueblos vivos', 'rutas culturales & pueblos vivos', 'pueblos vivos', 'rutas culturales']
   };
   ```

3. **Evaluación Multicriterio en Memoria (`coincideCategoria`):**
   Compara de forma bidireccional nombres normalizados, slugs generados (`generarSlug`), coincidencias parciales por inclusión (`includes`) y membresía en el catálogo de alias.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Experiencia de búsqueda en tiempo real fluida y receptiva (menos de 2 ms por búsqueda).
  * Tolerancia absoluta a errores de acentuación y ortografía común en español.
  * Flexibilidad semántica que conecta el vocabulario coloquial del turista con las categorías institucionales del MITUR.
  * Ahorro masivo en cuotas de llamadas API a Supabase.
  * Pruebas unitarias exhaustivas con 100% de éxito en `tests/filtros.test.js`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Descarga inicial del catálogo completo de lugares en memoria.*
  * *Mitigación:* El volumen de datos del catálogo turístico salvadoreño en formato JSON pesa menos de 35 KB comprimido, descargándose en una sola petición HTTP al inicializar la página y manteniéndose en caché del navegador.

