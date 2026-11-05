# ADR-007: Adopción de Transferencia Bancaria y Comprobante Auditado en Lugar de Pasarela de Pagos Directa

## Estado
Aceptado — Sprint 2 (22 de octubre de 2026) / Transición a Esqueleto 2.0

## Contexto y Planteamiento del Problema
El backlog original de Jira (Esqueleto 1.0) planteaba una integración automatizada de comercio electrónico con pasarelas de pago con tarjeta de crédito/débito (como Stripe, Wompi o Cybersource) para liquidar inmediatamente el valor de los tours turísticos.

Al evaluar la factibilidad operativa y legal con los departamentos administrativo y financiero del MITUR, surgieron barreras infranqueables dentro del horizonte de desarrollo:
1. **Brecha Operativa de Operadores Locales:** Gran parte de los guías comunitarios y micro-operadores turísticos acreditados por el MITUR no disponen de cuentas mercantiles compatibles con pasarelas API directas ni pueden asumir comisiones transaccionales elevadas (3.5% + $0.30 por transacción).
2. **Complejidad Regulatoria y PCI-DSS:** El manejo directo de pasarelas implicaba tiempos prolongados de verificación de personería jurídica gubernamental y cumplimiento normativo de seguridad que excedían el plazo de entrega académica y lanzamiento institucional.

## Decisión de Arquitectura y Justificación
Se decide sustituir la pasarela de pagos automatizada directa por un modelo transaccional asíncrono basado en Transferencia Bancaria Directa a Cuentas Oficiales y Subida de Comprobante de Pago Digital (voucher), auditado mediante una Mesa de Validación Administrativa en el panel de control.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Inclusión financiera total para usuarios nacionales que operan mediante transferencias electrónicas interbancarias (UNI/Transfer365).
  * Desacoplamiento tecnológico respecto a APIs de cobro de terceros, evitando caídas por fallas en procesadores externos de tarjetas de crédito.
  * Control riguroso sobre las credenciales y accesos de los revisores mediante la tabla protegida `admin_users`.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Latencia en la confirmación:* La confirmación no es instantánea; depende del tiempo de respuesta del funcionario que valida el comprobante en la mesa de control.
  * *Mitigación:* Se implementó un temporizador de reserva gobernado por base de datos (`expires_at` a 60 minutos, ADR-017) para garantizar la retención de cupos durante el proceso de transferencia, complementado con alertas automatizadas por correo electrónico (EmailJS, ADR-021) que notifican al turista de inmediato en cuanto su comprobante es aprobado o rechazado.

