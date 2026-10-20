import { getOrderFormColumns } from "@/components/orders/order-columns";
import { displayMultiline, displayText, normalizeOrder } from "@/lib/order-form";
import { parsePackage } from "@/lib/package";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import { getFormSongListColumnText } from "@/lib/order-requirements";
import type { MTDRecord, Order } from "@/types";
import type { OrderDetailField } from "@/lib/order-detail-sections";

/**
 * First defined alias wins — including explicit "".
 * Prevents cleared inputs from snapping back via sibling `||` fallbacks.
 */
export function coalesceFieldAliases(
  ...vals: Array<string | null | undefined>
): string {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    return String(v);
  }
  return "";
}

const FIELD_GETTERS: Record<string, (order: Order) => string | undefined> = {
  schoolProgramName: (o) =>
    coalesceFieldAliases(
      o.schoolProgramName,
      o.schoolName,
      o.gymName,
      o.schoolOrganizationName,
      o.organizationName,
      o.programName
    ),
  schoolAddress: (o) =>
    coalesceFieldAliases(
      o.schoolAddress,
      o.schoolGymAddress,
      o.gymBillingAddress,
      o.schoolBillingAddress,
      o.youthRecBillingAddress,
      o.organizationBillingAddress
    ),
  gymName: (o) =>
    coalesceFieldAliases(
      o.gymName,
      o.schoolName,
      o.schoolProgramName,
      o.schoolOrganizationName,
      o.organizationName,
      o.programName
    ),
  gymBillingAddress: (o) =>
    coalesceFieldAliases(
      o.gymBillingAddress,
      o.schoolBillingAddress,
      o.schoolGymAddress,
      o.schoolAddress
    ),
  schoolName: (o) =>
    coalesceFieldAliases(
      o.schoolName,
      o.gymName,
      o.schoolProgramName,
      o.schoolOrganizationName,
      o.organizationName,
      o.programName
    ),
  schoolBillingAddress: (o) =>
    coalesceFieldAliases(
      o.schoolBillingAddress,
      o.gymBillingAddress,
      o.schoolGymAddress,
      o.schoolAddress
    ),
  youthRecBillingAddress: (o) =>
    coalesceFieldAliases(
      o.youthRecBillingAddress,
      o.schoolBillingAddress,
      o.gymBillingAddress,
      o.schoolAddress
    ),
  organizationBillingAddress: (o) =>
    coalesceFieldAliases(
      o.organizationBillingAddress,
      o.schoolBillingAddress,
      o.gymBillingAddress,
      o.schoolAddress
    ),
  city: (o) => o.city,
  stateProvince: (o) => o.stateProvince,
  zipPostalCode: (o) => o.zipPostalCode,
  country: (o) => o.country,
  // Team name is its own column — never fall back to gym/school identity.
  teamName: (o) => coalesceFieldAliases(o.teamName),
  programName: (o) =>
    coalesceFieldAliases(
      o.schoolName,
      o.gymName,
      o.schoolProgramName,
      o.schoolOrganizationName,
      o.organizationName,
      o.programName
    ),
  mascot: (o) => coalesceFieldAliases(o.mascot),
  division: (o) => o.division,
  teamCoedAllGirl: (o) => coalesceFieldAliases(o.teamCoedAllGirl),
  teamColors: (o) =>
    coalesceFieldAliases(o.teamColors, o.youthRecColors, o.schoolProgramColors),
  youthRecColors: (o) =>
    coalesceFieldAliases(o.youthRecColors, o.teamColors, o.schoolProgramColors),
  schoolProgramColors: (o) =>
    coalesceFieldAliases(o.schoolProgramColors, o.teamColors, o.youthRecColors),
  numberOfCopies: (o) => o.numberOfCopies,
  coachName: (o) =>
    coalesceFieldAliases(o.coachName, o.coachContactFullName, o.musicContactName),
  coachContactFullName: (o) =>
    coalesceFieldAliases(o.coachContactFullName, o.coachName, o.musicContactName),
  coachPhone: (o) => coalesceFieldAliases(o.coachPhone, o.musicContactPhone),
  coachEmail: (o) =>
    coalesceFieldAliases(o.coachEmail, o.coachEmailAddress, o.musicContactEmail),
  coachEmailAddress: (o) =>
    coalesceFieldAliases(o.coachEmailAddress, o.coachEmail, o.musicContactEmail),
  youthRecExtraEmailAddress: (o) =>
    coalesceFieldAliases(
      o.youthRecExtraEmailAddress,
      o.emailAddress,
      o.billingPersonEmail,
      o.billingContactEmail
    ),
  emailAddress: (o) =>
    coalesceFieldAliases(
      o.emailAddress,
      o.youthRecExtraEmailAddress,
      o.billingPersonEmail,
      o.billingContactEmail
    ),
  billingPersonName: (o) =>
    coalesceFieldAliases(o.billingPersonName, o.billingContactName),
  billingPersonEmail: (o) =>
    coalesceFieldAliases(
      o.billingPersonEmail,
      o.billingContactEmail,
      o.youthRecExtraEmailAddress,
      o.emailAddress
    ),
  choreographerName: (o) =>
    coalesceFieldAliases(o.choreographerName, o.virocChoreographerName),
  choreographerEmail: (o) =>
    coalesceFieldAliases(o.choreographerEmail, o.virocChoreographerEmail),
  virocChoreographerName: (o) =>
    coalesceFieldAliases(o.virocChoreographerName, o.choreographerName),
  virocChoreographerEmail: (o) =>
    coalesceFieldAliases(o.virocChoreographerEmail, o.choreographerEmail),
  packageType: (o) => o.packageType,
  requestedEditor: (o) =>
    coalesceFieldAliases(o.requestedEditor, o.requestedProducer),
  timeLengthOfMix: (o) => o.timeLengthOfMix,
  splitOrNoSplit: (o) => coalesceFieldAliases(o.splitOrNoSplit),
  musicAffiliate: (o) => o.musicAffiliate,
  sendingEightCountSheets: (o) =>
    coalesceFieldAliases(o.sendingEightCountSheets, o.usingEightCountSheets),
  usingEightCountSheets: (o) =>
    coalesceFieldAliases(o.sendingEightCountSheets, o.usingEightCountSheets),
  // Prefer own column so clear sticks; Anthem/MB instrumentation aliases share SoT.
  songListSuggestions: (o) =>
    coalesceFieldAliases(
      o.songListSuggestions,
      o.instrumentationNotes,
      o.instrumentalStylePreference,
      getFormSongListColumnText(o)
    ),
  powerMusicCovers: (o) => {
    const direct = String(o.powerMusicCovers || "").trim();
    if (direct) return direct;
    // Lazy parse to avoid circular import with dance-song-covers at module init.
    const packed = String(o.songListSuggestions || "").trim();
    if (!/Power Music Covers:/i.test(packed)) return "";
    const m = packed.match(
      /Power Music Covers:\s*\n?([\s\S]*?)(?=\n\s*Unleash the Beats Covers:|$)/i
    );
    return (m?.[1] ?? "").trim();
  },
  unleashTheBeatsCovers: (o) => {
    const direct = String(o.unleashTheBeatsCovers || "").trim();
    if (direct) return direct;
    const packed = String(o.songListSuggestions || "").trim();
    if (!/Unleash the Beats Covers:/i.test(packed)) return "";
    const m = packed.match(/Unleash the Beats Covers:\s*\n?([\s\S]*)$/i);
    return (m?.[1] ?? "").trim();
  },
  routineNotes: (o) =>
    coalesceFieldAliases(o.routineNotes, o.lyricalNotes, o.additionalNotes),
  couponCode: (o) => coalesceFieldAliases(o.couponCode),
  customVoiceovers: (o) => o.customVoiceovers,
  schoolGymAddress: (o) =>
    coalesceFieldAliases(
      o.schoolGymAddress,
      o.schoolAddress,
      o.gymBillingAddress,
      o.schoolBillingAddress
    ),
  divisionOfTeam: (o) => coalesceFieldAliases(o.divisionOfTeam, o.division),
  style: (o) => o.style,
  styleOfGamedayMix: (o) => coalesceFieldAliases(o.styleOfGamedayMix, o.style),
  licensingRequired: (o) => o.licensingRequired,
  voiceoverScript: (o) => o.voiceoverScript,
  pronunciationGuidance: (o) => o.pronunciationGuidance,
  organizationName: (o) =>
    coalesceFieldAliases(
      o.organizationName,
      o.schoolOrganizationName,
      o.schoolName,
      o.gymName,
      o.schoolProgramName,
      o.programName
    ),
  schoolOrganizationName: (o) =>
    coalesceFieldAliases(
      o.schoolOrganizationName,
      o.organizationName,
      o.schoolName,
      o.gymName,
      o.schoolProgramName,
      o.programName
    ),
  musicContactName: (o) =>
    coalesceFieldAliases(o.musicContactName, o.coachName, o.coachContactFullName),
  musicContactPhone: (o) =>
    coalesceFieldAliases(o.musicContactPhone, o.coachPhone),
  musicContactEmail: (o) =>
    coalesceFieldAliases(o.musicContactEmail, o.coachEmail, o.coachEmailAddress),
  billingContactName: (o) =>
    coalesceFieldAliases(o.billingContactName, o.billingPersonName),
  billingContactEmail: (o) =>
    coalesceFieldAliases(o.billingContactEmail, o.billingPersonEmail),
  isRushOrder: (o) => {
    const val = o.isRushOrder;
    if (val === undefined || val === null) return "";
    return String(val);
  },
  clientRequestedRushOrder: (o) => {
    const val = o.clientRequestedRushOrder;
    if (val === undefined || val === null) return "";
    return String(val);
  },
  mixEndDate: (o) => coalesceFieldAliases(o.mixEndDate),
  clientRequestedMixDueDate: (o) =>
    coalesceFieldAliases(o.clientRequestedMixDueDate),
  customerSongs: (o) =>
    coalesceFieldAliases(o.customerSongs, o.songListSuggestions),
  additionalNotes: (o) =>
    coalesceFieldAliases(o.additionalNotes, o.routineNotes),
  instrumentationNotes: (o) =>
    coalesceFieldAliases(
      o.instrumentationNotes,
      o.instrumentalStylePreference,
      o.songListSuggestions
    ),
  instrumentalStylePreference: (o) =>
    coalesceFieldAliases(
      o.instrumentalStylePreference,
      o.instrumentationNotes,
      o.songListSuggestions
    ),
  lyricalNotes: (o) =>
    coalesceFieldAliases(o.lyricalNotes, o.routineNotes, o.additionalNotes),
  nicknames: (o) => coalesceFieldAliases(o.nicknames),
  vocalsPreference: (o) => coalesceFieldAliases(o.vocalsPreference),
};

