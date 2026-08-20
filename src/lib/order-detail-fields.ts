import { getOrderFormColumns } from "@/components/orders/order-columns";
import { displayMultiline, displayText, normalizeOrder } from "@/lib/order-form";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import type { MTDRecord, Order } from "@/types";

export type OrderDetailField = {
  label: string;
  value: string;
  multiline?: boolean;
};

const FIELD_GETTERS: Record<string, (order: Order) => string> = {
  schoolProgramName: (o) => o.schoolProgramName,
  schoolAddress: (o) => o.schoolAddress,
  gymName: (o) => o.gymName || o.schoolProgramName,
  gymBillingAddress: (o) => o.gymBillingAddress || o.schoolAddress,
  schoolName: (o) => o.schoolName || o.schoolProgramName,
  schoolBillingAddress: (o) => o.schoolBillingAddress || o.schoolAddress,
  billingAddress: (o) => o.billingAddress || o.schoolAddress,
  city: (o) => o.city,
  stateProvince: (o) => o.stateProvince,
  zipPostalCode: (o) => o.zipPostalCode,
  country: (o) => o.country,
  teamName: (o) => o.teamName || o.programName,
  programName: (o) => o.programName,
  mascot: (o) => o.mascot || "",
  division: (o) => o.division,
  teamCoedAllGirl: (o) => o.teamCoedAllGirl || "",
  teamColors: (o) => o.teamColors || o.colors || "",
  colors: (o) => o.colors || o.teamColors || "",
  numberOfCopies: (o) => o.numberOfCopies,
  coachName: (o) => o.coachName || o.coachContactFullName || "",
  coachContactFullName: (o) => o.coachContactFullName || o.coachName,
  coachPhone: (o) => o.coachPhone,
  coachEmail: (o) => o.coachEmail || o.coachEmailAddress || "",
  coachEmailAddress: (o) => o.coachEmailAddress || o.coachEmail,
  emailAddress: (o) => o.emailAddress || o.billingPersonEmail,
  billingPersonName: (o) => o.billingPersonName,
  billingPersonEmail: (o) => o.billingPersonEmail,
  choreographerName: (o) => o.choreographerName,
  choreographerEmail: (o) => o.choreographerEmail,
  virocChoreographerName: (o) => o.virocChoreographerName || o.choreographerName,
  virocChoreographerEmail: (o) =>
    o.virocChoreographerEmail || o.choreographerEmail,
  packageType: (o) => o.packageType,
  requestedEditor: (o) => o.requestedEditor,
  timeLengthOfMix: (o) => o.timeLengthOfMix,
  splitOrNoSplit: (o) => o.splitOrNoSplit || "",
  musicAffiliate: (o) => o.musicAffiliate,
  sendingEightCountSheets: (o) => o.sendingEightCountSheets || "",
  usingEightCountSheets: (o) => o.usingEightCountSheets || "",
  songListSuggestions: (o) =>
    o.songListSuggestions || o.powerMusicCovers || o.musicTheme,
  powerMusicCovers: (o) => o.powerMusicCovers,
  routineNotes: (o) => o.routineNotes,
  couponCode: (o) => o.couponCode || "",
  howDidYouFindOut: (o) => o.howDidYouFindOut || "",
  customVoiceovers: (o) => o.customVoiceovers,
};

function rawFieldValue(order: Order, key: string): string {
  const getter = FIELD_GETTERS[key];
  if (getter) return getter(order) || "";
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
        label: col.header,
        value: multiline ? displayMultiline(raw, 500) : displayText(raw),
        multiline,
      };
    })
    .filter((field) => field.value !== "—");
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
    division: rec.category,
    coachName: rec.contactName,
    coachPhone: "",
    coachEmail: "",
    billingPersonName: rec.contactName,
    billingPersonEmail: "",
    choreographerName: "N/A",
    choreographerEmail: "N/A",
    numberOfCopies: "",
    packageType: rec.package,
    requestedEditor: String(rec.editorRequest),
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
  });
}
