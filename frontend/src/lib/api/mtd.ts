import { apiClient } from "./client";
import type { MTDRecord, PriceCompliance, EditorRequest, MTDRecordStatus, Order } from "@/types";
import { transformOrder, type BackendOrder } from "./orders";

export interface BackendMTDRecord {
  id: string;
  order_id?: string | null;
  section: string;
  assigned_producer_id?: string | null;
  assigned_producer?: string | null;
  category: string;
  editor_request?: string | null;
  contact_name: string;
  editor_initials?: string | null;
  program_name: string;
  package: string;
  music_theme?: string | null;
  price: number;
  price_compliance: string;
  invoice: string;
  mix_start_date?: string | null;
  mix_end_date?: string | null;
  waiting_on?: string | null;
  received_eight_count_sheet: string;
  have_songs: string;
  needs_attention: boolean;
  status: "active" | "outsourced" | "needs_attention" | "completed";
  record_status?: string | null;
  is_reassigned?: boolean;
  order_status?: string | null;
  collection_states?: Record<string, boolean> | null;
  missing_data_email_sent_at?: string | null;
  producer_email_sent_at?: string | null;
  producer_email_sent_to?: string | null;
  in_mtd?: boolean;
  inMTD?: boolean;
  in_payroll: boolean;
  completed_at?: string | null;
  paid_at?: string | null;
  is_manual_schedule_entry?: boolean;
  has_extend_8ct_addon?: boolean;
  has_processing_8ct_sheets_addon?: boolean;
  hasExtend8ctAddon?: boolean;
  hasProcessing8ctSheetsAddon?: boolean;
  final_customer_price?: number | null;
  final_customer_price_overridden?: boolean;
}

export function transformMTDRecord(bm: BackendMTDRecord): MTDRecord {
  return {
    // Always use the DB UUID — legacy_id is retired.
    id: bm.id,
    uuid: bm.id,
    orderId: bm.order_id || undefined,
    section: bm.section || "CHEERLEADING MUSIC",
    // Keep "FA" — it can be a real producer's initials. Only "NA" means unassigned.
    assignedProducer:
      bm.assigned_producer && bm.assigned_producer !== "NA"
        ? bm.assigned_producer
        : null,
    category: bm.category || "Cheer",
    editorRequest: (bm.editor_request as EditorRequest) || "FA",
    contactName: bm.contact_name || "",
    editorInitials: bm.editor_initials || bm.assigned_producer || "",
    programName: bm.program_name || "",
    package: bm.package || "",
    musicTheme: bm.music_theme || "",
    price: bm.price ?? 0,
    priceCompliance: (bm.price_compliance as PriceCompliance) || "compliant",
    invoice: bm.invoice || "",
    mixStartDate: bm.mix_start_date || "",
    mixEndDate: bm.mix_end_date || undefined,
    waitingOn: bm.waiting_on || null,
    eightCountSheet: bm.received_eight_count_sheet || "",
    haveSongs: bm.have_songs || "",
    needsAttention: Boolean(bm.needs_attention),
    status: bm.status || "active",
    recordStatus: (bm.record_status as MTDRecordStatus) || undefined,
    inMTD: bm.is_reassigned && bm.in_mtd === false ? false : (bm.in_mtd !== undefined ? Boolean(bm.in_mtd) : (bm.inMTD !== undefined ? Boolean(bm.inMTD) : true)),
    inPayroll: Boolean(bm.in_payroll),
    isManualScheduleEntry: Boolean(bm.is_manual_schedule_entry),
    isReassigned: Boolean(bm.is_reassigned),
    paidAt: bm.paid_at || null,
    collectionStates: (() => {
      const raw = bm.collection_states;
      if (!raw) return undefined;
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch {
          return undefined;
        }
      }
      return raw;
    })(),
    orderStatus: bm.order_status || undefined,
    missingDataEmailSentAt: bm.missing_data_email_sent_at || null,
    producerEmailSentAt: bm.producer_email_sent_at || null,
    producerEmailSentTo: bm.producer_email_sent_to || null,
    completedAt: bm.completed_at || undefined,
    hasExtend8ctAddon: Boolean(bm.has_extend_8ct_addon ?? bm.hasExtend8ctAddon),
    hasProcessing8ctSheetsAddon: Boolean(bm.has_processing_8ct_sheets_addon ?? bm.hasProcessing8ctSheetsAddon),
    finalCustomerPrice: bm.final_customer_price ?? null,
    finalCustomerPriceOverridden: Boolean(bm.final_customer_price_overridden),
  };
}

export async function fetchMTDRecordsApi(): Promise<MTDRecord[]> {
  const backendMtd = await apiClient.get<BackendMTDRecord[]>("/api/mtd");
  return backendMtd.map(transformMTDRecord);
}

