import { z } from "zod";

export const musicianSchema = z
  .object({
    nombre: z.string().min(2, "Mínimo 2 caracteres"),
    apellido: z.string().min(2, "Mínimo 2 caracteres"),
    dni: z.string().regex(/^\d{7,8}$/, "7 u 8 dígitos"),
    cuil: z.string().regex(/^\d{11}$/, "11 dígitos (obligatorio para pago)"),
    mail: z
      .union([z.string().email("Email inválido"), z.literal("")])
      .optional(),
    condicion: z.enum(
      ["Estable", "Contratado", "Refuerzo", "Invitado", "Becario"],
      "Condición inválida"
    ),
    id_instr: z
      .union([z.number(), z.string()])
      .refine(
        (val) => {
          if (val === "" || val === null || val === undefined) return false;
          const n = Number(val);
          return !isNaN(n) && n > 0;
        },
        { message: "Instrumento obligatorio" }
      ),
  })
  .passthrough();
