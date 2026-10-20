# ADR 0002 · Elección de Vercel

Estado: Aceptada · 20 de octubre de 2026

## Contexto
El equipo ya tenía experiencia con Vercel. Conectarlo al repositorio de GitHub permitió automatizar el despliegue, y por el límite de presupuesto resultó una alternativa económica en su versión gratuita.

## Decisión
Cada push a main se despliega automáticamente en Vercel. No hacemos despliegues manuales.

## Consecuencias
+ Cada cambio queda en línea en minutos, así se puede revisar el avance real en cada sprint.
+ Menos trabajo operativo: el equipo se dedica a construir funcionalidades, no a desplegar.
− Dependemos de Vercel y de los límites de su plan gratuito. Si el proyecto crece, podríamos tener que migrar o pagar.
− Un error que llegue a main se publica de inmediato. Exige revisar los pull requests antes de integrar.