export async function createMTDRecordApi(record: Partial<MTDRecord>): Promise<MTDRecord> {
  // Prefer UUID.
  const orderRef =
    (record as { orderUuid?: string }).orderUuid || record.orderId || null;

  // Create links the board row only. Order identity/assignment/collection are
  // already on Orders — sending empty SoT keys was wiping assigned producers,
  // mix dates, and form fields on move-to-MTD.
  const payload: Record<string, unknown> = {
    order_id: orderRef,
    section: record.section || "CHEERLEADING MUSIC",
    price: record.price ?? 0,
    invoice: record.invoice || "",
    status: record.status || "active",
    record_status: record.recordStatus || null,
    in_mtd: Boolean(record.inMTD),
    has_extend_8ct_addon: Boolean(record.hasExtend8ctAddon),
    has_processing_8ct_sheets_addon: Boolean(record.hasProcessing8ctSheetsAddon),
  };
  if (record.priceCompliance !== undefined) {
    payload.price_compliance = record.priceCompliance;
  }
  const res = await apiClient.post<BackendMTDRecord>("/api/mtd", payload);
  return transformMTDRecord(res);
}

export async function updateMTDRecordApi(
  id: string,
  patch: Partial<MTDRecord>
): Promise<MTDRecord> {
  const payload: Record<string, unknown> = {};
  if (patch.section !== undefined) payload.section = patch.section;
  if (patch.assignedProducer !== undefined) payload.assigned_producer = patch.assignedProducer;
  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.editorRequest !== undefined) payload.editor_request = patch.editorRequest;
  if (patch.contactName !== undefined) payload.contact_name = patch.contactName;
  if (patch.editorInitials !== undefined) payload.editor_initials = patch.editorInitials;
  if (patch.programName !== undefined) payload.program_name = patch.programName;
  if (patch.package !== undefined) payload.package = patch.package;
  if (patch.musicTheme !== undefined) payload.music_theme = patch.musicTheme;
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.priceCompliance !== undefined) payload.price_compliance = patch.priceCompliance;
  if (patch.invoice !== undefined) payload.invoice = patch.invoice;
  if (patch.mixStartDate !== undefined) payload.mix_start_date = patch.mixStartDate || null;
  if (patch.mixEndDate !== undefined) payload.mix_end_date = patch.mixEndDate || null;
  if (patch.waitingOn !== undefined) payload.waiting_on = patch.waitingOn;
  if (patch.eightCountSheet !== undefined) {
    payload.received_eight_count_sheet = patch.eightCountSheet;
  }
  if (patch.haveSongs !== undefined) payload.have_songs = patch.haveSongs;
  if (patch.needsAttention !== undefined) payload.needs_attention = patch.needsAttention;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.recordStatus !== undefined) payload.record_status = patch.recordStatus;
  if (patch.inMTD !== undefined) payload.in_mtd = patch.inMTD;
  if (patch.inPayroll !== undefined) payload.in_payroll = patch.inPayroll;
  if (patch.isReassigned !== undefined) payload.is_reassigned = patch.isReassigned;
  if (patch.collectionStates !== undefined) payload.collection_states = patch.collectionStates;
  if ((patch as any).orderStatus !== undefined) payload.order_status = (patch as any).orderStatus;
  if (patch.missingDataEmailSentAt !== undefined) {
    payload.missing_data_email_sent_at = patch.missingDataEmailSentAt;
  }
  if (patch.producerEmailSentAt !== undefined) {
    payload.producer_email_sent_at = patch.producerEmailSentAt;
  }
  if (patch.producerEmailSentTo !== undefined) {
    payload.producer_email_sent_to = patch.producerEmailSentTo;
  }
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
  if (patch.paidAt !== undefined) payload.paid_at = patch.paidAt;
  if (patch.hasExtend8ctAddon !== undefined) payload.has_extend_8ct_addon = patch.hasExtend8ctAddon;
  if (patch.hasProcessing8ctSheetsAddon !== undefined) payload.has_processing_8ct_sheets_addon = patch.hasProcessing8ctSheetsAddon;
  if (patch.finalCustomerPrice !== undefined) {
    payload.final_customer_price = patch.finalCustomerPrice;
  }
  if (patch.finalCustomerPriceOverridden !== undefined) {
    payload.final_customer_price_overridden = patch.finalCustomerPriceOverridden;
  }

  try {
    const res = await apiClient.patch<BackendMTDRecord>(`/api/mtd/${id}`, payload);
    return transformMTDRecord(res);
  } catch (err) {
    // Never fake success — callers must handle failure or the UI lies.
    throw err;
  }
}

export async function deleteMTDRecordApi(id: string): Promise<void> {
  await apiClient.delete(`/api/mtd/${id}`);
}

