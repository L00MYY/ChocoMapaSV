# ADR-021: Descarte de Webhooks n8n en Favor de Integración Directa con EmailJS REST API (JUL-64, JUL-65)

## Estado
Aceptado y Superado — Vísperas de Sprint 4 (1 de noviembre de 2026) / Historias de Jira JUL-64, JUL-65

## Contexto y Planteamiento del Problema
En el diseño arquitectónico inicial del sistema de notificaciones por correo electrónico (Jira JUL-64), se concibió una infraestructura basada en webhooks que disparaban flujos de automatización en una instancia externa de n8n (plataforma de integración workflow low-code). n8n recibía el payload JSON de la reserva y se encargaba de formatear y enviar el correo vía SMTP.

Durante la fase de integración y pruebas de carga surgieron problemas arquitectónicos críticos:
1. **Punto Único de Falla (SPOF) y Dependencia de Infraestructura:** Mantener n8n requería alojar un servidor VPS dedicado o configurar túneles locales inestables (como ngrok o localtunnel) durante el desarrollo, que fallaban frecuentemente por desconexión o reinicio de URLs.
2. **Sobrecarga de Mantenimiento:** Para la evaluación académica y el mantenimiento del MITUR, exigir un clúster de n8n activo 24/7 incrementaba la complejidad del despliegue sin aportar valor técnico diferencial.

## Decisión de Arquitectura y Justificación
Se decide descartar formalmente la arquitectura basada en webhooks de n8n (Jira JUL-65) y migrar a una Integración Directa y Liviana con la API REST de EmailJS:

1. **Despacho Directo mediante REST API (`enviarEmailReal` en `NotificacionesModel.js`):**
   Las notificaciones de confirmación y rechazo se envían directamente a través del endpoint oficial `POST https://api.emailjs.com/api/v1.0/email/send`, utilizando `fetch` nativo con cabeceras `Content-Type: application/json`.

2. **Seguridad y Parámetros Ofuscados en `config.js`:**
   Los identificadores del servicio, plantilla y llave pública (`service_id`, `template_id`, `user_id`) se inyectan en tiempo de compilación ofuscados en Base64 (`EMAILJS_SERVICE_ID_B64`, `EMAILJS_TEMPLATE_ID_B64`, `EMAILJS_PUBLIC_KEY_B64`), decodificándose en memoria en el cliente según lo pautado en el ADR-005.

3. **Manejo Síncrono de Excepciones y Trazabilidad:**
   Al ser una llamada directa, el modelo captura inmediatamente el estado HTTP de respuesta (200 OK vs errores 400/500), permitiendo al panel administrativo mostrar feedback en tiempo real al funcionario y registrar el resultado de forma determinista.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Eliminación total de infraestructura intermedia (servidores VPS, bases de datos auxiliares de n8n y túneles).
  * Reducción drástica del tiempo de entrega del correo a menos de 1 segundo.
  * Captura inmediata de errores de comunicación directamente en el flujo del controlador.
  * Despliegue estático autónomo en Vercel sin dependencias externas de backend.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Límite de cuota mensual gratuita de EmailJS (200 envíos/mes).*
  * *Mitigación:* Se diseñó `NotificacionesModel` con un contrato de interfaz desacoplado (`enviarNotificacionesReserva`), lo que permite conmutar a futuro hacia otro proveedor transaccional (Resend, SendGrid, Amazon SES) modificando únicamente la función de despacho sin tocar los controladores ni las vistas.

