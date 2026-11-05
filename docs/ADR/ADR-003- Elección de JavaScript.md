# ADR 0003 · Elección de JavaScript como lenguaje de programación

Estado: Aceptada · 20 de octubre de 2026

## Contexto
El equipo cuenta con poco conocimiento en cuanto a variedad de tecnologías y especializaciones técnicas. Sin embargo, el proyecto exige de forma crítica un frontend dinámico (que carga los registros de una base de datos), y un backend que permita manejar la lógica de la bd.

## Decisión
Se elige JavaScript como el único lenguaje de programación para el desarrollo del proyecto. Mantendremos esta vía tecnológica de forma estricta y a propósito para garantizar estabilidad y continuidad en el código. No cambiaremos de lenguaje de programación a mitad del proyecto.

## Consecuencias
+ Evita alteraciones críticas o la necesidad de migrar el código a mitad del ciclo de desarrollo.
- El equipo queda limitado a los recursos y ecosistema de una sola tecnología.
- Puede restringir la integración nativa con herramientas o componentes ajenos al entorno de JavaScript.
- JavaScript vive en el navegador, por lo que es más vulnerable.