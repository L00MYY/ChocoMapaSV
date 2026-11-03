ADR-005: Ofuscación (Base64) de variables de entorno en el cliente
Estado: Aceptado

Fecha: 27 de Octubre de 2026


Contexto
En la arquitectura actual de Frontend Puro (Vanilla JS) desplegada en Vercel, el navegador requiere de las variables MAPBOX_TOKEN, SUPABASE_URL y SUPABASE_ANON_KEY para comunicarse con los servicios externos. El script de construcción (build-config.js) generaba el archivo config.js exponiendo estas variables en texto plano.

Aunque técnicamente la llave de Supabase es pública (protegida por RLS) y la de Mapbox está restringida por dominio, se emitió una observación de auditoría de seguridad visual: no se permite que las llaves sean legibles en texto plano al inspeccionar el código fuente del navegador. El equipo no cuenta con el alcance en el Sprint actual para reestructurar la arquitectura e implementar una capa Backend For Frontend (BFF / API Routes), y se debe mantener intacto el patrón MVC implementado en el ADR-001.

Decisión
Se decide implementar una medida de ofuscación visual mediante la codificación en Base64 de las variables de entorno durante la etapa de build, y su posterior decodificación en memoria en el lado del cliente.

La implementación se dividirá de la siguiente manera:

Build (scripts/build-config.js): Las variables se codifican usando Buffer.from(valor).toString('base64') y se exportan con el sufijo _B64 en el archivo config.js generado.

Consumo (js/models/ y js/views/): Los archivos que consumen estas variables (AuthModel.js, SupabaseClient.js, ToursModel.js, MisToursModel.js, LugarDetalleModel.js y los controladores de Mapbox) importan las variables _B64 y las decodifican inmediatamente en memoria usando atob().

Consecuencias
Positivas

Cumplimiento del requisito de auditoría visual: El código fuente visible en el navegador ya no muestra las llaves en texto plano, superando la inspección.

Cero impacto arquitectónico: No se modificó el patrón MVC, no se añadieron nuevas capas de red ni servidores adicionales.

Cero fricción en el Sprint: La implementación es rápida, aislada al script de build y no altera la lógica de negocio existente ni las peticiones fetch actuales.

Mantenimiento de la seguridad real: Las políticas RLS en Supabase y las restricciones de dominio en Mapbox siguen siendo la verdadera barrera de protección.

Negativas

Falsa sensación de seguridad: Base64 es una codificación, no un cifrado. Un atacante con conocimientos básicos puede decodificar las llaves en milisegundos si intercepta el tráfico.

Sobrecarga de mantenimiento: Cada vez que se agregue una nueva variable de entorno pública al proyecto, deberá ser codificada en el script de build y decodificada manualmente en su respectivo archivo consumidor.

Deuda técnica registrada: Se requerirá planificar en un futuro Sprint la implementación de un BFF (Backend For Frontend) para eliminar por completo la necesidad de enviar cualquier llave (incluso ofuscada) al cliente.

Alternativas Consideradas y Descartadas
Backend For Frontend (Vercel API Routes): Solución arquitectónicamente correcta y segura (las llaves nunca viajan al cliente). Descartada por estar fuera del alcance del Sprint actual.

Dejar las llaves en texto plano y educar al stakeholder: Explicar que las claves publishable son públicas por diseño. Descartada por directiva de la Decana.

Encriptación Real (AES/RSA): Inviable en frontend puro, ya que el cliente necesitaría la llave de desencriptación para leer las variables, exponiendo el proceso de todos modos.