export type ParsedMusicTheme = {
  music: string;
  /** Trailing initials from theme, e.g. "CM" from "(CM)" */
  chosenInitials: string;
};

/** Split "SONGS FOR CHEER EDITORS CHOICE (CM)" into music + initials. */
export function parseMusicTheme(theme: string): ParsedMusicTheme {
  const value = theme.trim();
  if (!value) return { music: "-", chosenInitials: "-" };

  // "(CM)" or broken "CM)" / "(CM"
  const parenMatch = value.match(/\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return {
      music: value.slice(0, parenMatch.index).trim() || "-",
      chosenInitials: parenMatch[1].trim() || "-",
    };
  }

  const brokenClose = value.match(/\s+([A-Z]{1,6})\)\s*$/i);
  if (brokenClose) {
    return {
      music: value.slice(0, brokenClose.index).trim() || "-",
      chosenInitials: brokenClose[1].trim().toUpperCase(),
    };
  }

  return { music: value, chosenInitials: "-" };
}
