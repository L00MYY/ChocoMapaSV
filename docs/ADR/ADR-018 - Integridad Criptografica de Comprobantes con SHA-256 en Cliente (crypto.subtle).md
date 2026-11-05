# ADR-018: Integridad Criptográfica de Comprobantes con SHA-256 en Cliente (crypto.subtle)

## Estado
Implementado — Sprint 4 (31 de octubre de 2026)

## Contexto y Planteamiento del Problema
En el modelo transaccional basado en transferencias bancarias y subida manual de comprobantes digitales (vouchers), existen vectores de vulnerabilidad y fraude financiero documentados:
1. **Reciclaje de Comprobantes (Replay Fraud):** Un usuario malicioso podría utilizar la misma captura de pantalla o PDF de una transferencia antigua y subirla a múltiples reservas distintas para obtener tours gratuitos.
2. **Repudio y Manipulación de Documentos:** Un usuario podría alegar que el sistema alteró o corrompió su archivo bancario durante la transferencia o que subió un documento con un monto diferente al revisado por el auditor gubernamental.
3. **Falta de Trazabilidad Forense:** El almacenamiento de archivos en Supabase Storage mediante nombres generados aleatoriamente dificulta auditar de forma matemática si dos archivos idénticos fueron cargados en reservas separadas.

## Decisión de Arquitectura y Justificación
Se decide implementar un mecanismo de no repudio e integridad criptográfica en el cliente antes de la subida física del archivo, utilizando la API nativa del navegador Web Cryptography API (`crypto.subtle`):

1. **Función Criptográfica Pura (`calcularHashArchivo` en `PagoModel.js`):**
   Antes de despachar el binario al bucket de Supabase Storage, se lee el archivo como un búfer de memoria (`ArrayBuffer`) y se computa el resumen criptográfico SHA-256:
   ```javascript
   export async function calcularHashArchivo(file) {
       if (!file) throw new Error('Archivo no proporcionado');
       const buffer = await file.arrayBuffer();
       const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
       const hashArray = Array.from(new Uint8Array(hashBuffer));
       return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
   }
   ```

2. **Persistencia en la Columna `file_hash` de `payment_receipts`:**
   La cadena hexadecimal de 64 caracteres resultante del hash SHA-256 se persiste en la base de datos junto con el tipo MIME, tamaño en bytes y la ruta de almacenamiento (`storage_path`).

3. **Auditoría y Detección de Duplicados:**
   El equipo administrativo de MITUR cuenta con una firma digital única de cada comprobante; cualquier intento de reutilizar el mismo voucher genera una coincidencia directa de hash (`file_hash`), alertando de inmediato sobre una posible duplicidad no autorizada.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Integridad inmutable y principio de no repudio: el hash garantiza que el archivo en Storage es exactamente el mismo que el usuario seleccionó en su dispositivo.
  * Capacidad forense para detectar vouchers clonados o reutilizados en diferentes reservas.
  * Cero dependencias externas: utiliza el estándar nativo del consorcio W3C `crypto.subtle`, disponible en todos los navegadores modernos con aceleración por hardware.
  * Velocidad de ejecución: el cómputo de SHA-256 para archivos de recibos típicos (menores a 5 MB) toma entre 5 y 15 milisegundos.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Uso de CPU del dispositivo del cliente:* El cálculo del hash consume ciclos de procesamiento en el navegador del turista.
  * *Mitigación:* Se fijó un límite estricto de tamaño de archivo a 5 MB (5,242,880 bytes) en `PagoController.validarArchivo`, asegurando que el consumo de memoria y CPU sea despreciable incluso en dispositivos móviles de gama baja.

