import type { CheerFormSubtype, DanceFormSubtype, Order, OrderFormType } from "@/types";
import { parsePackage } from "@/lib/package";
import { titleCase } from "@/lib/data";

export const POM_FORM_COLUMN_LABELS = [
  "School / Program",
  "Address",
  "City",
  "State",
  "ZIP",
  "Country",
  "Division",
  "Coach",
  "Coach Phone",
  "Coach Email",
  "Billing Contact",
  "Billing Email",
  "Choreographer",
  "Choreographer Email",
  "Copies",
  "Package",
  "Requested Editor",
  "Mix Length",
  "Music Affiliate",
  "Power Music Covers",
  "Routine Notes",
  "Voiceovers",
] as const;

export function inferMusicAffiliate(musicTheme: string): string {
  const upper = musicTheme.toUpperCase();
  if (upper.includes("NON COMPLIANT") || upper.includes("NON-COMPLIANT")) {
    return "Non-compliant";
  }
  if (upper.includes("UNLEASH")) return "Unleash the Beats Covers";
  if (upper.includes("PM") || upper.includes("POWER")) return "Power Music Covers";
  return "Power Music Covers";
}

export function buildLegacyPackage(packageType: string, timeLengthOfMix: string): string {
  const pkg = packageType.trim();
  const time = timeLengthOfMix.trim();
  if (!pkg) return "TBD";
  if (!time) return pkg;
  if (pkg.toUpperCase().includes(time.toUpperCase())) return pkg;
  return `${pkg} ${time}`.trim();
}

export function buildLegacyMusicTheme(order: Pick<Order, "routineNotes" | "powerMusicCovers" | "musicAffiliate">): string {
  const parts = [
    order.routineNotes?.trim(),
    order.powerMusicCovers?.trim(),
    order.musicAffiliate ? `(${order.musicAffiliate})` : "",
  ].filter(Boolean);
  return parts.join(" · ") || "";
}

export function inferFormType(raw: Partial<Order>): OrderFormType {
  if (raw.formType) return raw.formType;

  const cat = (raw.category || "").toLowerCase();
  const div = (raw.division || "").toLowerCase();
  const pkg = (raw.packageType || raw.package || "").toLowerCase();

  if (cat.includes("marching") || div.includes("marching")) return "marching-band";
  if (cat.includes("anthem") || pkg.includes("anthem")) return "school-anthem";
  if (cat.includes("sport") || cat.includes("entertainment")) {
    return "sports-entertainment";
  }
  if (
    cat.includes("dance") ||
    div.includes("pom") ||
    div.includes("dance") ||
    pkg.includes("dance")
  ) {
    return "school-all-star-dance";
  }

  return "school-all-star-cheer";
}

export function inferCheerFormSubtype(raw: Partial<Order>): CheerFormSubtype | undefined {
  if (raw.formType && raw.formType !== "school-all-star-cheer") return undefined;
  if (raw.cheerFormSubtype) return raw.cheerFormSubtype;

  const div = (raw.division || "").toLowerCase();
  const cat = (raw.category || "").toLowerCase();
  const notes = (raw.routineNotes || raw.musicTheme || "").toLowerCase();

  if (div.includes("youth") || div.includes("rec") || cat.includes("youth rec")) {
    return "youth-rec-cheer";
  }
  if (
    notes.includes("viroc") ||
    div.includes("school cheer") ||
    cat.includes("school cheer")
  ) {
    if (notes.includes("viroc no") || notes.includes("viroc: no")) {
      return "school-cheer-viroc-no";
    }
    return "school-cheer-viroc-yes";
  }

  return "all-star-cheer";
}

export function inferDanceFormSubtype(raw: Partial<Order>): DanceFormSubtype | undefined {
  if (raw.formType && raw.formType !== "school-all-star-dance") return undefined;
  if (raw.danceFormSubtype) return raw.danceFormSubtype;

  const div = (raw.division || "").toLowerCase();
  const notes = (raw.routineNotes || raw.musicTheme || "").toLowerCase();
  const pkg = (raw.packageType || raw.package || "").toLowerCase();

  if (div.includes("pom") || notes.includes("pom") || pkg.includes("pom")) return "pom";
  if (div.includes("hip hop") || notes.includes("hip hop") || div.includes("hip-hop")) {
    return "hip-hop";
  }
  if (div.includes("gameday") || notes.includes("gameday")) return "gameday";
  if (
    div.includes("jazz") ||
    div.includes("kick") ||
    notes.includes("jazz") ||
    notes.includes("kick")
  ) {
    return "jazz-kick";
  }
  if (
    div.includes("team performance") ||
    div.includes("variety") ||
    notes.includes("team performance") ||
    notes.includes("variety")
  ) {
    return "team-performance-variety";
  }

  return "pom";
}

