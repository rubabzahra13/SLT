import { apiClient } from "./client";
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
  in_payroll: boolean;
  completed_at?: string | null;
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
    orderId: bm.order_id || undefined,
    section: bm.section || "CHEERLEADING MUSIC",
    assignedProducer: bm.assigned_producer || bm.editor_initials || null,
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
    inPayroll: Boolean(bm.in_payroll),
    completedAt: bm.completed_at || undefined,
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
    eight_count_sheet: record.eightCountSheet || "NEED CS",
    have_songs: record.haveSongs || "NEED SONGS",
    needs_attention: record.needsAttention ?? true,
    status: record.status || "needs_attention",
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
  if (patch.inPayroll !== undefined) payload.in_payroll = patch.inPayroll;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;

  const res = await apiClient.patch<BackendMTDRecord>(`/api/mtd/${id}`, payload);
  return transformMTDRecord(res);
}
