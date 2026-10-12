import type { MTDRecord, Order } from "@/types";
import { parsePackage } from "@/lib/package";

/** MTD patches when an order form field changes. */
export function mtdPatchFromOrderField(
  key: string,
  value: string
): Partial<MTDRecord> {
  switch (key) {
    case "coachName":
    case "contactName":
    case "customerName":
    case "coachContactFullName":
      return { contactName: value };
    case "teamName":
    case "programName":
      return { programName: value };
    case "package":
      return { package: value };
    case "packageType":
      // packageType is tier-only; MTD package label is composed separately.
      return {};
    case "timeLengthOfMix":
      return {};
    case "songListSuggestions":
    case "routineNotes":
    case "powerMusicCovers":
    case "musicTheme":
      return { musicTheme: value };
    case "sendingEightCountSheets":
    case "usingEightCountSheets": {
      // Form Yes/No is send-intent on the order (applicability). Do not treat
      // Yes as collected. Clear MTD CS only when customer said No.
      const intent = String(value || "").trim().toUpperCase();
      if (intent === "NO" || intent === "N" || intent.startsWith("NO")) {
        return { eightCountSheet: "" };
      }
      return {};
    }
    case "division":
      return { section: value };
    default:
      return {};
  }
}

/** Order patches when spreadsheet / MTD fields change. */
export function orderPatchFromMTD(
  patch: Partial<MTDRecord>
): Partial<Order> {
  const orderPatch: Partial<Order> = {};

  if (patch.contactName !== undefined) {
    orderPatch.contactName = patch.contactName;
    orderPatch.customerName = patch.contactName;
    orderPatch.coachName = patch.contactName;
    orderPatch.coachContactFullName = patch.contactName;
  }
  if (patch.programName !== undefined) {
    orderPatch.programName = patch.programName;
    orderPatch.teamName = patch.programName;
    orderPatch.schoolProgramName = patch.programName;
  }
  if (patch.package !== undefined) {
    orderPatch.package = patch.package;
    orderPatch.packageType = patch.package;
  }
  if (patch.musicTheme !== undefined) {
    orderPatch.musicTheme = patch.musicTheme;
    orderPatch.songListSuggestions = patch.musicTheme;
    orderPatch.routineNotes = patch.musicTheme;
    orderPatch.powerMusicCovers = patch.musicTheme;
  }
  if (patch.price !== undefined) {
    orderPatch.price = patch.price;
  }
  if (patch.priceCompliance !== undefined) {
    orderPatch.priceCompliance = patch.priceCompliance;
  }
  // eightCountSheet is collection status (HAVE CS / NEED CS). Do not copy onto
  // sendingEightCountSheets — that field is the form Yes/No send-intent.
  if (patch.section !== undefined) {
    orderPatch.division = patch.section;
  }

  return orderPatch;
}

function composePackageLabel(tierOrPackage: string, mixLength?: string): string {
  const raw = tierOrPackage.trim();
  if (!raw) return mixLength?.trim() || "";
  const parsed = parsePackage(raw);
  const tier =
    parsed.tier && parsed.tier !== "-"
      ? parsed.tier
      : raw.replace(/\s+\d+:\d{2}\b/g, "").replace(/\s+TBD\b/i, "").trim();
  const length = (mixLength || "").trim();
  if (tier && length && length !== "-") return `${tier} ${length}`;
  return tier || raw;
}