export interface CreateManualSchedulePayload {
  category: string;
  subcategory?: string | null;
  formType?: string | null;
  form_type?: string | null;
  cheerFormSubtype?: string | null;
  cheer_form_subtype?: string | null;
  danceFormSubtype?: string | null;
  dance_form_subtype?: string | null;
  mixStartDate?: string | null;
  mix_start_date?: string | null;
  mixEndDate?: string | null;
  mix_end_date?: string | null;
  assignedProducer?: string | null;
  assigned_producer?: string | null;
  programName?: string | null;
  program_name?: string | null;
  contactName?: string | null;
  contact_name?: string | null;
  schoolProgramName?: string | null;
  school_program_name?: string | null;
  gymName?: string | null;
  gym_name?: string | null;
  schoolName?: string | null;
  school_name?: string | null;
  schoolGymName?: string | null;
  school_gym_name?: string | null;
  teamName?: string | null;
  team_name?: string | null;
  email?: string | null;
  coachEmail?: string | null;
  coach_email?: string | null;
  billingPersonEmail?: string | null;
  billing_person_email?: string | null;
  youthRecExtraEmailAddress?: string | null;
  youth_rec_extra_email_address?: string | null;
  emailAddress?: string | null;
  email_address?: string | null;
  package?: string | null;
  routineNotes?: string | null;
  routine_notes?: string | null;
  musicAffiliate?: string | null;
  music_affiliate?: string | null;
  timeLengthOfMix?: string | null;
  time_length_of_mix?: string | null;
  songListSuggestions?: string | null;
  song_list_suggestions?: string | null;
  customVoiceovers?: string | null;
  custom_voiceovers?: string | null;
  eightCountSheet?: string | null;
  received_eight_count_sheet?: string | null;
  videoUrl?: string | null;
  video_url?: string | null;
  danceVoiceover?: string | null;
  dance_voiceover?: string | null;
  hasRallyMix?: boolean;
  has_rally_mix?: boolean;
  hasExtend8ctAddon?: boolean;
  has_extend_8ct_addon?: boolean;
  hasProcessing8ctSheetsAddon?: boolean;
  has_processing_8ct_sheets_addon?: boolean;
  hasTraditionalVoiceover?: boolean;
  has_traditional_voiceover?: boolean;
  hasThemedVoiceover?: boolean;
  has_themed_voiceover?: boolean;
  powerMusicCovers?: string | null;
  power_music_covers?: string | null;
  voiceoverScript?: string | null;
  voiceover_script?: string | null;
  pronunciationGuidance?: string | null;
  pronunciation_guidance?: string | null;
}

export async function createManualScheduleEntryApi(
  payload: CreateManualSchedulePayload
): Promise<Order> {
  const startDate = payload.mixStartDate ?? payload.mix_start_date ?? null;
  const endDate = payload.mixEndDate ?? payload.mix_end_date ?? null;
  const producer = payload.assignedProducer ?? payload.assigned_producer ?? null;
  const contact = payload.contactName || payload.contact_name || "";
  const program = payload.programName || payload.program_name || "";
  const schoolProgram = payload.schoolProgramName || payload.school_program_name || "";

  const body = {
    category: payload.category,
    form_type: payload.formType || payload.form_type,
    cheer_form_subtype: payload.cheerFormSubtype || payload.cheer_form_subtype,
    dance_form_subtype: payload.danceFormSubtype || payload.dance_form_subtype,
    mix_start_date: startDate || null,
    mix_end_date: endDate || null,
    assigned_producer: producer || null,
    program_name: null,
    school_gym_name:
      payload.schoolGymName ||
      payload.school_gym_name ||
      payload.schoolName ||
      payload.school_name ||
      payload.gymName ||
      payload.gym_name ||
      schoolProgram ||
      program ||
      null,
    team_name: payload.teamName || payload.team_name || null,
    contact_name: contact || null,
    email: payload.email || null,
    coach_email: payload.coachEmail || payload.coach_email || null,
    billing_person_email:
      payload.billingPersonEmail ||
      payload.billing_person_email ||
      payload.youthRecExtraEmailAddress ||
      payload.youth_rec_extra_email_address ||
      payload.emailAddress ||
      payload.email_address ||
      null,
    package: payload.package || null,
    routine_notes: payload.routineNotes || payload.routine_notes || null,
    music_affiliate: payload.musicAffiliate || payload.music_affiliate || null,
    time_length_of_mix: payload.timeLengthOfMix || payload.time_length_of_mix || null,
    song_list_suggestions: payload.songListSuggestions || payload.song_list_suggestions || null,
    custom_voiceovers: payload.customVoiceovers || payload.custom_voiceovers || null,
    received_eight_count_sheet:
      payload.eightCountSheet ||
      payload.received_eight_count_sheet ||
      null,
    video_url: payload.videoUrl || payload.video_url || null,
  };
  try {
    const res = await apiClient.post<BackendOrder>("/api/mtd/manual-schedule", body);
    return transformOrder(res);
  } catch (err) {
    // Do not invent a local-only order that will never appear in production.
    throw err;
  }
}
