ADR-001: Adopción del patrón arquitectónico MVC en ChocoMap
Estado
Aceptado

Fecha
20 de octubre de 2026

# Contexto
Ademas, al inicio del proyecto, el código en Vanilla JS se organizaba de forma monolítica por ejemplo, el archivo lugares-turisticos.js contenía en un solo lugar: La lógica de conexión y peticiones fetch a la base de datos en Supabase, el manejo del estado (filtros activos, término de búsqueda), la manipulación del DOM (creación de tarjetas y estados de carga), la captura de eventos.El equipo de desarrollo de ChocoMapSv no cuenta con el tiempo de desarrollo para planificar una estructura o completa de arquitectura de desarrollo. 

# Decisión
Se decide implementar el patrón de arquitectura MVC (Modelo-Vista-Controlador) adaptado a Vanilla JS utilizando ES Modules (import/export).

La estructura del código se dividirá estrictamente en las siguientes carpetas dentro de js/:

models/: Única capa autorizada para comunicarse con Supabase y aplicar reglas de negocio.

views/: Única capa autorizada para manipular el DOM y renderizar HTML.

controllers/: Capa intermedia que captura eventos, orquesta el flujo y comunica Modelo con Vista.

utils/: Funciones puras y reutilizables como la normalización de textos o renderizacion del footer o navbar.

# Consecuencias
+ Positivas

Estructura comprensible y ampliamente documentada, lo que reduce la curva de aprendizaje.

Separación de responsabilidades clara entre lógica de negocio, presentación y control de flujo.

Testabilidad de los modelos sin depender de la UI.

Facilidad para evolucionar hacia capas adicionales (servicios/repositorios) si la complejidad crece.

Menor tiempo para desarrollo de funcionalides, debido a la simplicidad de construccion que ofrece la arquitectura.

- Negativas

Riesgo de controladores "gordos" si no se disciplina la delegación de lógica al modelo.

Acoplamiento vista–controlador puede dificultar migrar a una SPA mas adelante

No apto para equipos muy grandes con múltiples dominios independientes