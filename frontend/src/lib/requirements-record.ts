import { findLinkedOrder } from "@/lib/editor-assignment";
import { resolveFinalMatchedOrder } from "@/lib/order-form-missing";
import { mergeOrderFormFieldsForRequirements } from "@/lib/order-requirements";
import { isRecentLocalOrderWrite } from "@/lib/orders-board-cache";
import type { MTDRecord, Order } from "@/types";

/**
 * Magento-wins requirements view for board pills + Missing/Complete badge.
 * During a local Songs/Notes write, keep board-row field values so empty
 * Magento peers cannot flip pills green→red or leave the badge on Missing.
 */
export function resolveRequirementsRecord(
  record: Order | MTDRecord,
  lookupOrders: Order[]
): Order | MTDRecord {
  const linked = findLinkedOrder(record as MTDRecord, lookupOrders);
  const finalized = linked
    ? resolveFinalMatchedOrder(linked, lookupOrders)
    : null;
  const merged = mergeOrderFormFieldsForRequirements(record, finalized);
  const recent =
    isRecentLocalOrderWrite(record as Order) ||
    (linked != null && isRecentLocalOrderWrite(linked));
  if (!recent) return merged;

  const board = record as Order;
  const base = merged as Order;
  return {
    ...merged,
    routineNotes: board.routineNotes ?? base.routineNotes,
    additionalNotes: board.additionalNotes ?? base.additionalNotes,
    lyricalNotes: board.lyricalNotes ?? base.lyricalNotes,
    songListSuggestions:
      board.songListSuggestions ?? base.songListSuggestions,
    powerMusicCovers: board.powerMusicCovers ?? base.powerMusicCovers,
    unleashTheBeatsCovers:
      board.unleashTheBeatsCovers ?? base.unleashTheBeatsCovers,
    customerSongs: board.customerSongs ?? base.customerSongs,
    instrumentationNotes:
      board.instrumentationNotes ?? base.instrumentationNotes,
    instrumentalStylePreference:
      board.instrumentalStylePreference ?? base.instrumentalStylePreference,
    musicTheme: board.musicTheme ?? base.musicTheme,
    haveSongs: board.haveSongs ?? base.haveSongs ?? "",
    collectionStates: board.collectionStates ?? base.collectionStates,
    timeLengthOfMix:
      board.timeLengthOfMix !== undefined && board.timeLengthOfMix !== null
        ? board.timeLengthOfMix
        : base.timeLengthOfMix,
  } as Order | MTDRecord;
}
