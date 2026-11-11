import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import {
  normalizeProducerKey,
  producerAssignmentKey,
} from "@/lib/producer-keys";
import type { PayrollAddon, Producer } from "@/types";

export type VoiceoverProducerGroup = {
  key: string;
  name: string;
  producer?: Producer;
  rows: PayrollAddon[];
  total: number;
};

/**
 * Group voiceover add-ons by the producer who recorded them (payment recipient).
 * Original producer is ignored — it is context only and must not split groups.
 */
export function groupVoiceoversByProducer(
  voiceovers: PayrollAddon[],
  producers: Producer[]
): VoiceoverProducerGroup[] {
  const groups: VoiceoverProducerGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const addon of voiceovers) {
    const producer = addon.producerId
      ? producers.find((item) => item.id === addon.producerId) ??
        findProducerByAssignmentKey(addon.producerInitials, producers)
      : addon.producerInitials
        ? findProducerByAssignmentKey(addon.producerInitials, producers)
        : undefined;
    const raw = (addon.producerInitials || "").trim();
    const key =
      !producer && !raw
        ? "__unassigned__"
        : producer
          ? producerAssignmentKey(producer)
          : normalizeProducerKey(raw);
    const name = producer?.name?.trim() || raw || "Unassigned";
    let idx = indexByKey.get(key);
    if (idx === undefined) {
      idx = groups.length;
      indexByKey.set(key, idx);
      groups.push({ key, name, producer, rows: [], total: 0 });
    }
    groups[idx].rows.push(addon);
    groups[idx].total += Number(addon.amount) || 0;
  }

  const assigned = groups.filter((group) => group.key !== "__unassigned__");
  const unassigned = groups.filter((group) => group.key === "__unassigned__");
  assigned.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
  return [...assigned, ...unassigned];
}
