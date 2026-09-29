Backend diseñado con fines formativos para profundizar en JavaScript, arquitectura de middlewares, autenticación basada en tokens (JWT) y persistencia de datos con MySQL. Este servicio servirá como API REST para consumir desde una aplicación frontend.

### Refactorización en curso
- **Validación centralizada con Zod:** Para evitar la duplicación de lógica y mejorar la legibilidad y mantenimiento del código, se implementó un middleware de validación agnóstico que procesa y valida las entradas de cada endpoint a partir de esquemas tipados con Zod.
- **Constantes de dominio centralizadas (`dbConstants.js`):** Definición de valores permitidos a nivel de aplicación (estados, tipos de torneo, roles). Esto permite sincronizar las validaciones de Zod con los tipos esperados en MySQL, garantizando una única fuente de verdad y evitando escrituras inconsistentes.
