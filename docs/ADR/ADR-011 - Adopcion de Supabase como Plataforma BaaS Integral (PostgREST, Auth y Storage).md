# ADR-011: Adopción de Supabase como Plataforma BaaS Integral (PostgREST, Auth y Storage)

## Estado
Aceptado — Sprint 1 (20 de octubre de 2026)

## Contexto y Planteamiento del Problema
ChocoMapaSV requería una infraestructura de datos completa capaz de soportar:
1. Almacenamiento y consultas relacionales de lugares turísticos, categorías, departamentos, fechas de tours, reservas y calificaciones.
2. Gestión de identidades, registro de turistas, inicio de sesión seguro y control de sesiones mediante tokens criptográficos (JWT).
3. Repositorio de almacenamiento masivo de objetos (*object storage*) para fotografías de destinos y comprobantes bancarios confidenciales (vouchers).

Implementar un servidor backend tradicional (Node.js/Express, Python/FastAPI o Java/Spring Boot) conllevaba aprovisionar servidores virtuales, configurar certificados SSL, mantener un motor PostgreSQL dedicado, implementar endpoints CRUD repetitivos, orquestar políticas de parches de seguridad y gestionar la infraestructura. Esta sobrecarga operativa superaba los plazos del proyecto y desviaba el foco de la solución turística.

## Decisión de Arquitectura y Justificación
Se decide adoptar Supabase como plataforma integral de Backend-as-a-Service (BaaS), aprovechando sus tres componentes fundamentales:

1. **PostgREST (Motor de Datos Declarativo):**
   Exposición inmediata de la base de datos PostgreSQL. Las consultas relacionales complejas, filtros (`eq`, `in`, `gte`), ordenamientos y mutaciones (`POST`, `PATCH`, `DELETE`) se efectúan de forma declarativa directamente desde la capa `models/`.
2. **GoTrue (Módulo de Autenticación):**
   Manejo de ciclo de vida de usuarios (`auth.users`), hashing seguro de contraseñas con bcrypt, emisión de tokens JWT y persistencia en sesión.
3. **Supabase Storage (Almacenamiento de Archivos):**
   Buckets especializados (`payment_receipts` y `place-images`) con soporte para subida de binarios mediante SDK cliente y generación de URLs firmadas efímeras.
4. **Motor PostgreSQL Nativo Subyacente:**
   A diferencia de soluciones NoSQL (como Firebase Firestore), Supabase provee integridad referencial real (claves foráneas, restricciones `CHECK`, índices B-Tree y triggers), vital para garantizar la consistencia financiera de las reservas del MITUR.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Reducción drástica del *Time-to-Market*: eliminación del 100% del código *boilerplate* de controladores de backend CRUD.
  * Base de datos relacional estándar de clase industrial (PostgreSQL 15+).
  * Cero costos de mantenimiento de servidores o parches de infraestructura durante el ciclo de vida del proyecto.
  * Escalabilidad elástica y disponibilidad garantizada en la nube.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Acoplamiento a la API propietaria de Supabase / PostgREST:* Si en el futuro se requiriera migrar a un backend propio, las llamadas REST deberían adaptarse.
  * *Mitigación:* Se confinaron estrictamente todas las interacciones con Supabase dentro de los archivos de `js/models/` (`LugaresModel.js`, `ToursModel.js`, `PagoModel.js`, `AuthModel.js`). Las vistas y controladores jamás invocan directamente a Supabase, permitiendo sustituir el proveedor de datos sin alterar la interfaz de usuario ni los controladores.

