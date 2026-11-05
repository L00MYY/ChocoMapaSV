# ADR-020: Protección de Privacidad Financiera mediante URLs Firmadas Efímeras (TTL 300s)

## Estado
Implementado — Sprint 4 (31 de octubre de 2026)

## Contexto y Planteamiento del Problema
Los comprobantes bancarios cargados por los turistas (vouchers de transferencia de Banco Agrícola, BAC, Cuscatlán o Chivo Wallet) contienen información financiera de alta sensibilidad:
* Nombres y apellidos completos de los cuentahabientes.
* Números de cuenta de origen y destino bancario.
* Saldos parciales, referencias de transferencias interbancarias y sellos digitales.

Si los buckets de Supabase Storage (`payment_receipts` o `receipts`) se configuraran como públicos, cualquier usuario o bot que adivinara o enumerara la ruta URL del archivo (`https://.../storage/v1/object/public/payment_receipts/receipts/res-123.jpg`) tendría acceso irrestricto a los estados de cuenta de la ciudadanía. Esto violaría las leyes de protección de datos personales de El Salvador, las normativas de confidencialidad bancaria y los lineamientos de ciberseguridad del Estado.

## Decisión de Arquitectura y Justificación
Se decide implementar un esquema de aislamiento privado riguroso complementado con URLs Firmadas Efímeras (*Time-Limited Signed URLs*):

1. **Bucket Estrictamente Privado (`public: false`):**
   El bucket `payment_receipts` en Supabase Storage se configura con visibilidad privada absoluta. Las políticas RLS de Storage prohíben la lectura pública anónima o de turistas ajenos.

2. **Generación Bajo Demanda con TTL de 300 Segundos (`obtenerUrlFirmada`):**
   En `AdminPagosModel.obtenerUrlFirmada`, cuando un funcionario administrativo autenticado abre el modal de conciliación de una reserva para inspeccionar el comprobante, el sistema solicita a Supabase una URL temporal criptográficamente firmada con un tiempo de vida (TTL) de exactamente 300 segundos (5 minutos):
   ```javascript
   const { data, error } = await client.storage
       .from(bucket)
       .createSignedUrl(cleanPath, 300);
   ```
   Se incluye además un mecanismo de contingencia (*fallback*) vía petición REST `POST /storage/v1/object/sign/...` con cabeceras de autorización Bearer del token administrativo.

3. **Invalidez Automática tras Expiración:**
   Transcurridos los 5 minutos, la firma HMAC contenida en el token del enlace expira en los servidores de Supabase Storage, devolviendo un código HTTP 403 ante cualquier intento posterior de descarga.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Blindaje integral de la privacidad financiera y bancaria de turistas nacionales e internacionales.
  * Si una URL firmada llega a ser copiada o filtrada accidentalmente, queda inutilizada de forma permanente a los 300 segundos de su creación.
  * Cumplimiento estricto con las directrices de auditoría y protección de datos gubernamentales del MITUR y de la cátedra de ESEN.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Expiración si el auditor demora más de 5 minutos en revisar el documento.*
  * *Mitigación:* En el flujo operativo habitual, la validación de un comprobante toma menos de 30 segundos; no obstante, si el enlace expira, el panel de administración permite volver a hacer clic en "Ver Comprobante", regenerando instantáneamente una nueva firma sin reiniciar el flujo.

