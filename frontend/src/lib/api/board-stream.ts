import { subscribeLiveStream } from "./live-stream";
import type { MTDRecord, Order } from "@/types";

export type BoardStreamEvent =
  | { type: "ready"; ok?: boolean; reconnect?: boolean }
  | { type: "order.updated"; order: Order }
  | { type: "order.deleted"; id: string }
  | { type: "mtd.updated"; record: MTDRecord };

/**
 * Board events from the tab's shared studio stream (no extra connection).
 *
 * Contract for boards (1-admin / low concurrency):
 * - Live row patches arrive as order.updated / mtd.updated / order.deleted
 * - ready with reconnect=true means the stream dropped and came back —
 *   callers should do one background board reload (safety net), not poll.
 *
 * Resolves when `signal` aborts.
 */
export function subscribeBoardStream(
  onEvent: (event: BoardStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const unsubscribe = subscribeLiveStream((event) => {
      if (event.type === "ready") {
        onEvent({ type: "ready", ok: true, reconnect: event.reconnect });
        return;
      }
      if (
        event.type === "order.updated" ||
        event.type === "order.deleted" ||
        event.type === "mtd.updated"
      ) {
        onEvent(event);
      }
    });
    signal?.addEventListener(
      "abort",
      () => {
        unsubscribe();
        resolve();
      },
      { once: true }
    );
  });
}
