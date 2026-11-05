# ADR-006: Descarte de Red Social y Módulo de Comunidad en Favor de Plataforma Oficial de Turismo Institucional

## Estado
Aceptado — Sprint 2 (21 de octubre de 2026) / Transición a Esqueleto 2.0

## Contexto y Planteamiento del Problema
En la concepción original del proyecto (Esqueleto 1.0), el backlog de producto contemplaba un "Módulo de Comunidad" con características de red social abierta: un muro o feed público de publicaciones donde cualquier usuario registrado podía compartir experiencias, subir fotografías libres y emitir comentarios sin validación previa.

Al someter este alcance a revisión estratégica se identificaron riesgos críticos:
1. **Riesgo Legal y Reputacional Institucional:** Una plataforma bajo el auspicio del MITUR no puede alojar contenido generado por usuarios (UGC) sin moderación activa, ante la posibilidad de difamación de destinos nacionales, publicidad no autorizada, estafas de operadores ilegales o contenido inapropiado.
2. **Inviabilidad Operativa de Moderación:** El equipo de desarrollo ágil y el personal de MITUR asignado carecían de un equipo legal y de moderación en tiempo real (24/7) para auditar publicaciones de comunidad.
3. **Dispersión del Valor Central:** El objetivo primario de ChocoMapaSV es la digitalización certera de rutas turísticas oficiales, la certificación de destinos seguros y el control estricto de aforo en tours guiados.

## Decisión de Arquitectura y Justificación
Se decide descartar formal y definitivamente el módulo de comunidad y red social del alcance del sistema (Esqueleto 2.0), reorientando toda la arquitectura hacia una Plataforma Oficial de Turismo y Gestión de Reservas Institucionales.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Reducción radical del riesgo legal y de imagen pública para el MITUR.
  * Simplificación sustancial del modelo de datos en PostgreSQL, evitando esquemas complejos de publicaciones, comentarios anidados, reacciones y tablas de seguimiento (*followers*).
  * Reducción de costos y almacenamiento en Supabase Storage al evitar la carga indiscriminada de imágenes de redes sociales.
  * Enfoque del equipo de desarrollo en robustecer la transaccionalidad de reservas, seguridad de comprobantes y precisión cartográfica.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Pérdida de viralidad social orgánica:* La plataforma pierde la interacción espontánea de tipo red social entre turistas.
  * *Mitigación:* Se diseñó un modelo alternativo antifraude denominado *Verified Visitor* (implementado en ADR-019), donde la retroalimentación de los turistas existe, pero está estrictamente condicionada a visitas comprobadas mediante reservas oficiales confirmadas por el MITUR.