export function orderPatchFromOrderField(
  key: string,
  value: string,
  current?: Order | null
): Partial<Order> {
  const patch: Partial<Order> = { [key]: value } as Partial<Order>;

  if (key === "coachName" || key === "coachContactFullName") {
    patch.contactName = value;
    patch.customerName = value;
  }
  if (key === "teamName") {
    patch.programName = value;
    patch.schoolProgramName = value;
  }
  // Category identity fields (Program column / form↔manual match key).
  if (
    key === "gymName" ||
    key === "schoolName" ||
    key === "schoolProgramName" ||
    key === "programName"
  ) {
    patch.programName = value;
    if (key === "gymName") patch.gymName = value;
    if (key === "schoolName") patch.schoolName = value;
    if (key === "schoolProgramName" || key === "gymName" || key === "schoolName") {
      patch.schoolProgramName = value;
    }
  }
  if (key === "packageType") {
    const parsed = parsePackage(value);
    const tier =
      parsed.tier && parsed.tier !== "-"
        ? parsed.tier
        : value.replace(/\s+\d+:\d{2}\b/g, "").replace(/\s+TBD\b/i, "").trim();
    // Store package type as tier only; mix length is a separate field.
    patch.packageType = tier;
    // Cheer packages compose tier + mix length; other forms keep package flat.
    if (current?.formType === "school-all-star-cheer") {
      patch.package = composePackageLabel(tier, current?.timeLengthOfMix);
    } else {
      patch.package = tier;
    }
  }
  if (key === "timeLengthOfMix") {
    // Only cheer mix length rewrites the composed package label.
    if (current?.formType === "school-all-star-cheer") {
      const packageSource = current?.packageType || current?.package || "";
      if (packageSource.trim()) {
        const parsed = parsePackage(packageSource);
        const tier =
          parsed.tier && parsed.tier !== "-"
            ? parsed.tier
            : packageSource.trim();
        patch.packageType = tier;
        patch.package = composePackageLabel(tier, value);
      }
    }
  }
  if (key === "songListSuggestions" || key === "routineNotes") {
    // Cheer song list / notes feed the legacy musicTheme column.
    // Dance keeps Power Music Covers and Unleash boxes separate.
    if (current?.formType !== "school-all-star-dance") {
      patch.musicTheme = value;
    }
  }
  if (key === "powerMusicCovers") {
    if (current?.formType !== "school-all-star-dance") {
      patch.musicTheme = value;
    }
  }
  if (key === "styleOfGamedayMix") {
    // Persist gameday style on the shared `style` column.
    patch.styleOfGamedayMix = value;
    patch.style = value;
  }
  if (key === "organizationName") {
    patch.organizationName = value;
    patch.schoolProgramName = value;
    patch.programName = value;
  }
  if (key === "musicContactName") {
    patch.musicContactName = value;
    patch.coachName = value;
    patch.contactName = value;
    patch.customerName = value;
  }
  if (key === "musicContactPhone") {
    patch.musicContactPhone = value;
    patch.coachPhone = value;
  }
  if (key === "musicContactEmail") {
    patch.musicContactEmail = value;
    patch.coachEmail = value;
  }
  if (key === "billingContactName") {
    patch.billingContactName = value;
    patch.billingPersonName = value;
  }
  if (key === "billingContactEmail") {
    patch.billingContactEmail = value;
    patch.billingPersonEmail = value;
  }
  if (key === "customerSongs") {
    patch.customerSongs = value;
    patch.songListSuggestions = value;
  }
  if (key === "additionalNotes") {
    patch.additionalNotes = value;
    patch.routineNotes = value;
  }
  if (key === "isRushOrder") {
    const intent = String(value || "").trim().toUpperCase();
    if (intent === "Y" || intent.startsWith("YES")) {
      patch.isRushOrder = "Yes";
    } else if (intent === "N" || intent.startsWith("NO")) {
      patch.isRushOrder = "No";
    }
  }
  if (key === "schoolOrganizationName") {
    patch.schoolOrganizationName = value;
    patch.schoolProgramName = value;
    patch.programName = value;
  }
  if (key === "schoolBillingAddress") {
    patch.schoolBillingAddress = value;
    patch.schoolAddress = value;
  }
  if (key === "schoolProgramColors") {
    patch.schoolProgramColors = value;
    patch.colors = value;
    patch.teamColors = value;
  }
  if (key === "sendingEightCountSheets" || key === "usingEightCountSheets") {
    const intent = String(value || "").trim().toUpperCase();
    if (intent === "Y" || intent.startsWith("YES")) {
      patch[key] = "Yes";
    } else if (intent === "N" || intent.startsWith("NO")) {
      patch[key] = "No";
    }
  }

  return patch;
}
