import { supabaseAdmin } from "../../../config/supabase";
import type {
  PopsEventInsert,
  PopsEventRepository as PopsEventRepositoryContract,
  PopsSignalBatchInsert,
  PopsSignalBatchRepository as PopsSignalBatchRepositoryContract
} from "./pops-repository.types";

export class PopsEventRepository implements PopsEventRepositoryContract, PopsSignalBatchRepositoryContract {
  async insertEventsDeduped(events: PopsEventInsert[]): Promise<{ inserted: number; deduped: number }> {
    let inserted = 0;
    let deduped = 0;
    for (const event of events) {
      const exists = await this.hasEventId(event.session_id, event.event_id);
      if (exists) {
        deduped += 1;
        continue;
      }
      await this.insertEvent({
        session_id: event.session_id,
        user_id: event.user_id,
        event_id: event.event_id,
        event_type: event.event_type,
        source: event.source,
        client_timestamp_ms: event.client_timestamp_ms,
        payload: event.payload,
        privacy_flags: event.privacy_flags ?? null
      });
      inserted += 1;
    }
    return { inserted, deduped };
  }

  async getEventsBySession(sessionId: string): Promise<Array<Record<string, unknown>>> {
    return this.getSessionEvents(sessionId);
  }

  async insertSignalBatchDeduped(
    batch: PopsSignalBatchInsert
  ): Promise<{ inserted: boolean; deduped: boolean }> {
    const exists = await this.hasBatchId(batch.session_id, batch.batch_id);
    if (exists) {
      return { inserted: false, deduped: true };
    }
    await this.insertSignalBatch({
      session_id: batch.session_id,
      user_id: batch.user_id,
      batch_id: batch.batch_id,
      client_timestamp_ms: batch.client_timestamp_ms,
      window_start_ms: batch.window_start_ms,
      window_end_ms: batch.window_end_ms,
      raw_payload: batch.signals,
      privacy: batch.privacy ?? null
    });
    return { inserted: true, deduped: false };
  }

  async getSignalBatchesBySession(sessionId: string): Promise<Array<Record<string, unknown>>> {
    return this.getSessionBatches(sessionId);
  }

  async hasEventId(sessionId: string, eventId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("pops_events")
      .select("id")
      .eq("session_id", sessionId)
      .eq("event_id", eventId)
      .limit(1);

    if (error) throw error;
    return (data ?? []).length > 0;
  }

  async insertEvent(row: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from("pops_events").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  async hasBatchId(sessionId: string, batchId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("pops_signal_batches")
      .select("id")
      .eq("session_id", sessionId)
      .eq("batch_id", batchId)
      .limit(1);

    if (error) throw error;
    return (data ?? []).length > 0;
  }

  async insertSignalBatch(row: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from("pops_signal_batches").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  async getSessionEvents(sessionId: string) {
    const { data, error } = await supabaseAdmin
      .from("pops_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("client_timestamp_ms", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getSessionBatches(sessionId: string) {
    const { data, error } = await supabaseAdmin
      .from("pops_signal_batches")
      .select("*")
      .eq("session_id", sessionId)
      .order("client_timestamp_ms", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
}
