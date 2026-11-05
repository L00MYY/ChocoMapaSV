# ADR-033: Estrategia de Resiliencia con Fallback Offline DESTINOS_RESPALDO en Portada

## Estado
Implementado — Sprint 4 (29 de octubre de 2026)

## Contexto y Planteamiento del Problema
La página principal o portada (`index.html`) de ChocoMapaSV constituye el primer punto de contacto e imagen institucional del Ministerio de Turismo ante la ciudadanía y los turistas internacionales. En ella se exhiben el Buscador Predictivo del Hero, el Bento Grid interactivo de categorías turísticas, el carrusel de paquetes guiados oficiales y la sección de destinos mejor valorados.

En aplicaciones web que dependen exclusivamente de servicios en la nube (Backend-as-a-Service en Supabase):
1. Fluctuaciones en la conectividad del usuario móvil (zonas rurales o de baja cobertura en El Salvador), latencias transitorias de red o pausas de mantenimiento de la base de datos pueden provocar que las solicitudes `fetch` fallen por timeout o retornen códigos de error HTTP.
2. Si la aplicación carece de resiliencia, la portada renderiza contenedores vacíos, spinners infinitos o pantallas de error rotas, transmitiendo una imagen de inestabilidad ministerial y frustrando la navegación del turista.

## Opciones Consideradas
1. **Mostrar Pantallas o Banners de Error ("Fallo de Conexión"):**
   * *Ventajas:* Informa al usuario sobre la interrupción técnica.
   * *Desventajas:* Experiencia de usuario altamente negativa. La primera impresión del turista es un sistema inaccesible, bloqueando cualquier interacción en la portada.
2. **Depender Exclusivamente de Service Workers y Cache API (PWA Offline):**
   * *Ventajas:* Cacheo a nivel de navegador para visitas recurrentes.
   * *Desventajas:* No resuelve el problema del primer acceso (*cold start*): si un usuario entra por primera vez y la red titubea, el Service Worker aún no está instalado ni tiene datos cacheados. Requiere además mantenimiento de políticas de invalidación complejas.
3. **Estrategia de Degradación Elegante (*Graceful Degradation*) con Catálogo Embebido de Respaldo (`DESTINOS_RESPALDO`):**
   * *Ventajas:* Garantiza que la portada **siempre** muestre contenido institucional verificado, imágenes en alta resolución, enlaces interactivos y calificaciones válidas, sin importar el estado de la conexión a Supabase ni si es la primera visita del usuario.

## Decisión de Arquitectura y Justificación
Se decide implementar un patrón de **Resiliencia y Degradación Elegante** en `js/controllers/InicioController.js`, sustentado en:

1. **Colección Inmutable de Respaldo (`DESTINOS_RESPALDO`):**
   Un arreglo estático embebido en código con los destinos turísticos emblemáticos certificados por el MITUR (BINAES, Volcán de Santa Ana / Ilamatepec, Surf City - Playa El Tunco, Parque Arqueológico Tazumal, Suchitoto Colonial, Laguna de Apastepeque), con coordenadas, descripciones, categorías oficiales y calificaciones verificadas.

2. **Resolución Concurrente Resiliente con `Promise.allSettled`:**
   En el método `init()` de `InicioController.js`, las consultas de lugares y tours se ejecutan en paralelo:
   ```javascript
   const [lugaresResult, toursResult] = await Promise.allSettled([
       obtenerLugaresTuristicos(),
       obtenerToursActivos()
   ]);

   // Procesar Lugares con Fallback Automático
   let lugares = [];
   if (lugaresResult.status === 'fulfilled' && Array.isArray(lugaresResult.value) && lugaresResult.value.length > 0) {
       lugares = lugaresResult.value;
   } else {
       console.warn('Conexión con Supabase no disponible o catálogo vacío. Activando DESTINOS_RESPALDO de contingencia.');
       lugares = DESTINOS_RESPALDO;
   }
   ```

3. **Operatividad Continua del Buscador y Bento Grid:**
   Al poblar `lugaresDisponibles` con `DESTINOS_RESPALDO`, el buscador predictivo del Hero y las tarjetas del Bento Grid continúan respondiendo de inmediato a las búsquedas del usuario en modo offline/contingencia.

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Disponibilidad percibida del 100%: la portada de ChocoMapaSV jamás se presenta en blanco o rota, manteniendo una imagen institucional impecable.
  * Resiliencia total ante caídas de red, problemas de DNS o cuotas de Supabase.
  * Cero latencia en situaciones de degradación: el catálogo embebido se renderiza al instante en memoria.
  * Funcionalidad completa del buscador predictivo incluso sin conexión activa.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Riesgo de mostrar información desactualizada si cambian datos en Supabase mientras opera el fallback.*
  * *Mitigación:* `DESTINOS_RESPALDO` actúa estrictamente como contingencia de última línea; tan pronto como la conexión con Supabase se restablece, el sistema prioriza los datos dinámicos de la base de datos relacional.

