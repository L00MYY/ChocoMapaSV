# ADR-029: Transformación y Normalización Geoespacial de Coordenadas en Capa de Modelo

## Estado
Implementado — Sprint 2 (23 de octubre de 2026)

## Contexto y Planteamiento del Problema
En el diseño de la base de datos relacional de Supabase (PostgreSQL), la tabla `places` almacena la geolocalización de cada sitio turístico en dos columnas escalares de tipo numérico flotante: `latitude` (latitud, eje $Y$, rango $[-90, 90]$) y `longitude` (longitud, eje $X$, rango $[-180, 180]$). Este es el estándar habitual en esquemas relacionales y formularios administrativos.

Sin embargo, los estándares de datos geoespaciales modernos como GeoJSON (RFC 7946) y los motores cartográficos basados en WebGL como Mapbox GL JS (`mapboxgl.LngLatLike` y `Marker.setLngLat([lng, lat])`) exigen estrictamente el orden inverso:
$$\text{Coordenadas GeoJSON / Mapbox} = [\text{longitude}, \text{latitude}]$$

Si esta transformación se dejara en manos de las vistas (`MapaView.js`, `LugarDetalleView.js`) o de los controladores:
1. Se producía un alto riesgo de inversión accidental de coordenadas (e.g. pasar `[lat, lng]` en lugar de `[lng, lat]`), provocando que los marcadores de El Salvador aparecieran en medio del Océano Índico o en la Antártida.
2. Se violaba la separación de responsabilidades del patrón MVC (ADR-001), acoplando las capas de presentación al esquema físico de la base de datos de PostgreSQL.

## Opciones Consideradas
1. **Delegar la Inversión Manual a las Vistas y Controladores:**
   * *Ventajas:* No requiere código de mapeo en el cliente HTTP.
   * *Desventajas:* Fragilidad extrema. Cada vista que consuma coordenadas debe recordar invertir el orden de los atributos (`[lugar.longitude, lugar.latitude]`), multiplicando la probabilidad de error humano y duplicando lógica.
2. **Alterar la Estructura de la Base de Datos en Supabase (PostGIS / Columna JSONB `coords`):**
   * *Ventajas:* Los datos ya viajarían en el formato de Mapbox desde la base de datos.
   * *Desventajas:* Mayor complejidad en la gestión de migraciones DDL de PostgreSQL, pérdida de índices B-Tree simples sobre columnas numéricas de latitud/longitud y potencial incompatibilidad con paneles CRUD administrativos tradicionales del MITUR.
3. **Transformación Centralizada en la Capa de Modelo (`SupabaseClient.js`):**
   * *Ventajas:* Cumplimiento estricto del Principio de Responsabilidad Única (SRP). El modelo extrae los datos crudos de Supabase PostgREST, aplica la normalización geoespacial una sola vez y expone una entidad de dominio limpia con el atributo `coords: [lugar.longitude, lugar.latitude]`.

## Decisión de Arquitectura y Justificación
Se decide implementar la **Transformación y Normalización Geoespacial Centralizada** en `js/models/SupabaseClient.js` dentro de la función pública `obtenerLugaresTuristicos()`:

```javascript
return datos.map(lugar => ({
    id: lugar.id,
    name: lugar.name,
    description: lugar.description || '',
    image_url: lugar.image_url || '',
    opening_days: lugar.opening_days || '',
    department: lugar.department || '',
    region: lugar.region || '',
    is_active: lugar.is_active,
    category: lugar.categories?.name || 'Turismo',
    category_slug: lugar.categories?.slug || generarSlug(lugar.categories?.name || 'Turismo'),
    color: lugar.categories?.color || '#FF6B6B',
    coords: [lugar.longitude, lugar.latitude], // Normalización canónica para Mapbox GL JS
    ratings: Array.isArray(lugar.ratings) ? lugar.ratings : []
}));
```

De esta manera, `MapaView.js` y `LugarDetalleView.js` consumen directamente `lugar.coords` como un arreglo ordenado listo para Mapbox (`new mapboxgl.Marker().setLngLat(lugar.coords)`), sin necesidad de conocer el nombre de las columnas de la base de datos ni preocuparse por la orientación de los ejes espaciales.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Eliminación total de bugs por inversión de coordenadas en el mapa.
  * Desacoplamiento total entre la representación interna de la base de datos (`latitude`, `longitude`) y la representación cartográfica en el cliente (`coords: [lng, lat]`).
  * Consistencia garantizada en todas las vistas de la aplicación (mapa principal, modales, vistas detalladas de destino).
  * Código de vistas más limpio, conciso y mantenible.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Sobrecarga de mapeo en memoria para el arreglo de lugares.*
  * *Mitigación:* Para catálogos turísticos de escala nacional (cientos de registros), el mapeo en memoria en JavaScript toma menos de 1 milisegundo, siendo completamente imperceptible.

