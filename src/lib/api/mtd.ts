import { apiClient, ApiClientError } from "./client";
import type { MTDRecord, PriceCompliance, EditorRequest, MTDRecordStatus } from "@/types";

export interface BackendMTDRecord {
  id: string;
  legacy_id?: string | null;
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
  eight_count_sheet: string;
  have_songs: string;
  needs_attention: boolean;
  status: "active" | "outsourced" | "needs_attention" | "completed";
  record_status?: string | null;
  is_reassigned?: boolean;
  order_status?: string | null;
  collection_states?: Record<string, boolean> | null;
  missing_data_email_sent_at?: string | null;
  in_mtd?: boolean;
  inMTD?: boolean;
  in_payroll: boolean;
  completed_at?: string | null;
  is_manual_schedule_entry?: boolean;
  has_rally_mix?: boolean;
  has_extend_8ct_addon?: boolean;
  has_processing_8ct_sheets_addon?: boolean;
  hasRallyMix?: boolean;
  hasExtend8ctAddon?: boolean;
  hasProcessing8ctSheetsAddon?: boolean;
  system_calculated_customer_price?: number | null;
  final_customer_price?: number | null;
  final_customer_price_overridden?: boolean;
  pricing_breakdown?: any;
  rate_used?: number | null;
  rate_source?: string | null;
  producer_payout?: number | null;
  slt_portion?: number | null;
  payroll_finalized?: boolean;
  payroll_breakdown?: any;
}

export function transformMTDRecord(bm: BackendMTDRecord): MTDRecord {
  return {
    id: bm.legacy_id || bm.id,
    legacyId: bm.legacy_id || undefined,
    uuid: bm.id,
    orderId: bm.order_id || undefined,
    section: bm.section || "CHEERLEADING MUSIC",
    assignedProducer: bm.assigned_producer && bm.assigned_producer !== "FA" && bm.assigned_producer !== "NA" ? bm.assigned_producer : null,
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
    eightCountSheet: bm.eight_count_sheet || "",
    haveSongs: bm.have_songs || "",
    needsAttention: Boolean(bm.needs_attention),
    status: bm.status || "active",
    recordStatus: (bm.record_status as MTDRecordStatus) || undefined,
    inMTD: Boolean(bm.in_mtd ?? bm.inMTD),
    inPayroll: Boolean(bm.in_payroll),
    isManualScheduleEntry: Boolean(bm.is_manual_schedule_entry),
    isReassigned: Boolean(bm.is_reassigned),
    collectionStates: bm.collection_states || undefined,
    missingDataEmailSentAt: bm.missing_data_email_sent_at || null,
    completedAt: bm.completed_at || undefined,
    hasRallyMix: Boolean(bm.has_rally_mix ?? bm.hasRallyMix),
    hasExtend8ctAddon: Boolean(bm.has_extend_8ct_addon ?? bm.hasExtend8ctAddon),
    hasProcessing8ctSheetsAddon: Boolean(bm.has_processing_8ct_sheets_addon ?? bm.hasProcessing8ctSheetsAddon),
    systemCalculatedCustomerPrice: bm.system_calculated_customer_price ?? null,
    finalCustomerPrice: bm.final_customer_price ?? null,
    finalCustomerPriceOverridden: Boolean(bm.final_customer_price_overridden),
    pricingBreakdown: bm.pricing_breakdown || null,
    rateUsed: bm.rate_used ?? null,
    rateSource: bm.rate_source || null,
    producerPayout: bm.producer_payout ?? null,
    sltPortion: bm.slt_portion ?? null,
    payrollFinalized: Boolean(bm.payroll_finalized),
    payrollBreakdown: bm.payroll_breakdown || null,
  };
}

export async function fetchMTDRecordsApi(): Promise<MTDRecord[]> {
  const backendMtd = await apiClient.get<BackendMTDRecord[]>("/api/mtd");
  return backendMtd.map(transformMTDRecord);
}

