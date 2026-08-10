import { z } from 'zod';

const positiveNumber = z.coerce
  .number({ invalid_type_error: 'Debe ser un número' })
  .min(1, 'El número debe ser mayor o igual a 1');

const nonEmptyString = z
  .string({ invalid_type_error: 'Debe ser un texto' })
  .min(1, 'El valor no puede estar vacío');

const validDate = z.coerce.date({ 
  invalid_type_error: "Debe ser una fecha válida" 
});

export { positiveNumber, nonEmptyString, validDate }