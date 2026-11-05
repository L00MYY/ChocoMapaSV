# ADR-027: Selección de Mapbox GL JS v2.15.0 como Motor Cartográfico

## Estado
Aceptado e Implementado — Sprint 1 (20 de octubre de 2026) / Ratificado en vísperas de Sprint 4

## Contexto y Planteamiento del Problema
ChocoMapaSV es una plataforma oficial de turismo del Ministerio de Turismo de El Salvador (MITUR) cuyo núcleo funcional radica en la exploración geoespacial interactiva de sitios turísticos, rutas guiadas y zonas de interés cultural y natural.

El sistema requería un motor cartográfico cliente capaz de:
1. Renderizar de forma fluida decenas de marcadores geolocalizados con popups personalizados, animaciones de encuadre (*flyTo*, *fitBounds*) y controles de navegación responsivos.
2. Soportar capas vectoriales dinámicas y estilos avanzados para aislar territorialmente a El Salvador mediante máscaras opacas sobre países vecinos (ADR-008).
3. Operar de forma autónoma en el navegador web con alto rendimiento visual en dispositivos móviles y de escritorio, sin requerir empaquetadores ni servidores de mapas propios.
4. Cumplir con un marco de licenciamiento de software abierto y seguro para proyectos académicos e institucionales gubernamentales.

## Opciones Consideradas
1. **Leaflet.js:**
   * *Ventajas:* Biblioteca liviana (~40 KB), madura y ampliamente utilizada en la comunidad de código abierto (licencia BSD-2-Clause).
   * *Desventajas:* Renderizado tradicional basado en DOM y Canvas 2D sin aceleración WebGL nativa. Manipular estilos vectoriales en tiempo real o enmascarar países limítrofes exige descargar pesados archivos GeoJSON externos, degradando la fluidez en dispositivos móviles y complicando la personalización estética moderna.
2. **OpenLayers:**
   * *Ventajas:* Soporte masivo para estándares de Open Geospatial Consortium (OGC), proyecciones arbitrarias y robustez SIG (*GIS*).
   * *Desventajas:* Curva de aprendizaje empinada, tamaño de librería elevado (>150 KB gzip), API compleja para un proyecto ágil y sobrecarga innecesaria para un visor turístico web.
3. **Google Maps JavaScript API:**
   * *Ventajas:* Reconocimiento universal de interfaz y precisión en puntos de interés salvadoreños.
   * *Desventajas:* Costos elevados de facturación por carga de mapa una vez superado el crédito mensual; menor flexibilidad para inyectar filtros vectoriales de polígonos fronterizos; fuerte acoplamiento propietario y dependencia de cuentas de facturación de Google Cloud.
4. **Mapbox GL JS (v2.15.0):**
   * *Ventajas:* Motor de renderizado WebGL acelerado por hardware para teselas vectoriales (*vector tiles*), capacidad de estilizar capas dinámicamente en tiempo de ejecución (acceso directo al tileset oficial `mapbox://mapbox.country-boundaries-v1` para la máscara fronteriza), y amplia documentación para diseño de interfaces de usuario personalizadas.
   * *Aspecto de Licenciamiento:* Fijar estrictamente la versión **v2.15.0** permite operar bajo un modelo de consumo predecible y compatible con la infraestructura docente e institucional, evitando las restricciones comerciales y transiciones restrictivas a licencias BSL 1.1 (*Business Source License*) de versiones mayores posteriores.

## Decisión de Arquitectura y Justificación
Se decide seleccionar **Mapbox GL JS v2.15.0** como el motor cartográfico exclusivo de ChocoMapaSV, consumido mediante su CDN oficial en `mapa.html` e integrado visualmente en `js/views/MapaView.js`.

Las justificaciones técnicas y estratégicas son:
* **Renderizado WebGL de Alto Rendimiento:** La aceleración gráfica por hardware garantiza transiciones suaves a 60 FPS, paneo fluido y renderizado instantáneo de marcadores en dispositivos móviles de cualquier gama.
* **Integración Vectorial Nativa para Máscara Fronteriza:** Permite inyectar directamente la capa de recorte territorial (`mapbox://mapbox.country-boundaries-v1`) con filtrado dinámico `iso_3166_1 != 'SV'` (ADR-008), sin sobrecargar el ancho de banda descargando polígonos GeoJSON gigantescos.
* **Gobernanza de Licencia y Estabilidad:** Fijar la versión `v2.15.0` garantiza estabilidad en la API, compatibilidad total con Vanilla JS sin transpiladores y predictibilidad operativa para el MITUR y la ESEN.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Experiencia visual inmersiva, moderna y ultra fluida para los turistas.
  * Facilidad para definir límites geográficos estrictos (`bounds` y `maxBounds`) y encuadres dinámicos (`cameraForBounds`).
  * Estilizado fino de popups (`.mapboxgl-popup-content` y `.mapboxgl-popup-tip`) alineados con la identidad visual *Dark Anchor Frame* (ADR-024).
  * Consumo óptimo de recursos de red gracias a la carga bajo demanda de teselas vectoriales compactas.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Dependencia de token de acceso de Mapbox (`MAPBOX_TOKEN`):* Requiere gestionar una clave pública de API asociada a una cuenta de Mapbox.
  * *Mitigación:* Se implementó la ofuscación en Base64 en el script de compilación (ADR-005) y se configuraron restricciones de dominio (*URL Referrer restrictions*) en la consola de Mapbox, limitando las solicitudes exclusivamente al dominio de producción en Vercel y entornos locales de desarrollo.

