import type { Producer } from "@/types";

/** Legacy spreadsheet / order-form codes mapped to current producer initials. */
const LEGACY_PRODUCER_KEYS: Record<string, string> = {
  MATT: "MS",
  NATE: "NC",
  JUSTIN: "JD",
  JUST: "JD",
  MARK: "MM",
  GRIFFIN: "G",
  GRIF: "G",
  JOSH: "JM",
  JOEL: "JOP",
  BRENT: "BV",
  BREN: "BV",
  RILEY: "R",
  RILE: "R",
  STEVE: "SS",
  STEV: "SS",
  CASEY: "CM",
  CM: "CM",
};

export function normalizeProducerKey(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  return LEGACY_PRODUCER_KEYS[normalized] ?? normalized;
}

export function producerKeysMatch(assigned: string, key: string): boolean {
  return normalizeProducerKey(assigned) === normalizeProducerKey(key);
}

/** Assignment key used in MTD (initials / uppercase name). */
export function producerAssignmentKey(producer: Producer): string {
  const initials = producer.initials?.trim().toUpperCase();
  if (initials) return initials;
  return producer.name.trim().toUpperCase();
}
