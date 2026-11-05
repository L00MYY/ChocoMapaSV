# ADR-019: Modelo Antifraude Verified Visitor para Calificaciones de Destinos (JUL-46, JUL-60)

## Estado
Implementado — Sprint 4 (31 de octubre de 2026) / Historias de Usuario Jira JUL-46, JUL-60

## Contexto y Planteamiento del Problema
En el prototipo inicial de ChocoMapaSV, las tarjetas de lugares turísticos y la vista detallada mostraban calificaciones numéricas estáticas o simuladas (como el valor quemado de `4.8` estrellas). Esto constituía una deuda técnica documentada y violaba los principios de transparencia gubernamental del MITUR.

Al abrir el sistema a calificaciones reales, surgieron dos riesgos fundamentales:
1. **Calificaciones Fraudulentas y Campañas de Desprestigio (*Review Bombing*):** Si cualquier usuario anónimo o registrado pudiera calificar cualquier destino, actores maliciosos o competidores podrían dañar la reputación de cooperativas y guías locales mediante puntuaciones de 1 estrella sin haber visitado jamás el lugar.
2. **Inflación Artificial de Reputación:** Por el contrario, operadores inescrupulosos podrían autocalificarse con 5 estrellas mediante cuentas falsas.

## Decisión de Arquitectura y Justificación
Se decide diseñar e implementar el modelo de negocio y arquitectura antifraude "Visitante Verificado" (*Verified Visitor Pattern*), gobernado por `CalificacionesModel.js` y validado en `tests/ratings.test.js`:

1. **Descarte Total de Datos Quemados (`calcularPromedioRating`):**
   El promedio de calificaciones se calcula estrictamente en tiempo real sobre las filas de la tabla `ratings`. Si un lugar no cuenta con valoraciones válidas, el sistema retorna con honestidad el estado neutral: promedio `0`, total `0`, texto `"Sin calificaciones aún"`, y `tieneCalificaciones: false`.

2. **Reglas de Elegibilidad Estrictas (`evaluarElegibilidadCalificacion`):**
   Un turista **solo** está habilitado para puntuar un destino si se satisfacen todas las siguientes condiciones concurrentes:
   * **Autenticación Obligatoria:** El usuario debe poseer una sesión válida en `AuthModel`.
   * **Reserva Confirmada:** El usuario debe contar con al menos una reservación en estado `'confirmada'` en `tour_reservations`.
   * **Vínculo Físico con el Destino:** El tour reservado debe incluir explícitamente el `place_id` dentro de su itinerario geográfico oficial.
   * **No Duplicidad:** Se aplica la regla de "Una reseña por turista por lugar" (`yaCalifico: false`).
   Si alguna condición no se cumple, la interfaz bloquea el formulario e informa con precisión la razón legal (e.g. `"Solo puedes calificar lugares turísticos incluidos en tours que hayas reservado y confirmado"`).

3. **Validación Formal de Puntuación (`validarScoreRating`):**
   Solo se aceptan números enteros estrictos entre 1 y 5 estrellas ($1, 2, 3, 4, 5$). Se rechazan de plano valores decimales (como 4.8 o 3.5), cadenas de texto, valores fuera de rango o nulos.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Credibilidad y prestigio institucional: las valoraciones en ChocoMapaSV representan testimonios reales de turistas que pagaron el tour guiado oficial.
  * Protección integral a pequeños artesanos, operadores comunitarios y parques nacionales frente a campañas difamatorias.
  * Cumplimiento estricto de los criterios de aceptación de Jira JUL-46 y JUL-60.
  * Suite de 18 pruebas unitarias automatizadas cubriendo casos límite en `tests/ratings.test.js`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Menor volumen inicial de reseñas:* El número de calificaciones crece a un ritmo más pausado que en plataformas abiertas como TripAdvisor o Google Reviews.
  * *Mitigación:* Se asume como un beneficio de calidad sobre cantidad, plenamente alineado con la visión de certificación oficial del Ministerio de Turismo.