/** Map legacy spreadsheet-style orders + full POM form payloads into one shape. */
export function normalizeOrder(
  raw: Order & {
    formType?: OrderFormType;
    cheerFormSubtype?: CheerFormSubtype;
    danceFormSubtype?: DanceFormSubtype;
  }
): Order {
  const hasForm = Boolean(raw.schoolProgramName?.trim());

  const programName = raw.programName || raw.schoolProgramName || "";
  const contactName = raw.contactName || raw.customerName || raw.coachName || "";
  const { tier, limit } = parsePackage(raw.package || raw.packageType || "");

  const packageType =
    raw.packageType?.trim() ||
    tier ||
    raw.package?.split(/\d+:\d+/)[0]?.trim() ||
    raw.package ||
    "";

  const timeLengthOfMix =
    raw.timeLengthOfMix?.trim() ||
    (limit !== "-" ? limit : "") ||
    "";

  const musicAffiliate =
    raw.musicAffiliate?.trim() || inferMusicAffiliate(raw.musicTheme || raw.routineNotes || "");

  const routineNotes = raw.routineNotes?.trim() || raw.musicTheme || "";
  const powerMusicCovers = raw.powerMusicCovers?.trim() || "";

  const requestedEditor =
    raw.requestedEditor?.trim() ||
    raw.requestedProducer ||
    raw.editorRequest ||
    "First Available";

  const formType = inferFormType(raw);
  const cheerFormSubtype = inferCheerFormSubtype({ ...raw, formType });
  const danceFormSubtype = inferDanceFormSubtype({ ...raw, formType });

  const program = raw.schoolProgramName?.trim() || programName;
  const splitOrNoSplit =
    raw.splitOrNoSplit?.trim() ||
    (raw.package?.toUpperCase().includes("NO SPLIT")
      ? "No Split"
      : raw.package?.toUpperCase().includes("SPLIT")
        ? "Split"
        : "");
  const songList =
    raw.songListSuggestions?.trim() || powerMusicCovers || raw.musicTheme || "";

  const normalized: Order = {
    ...raw,
    formType,
    cheerFormSubtype,
    danceFormSubtype,
    gymName: raw.gymName?.trim() || (cheerFormSubtype === "all-star-cheer" ? program : ""),
    gymBillingAddress: raw.gymBillingAddress?.trim() || raw.schoolAddress?.trim() || "",
    schoolName: raw.schoolName?.trim() || (cheerFormSubtype?.startsWith("school-cheer") ? program : ""),
    schoolBillingAddress: raw.schoolBillingAddress?.trim() || raw.schoolAddress?.trim() || "",
    teamName: raw.teamName?.trim() || program,
    mascot: raw.mascot?.trim() || "",
    teamCoedAllGirl: raw.teamCoedAllGirl?.trim() || "",
    teamColors: raw.teamColors?.trim() || raw.colors?.trim() || "",
    colors: raw.colors?.trim() || raw.teamColors?.trim() || "",
    billingAddress: raw.billingAddress?.trim() || raw.schoolAddress?.trim() || "",
    splitOrNoSplit,
    virocChoreographerName:
      raw.virocChoreographerName?.trim() ||
      (cheerFormSubtype === "school-cheer-viroc-yes" ? raw.choreographerName?.trim() : "") ||
      "",
    virocChoreographerEmail:
      raw.virocChoreographerEmail?.trim() ||
      (cheerFormSubtype === "school-cheer-viroc-yes" ? raw.choreographerEmail?.trim() : "") ||
      "",
    coachContactFullName: raw.coachContactFullName?.trim() || raw.coachName?.trim() || contactName,
    coachEmailAddress: raw.coachEmailAddress?.trim() || raw.coachEmail?.trim() || "",
    emailAddress: raw.emailAddress?.trim() || raw.billingPersonEmail?.trim() || "",
    sendingEightCountSheets: raw.sendingEightCountSheets?.trim() || "",
    usingEightCountSheets: raw.usingEightCountSheets?.trim() || raw.sendingEightCountSheets?.trim() || "",
    songListSuggestions: songList,
    couponCode: raw.couponCode?.trim() || "",
    howDidYouFindOut: raw.howDidYouFindOut?.trim() || "",
    schoolProgramName: program,
    schoolAddress: raw.schoolAddress?.trim() || "",
    city: raw.city?.trim() || "",
    stateProvince: raw.stateProvince?.trim() || "",
    zipPostalCode: raw.zipPostalCode?.trim() || "",
    country: raw.country?.trim() || "United States",
    division: raw.division?.trim() || raw.category || "",
    coachName: raw.coachName?.trim() || contactName,
    coachPhone: raw.coachPhone?.trim() || "",
    coachEmail: raw.coachEmail?.trim() || "",
    billingPersonName: raw.billingPersonName?.trim() || contactName,
    billingPersonEmail: raw.billingPersonEmail?.trim() || "",
    choreographerName: raw.choreographerName?.trim() || "N/A",
    choreographerEmail: raw.choreographerEmail?.trim() || "N/A",
    numberOfCopies: raw.numberOfCopies?.trim() || "",
    packageType: hasForm ? packageType : packageType || raw.package || "",
    requestedEditor,
    timeLengthOfMix,
    musicAffiliate,
    powerMusicCovers: hasForm ? powerMusicCovers : powerMusicCovers || raw.musicTheme || "",
    routineNotes,
    customVoiceovers: raw.customVoiceovers?.trim() || "No - None",
    programName: raw.schoolProgramName?.trim() || programName,
    contactName: raw.coachName?.trim() || contactName,
    customerName: raw.coachName?.trim() || raw.customerName || contactName,
    category: raw.category || (raw.division?.toLowerCase().includes("pom") ? "Dance" : "Cheer"),
    package: buildLegacyPackage(packageType || raw.package || "", timeLengthOfMix),
    musicTheme: buildLegacyMusicTheme({
      routineNotes,
      powerMusicCovers: hasForm ? powerMusicCovers : raw.musicTheme || "",
      musicAffiliate,
    }),
    requestedProducer: requestedEditor,
    editorRequest:
      raw.editorRequest ||
      (requestedEditor.toLowerCase() === "first available" ? "FA" : requestedEditor),
  };

  return normalized;
}

export function displayText(value: string): string {
  if (!value?.trim()) return "—";
  return titleCase(value);
}

export function displayMultiline(value: string, max = 120): string {
  if (!value?.trim()) return "—";
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return titleCase(cleaned);
  return `${titleCase(cleaned.slice(0, max))}…`;
}
