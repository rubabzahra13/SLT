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
    case "musicContactName":
      return { contactName: value };
    // MTD program column = gym/school/org identity — not Team Name.
    case "gymName":
    case "schoolName":
    case "schoolProgramName":
    case "programName":
    case "organizationName":
    case "schoolOrganizationName":
      return { programName: value };
    case "package":
      return { package: value };
    case "packageType":
      // packageType is tier-only; MTD package label is composed separately.
      return {};
    case "timeLengthOfMix":
      return {};
    case "songListSuggestions":
    case "powerMusicCovers":
    case "unleashTheBeatsCovers":
    case "customerSongs": {
      const filled = Boolean(String(value || "").trim());
      return {
        musicTheme: value,
        haveSongs: filled ? "HAVE SONGS" : "NEED SONGS",
      };
    }
    case "routineNotes":
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
    // Board contact ↔ coach_name SoT (Music Contact / Coach form fields).
    orderPatch.contactName = patch.contactName;
    orderPatch.customerName = patch.contactName;
    orderPatch.coachName = patch.contactName;
    orderPatch.coachContactFullName = patch.contactName;
    orderPatch.musicContactName = patch.contactName;
  }
  if (patch.programName !== undefined) {
    // Identity only — school_gym_name; do not overwrite team_name.
    orderPatch.programName = patch.programName;
    orderPatch.schoolName = patch.programName;
    orderPatch.schoolProgramName = patch.programName;
    orderPatch.gymName = patch.programName;
    orderPatch.organizationName = patch.programName;
    orderPatch.schoolOrganizationName = patch.programName;
  }
  if (patch.package !== undefined) {
    orderPatch.package = patch.package;
    orderPatch.packageType = patch.package;
  }
  if (patch.musicTheme !== undefined) {
    // Keep musicTheme on the legacy column only — do not copy into Song list /
    // Routine notes / Power Music Covers (Songs & Notes pills read those fields).
    orderPatch.musicTheme = patch.musicTheme;
  }
  if (patch.price !== undefined) {
    orderPatch.price = patch.price;
  }
  if (patch.priceCompliance !== undefined) {
    orderPatch.priceCompliance = patch.priceCompliance;
  }
  // eightCountSheet → received_eight_count_sheet (HAVE CS / NEED CS).
  // Do not copy onto sendingEightCountSheets (Magento Yes/No send-intent).
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

  if (
    key === "coachName" ||
    key === "coachContactFullName" ||
    key === "musicContactName"
  ) {
    // Single SoT: coach_name (Youth Rec / Music Contact Magento labels).
    patch.coachName = value;
    patch.coachContactFullName = value;
    patch.musicContactName = value;
    patch.contactName = value;
    patch.customerName = value;
  }
  if (key === "coachEmail" || key === "coachEmailAddress") {
    // Single SoT: coach_email (Youth Rec Magento key is coachEmailAddress).
    patch.coachEmail = value;
    patch.coachEmailAddress = value;
  }
  if (key === "choreographerName" || key === "virocChoreographerName") {
    // Single SoT: choreographer_name (V!ROC Magento key is virocChoreographerName).
    patch.choreographerName = value;
    patch.virocChoreographerName = value;
  }
  if (key === "choreographerEmail" || key === "virocChoreographerEmail") {
    // Single SoT: choreographer_email (V!ROC Magento key is virocChoreographerEmail).
    patch.choreographerEmail = value;
    patch.virocChoreographerEmail = value;
  }
  if (key === "requestedEditor" || key === "requestedProducer") {
    // Single SoT: requested_editor (legacy in-memory key is requestedProducer).
    patch.requestedEditor = value;
    patch.requestedProducer = value;
  }
  if (key === "youthRecExtraEmailAddress" || key === "emailAddress") {
    patch.youthRecExtraEmailAddress = value;
    patch.emailAddress = value;
  }
  if (key === "teamName") {
    // Team Name is its own form field — do not also fill program_name.
    patch.teamName = value;
  }
  // Identity fields map 1:1 to the UI/DB column for that form.
  // All Star Cheer has Gym Name (not Program Name) — never write program_name from gym.
  if (
    key === "gymName" ||
    key === "schoolName" ||
    key === "schoolProgramName" ||
    key === "programName" ||
    key === "organizationName" ||
    key === "schoolOrganizationName"
  ) {
    // Single SoT: school_gym_name (Gym / School / Program / Org labels).
    patch.schoolName = value;
    patch.gymName = value;
    patch.schoolProgramName = value;
    patch.programName = value;
    patch.organizationName = value;
    patch.schoolOrganizationName = value;
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
  if (key === "songListSuggestions" && current?.formType !== "school-all-star-dance") {
    // Cheer/other: covers is unused — clear so song text is not mirrored there.
    patch.powerMusicCovers = "";
  }
  if (key === "powerMusicCovers" || key === "unleashTheBeatsCovers") {
    if (current?.formType !== "school-all-star-dance") {
      patch.musicTheme = value;
    }
  }
  // Songs / Notes pills follow form fields: clear manual overrides when edited.
  if (
    key === "songListSuggestions" ||
    key === "powerMusicCovers" ||
    key === "unleashTheBeatsCovers" ||
    key === "customerSongs"
  ) {
    const filled = Boolean(String(value || "").trim());
    patch.haveSongs = filled ? "HAVE SONGS" : "NEED SONGS";
    const prevStates =
      ((current?.collectionStates as Record<string, unknown> | null) ||
        {}) as Record<string, unknown>;
    const nextStates = { ...prevStates };
    delete nextStates.songs;
    patch.collectionStates = nextStates as Order["collectionStates"];
  }
  if (key === "routineNotes" || key === "additionalNotes") {
    const prevStates =
      ((current?.collectionStates as Record<string, unknown> | null) ||
        {}) as Record<string, unknown>;
    const nextStates = { ...prevStates };
    delete nextStates.notes;
    patch.collectionStates = nextStates as Order["collectionStates"];
  }
  if (key === "styleOfGamedayMix") {
    // Persist gameday style on the shared `style` column.
    patch.styleOfGamedayMix = value;
    patch.style = value;
  }
  if (key === "musicContactPhone") {
    patch.musicContactPhone = value;
    patch.coachPhone = value;
  }
  if (key === "musicContactEmail") {
    patch.musicContactEmail = value;
    patch.coachEmail = value;
    patch.coachEmailAddress = value;
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
  if (key === "instrumentationNotes" || key === "instrumentalStylePreference") {
    // Single SoT: instrumentation_notes (School Anthem style + Band notes).
    patch.instrumentationNotes = value;
    patch.instrumentalStylePreference = value;
  }
  if (key === "isRushOrder") {
    const intent = String(value || "").trim().toUpperCase();
    if (intent === "Y" || intent.startsWith("YES")) {
      patch.isRushOrder = "Yes";
    } else if (intent === "N" || intent.startsWith("NO")) {
      patch.isRushOrder = "No";
    }
  }
  if (key === "clientRequestedRushOrder") {
    const intent = String(value || "").trim().toUpperCase();
    if (intent === "Y" || intent.startsWith("YES")) {
      patch.clientRequestedRushOrder = "Yes";
    } else if (intent === "N" || intent.startsWith("NO")) {
      patch.clientRequestedRushOrder = "No";
    } else {
      patch.clientRequestedRushOrder = value;
    }
  }
  if (
    key === "gymBillingAddress" ||
    key === "schoolBillingAddress" ||
    key === "youthRecBillingAddress" ||
    key === "organizationBillingAddress" ||
    key === "schoolGymAddress" ||
    key === "schoolAddress"
  ) {
    // Single SoT: school_gym_billing_address (form labels vary).
    patch.gymBillingAddress = value;
    patch.schoolBillingAddress = value;
    patch.youthRecBillingAddress = value;
    patch.organizationBillingAddress = value;
    patch.schoolGymAddress = value;
    patch.schoolAddress = value;
  }
  if (
    key === "teamColors" ||
    key === "youthRecColors" ||
    key === "schoolProgramColors"
  ) {
    // Single SoT: colors (form labels vary).
    patch.teamColors = value;
    patch.youthRecColors = value;
    patch.schoolProgramColors = value;
  }
  if (key === "sendingEightCountSheets" || key === "usingEightCountSheets") {
    // Single SoT: sending_eight_count_sheets (using is Magento label alias).
    const intent = String(value || "").trim().toUpperCase();
    const normalized =
      intent === "Y" || intent.startsWith("YES")
        ? "Yes"
        : intent === "N" || intent.startsWith("NO")
          ? "No"
          : value;
    patch.sendingEightCountSheets = normalized;
    patch.usingEightCountSheets = normalized;
  }
  if (key === "divisionOfTeam") {
    patch.divisionOfTeam = value;
    patch.division = value;
  }

  return patch;
}