export async function createMTDRecordApi(record: Partial<MTDRecord>): Promise<MTDRecord> {
  const payload = {
    order_id: record.orderId || null,
    section: record.section || "CHEERLEADING MUSIC",
    category: record.category || "Cheer",
    contact_name: record.contactName || "",
    program_name: record.programName || "",
    package: record.package || "",
    price: record.price ?? 0,
    music_theme: record.musicTheme || null,
    editor_request: record.editorRequest || "FA",
    assigned_producer: record.assignedProducer || null,
    invoice: record.invoice || "",
    mix_start_date: record.mixStartDate || null,
    mix_end_date: record.mixEndDate || null,
    record_status: record.recordStatus || (record.assignedProducer ? "Ongoing" : null),
    eight_count_sheet: record.eightCountSheet || "NEED CS",
    have_songs: record.haveSongs || "NEED SONGS",
    needs_attention: record.needsAttention ?? false,
    status: record.status || "active",
    in_mtd: Boolean(record.inMTD),
    has_rally_mix: Boolean(record.hasRallyMix),
    has_extend_8ct_addon: Boolean(record.hasExtend8ctAddon),
    has_processing_8ct_sheets_addon: Boolean(record.hasProcessing8ctSheetsAddon),
  };
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
  if (patch.eightCountSheet !== undefined) payload.eight_count_sheet = patch.eightCountSheet;
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
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
  if (patch.hasRallyMix !== undefined) payload.has_rally_mix = patch.hasRallyMix;
  if (patch.hasExtend8ctAddon !== undefined) payload.has_extend_8ct_addon = patch.hasExtend8ctAddon;
  if (patch.hasProcessing8ctSheetsAddon !== undefined) payload.has_processing_8ct_sheets_addon = patch.hasProcessing8ctSheetsAddon;
  if (patch.systemCalculatedCustomerPrice !== undefined) {
    payload.system_calculated_customer_price = patch.systemCalculatedCustomerPrice;
  }
  if (patch.finalCustomerPrice !== undefined) {
    payload.final_customer_price = patch.finalCustomerPrice;
  }
  if (patch.finalCustomerPriceOverridden !== undefined) {
    payload.final_customer_price_overridden = patch.finalCustomerPriceOverridden;
  }
  if (patch.rateUsed !== undefined) payload.rate_used = patch.rateUsed;
  if (patch.rateSource !== undefined) payload.rate_source = patch.rateSource;
  if (patch.producerPayout !== undefined) payload.producer_payout = patch.producerPayout;
  if (patch.sltPortion !== undefined) payload.slt_portion = patch.sltPortion;
  if (patch.payrollFinalized !== undefined) {
    payload.payroll_finalized = patch.payrollFinalized;
  }
  if (patch.payrollBreakdown !== undefined) {
    payload.payroll_breakdown = patch.payrollBreakdown;
  }

  try {
    const res = await apiClient.patch<BackendMTDRecord>(`/api/mtd/${id}`, payload);
    return transformMTDRecord(res);
  } catch (err) {
    if (err instanceof ApiClientError) {
      console.warn(`MTD Record ${id} update not persisted to backend (${err.message}). Local update retained.`);
      return { id, ...patch } as MTDRecord;
    }
    throw err;
  }
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
  email?: string | null;
  coachEmail?: string | null;
  coach_email?: string | null;
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
  eight_count_sheet?: string | null;
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
}

export async function createManualScheduleEntryApi(
  payload: CreateManualSchedulePayload
): Promise<MTDRecord> {
  const startDate = payload.mixStartDate || payload.mix_start_date || "";
  const endDate = payload.mixEndDate || payload.mix_end_date || "";
  const producer = payload.assignedProducer || payload.assigned_producer || "";
  const contact = payload.contactName || payload.contact_name || "";
  const program = payload.programName || payload.program_name || "";

  const body = {
    category: payload.category,
    form_type: payload.formType || payload.form_type,
    cheer_form_subtype: payload.cheerFormSubtype || payload.cheer_form_subtype,
    dance_form_subtype: payload.danceFormSubtype || payload.dance_form_subtype,
    mix_start_date: startDate,
    mix_end_date: endDate,
    assigned_producer: producer,
    program_name: program || null,
    contact_name: contact || null,
    package: payload.package || null,
    routine_notes: payload.routineNotes || payload.routine_notes || null,
    music_affiliate: payload.musicAffiliate || payload.music_affiliate || null,
    time_length_of_mix: payload.timeLengthOfMix || payload.time_length_of_mix || null,
    song_list_suggestions: payload.songListSuggestions || payload.song_list_suggestions || null,
    custom_voiceovers: payload.customVoiceovers || payload.custom_voiceovers || null,
    eight_count_sheet: payload.eightCountSheet || payload.eight_count_sheet || null,
  };
  try {
    const res = await apiClient.post<BackendMTDRecord>("/api/mtd/manual-schedule", body);
    return transformMTDRecord(res);
  } catch (err) {
    if (err instanceof ApiClientError) {
      console.warn("Backend unavailable for manual schedule entry; falling back to local object.");
    }
    const tempId = `mtd-manual-${Date.now()}`;
    return {
      id: tempId,
      orderId: null,
      section: payload.category === "Dance" ? "DANCE MUSIC" : "CHEERLEADING MUSIC",
      assignedProducer: producer,
      category: payload.category,
      editorRequest: "FA",
      contactName: contact || "N/A",
      editorInitials: producer,
      programName: program || "Manual Schedule Entry",
      package: payload.package || "Standard",
      musicTheme: "",
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      mixStartDate: startDate,
      mixEndDate: endDate,
      eightCountSheet: payload.eightCountSheet || payload.eight_count_sheet || "NEED CS",
      haveSongs: "NEED SONGS",
      needsAttention: false,
      status: "active",
      inMTD: false,
      isManualScheduleEntry: true,
      routineNotes: payload.routineNotes || payload.routine_notes || undefined,
      musicAffiliate: payload.musicAffiliate || payload.music_affiliate || undefined,
      timeLengthOfMix: payload.timeLengthOfMix || payload.time_length_of_mix || undefined,
      songListSuggestions: payload.songListSuggestions || payload.song_list_suggestions || undefined,
      customVoiceovers: payload.customVoiceovers || payload.custom_voiceovers || undefined,
      hasRallyMix: payload.hasRallyMix || payload.has_rally_mix,
      hasExtend8ctAddon: payload.hasExtend8ctAddon || payload.has_extend_8ct_addon,
      hasProcessing8ctSheetsAddon: payload.hasProcessing8ctSheetsAddon || payload.has_processing_8ct_sheets_addon,
      hasTraditionalVoiceover: payload.hasTraditionalVoiceover || payload.has_traditional_voiceover,
      hasThemedVoiceover: payload.hasThemedVoiceover || payload.has_themed_voiceover,
      danceVoiceover: (payload.danceVoiceover || payload.dance_voiceover) as any,
    };
  }
}
