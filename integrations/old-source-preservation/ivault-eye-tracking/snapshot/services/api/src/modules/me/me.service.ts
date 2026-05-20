import { createUserSupabaseClient } from "../../config/supabase";
import { mapUserHomeSnapshotRow } from "./me.mapper";

export async function getUserHomeSnapshot(accessToken: string, userId: string) {
  const db = createUserSupabaseClient(accessToken);

  const { data, error } = await db
    .from("app_user_home_snapshot")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapUserHomeSnapshotRow(data);
}
