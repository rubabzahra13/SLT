import type { CheerFormSubtype, DanceFormSubtype, MTDRecord, Order, OrderFormType } from "@/types";
import { parsePackage } from "@/lib/package";
import { titleCase } from "@/lib/data";
import { resolveOrderPriceCompliance } from "@/lib/pricing";
import {
  ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS,
  normalizeAllStarCheerMusicAffiliateLabel,
  normalizeSchoolCheerVirocMusicAffiliateLabel,
  SCHOOL_CHEER_VIROC_MUSIC_AFFILIATE_OPTIONS,
} from "@/lib/pricing-reference";

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

/**
 * Legacy fallback when musicAffiliate is empty but musicTheme still carries
 * an affiliate hint (buildLegacyMusicTheme appends "(Label)").
 * Never treat free-text Song list / notes as an affiliate SoftSelect value.
 */
export function inferMusicAffiliate(musicTheme: string): string {
  const raw = String(musicTheme || "").trim();
  if (!raw) return "";
  const paren = raw.match(/\(([^)]+)\)\s*$/);
  const candidate = (paren ? paren[1] : raw).trim();
  if (!candidate) return "";
  const normalized = normalizeAllStarCheerMusicAffiliateLabel(candidate);
  const known = new Set<string>([
    ...ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS,
    ...SCHOOL_CHEER_VIROC_MUSIC_AFFILIATE_OPTIONS,
  ]);
  return known.has(normalized) ? normalized : "";
}

/** Magento School Anthem has no package field — flat rate card. */
export const SCHOOL_ANTHEM_PACKAGE = "SCHOOL ANTHEMS";
export const SCHOOL_ANTHEM_PRICE = 1250;

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

