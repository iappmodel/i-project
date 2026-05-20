import { z } from "zod";

export const uuidSchema = z.string().uuid();

export function parseUuid(value: unknown, fieldName: string): string {
  return uuidSchema.parse(value, {
    path: [fieldName]
  });
}
