export type EightCsItemState = "none" | "have" | "need";

export type EightCsState = {
  cs: EightCsItemState;
  video: EightCsItemState;
  form: EightCsItemState;
  mix: EightCsItemState;
};

export type EightCsItemKey = keyof EightCsState;

export type SongsStatus = "have" | "need" | "no";

const EIGHT_CS_ITEM_LABELS: Record<EightCsItemKey, string> = {
  form: "ORDER FORM",
  cs: "CS",
  video: "VIDEO",
  mix: "MIX",
};

const EMPTY_EIGHT_CS_STATE: EightCsState = {
  cs: "none",
  video: "none",
  form: "none",
  mix: "none",
};

function joinEightCsParts(prefix: "HAVE" | "NEED", parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return `${prefix} ${parts[0]}`;
  if (parts.length === 2) return `${prefix} ${parts[0]} & ${parts[1]}`;
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(", ");
  return `${prefix} ${rest}, & ${last}`;
}

function detectItems(clause: string): EightCsItemKey[] {
  const upper = clause.toUpperCase();
  const items: EightCsItemKey[] = [];
  if (upper.includes("ORDER FORM")) items.push("form");
  if (/\bCS\b/.test(upper)) items.push("cs");
  if (upper.includes("VIDEO")) items.push("video");
  if (/\bMIX\b/.test(upper)) items.push("mix");
  return items;
}

export function parseEightCsState(value: string): EightCsState {
  const trimmed = value.trim();
  if (!trimmed) return { ...EMPTY_EIGHT_CS_STATE };

  const state: EightCsState = { ...EMPTY_EIGHT_CS_STATE };
  const clauses = trimmed.split(/,\s*(?=HAVE|NEED)/i);

  for (const clause of clauses) {
    const upper = clause.trim().toUpperCase();
    const kind: EightCsItemState | null = upper.startsWith("NEED")
      ? "need"
      : upper.startsWith("HAVE")
        ? "have"
        : null;
    if (!kind) continue;

    for (const item of detectItems(upper)) {
      state[item] = kind;
    }
  }

  return state;
}

export function encodeEightCsState(state: EightCsState): string {
  const haveParts: string[] = [];
  const needParts: string[] = [];

  (Object.keys(EIGHT_CS_ITEM_LABELS) as EightCsItemKey[]).forEach((key) => {
    const label = EIGHT_CS_ITEM_LABELS[key];
    if (state[key] === "have") haveParts.push(label);
    if (state[key] === "need") needParts.push(label);
  });

  const segments = [
    joinEightCsParts("HAVE", haveParts),
    joinEightCsParts("NEED", needParts),
  ].filter(Boolean);

  return segments.join(", ");
}

export function cycleEightCsItem(
  state: EightCsState,
  id: EightCsItemKey
): EightCsState {
  const cycle: EightCsItemState[] = ["none", "have", "need"];
  const next = cycle[(cycle.indexOf(state[id]) + 1) % cycle.length];
  return { ...state, [id]: next };
}

export type SongsState = {
  songs: EightCsItemState;
  notes: EightCsItemState;
};

export type SongsItemKey = keyof SongsState;

const EMPTY_SONGS_STATE: SongsState = {
  songs: "none",
  notes: "none",
};

const SONGS_ITEM_LABELS: Record<SongsItemKey, string> = {
  songs: "SONGS",
  notes: "NOTES",
};

function detectSongItems(clause: string): SongsItemKey[] {
  const upper = clause.toUpperCase();
  const items: SongsItemKey[] = [];
  if (upper.includes("SONGS")) items.push("songs");
  if (upper.includes("NOTES")) items.push("notes");
  return items;
}

export function parseSongsState(value: string): SongsState {
  const trimmed = value.trim();
  if (!trimmed) return { ...EMPTY_SONGS_STATE };

  const upper = trimmed.toUpperCase();
  if (upper === "NO") return { ...EMPTY_SONGS_STATE };
  if (upper === "HAVE") return { songs: "have", notes: "none" };

  const state: SongsState = { ...EMPTY_SONGS_STATE };
  const clauses = trimmed.split(/,\s*(?=HAVE|NEED)/i);

  for (const clause of clauses) {
    const clauseUpper = clause.trim().toUpperCase();
    const kind: EightCsItemState | null = clauseUpper.startsWith("NEED")
      ? "need"
      : clauseUpper.startsWith("HAVE")
        ? "have"
        : null;
    if (!kind) continue;

    for (const item of detectSongItems(clauseUpper)) {
      state[item] = kind;
    }
  }

  return state;
}

export function encodeSongsState(state: SongsState): string {
  if (state.songs === "none" && state.notes === "none") return "NO";
  if (state.songs === "have" && state.notes === "none") return "HAVE";

  const haveParts: string[] = [];
  const needParts: string[] = [];

  (Object.keys(SONGS_ITEM_LABELS) as SongsItemKey[]).forEach((key) => {
    const label = SONGS_ITEM_LABELS[key];
    if (state[key] === "have") haveParts.push(label);
    if (state[key] === "need") needParts.push(label);
  });

  const segments = [
    joinEightCsParts("HAVE", haveParts),
    joinEightCsParts("NEED", needParts),
  ].filter(Boolean);

  return segments.join(", ");
}

export function cycleSongsItem(state: SongsState, id: SongsItemKey): SongsState {
  const cycle: EightCsItemState[] = ["none", "have", "need"];
  const next = cycle[(cycle.indexOf(state[id]) + 1) % cycle.length];
  return { ...state, [id]: next };
}

/** @deprecated Use parseEightCsState */
export function parseEightCsFlags(value: string) {
  const state = parseEightCsState(value);
  return {
    cs: state.cs !== "none",
    video: state.video !== "none",
    form: state.form !== "none",
    mix: state.mix !== "none",
  };
}

/** @deprecated Use encodeEightCsState */
export function encodeEightCs(
  flags: { cs: boolean; video: boolean; form: boolean; mix: boolean },
  current: string
): string {
  const state = parseEightCsState(current);
  return encodeEightCsState({
    cs: flags.cs ? (state.cs === "need" ? "need" : "have") : "none",
    video: flags.video ? (state.video === "need" ? "need" : "have") : "none",
    form: flags.form ? (state.form === "need" ? "need" : "have") : "none",
    mix: flags.mix ? (state.mix === "need" ? "need" : "have") : "none",
  });
}

export function parseSongsFlags(value: string): SongsStatus {
  const state = parseSongsState(value);
  if (state.songs === "none" && state.notes === "none") return "no";
  if (state.songs === "need" || state.notes === "need") return "need";
  return "have";
}

export function encodeSongs(status: SongsStatus): string {
  if (status === "have") return "HAVE";
  if (status === "no") return "NO";
  return "NEED SONGS";
}