/** Board/MTD category label — always derived from form_type (single source of truth). */
export function categoryFromFormType(
  formType: OrderFormType | string | undefined
): string {
  switch (formType) {
    case "school-all-star-dance":
      return "Dance";
    case "marching-band":
      return "Marching Band";
    case "sports-entertainment":
      return "Sports Entertainment";
    case "school-anthem":
      return "School Anthem";
    case "school-all-star-cheer":
    default:
      return "Cheer";
  }
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
    cat.includes("pom") ||
    cat.includes("hip hop") ||
    cat.includes("hip-hop") ||
    cat.includes("gameday") ||
    cat.includes("jazz") ||
    cat.includes("kick") ||
    cat.includes("variety") ||
    cat.includes("performance") ||
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
  const hasForm = Boolean(
    raw.schoolName?.trim() || raw.schoolProgramName?.trim() || raw.gymName?.trim()
  );

  // Identity SoT = school_gym_name (UI aliases only).
  const programName =
    raw.schoolName?.trim() ||
    raw.gymName?.trim() ||
    raw.schoolProgramName?.trim() ||
    raw.schoolOrganizationName?.trim() ||
    raw.organizationName?.trim() ||
    raw.programName?.trim() ||
    "";
  // Person SoT = coach_name — never copy school/org identity into contact.
  const coachPerson =
    raw.coachName?.trim() ||
    raw.coachContactFullName?.trim() ||
    raw.musicContactName?.trim() ||
    "";
  const rawContact =
    coachPerson ||
    raw.contactName?.trim() ||
    raw.customerName?.trim() ||
    "";
  const contactName =
    programName &&
    rawContact.toLowerCase() === programName.toLowerCase()
      ? coachPerson
      : /^(contact|customer)$/i.test(rawContact)
        ? coachPerson
        : rawContact;
  const { tier, limit } = parsePackage(raw.package || raw.packageType || "");

  const formType = inferFormType(raw);
  const cheerFormSubtype = inferCheerFormSubtype({ ...raw, formType });
  const danceFormSubtype = inferDanceFormSubtype({ ...raw, formType });

  const packageType =
    formType === "school-anthem"
      ? SCHOOL_ANTHEM_PACKAGE
      : raw.packageType?.trim() ||
        tier ||
        raw.package?.split(/\d+:\d+/)[0]?.trim() ||
        raw.package ||
        "";

  // Cheer packages encode mix length in the label (e.g. GOLD 2:00). Other forms
  // keep Magento package labels flat — never refill Time Length from package, or
  // clearing the field "comes back" after save/normalize.
  const isCheerForm = formType === "school-all-star-cheer";
  const timeLengthOfMix = isCheerForm
    ? raw.timeLengthOfMix?.trim() || (limit !== "-" ? limit : "") || ""
    : raw.timeLengthOfMix?.trim() || "";

  const songListEarly = raw.songListSuggestions?.trim() || "";
  const musicAffiliateRaw =
    raw.musicAffiliate?.trim() ||
    inferMusicAffiliate(raw.musicTheme || "");
  const pkgForAffiliate = raw.packageType || raw.package;
  let musicAffiliate = musicAffiliateRaw;
  if (formType === "school-all-star-cheer") {
    if (
      cheerFormSubtype === "school-cheer-viroc-yes" ||
      cheerFormSubtype === "school-cheer-viroc-no"
    ) {
      musicAffiliate = normalizeSchoolCheerVirocMusicAffiliateLabel(
        musicAffiliateRaw,
        pkgForAffiliate
      );
    } else if (
      cheerFormSubtype !== "youth-rec-cheer" &&
      (cheerFormSubtype === "all-star-cheer" ||
        !cheerFormSubtype ||
        String(cheerFormSubtype) === "all")
    ) {
      musicAffiliate = normalizeAllStarCheerMusicAffiliateLabel(
        musicAffiliateRaw,
        pkgForAffiliate
      );
    }
    // Scrub bleed from older Song list → musicTheme → affiliate copies.
    if (
      songListEarly &&
      musicAffiliate &&
      musicAffiliate.trim().toLowerCase() === songListEarly.toLowerCase()
    ) {
      musicAffiliate = "";
    }
  }

  // Cheer / Dance Magento forms have dedicated Notes fields. Never fall back
  // musicTheme → routineNotes: Song list edits used to write musicTheme and
  // would flood Routine Notes (and Music Affiliate via infer).
  const hasSeparateNotesField =
    formType === "school-all-star-cheer" ||
    formType === "school-all-star-dance";
  const routineNotes = hasSeparateNotesField
    ? raw.routineNotes?.trim() || ""
    : raw.routineNotes?.trim() || raw.musicTheme || "";

  const requestedEditor =
    raw.requestedEditor?.trim() ||
    raw.requestedProducer ||
    raw.editorRequest ||
    "First Available";

  const splitOrNoSplit =
    raw.splitOrNoSplit?.trim() ||
    (raw.package?.toUpperCase().includes("NO SPLIT")
      ? "No Split"
      : raw.package?.toUpperCase().includes("SPLIT")
        ? "Split"
        : "");
  // Keep Song list/suggestions distinct from musicTheme / Power Music Covers.
  // Dance Power Music / Unleash are their own columns; cheer Songs uses song list.
  const powerMusicCovers = raw.powerMusicCovers?.trim() || "";
  const unleashTheBeatsCovers = raw.unleashTheBeatsCovers?.trim() || "";
  const songList = songListEarly;

  const normalized: Order = {
    ...raw,
    formType,
    cheerFormSubtype,
    danceFormSubtype,
    // Identity aliases → school_gym_name.
    gymName: programName,
    schoolName: programName,
    schoolProgramName: programName,
    schoolOrganizationName: programName,
    organizationName: programName,
    programName,
    // Billing aliases → school_gym_billing_address.
    ...(() => {
      const billing =
        raw.gymBillingAddress?.trim() ||
        raw.schoolBillingAddress?.trim() ||
        raw.youthRecBillingAddress?.trim() ||
        raw.organizationBillingAddress?.trim() ||
        raw.schoolGymAddress?.trim() ||
        raw.schoolAddress?.trim() ||
        (raw as { billingAddress?: string }).billingAddress?.trim() ||
        "";
      return {
        gymBillingAddress: billing,
        schoolBillingAddress: billing,
        youthRecBillingAddress: billing,
        organizationBillingAddress: billing,
        schoolGymAddress: billing,
        schoolAddress: billing,
      };
    })(),
    teamName: raw.teamName?.trim() || "",
    mascot: raw.mascot?.trim() || "",
    teamCoedAllGirl: raw.teamCoedAllGirl?.trim() || "",
    // Colors aliases → colors.
    ...(() => {
      const colors =
        raw.teamColors?.trim() ||
        raw.youthRecColors?.trim() ||
        raw.schoolProgramColors?.trim() ||
        (raw as { colors?: string }).colors?.trim() ||
        "";
      return {
        teamColors: colors,
        youthRecColors: colors,
        schoolProgramColors: colors,
      };
    })(),
    splitOrNoSplit,
    // Choreographer aliases → choreographer_name / email.
    choreographerName:
      raw.choreographerName?.trim() ||
      raw.virocChoreographerName?.trim() ||
      "",
    choreographerEmail:
      raw.choreographerEmail?.trim() ||
      raw.virocChoreographerEmail?.trim() ||
      "",
    virocChoreographerName:
      raw.virocChoreographerName?.trim() ||
      raw.choreographerName?.trim() ||
      "",
    virocChoreographerEmail:
      raw.virocChoreographerEmail?.trim() ||
      raw.choreographerEmail?.trim() ||
      "",
    // Coach / Music Contact aliases → coach_name.
    coachName: contactName,
    coachContactFullName: contactName,
    musicContactName: contactName,
    contactName,
    customerName: contactName,
    coachEmailAddress:
      raw.coachEmailAddress?.trim() || raw.coachEmail?.trim() || "",
    coachEmail: raw.coachEmail?.trim() || raw.coachEmailAddress?.trim() || "",
    musicContactEmail:
      raw.musicContactEmail?.trim() ||
      raw.coachEmail?.trim() ||
      raw.coachEmailAddress?.trim() ||
      "",
    musicContactPhone:
      raw.musicContactPhone?.trim() || raw.coachPhone?.trim() || "",
    // Youth Rec Magento second email — distinct from coach email.
    youthRecExtraEmailAddress:
      raw.youthRecExtraEmailAddress?.trim() ||
      raw.emailAddress?.trim() ||
      "",
    emailAddress:
      raw.youthRecExtraEmailAddress?.trim() ||
      raw.emailAddress?.trim() ||
      "",
    sendingEightCountSheets:
      raw.sendingEightCountSheets?.trim() ||
      raw.usingEightCountSheets?.trim() ||
      "",
    usingEightCountSheets:
      raw.sendingEightCountSheets?.trim() ||
      raw.usingEightCountSheets?.trim() ||
      "",
    instrumentationNotes:
      raw.instrumentationNotes?.trim() ||
      raw.instrumentalStylePreference?.trim() ||
      "",
    instrumentalStylePreference:
      raw.instrumentationNotes?.trim() ||
      raw.instrumentalStylePreference?.trim() ||
      "",
    songListSuggestions: songList,
    couponCode: raw.couponCode?.trim() || "",
    howDidYouFindOut: raw.howDidYouFindOut?.trim() || "",
    city: raw.city?.trim() || "",
    stateProvince: raw.stateProvince?.trim() || "",
    zipPostalCode: raw.zipPostalCode?.trim() || "",
    country: raw.country?.trim() || "United States",
    division: raw.division?.trim() || "",
    coachPhone: raw.coachPhone?.trim() || raw.musicContactPhone?.trim() || "",
    billingPersonName:
      raw.billingPersonName?.trim() ||
      raw.billingContactName?.trim() ||
      "",
    billingPersonEmail:
      raw.billingPersonEmail?.trim() ||
      raw.billingContactEmail?.trim() ||
      "",
    billingContactName:
      raw.billingContactName?.trim() ||
      raw.billingPersonName?.trim() ||
      "",
    billingContactEmail:
      raw.billingContactEmail?.trim() ||
      raw.billingPersonEmail?.trim() ||
      "",
    numberOfCopies: raw.numberOfCopies?.trim() || "",
    packageType: hasForm ? packageType : packageType || raw.package || "",
    package:
      formType === "school-anthem"
        ? SCHOOL_ANTHEM_PACKAGE
        : isCheerForm
          ? buildLegacyPackage(packageType || raw.package || "", timeLengthOfMix)
          : // SE / Dance / Band: persist flat Magento PACKAGE TYPE (strip any
            // legacy " … 2:00" that older normalize runs appended).
            (packageType || raw.packageType || raw.package || "").trim() ||
            "TBD",
    price:
      formType === "school-anthem"
        ? SCHOOL_ANTHEM_PRICE
        : typeof raw.price === "number"
          ? raw.price
          : Number(raw.price) || 0,
    requestedEditor,
    timeLengthOfMix,
    musicAffiliate,
    // Power Music Covers is a dance Magento field. Never backfill it from
    // musicTheme — cheer Song list saves set musicTheme and would otherwise
    // mirror into power_music_covers.
    powerMusicCovers:
      formType === "school-all-star-dance" ? powerMusicCovers : "",
    unleashTheBeatsCovers:
      formType === "school-all-star-dance" ? unleashTheBeatsCovers : "",
    routineNotes,
    additionalNotes:
      raw.additionalNotes?.trim() ||
      (formType === "sports-entertainment" ? routineNotes : "") ||
      "",
    // Custom voiceovers (+ script/guidance) are dance Magento fields only.
    customVoiceovers:
      formType === "school-all-star-dance"
        ? raw.customVoiceovers?.trim() || "No - None"
        : "",
    voiceoverScript:
      formType === "school-all-star-dance"
        ? raw.voiceoverScript?.trim() || ""
        : "",
    pronunciationGuidance:
      formType === "school-all-star-dance"
        ? raw.pronunciationGuidance?.trim() || ""
        : "",
    category: categoryFromFormType(formType),
    musicTheme: buildLegacyMusicTheme({
      routineNotes,
      powerMusicCovers:
        formType === "school-all-star-dance" ? powerMusicCovers : "",
      musicAffiliate,
    }),
    // Same Edit Affiliates check for Magento form text and manual Add Order.
    priceCompliance: resolveOrderPriceCompliance({
      musicAffiliate,
      musicTheme: raw.musicTheme,
      formType,
      cheerFormSubtype,
      danceFormSubtype,
    }),
    requestedProducer: requestedEditor,
    editorRequest:
      raw.editorRequest ||
      (requestedEditor.toLowerCase() === "first available"
        ? "FA"
        : requestedEditor),
  };

  if (cheerFormSubtype === "youth-rec-cheer") {
    delete (normalized as Partial<Order>).musicAffiliate;
  }

  return normalized;
}

