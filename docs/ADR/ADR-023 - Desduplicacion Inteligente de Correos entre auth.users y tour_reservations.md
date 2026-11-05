# ADR-023: Desduplicación Inteligente de Correos entre auth.users y tour_reservations

## Estado
Implementado — Vísperas de sprint 4 (2 de noviembre de 2026)

## Contexto y Planteamiento del Problema
En el modelo de datos de ChocoMapaSV coexisten dos fuentes de correo electrónico para un mismo flujo de reserva:
1. `emailAuth`: El correo de la cuenta autenticada del usuario en Supabase GoTrue (`auth.users`), accesible mediante `sesion.user.email`.
2. `emailReserva`: El correo ingresado explícitamente por el turista en el formulario de reserva (`tourist_email` en la tabla `tour_reservations`).

Frecuentemente se presentan dos escenarios operacionales distintos:
* **Escenario A (Mismo destinatario):** El turista utiliza su propio correo registrado en ambos campos (e.g. `turista@mitur.gob.sv` y `turista@mitur.gob.sv`). Enviar dos correos idénticos generaría una experiencia de usuario molesta (spam) y agotaría el doble de la cuota transaccional de EmailJS.
* **Escenario B (Destinatarios distintos):** Un usuario registrado en la plataforma efectúa una reserva a nombre de un tercero (un familiar, un colega de trabajo o un cliente de agencia), indicando un correo operativo diferente (e.g., `usuario@empresa.com` vs `contacto.reserva@gmail.com`). Omitir cualquiera de los dos correos dejaría al titular de la cuenta o al asistente al tour sin el itinerario ni la confirmación oficial.

Adicionalmente, los usuarios introducen comúnmente espacios en blanco accidentales o combinaciones dispares de mayúsculas y minúsculas (ej. `"  Pablo@mail.com "` vs `"pablo@mail.com"`).

## Decisión de Arquitectura y Justificación
Se decide implementar un algoritmo determinista y puro de **Desduplicación Inteligente y Normalización Canónica** en `NotificacionesModel.determinarDestinatariosNotificacion`:

1. **Normalización y Sanitización Canónica:**
   Cada dirección de correo es convertida a cadena limpia mediante `trim()` y transformada estrictamente a minúsculas (`toLowerCase()`). Se descartan valores nulos, vacíos, indefinidos o sin el símbolo `@`.

2. **Lógica de Desduplicación:**
   * Si tras normalizar, `emailAuth === emailReserva`, la función consolida la lista a un arreglo de exactamente un (1) destinatario: `[emailNormalizado]`.
   * Si `emailAuth !== emailReserva` y ambos son sintácticamente válidos, la función retorna un arreglo con ambos destinatarios: `[emailAuthLimpio, emailReservaLimpio]`.
   * Si solo uno de los dos es válido, se retorna únicamente el correo válido.
   * Si ambos son inválidos o nulos, se retorna una lista vacía `[]`.

3. **Ejecución en Despacho:**
   En `enviarNotificacionesReserva`, el sistema itera sobre la lista desduplicada, despachando de forma segura y personalizada las notificaciones sin riesgo de duplicar mensajes a la misma casilla de correo.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Cero mensajes duplicados (cero spam) para el usuario final cuando ambos correos coinciden.
  * Cobertura informativa total cuando la reserva involucra a dos partes interesadas distintas (el pagador de la cuenta y el turista asistente).
  * Optimización directa de la cuota mensual de envíos de correo en EmailJS.
  * Función 100% pura y testeable con cobertura exhaustiva de casos límite en `tests/notificaciones.test.js`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Disparo de dos llamadas de correo cuando los emails difieren.*
  * *Mitigación:* Se asume como un requerimiento deseable de negocio para garantizar la comunicación a ambas partes, controlando el consumo mediante el límite de envíos por reserva.

