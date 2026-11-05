# ADR-010: Ejecución Nativa en Navegador con ES Modules sin Empaquetadores ni Bundlers

## Estado
Aceptado — Sprint 1 (20 de octubre de 2026) / Ratificado en vísperas de sprint 4

## Contexto y Planteamiento del Problema
En el desarrollo web moderno es común recurrir a empaquetadores como Webpack, Vite, Parcel o Rollup para procesar, transpilar y agrupar el código JavaScript en un único archivo distribuible (*bundle*).

No obstante, en el contexto formativo ágil de ChocoMapaSV, esta aproximación introducía fricciones críticas:
1. **Fragilidad de Configuración y Dependencias:** Problemas recurrentes de resolución de módulos en `node_modules`, desajustes en scripts de transpilación y fallos de despliegue en Vercel derivados de configuraciones de empaquetado defectuosas.
2. **Opacidad en la Depuración (*Debugging*):** El código ofuscado o combinado mediante sourcemaps dificulta el rastreo exacto de errores en las herramientas de desarrollo del navegador (*DevTools*) durante revisiones en vivo con la cátedra.
3. **Sobrecarga de Herramental:** La necesidad de mantener pipelines de empaquetado complejos desviaba horas de desarrollo vitales que debían destinarse a la lógica transaccional y cartográfica.

## Decisión de Arquitectura y Justificación
Se decide prescindir por completo de empaquetadores y bundlers en tiempo de ejecución, adoptando la ejecución nativa de ECMAScript Modules (ESM) en el navegador:

* **Sintaxis de Módulos Estándar W3C:** Carga directa mediante `<script type="module" src="js/..."></script>` en todas las páginas HTML.
* **Imports Relativos Explícitos:** Inclusión obligatoria de la extensión `.js` en todas las sentencias de importación interna (por ejemplo, `import { AuthModel } from './AuthModel.js'`), requisito estricto del motor de módulos nativo de los navegadores modernos.
* **Separación de Build Ligera:** Únicamente se conserva un script mínimo de Node.js en la fase de pre-despliegue (`scripts/build-config.cjs`), cuyo único rol es leer variables de entorno en Vercel e inyectar el archivo estático `js/config.js`.

Esta decisión se ampara en los principios de simplicidad arquitectónica (KISS) y minimización de dependencias (*zero-dependency runtime*).

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Tiempos de despliegue ultrarrápidos en Vercel (menos de 30 segundos por commit).
  * Cero riesgo de incompatibilidad entre plugins de empaquetadores.
  * Depuración limpia y transparente: cada archivo (`ToursModel.js`, `PagoController.js`, `MapaView.js`) aparece en su estructura original exacta en las DevTools del navegador.
  * Arquitectura modular pura: cualquier archivo puede ser inspeccionado, auditado y testeado de manera aislada.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Múltiples peticiones HTTP en cascada:* Al no existir un único bundle consolidado, el navegador realiza múltiples solicitudes GET para descargar los módulos importados.
  * *Mitigación:* Se mitiga de forma natural mediante el protocolo HTTP/2 provisto por la CDN de Vercel (que admite multiplexación de solicitudes y compresión de cabeceras sin latencia perceptible), sumado al almacenamiento en caché agresivo de assets estáticos y un árbol de dependencias superficial.

