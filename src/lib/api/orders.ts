import { apiClient } from "./client";
import type { Order, OrderFormType, CheerFormSubtype, DanceFormSubtype } from "@/types";

export interface BackendOrder {
  id: string;
  legacy_id?: string | null;
  form_type?: string;
  cheer_form_subtype?: string | null;
  dance_form_subtype?: string | null;
  school_program_name?: string | null;
  school_address?: string | null;
  city?: string | null;
  state_province?: string | null;
  zip_postal_code?: string | null;
  country?: string | null;
  division?: string | null;
  coach_name?: string | null;
  coach_phone?: string | null;
  coach_email?: string | null;
  billing_person_name?: string | null;
  billing_person_email?: string | null;
  choreographer_name?: string | null;
  choreographer_email?: string | null;
  number_of_copies?: string | null;
  package_type?: string | null;
  requested_editor?: string | null;
  time_length_of_mix?: string | null;
  music_affiliate?: string | null;
  power_music_covers?: string | null;
  routine_notes?: string | null;
  custom_voiceovers?: string | null;
  gym_name?: string | null;
  gym_billing_address?: string | null;
  team_name?: string | null;
  team_coed_all_girl?: string | null;
  team_colors?: string | null;
  school_name?: string | null;
  school_billing_address?: string | null;
  mascot?: string | null;
  split_or_no_split?: string | null;
  viroc_choreographer_name?: string | null;
  viroc_choreographer_email?: string | null;
  colors?: string | null;
  billing_address?: string | null;
  coach_contact_full_name?: string | null;
  coach_email_address?: string | null;
  email_address?: string | null;
  sending_eight_count_sheets?: string | null;
  using_eight_count_sheets?: string | null;
  song_list_suggestions?: string | null;
  coupon_code?: string | null;
  how_did_you_find_out?: string | null;

