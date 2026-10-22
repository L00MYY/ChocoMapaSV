# ADR 0004 · Deuda tecnica - Mantener el catálogo demo (TOURS_DEMO) dentro de ToursModel.js  

Estado: aceptada el 22 de octubre de 2026

## Contexto
Para tener visibles en las Reviews de los sprints 1 a 3, js/models/ToursModel.js incluye TOURS_DEMO, un arreglo de unas 215 líneas y funciones de presentación, que según ADR-001 deberían estar en la vista o en utils. Separarlo bien costaría 1 hora (tiempo que no tenemos dadas las tareas del sprint 4 y la refactorización en LugarDetalleView.js y Mapa.js). 

## Decisión
Aceptamos cargar esta deuda durante el sprint 4 y la semana de estabilización: Tours y Demo y las funciones de formato se quedan en ToursModel.js. No agregamos más datos demo ni más funciones de presentación ahí. 

## Consecuencias
Negativas: ToursModel.js(550 líneas) sigue mezclando datos, acceso a Supabase y formato, contra lo que dice ADR-001: agregar un tour demo implica editar código, el modelo es más difícil de probar sin la interfaz. 
Positivas: la hora se usa en deuda que sí cobra intereses (calificaciones inventadas y pruebas). Se revisa cuando la base de datos de Supabase sea la única fuente de tours.* 