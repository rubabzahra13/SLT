export type EightCsFlags = {
  cs: boolean;
  video: boolean;
  form: boolean;
};

export type SongsFlags = {
  songs: boolean;
  mix: boolean;
};

export function parseEightCsFlags(value: string): EightCsFlags {
  const upper = value.toUpperCase();
  return {
    cs: upper.includes("CS"),
    video: upper.includes("VIDEO"),
    form: upper.includes("ORDER FORM"),
  };
}

export function encodeEightCs(flags: EightCsFlags, current: string): string {
  const need = current.toUpperCase().startsWith("NEED");

  if (flags.form && flags.video) {
    return "NEED ORDER FORM, CS, & VIDEO";
  }
  if (flags.form) {
    return "NEED ORDER FORM & CS";
  }
  if (flags.video && flags.cs) {
    return need ? "NEED CS & VIDEO" : "HAVE CS & VIDEO";
  }
  if (flags.cs) {
    return need ? "NEED CS" : "HAVE CS";
  }
  return need ? "NEED CS" : "HAVE CS";
}

export function parseSongsFlags(value: string): SongsFlags {
  const upper = value.toUpperCase().trim();
  if (upper === "NEED SONGS") {
    return { songs: false, mix: false };
  }
  if (upper === "HAVE MIX") {
    return { songs: false, mix: true };
  }
  if (upper === "HAVE") {
    return { songs: true, mix: false };
  }
  return {
    songs: upper.includes("HAVE") && !upper.includes("NEED SONGS"),
    mix: upper.includes("MIX"),
  };
}

export function encodeSongs(flags: SongsFlags): string {
  if (flags.mix) return "HAVE MIX";
  if (flags.songs) return "HAVE";
  return "NEED SONGS";
}
