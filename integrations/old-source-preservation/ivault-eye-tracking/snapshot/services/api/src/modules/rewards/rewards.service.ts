import { createUserSupabaseClient } from "../../config/supabase";
import { decodeCursor, encodeCursor } from "../../shared/cursor";
import { mapRewardHistoryRow } from "./rewards.mapper";

export async function getRewardHistory(
  accessToken: string,
  userId: string,
  limit = 50,
  cursor?: string
) {
  const db = createUserSupabaseClient(accessToken);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const fetchLimit = safeLimit + 1;

  let query = db
    .from("app_reward_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("reward_id", { ascending: false })
    .limit(fetchLimit);

  if (cursor) {
    const decoded = decodeCursor(cursor);

    query = query.or(
      [
        `created_at.lt.${decoded.timestamp}`,
        `and(created_at.eq.${decoded.timestamp},reward_id.lt.${decoded.id})`
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, safeLimit);
  const hasNextPage = rows.length > safeLimit;
  const last = pageRows[pageRows.length - 1];

  return {
    items: pageRows.map(mapRewardHistoryRow),
    nextCursor:
      hasNextPage && last
        ? encodeCursor({
            timestamp: String(last.created_at),
            id: String(last.reward_id)
          })
        : null
  };
}
