import type { Producer } from "@/types";

/** Legacy spreadsheet / order-form codes mapped to current producer initials. */
const LEGACY_PRODUCER_KEYS: Record<string, string> = {
  MATT: "MS",
  NATE: "NC",
  JUSTIN: "JD",
  JUST: "JD",
  MARK: "MM",
  GRIFFIN: "GP",
  GRIF: "GP",
  G: "GP",
  GP: "GP",
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
  ANNE: "AJ",
  LAUREN: "LV",
  RORY: "RF",
  JOHN: "JP",
  MAX: "MT",
  CHRIS: "CC",
  JOE: "JB",
};

export function normalizeProducerKey(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  if (LEGACY_PRODUCER_KEYS[normalized]) return LEGACY_PRODUCER_KEYS[normalized];
  const firstWord = normalized.split(/\s+/)[0];
  if (LEGACY_PRODUCER_KEYS[firstWord]) return LEGACY_PRODUCER_KEYS[firstWord];
  return normalized;
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