export function rawFieldValue(order: Order, key: string): string {
  const getter = FIELD_GETTERS[key];
  if (getter) {
    const value = getter(order);
    if (value === undefined || value === null) return "";
    return String(value);
  }
  const direct = order[key as keyof Order];
  if (direct === null || direct === undefined) return "";
  return String(direct);
}

export function getOrderDetailFields(order: Order): OrderDetailField[] {
  const columns = getOrderFormColumns(order);

  return columns
    .map((col) => {
      const raw = rawFieldValue(order, col.key);
      const multiline = col.nowrap === false;
      return {
        key: col.key,
        label: col.header,
        value: multiline ? displayMultiline(raw, 500) : displayText(raw),
        multiline,
      };
    })
    .filter((field) => field.value !== "—");
}

function enrichOrderFromMTD(rec: {
  package: string;
  musicTheme: string;
  editorRequest: string;
  contactName: string;
  programName: string;
  category: string;
  section?: string;
  eightCountSheet?: string;
  haveSongs?: string;
}): Partial<Order> {
  const { limit } = parsePackage(rec.package);
  return {
    packageType: rec.package,
    timeLengthOfMix: limit !== "-" ? limit : "",
    teamName: rec.programName,
    gymName: rec.programName.split(" — ")[0]?.trim() || rec.programName,
    requestedEditor:
      rec.editorRequest === "FA" ? "First Available" : String(rec.editorRequest),
    musicTheme: rec.musicTheme,
    musicAffiliate: "Power Music Covers",
    division: rec.section || rec.category,
  };
}

