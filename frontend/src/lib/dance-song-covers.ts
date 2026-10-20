/**
 * Dance Magento "Power Music Covers" + "Unleash the Beats Covers" share
 * orders.song_list_suggestions as a labeled pack (same SoT as Cheer Song List).
 */

export type DanceSongCovers = {
  power: string;
  unleash: string;
};

const POWER_LABEL = "Power Music Covers:";
const UNLEASH_LABEL = "Unleash the Beats Covers:";

/** Pack both Dance cover boxes into song_list_suggestions. */
export function packDanceSongCovers(
  power: string | null | undefined,
  unleash: string | null | undefined
): string {
  const p = String(power ?? "").trim();
  const u = String(unleash ?? "").trim();
  if (!p && !u) return "";
  return `${POWER_LABEL}\n${p}\n\n${UNLEASH_LABEL}\n${u}`;
}

/** Unpack song_list_suggestions into the two Dance Magento cover boxes. */
export function parseDanceSongCovers(
  raw: string | null | undefined
): DanceSongCovers {
  const text = String(raw ?? "").trim();
  if (!text) return { power: "", unleash: "" };

  const hasPower = /Power Music Covers:/i.test(text);
  const hasUnleash = /Unleash the Beats Covers:/i.test(text);
  if (!hasPower && !hasUnleash) {
    // Plain cheer / anthem / sports song list — not Dance cover boxes.
    return { power: "", unleash: "" };
  }

  const powerMatch = text.match(
    /Power Music Covers:\s*\n?([\s\S]*?)(?=\n\s*Unleash the Beats Covers:|$)/i
  );
  const unleashMatch = text.match(
    /Unleash the Beats Covers:\s*\n?([\s\S]*)$/i
  );

  return {
    power: (powerMatch?.[1] ?? "").trim(),
    unleash: (unleashMatch?.[1] ?? "").trim(),
  };
}

/** True when song_list text is a Dance cover pack (not a plain song list). */
export function isDanceSongCoverPack(raw: string | null | undefined): boolean {
  const text = String(raw ?? "");
  return (
    /Power Music Covers:/i.test(text) || /Unleash the Beats Covers:/i.test(text)
  );
}
