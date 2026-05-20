import type { DbHandlerDefinition } from "@/types/alphabet/database.types";
import type { HandlerSchemaContract } from "@/types/alphabet/handler-registry.types";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

/**
 * Maps persisted handler definition schema JSON into the registry contract shape.
 */
export function parseHandlerSchemaContract(def: DbHandlerDefinition): HandlerSchemaContract {
  const raw = def.schema_contract;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      requiredPayloadKeys: [],
      optionalPayloadKeys: [],
      forbiddenPayloadKeys: [],
      requiredResultKeys: [],
      optionalResultKeys: []
    };
  }

  const r = raw as Record<string, unknown>;
  return {
    requiredPayloadKeys: asStringArray(r.requiredPayloadKeys),
    optionalPayloadKeys: asStringArray(r.optionalPayloadKeys),
    forbiddenPayloadKeys: asStringArray(r.forbiddenPayloadKeys),
    requiredResultKeys: asStringArray(r.requiredResultKeys),
    optionalResultKeys: asStringArray(r.optionalResultKeys)
  };
}