  customer_name: string;
  contact_name: string;
  program_name: string;
  category: string;
  package: string;
  music_theme?: string | null;
  editor_request?: string | null;
  requested_producer?: string | null;
  price: number;
  price_compliance?: string | null;
  status: "new" | "active" | "needs_attention" | "completed" | "in_mtd";
  created_at: string;
  completed_at?: string | null;
  needs_attention: boolean;
  attention_reason?: string | null;
  is_past_order: boolean;
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

export function transformOrder(bo: BackendOrder): Order {
  return {
    id: bo.legacy_id || bo.id,
    formType: (bo.form_type as OrderFormType) || "school-all-star-cheer",
    cheerFormSubtype: bo.cheer_form_subtype as CheerFormSubtype | undefined,
    danceFormSubtype: bo.dance_form_subtype as DanceFormSubtype | undefined,
    schoolProgramName: bo.school_program_name || "",
    schoolAddress: bo.school_address || "",
    city: bo.city || "",
    stateProvince: bo.state_province || "",
    zipPostalCode: bo.zip_postal_code || "",
    country: bo.country || "United States",
    division: bo.division || "",
    coachName: bo.coach_name || "",
    coachPhone: bo.coach_phone || "",
    coachEmail: bo.coach_email || "",
    billingPersonName: bo.billing_person_name || "",
    billingPersonEmail: bo.billing_person_email || "",
    choreographerName: bo.choreographer_name || "",
    choreographerEmail: bo.choreographer_email || "",
    numberOfCopies: bo.number_of_copies || "",
    packageType: bo.package_type || "",
    requestedEditor: bo.requested_editor || "",
    timeLengthOfMix: bo.time_length_of_mix || "",
    musicAffiliate: bo.music_affiliate || "",
    powerMusicCovers: bo.power_music_covers || "",
    routineNotes: bo.routine_notes || "",
    customVoiceovers: bo.custom_voiceovers || "",
    gymName: bo.gym_name || undefined,
    gymBillingAddress: bo.gym_billing_address || undefined,
    teamName: bo.team_name || undefined,
    teamCoedAllGirl: bo.team_coed_all_girl || undefined,
    teamColors: bo.team_colors || undefined,
    schoolName: bo.school_name || undefined,
    schoolBillingAddress: bo.school_billing_address || undefined,
    mascot: bo.mascot || undefined,
    splitOrNoSplit: bo.split_or_no_split || undefined,
    virocChoreographerName: bo.viroc_choreographer_name || undefined,
    virocChoreographerEmail: bo.viroc_choreographer_email || undefined,
    colors: bo.colors || undefined,
    billingAddress: bo.billing_address || undefined,
    coachContactFullName: bo.coach_contact_full_name || undefined,
    coachEmailAddress: bo.coach_email_address || undefined,
    emailAddress: bo.email_address || undefined,
    sendingEightCountSheets: bo.sending_eight_count_sheets || undefined,
    usingEightCountSheets: bo.using_eight_count_sheets || undefined,
    songListSuggestions: bo.song_list_suggestions || undefined,
    couponCode: bo.coupon_code || undefined,
    howDidYouFindOut: bo.how_did_you_find_out || undefined,

    customerName: bo.customer_name || bo.program_name,
    contactName: bo.contact_name || bo.customer_name,
    programName: bo.program_name,
    category: bo.category || "Cheer",
    package: bo.package || "TBD",
    musicTheme: bo.music_theme || "",
    editorRequest: bo.editor_request || "FA",
    requestedProducer: bo.requested_producer || "",
    assignedProducer: bo.editor_request && bo.editor_request !== "FA" && bo.editor_request !== "NA" ? bo.editor_request : null,
    price: bo.price ?? 0,
    priceCompliance: (bo.price_compliance as any) || "compliant",
    status: bo.status || "new",
    createdAt: bo.created_at || new Date().toISOString(),
    completedAt: bo.completed_at || null,
    needsAttention: Boolean(bo.needs_attention),
    attentionReason: bo.attention_reason || null,
    systemCalculatedCustomerPrice: bo.system_calculated_customer_price ?? null,
    finalCustomerPrice: bo.final_customer_price ?? null,
    finalCustomerPriceOverridden: Boolean(bo.final_customer_price_overridden),
    pricingBreakdown: bo.pricing_breakdown || null,
    rateUsed: bo.rate_used ?? null,
    rateSource: bo.rate_source || null,
    producerPayout: bo.producer_payout ?? null,
    sltPortion: bo.slt_portion ?? null,
    payrollFinalized: Boolean(bo.payroll_finalized),
    payrollBreakdown: bo.payroll_breakdown || null,
  };
}

export async function fetchOrdersApi(): Promise<{ activeOrders: Order[]; pastOrders: Order[] }> {
  const backendOrders = await apiClient.get<BackendOrder[]>("/api/orders");
  const activeOrders: Order[] = [];
  const pastOrders: Order[] = [];

  for (const bo of backendOrders) {
    const transformed = transformOrder(bo);
    if (bo.is_past_order || bo.status === "completed") {
      pastOrders.push(transformed);
    } else {
      activeOrders.push(transformed);
    }
  }

  return { activeOrders, pastOrders };
}

export async function createOrderApi(order: Partial<Order>): Promise<Order> {
  const payload = {
    customer_name: order.customerName || order.programName || "Customer",
    contact_name: order.contactName || order.customerName || "Contact",
    program_name: order.programName || "Program",
    category: order.category || "Cheer",
    package: order.package || "TBD",
    price: order.price ?? 0,
    music_theme: order.musicTheme || null,
    editor_request: order.editorRequest || "FA",
    requested_producer: order.requestedProducer || null,
    form_type: order.formType || "school-all-star-cheer",
    status: order.status || "new",
  };
  const res = await apiClient.post<BackendOrder>("/api/orders", payload);
  return transformOrder(res);
}

export async function updateOrderApi(
  id: string,
  patch: Partial<Order>
): Promise<Order> {
  const payload: Record<string, unknown> = {};
  if (patch.customerName !== undefined) payload.customer_name = patch.customerName;
  if (patch.contactName !== undefined) payload.contact_name = patch.contactName;
  if (patch.programName !== undefined) payload.program_name = patch.programName;
  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.package !== undefined) payload.package = patch.package;
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.musicTheme !== undefined) payload.music_theme = patch.musicTheme;
  if (patch.editorRequest !== undefined) payload.editor_request = patch.editorRequest;
  if (patch.requestedProducer !== undefined) payload.requested_producer = patch.requestedProducer;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.needsAttention !== undefined) payload.needs_attention = patch.needsAttention;
  if (patch.attentionReason !== undefined) payload.attention_reason = patch.attentionReason;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;

  const res = await apiClient.patch<BackendOrder>(`/api/orders/${id}`, payload);
  return transformOrder(res);
}