export function displayText(value?: string): string {
  if (!value?.trim()) return "—";
  return titleCase(value);
}

export function displayMultiline(value?: string, max = 120): string {
  if (!value?.trim()) return "—";
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return titleCase(cleaned);
  return `${titleCase(cleaned.slice(0, max))}…`;
}

export function orderToMTDRecord(order: Order): MTDRecord {
  const section =
    order.category === "Dance"
      ? "DANCE MUSIC"
      : order.category === "Marching Band"
      ? "MARCHING BAND"
      : order.category === "Sports Entertainment"
      ? "SPORTS ENTERTAINMENT"
      : order.category === "School Anthem"
      ? "SCHOOL ANTHEMS"
      : "CHEERLEADING MUSIC";

  const eightCountSheet =
    order.eightCountSheet ||
    order.sendingEightCountSheets ||
    "";
  const haveSongs = order.haveSongs || (order as any).have_songs || "";

  return {
    id: order.id || order.legacyId || order.uuid || `ord-${Date.now()}`,
    legacyId: order.legacyId,
    uuid: order.uuid,
    orderId: order.id || order.uuid,
    section,
    assignedProducer: order.assignedProducer || null,
    category: order.category || "Cheer",
    editorRequest: (order.editorRequest as any) || "FA",
    contactName:
      order.contactName ||
      order.coachName ||
      order.coachContactFullName ||
      order.musicContactName ||
      order.customerName ||
      "Contact",
    editorInitials:
      order.contactName ||
      order.coachName ||
      order.coachContactFullName ||
      order.musicContactName ||
      order.customerName ||
      "Contact",
    programName: order.programName || "Program",
    package: order.package || "TBD",
    musicTheme: order.musicTheme || "",
    price: order.price ?? 0,
    priceCompliance: resolveOrderPriceCompliance(order),
    invoice: "",
    mixStartDate: (order as any).mixStartDate || "",
    mixEndDate: (order as any).mixEndDate || undefined,
    eightCountSheet,
    haveSongs,
    needsAttention: Boolean(order.needsAttention),
    status: order.status === "in_mtd" ? "active" : (order.assignedProducer ? "active" : (order.needsAttention ? "needs_attention" : "active")),
    recordStatus: order.assignedProducer || order.status === "in_mtd" ? "Ongoing" : "Waiting for Data",
    inMTD: order.status === "in_mtd",
    isReassigned: Boolean(order.isReassigned),
    orderStatus: order.orderStatus || (order as any).order_status,
    collectionStates: order.collectionStates || (order as any).collection_states,
    musicAffiliate: order.musicAffiliate || (order as any).music_affiliate,
    routineNotes: order.routineNotes,
    timeLengthOfMix: order.timeLengthOfMix,
    songListSuggestions: order.songListSuggestions,
    customVoiceovers: order.customVoiceovers,
    missingDataEmailSentAt: order.missingDataEmailSentAt,
    producerEmailSentAt: order.producerEmailSentAt,
    producerEmailSentTo: order.producerEmailSentTo,
    inPayroll: false,
    hasRallyMix: false,
    hasExtend8ctAddon: false,
    hasProcessing8ctSheetsAddon: false,
    systemCalculatedCustomerPrice: order.systemCalculatedCustomerPrice,
    finalCustomerPrice: order.finalCustomerPrice,
    finalCustomerPriceOverridden: order.finalCustomerPriceOverridden,
    pricingBreakdown: order.pricingBreakdown,
    formType: order.formType,
    cheerFormSubtype: order.cheerFormSubtype,
    danceFormSubtype: order.danceFormSubtype,
    varsityVirocCustomer: order.varsityVirocCustomer,
  } as MTDRecord;
}
