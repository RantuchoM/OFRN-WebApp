import { z } from "zod";

/**
 * Solo nombre y apellido determinan si el botón "Crear Ficha" está habilitado.
 * El resto de campos se aceptan tal cual (passthrough) y se normalizan en handleCreateInitial.
 */
export const musicianSchema = z
  .object({
    nombre: z.string().min(2, "Mínimo 2 caracteres"),
    apellido: z.string().min(2, "Mínimo 2 caracteres"),
  })
  .passthrough();
