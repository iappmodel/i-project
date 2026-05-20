import { createServiceDbClient } from "../db-client";
import type { DbHandlerDefinition } from "@/types/alphabet/database.types";

export async function findHandlerByNameDb(params: {
  handlerName: string;
  handlerVersion?: string;
}): Promise<DbHandlerDefinition | null> {
  const db = createServiceDbClient();

  let query = db
    .from("handler_definitions")
    .select("*")
    .eq("handler_name", params.handlerName)
    .in("status", ["active", "deprecated"]);

  if (params.handlerVersion) {
    query = query.eq("handler_version", params.handlerVersion);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as DbHandlerDefinition | null;
}

export async function findHandlerDefinitionDb(params: {
  targetSystem: string;
  action: string;
  handlerVersion?: string;
}): Promise<DbHandlerDefinition | null> {
  const db = createServiceDbClient();

  let query = db
    .from("handler_definitions")
    .select("*")
    .eq("target_system", params.targetSystem)
    .eq("action", params.action)
    .in("status", ["active", "deprecated"]);

  if (params.handlerVersion) {
    query = query.eq("handler_version", params.handlerVersion);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as DbHandlerDefinition | null;
}