export function orderFromMTDRecord(
  rec: MTDRecord,
  linked?: Order | null,
  orderById?: Map<string, Order>
): Order {
  if (linked) return linked;

  const meta = resolveMTDFormMeta(rec, orderById ?? new Map());

  return normalizeOrder({
    id: rec.orderId || rec.id,
    formType: meta.formType,
    cheerFormSubtype: meta.cheerFormSubtype,
    danceFormSubtype: meta.danceFormSubtype,
    customerName: rec.contactName,
    contactName: rec.contactName,
    programName: rec.programName,
    schoolProgramName: rec.programName,
    schoolAddress: "",
    city: "",
    stateProvince: "",
    zipPostalCode: "",
    country: "United States",
    division: rec.section,
    coachName: rec.contactName,
    coachPhone: "",
    coachEmail: "",
    billingPersonName: rec.contactName,
    billingPersonEmail: "",
    choreographerName: "N/A",
    choreographerEmail: "N/A",
    numberOfCopies: "",
    packageType: rec.package,
    requestedEditor: rec.editorRequest === "FA" ? "First Available" : String(rec.editorRequest),
    timeLengthOfMix: "",
    musicAffiliate: "Power Music Covers",
    powerMusicCovers: rec.musicTheme,
    routineNotes: rec.musicTheme,
    customVoiceovers: "No - None",
    category: rec.category,
    package: rec.package,
    musicTheme: rec.musicTheme,
    editorRequest: rec.editorRequest,
    requestedProducer: String(rec.editorRequest),
    price: rec.price,
    status: "in_mtd",
    createdAt: "",
    needsAttention: rec.needsAttention,
    attentionReason: null,
    ...enrichOrderFromMTD(rec),
  });
}
