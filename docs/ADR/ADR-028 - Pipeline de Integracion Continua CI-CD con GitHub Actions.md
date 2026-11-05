# ADR-028: Pipeline de Integración Continua y Despliegue Continuo (CI/CD) con GitHub Actions

## Estado
Implementado — Sprint 3 (25 de octubre de 2026) / ADR ratificado en vísperas de sprint 4

## Contexto y Planteamiento del Problema
En el desarrollo colaborativo de ChocoMapaSV, con múltiples ramas de trabajo por cada historia de usuario y corrección de defectos de Jira, existía el riesgo latente de introducir regresiones de software silenciosas a producción:
1. Errores de sintaxis JavaScript derivados de fusiones (*merge conflicts*) o incompatibilidades entre sintaxis CommonJS y ES Modules.
2. Alteraciones accidentales en contratos de datos que rompieran el cálculo de aforo, las reglas de complejidad de contraseñas o el algoritmo de elegibilidad de calificaciones (*Verified Visitor*).
3. Despliegues automáticos a Vercel con código defectuoso si el hook de Git no contaba con barreras de control de calidad (*Quality Gates*).

## Opciones Consideradas
1. **Despliegues Manuales Locales por CLI:**
   * *Ventajas:* Control individual del desarrollador al ejecutar `vercel deploy`.
   * *Desventajas:* Falta total de gobernanza, alta probabilidad de error humano (olvidar correr pruebas antes de subir a producción), y ausencia de trazabilidad centralizada de auditoría para la cátedra de la ESEN.
2. **Integración Nativa Básica de Vercel para GitHub (sin CI previo):**
   * *Ventajas:* Despliegue automático con cada push a la rama `main`.
   * *Desventajas:* Vercel solo evalúa que el script de build (`build-config.cjs`) termine exitosamente; no ejecuta la suite de pruebas unitarias de Node.js ni la verificación de sintaxis de todos los archivos del repositorio, permitiendo que código con errores lógicos se publique en producción.
3. **Pipeline Automatizado de CI/CD con GitHub Actions (`.github/workflows/ci.yml`):**
   * *Ventajas:* Definición formal como código (IaC/YAML), ejecución de Quality Gates estrictos en máquinas virtuales estandarizadas de Ubuntu, paralelización de tareas y bloqueo automático del despliegue a Vercel si un solo test o verificación de sintaxis falla.

## Decisión de Arquitectura y Justificación
Se decide implementar un pipeline formal de Integración y Despliegue Continuo (CI/CD) mediante **GitHub Actions** en el archivo `.github/workflows/ci.yml`, estructurado en dos trabajos (*jobs*) desacoplados y secuenciales:

1. **Trabajo 1: Verificación de Calidad y Pruebas Unitarias (`test`):**
   * Se ejecuta en todo evento de `push` y `pull_request` sobre la rama `main`.
   * Aprovisiona un entorno limpio con `ubuntu-latest` y `node-version: 20`.
   * **Gate 1 - Verificación Sintáctica Estricta:** Ejecuta `npm run check:syntax`, validando que los 49 archivos JavaScript del proyecto no contengan errores de sintaxis o referencias inválidas.
   * **Gate 2 - Suite de Pruebas Unitarias:** Ejecuta `npm test` (`node --test`), evaluando las 185 pruebas automatizadas que cubren autenticación, validación de formularios, aforo, calificaciones, fechas y auditoría de notificaciones.

2. **Trabajo 2: Despliegue Automatizado a Vercel (`deploy`):**
   * Depende estrictamente del éxito del trabajo previo (`needs: test`).
   * Se activa exclusivamente si el evento proviene de la rama productiva oficial (`if: github.ref == 'refs/heads/main'`).
   * Descarga el código validado, instala la CLI oficial de Vercel y ejecuta `vercel --prod --token=${{ secrets.VERCEL_TOKEN }} --yes` utilizando variables de entorno y secretos seguros (`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).

## Consecuencias
* **Impacto Positivo (Beneficios):**
  * Tasa de cero regresiones en producción: es físicamente imposible que un commit con pruebas fallidas o errores sintácticos llegue al sitio productivo del MITUR.
  * Trazabilidad y auditoría total: cada commit y pull request cuenta con su registro público de ejecución e historial de pruebas en la pestaña de Actions de GitHub.
  * Automatización sin fricción: el equipo se concentra exclusivamente en programar; el despliegue a producción se orquesta de forma transparente y determinista en menos de 90 segundos.
  * Cumplimiento con las mejores prácticas de la ingeniería de software exigidas en la rúbrica académica de la ESEN.

* **Impacto Negativo y Mitigaciones (Trade-offs / Deuda técnica asumida):**
  * *Consumo de minutos de cómputo en GitHub Actions.*
  * *Mitigación:* Al prescindir de empaquetadores pesados (ADR-010) y utilizar el test runner nativo de Node.js (ADR-025), la ejecución completa del pipeline toma menos de 45 segundos, consumiendo una fracción mínima de la cuota mensual gratuita de GitHub.

