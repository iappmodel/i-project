import { z } from "zod";

export const paginationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  cursor: z.string().min(1).max(2048).optional()
});
