# ADR-024: Identidad Visual Dark Anchor Frame y Conformidad de Contraste WCAG AA

## Estado
Implementado — Vísperas de sprint 4 (3 de noviembre de 2026) / Auditoría de Accesibilidad Web

## Contexto y Planteamiento del Problema
ChocoMapaSV debe representar con dignidad y sobriedad institucional al Ministerio de Turismo de El Salvador (MITUR), ofreciendo al mismo tiempo una experiencia de usuario moderna con soporte para alternancia entre modo oscuro (*Dark Mode*) y modo claro (*Light Mode*).

Durante la auditoría visual y de accesibilidad previa a la entrega final, se identificaron deficiencias técnicas severas:
1. **Pérdida de Identidad Institucional en Modo Claro:** Al alternar a tema claro completo, la barra superior e inferior se tornaban blancas o grises deslavadas, diluyendo el carácter oficial y la solidez gubernamental del MITUR.
2. **Infracciones de Contraste WCAG 2.1 (Nivel AA):** Textos secundarios, enlaces de acción, badges de estado y descripciones en tarjetas presentaban relaciones de contraste de color inferiores al umbral mínimo reglamentario de **4.5:1** para texto normal y **3.0:1** para componentes gráficos interactivos.
3. **Anomalías en Controles Nativos del Navegador:** En modo oscuro, campos nativos de fecha (`<input type="date">`) y menús desplegables (`<select>`) renderizaban en ciertos navegadores con texto blanco sobre fondos blancos del sistema operativo, volviéndose ilegibles.
4. **Desarticulación en Tooltips de Mapbox:** Las puntas de flecha de los popups cartográficos (`.mapboxgl-popup-tip`) mantenían bordes blancos fijos, generando artefactos visuales rotos sobre mapas en modo oscuro.

## Decisión de Arquitectura y Justificación
Se decide diseñar e implementar el patrón de identidad visual **Dark Anchor Frame** combinado con un refactor sistemático de conformidad WCAG AA en todas las hojas de estilo:

1. **Patrón Arquitectónico "Dark Anchor Frame":**
   La barra de navegación principal (`navbar.css`) y el pie de página institucional (`footer.css`) permanecen **invariablemente anclados en tonos oscuros marinos institucionales** (`--baltic-blue: #0A192F`, `--deep-space-blue: #030B18`). Este marco oscuro perimetral ("Anchor Frame") preserva la identidad soberana del MITUR en todo momento.

2. **Dinamismo Temático en Contenedores Centrales (`[data-theme]`):**
   El cuerpo de la aplicación conmuta dinámicamente entre `[data-theme="dark"]` (predeterminado) y `[data-theme="light"]`, administrado por el interruptor en el menú de usuario (`NavbarView.js`) y persistido en `localStorage`.

3. **Correcciones Sistemáticas de Contraste WCAG AA:**
   Se incorporaron bloques explícitos `/* === WCAG AA CONTRAST AUDIT FIXES === */` en todos los archivos CSS (`styles.css`, `index-style.css`, `tours.css`, `detalle-lugar.css`, `admin-pagos.css`, `pago-comprobante.css`):
   * Ajuste de colores de texto a valores con ratio $\ge 4.5:1$ (e.g. coral suave `#f87171` para errores en dark mode, textos atenuados a `#e2e8f0` y `#cbd5e1`).
   * Forzado de compatibilidad con controles nativos del sistema operativo mediante las propiedades `color-scheme: dark !important;` y `color-scheme: light !important;` en selectores y campos de formulario.
   * Estilizado integral de Mapbox: personalización de `.mapboxgl-popup-content` y de las 4 orientaciones cardinales de `.mapboxgl-popup-tip` (top, bottom, left, right) según el tema activo.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Cumplimiento estricto con los estándares internacionales de accesibilidad web W3C WCAG 2.1 Nivel AA.
  * Presencia visual prestigiosa, imponente y consistente con las directrices de marca del MITUR.
  * Erradicación de anomalías visuales en selectores nativos, calendarios y popups cartográficos en navegadores móviles y de escritorio.
  * Suite de pruebas automatizadas validando la persistencia y alternancia del tema en `tests/theme_system.test.js`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Incremento en el volumen de selectores en las hojas de estilo CSS.*
  * *Mitigación:* Se estructuraron los bloques de accesibilidad al final de cada archivo CSS bajo comentarios demarcadores estandarizados, facilitando su mantenimiento y auditoría por separado.

