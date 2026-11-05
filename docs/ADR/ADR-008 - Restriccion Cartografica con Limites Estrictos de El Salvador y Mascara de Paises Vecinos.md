# ADR-008: Restricción Cartográfica con Límites Estrictos de El Salvador y Máscara de Países Vecinos

## Estado
Implementado — Sprint 3 (24 de octubre de 2026)

## Contexto y Planteamiento del Problema
ChocoMapaSV incorpora la biblioteca cartográfica Mapbox GL JS para la exploración geoespacial de destinos turísticos y rutas guiadas por El Salvador. En la configuración predeterminada de un mapa web, el usuario cuenta con libertad ilimitada de desplazamiento horizontal y vertical (*panning* infinito) y alejamiento de zoom (*zoom out* global).

Esta conducta presentaba problemas operativos y técnicos severos:
1. **Degradación de la Experiencia de Usuario (UX):** Los turistas perdían frecuentemente el foco de navegación, desorientándose en océanos abiertos o países vecinos (Guatemala, Honduras, Nicaragua).
2. **Falta de Alineación Institucional:** La plataforma es un instrumento soberano de promoción turística del MITUR; permitir visualizaciones prominentes de naciones limítrofes diluía el propósito ministerial.

## Decisión de Arquitectura y Justificación
Se decide implementar un mecanismo dual de restricción geoespacial rígida y enmascaramiento vectorial en `js/views/MapaView.js`, garantizando que el mapa permanezca confinado exclusivamente dentro de la geografía salvadoreña:

1. **Límites Cartográficos Geodésicos Estrictos (`limitesElSalvador`):**
   Se calcularon las coordenadas de los extremos cardinales reales de El Salvador con un margen técnico de tolerancia de ~0.05° para no seccionar islas ni hitos fronterizos:
   * Suroeste: `[-90.18, 13.10]`
   * Noreste: `[-87.64, 14.50]`
   Se configuran en la instancia de Mapbox mediante las propiedades `bounds: limitesElSalvador` y `maxBounds: limitesElSalvador`.

2. **Cálculo de Zoom Mínimo Dinámico (`fijarZoomMinimo`):**
   En lugar de definir un valor de zoom estático que rompa en dispositivos móviles o monitores ultrawide, se calcula dinámicamente con `map.cameraForBounds(limitesElSalvador, { padding: 10 })?.zoom` y se reajusta ante eventos de redimensionamiento de ventana (`resize`).

3. **Máscara Poligonal Vectorial de Países Vecinos (`mascara-vecinos`):**
   Aprovechando el tileset oficial de fronteras de Mapbox (`mapbox://mapbox.country-boundaries-v1`), se inyecta una capa de tipo `fill` con filtro lógico:
   ```javascript
   filter: [
       'all',
       ['!=', ['get', 'iso_3166_1'], 'SV'],
       ['any',
           ['==', 'all', ['get', 'worldview']],
           ['in', 'US', ['get', 'worldview']]
       ]
   ]
   ```
   Esta capa cubre con un color opaco `#f2f2f0` todos los países colindantes excepto El Salvador, logrando un recorte territorial limpio y elegante sin necesidad de descargar pesados archivos GeoJSON adicionales.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Usabilidad óptima: el usuario nunca pierde de vista el territorio de El Salvador sin importar cómo interactúe con el mapa.
  * Identidad institucional reforzada al resaltar con exclusividad el contorno nacional.
  * Cero sobrecarga de ancho de banda: la máscara reutiliza el tileset vectorial ya cargado por Mapbox.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Ocultación de contexto geográfico regional:* Si un turista desea orientarse respecto a una aduana fronteriza terrestre, el país vecino carece de detalles topográficos visibles.
  * *Mitigación:* Se fijó el color de máscara (`#f2f2f0`) en armonía con el estilo cartográfico base (`mapbox://styles/mapbox/light-v11`), asegurando que las líneas divisorias de frontera permanezcan sutilmente identificables.