# ADR-012: Doble Capa de Autorización (Row Level Security en PostgreSQL y Guards de Ruta en Cliente)

## Estado
Implementado — Sprint 3 (26 de octubre de 2026)

## Contexto y Planteamiento del Problema
En una arquitectura web donde el navegador cliente consume directamente la API de Supabase mediante una clave pública anónima (`SUPABASE_ANON_KEY`), existe un riesgo grave de vulnerabilidad de seguridad según el estándar OWASP Top 10 (*Broken Access Control*).

Si la autorización se delegara únicamente a la interfaz de usuario en el frontend mediante verificaciones condicionales en JavaScript ("guards" que ocultan botones o redirigen a `login.html`), cualquier atacante o usuario malicioso podría:
1. Abrir la consola de DevTools del navegador e inspeccionar o alterar variables en memoria.
2. Enviar solicitudes HTTP `fetch` directas a los endpoints de PostgREST modificando el ID de usuario para consultar comprobantes de pago de terceros.
3. Modificar el estado de una reserva o insertar registros en la tabla `admin_users` para adjudicarse privilegios de administrador institucional.

## Decisión de Arquitectura y Justificación
Se adopta el principio fundamental de seguridad de "Defensa en Profundidad" (*Defense in Depth*) mediante una Doble Capa de Autorización estricta:

1. **Capa Perimetral / Ergonomía de Usuario (Guards en Cliente):**
   Implementados en los controladores del frontend (`LoginController`, `PagoController`, `AdminPagosController`, `TourDetalleController`). Verifican en tiempo real el token y la sesión mediante `AuthModel.obtenerSesionActual()` y consultan `AdminPagosModel.verificarRolAdmin()`. Su propósito exclusivo es la experiencia de usuario (UX): redirigir amigablemente a `login.html` o presentar modales informativos sin generar parpadeos visuales en pantalla.

2. **Capa Inquebrantable de Seguridad (Row Level Security - RLS en PostgreSQL):**
   La verdadera barrera de protección y cumplimiento normativo reside en el motor de base de datos. Se habilita RLS obligatorio en todas las tablas sensibles del esquema:
   * `tour_reservations`: Políticas que restringen las consultas de lectura y actualización para que coincidan estrictamente con `auth.uid() = tourist_id`, excepto para usuarios con rol activo en `admin_users`.
   * `payment_receipts`: Solo el creador de la reserva o un administrador pueden acceder a los metadatos del comprobante.
   * `admin_users`: Tabla blindada donde solo los administradores confirmados pueden leer la lista de personal autorizado.
   * `ratings`: Solo permite insertar calificaciones si el usuario autenticado cumple las políticas de elegibilidad de visita confirmada.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Seguridad robusta e incorruptible: incluso si el código JavaScript del cliente fuese completamente comprometido o alterado, la base de datos rechaza cualquier acceso no autorizado.
  * Auditoría centralizada: las reglas de acceso se gestionan declarativamente en el catálogo del sistema gestor de base de datos relacional.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Complejidad de depuración en desarrollo:* Peticiones que parecen válidas en cliente pueden fallar silenciosamente en PostgreSQL si la política RLS no contempla un caso límite.
  * *Mitigación:* Se diseñaron scripts de verificación de políticas y pruebas automatizadas rigurosas que validan el comportamiento tanto para turistas autenticados como para administradores y usuarios anónimos.

