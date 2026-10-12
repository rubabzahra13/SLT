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
  affiliate_flag_status?: string | null;
  music_affiliate_selections?: string | null;
  power_music_covers?: string | null;
  routine_notes?: string | null;
  custom_voiceovers?: string | null;
  voiceover_script?: string | null;
  pronunciation_guidance?: string | null;
  style?: string | null;
  licensing_required?: string | null;
  instrumentation_notes?: string | null;
  lyrical_notes?: string | null;
  is_rush_order?: string | null;
  nicknames?: string | null;
  vocals_preference?: string | null;
  instrumental_style_preference?: string | null;
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
  collection_states?: any;
  order_status?: string | null;
  is_reassigned?: boolean;
  is_manual_entry?: boolean;
  merged_form_order_id?: string | null;
  merged_into_manual_order_id?: string | null;
  manual_overlap_snapshot?: Record<string, unknown> | null;
  suppress_manual_form_merge?: boolean;
  assigned_producer?: string | null;
  mix_start_date?: string | null;
  mix_end_date?: string | null;
  eight_count_sheet?: string | null;
  have_songs?: string | null;

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
  missing_data_email_sent_at?: string | null;
  producer_email_sent_at?: string | null;
  producer_email_sent_to?: string | null;
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
    legacyId: bo.legacy_id || undefined,
    uuid: bo.id,
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
    affiliateFlagStatus:
      bo.affiliate_flag_status === "open" ||
      bo.affiliate_flag_status === "resolved" ||
      bo.affiliate_flag_status === "released"
        ? bo.affiliate_flag_status
        : null,
    musicAffiliateSelections: bo.music_affiliate_selections || null,
    powerMusicCovers: bo.power_music_covers || "",
    routineNotes: bo.routine_notes || "",
    customVoiceovers: bo.custom_voiceovers || "",
    voiceoverScript: bo.voiceover_script || "",
    pronunciationGuidance: bo.pronunciation_guidance || "",
    style: bo.style || "",
    licensingRequired: bo.licensing_required || "",
    instrumentationNotes: bo.instrumentation_notes || "",
    lyricalNotes: bo.lyrical_notes || "",
    isRushOrder: bo.is_rush_order || "",
    nicknames: bo.nicknames || "",
    vocalsPreference: bo.vocals_preference || "",
    instrumentalStylePreference: bo.instrumental_style_preference || "",
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
    collectionStates: bo.collection_states || undefined,
    isReassigned: Boolean(bo.is_reassigned),
    isManualEntry: Boolean(bo.is_manual_entry),
    mergedFormOrderId: bo.merged_form_order_id || undefined,
    mergedIntoManualOrderId: bo.merged_into_manual_order_id || undefined,
    manualOverlapSnapshot: bo.manual_overlap_snapshot || undefined,
    suppressManualFormMerge: Boolean(bo.suppress_manual_form_merge),
    orderStatus: bo.order_status || undefined,

    customerName: bo.customer_name || bo.program_name,
    contactName: bo.contact_name || bo.customer_name,
    programName: bo.program_name,
    category: bo.category || "Cheer",
    package: bo.package || "TBD",
    musicTheme: bo.music_theme || "",
    editorRequest: bo.editor_request || "FA",
    requestedProducer: bo.requested_producer || "",
    assignedProducer: bo.assigned_producer || null,
    mixStartDate: bo.mix_start_date || undefined,
    mixEndDate: bo.mix_end_date || undefined,
    eightCountSheet: (bo.eight_count_sheet as any) || undefined,
    haveSongs: (bo.have_songs as any) || undefined,
    price: bo.price ?? 0,
    priceCompliance: (bo.price_compliance as any) || "compliant",
    status: bo.status || "new",
    createdAt: bo.created_at || new Date().toISOString(),
    completedAt: bo.completed_at || null,
    needsAttention: Boolean(bo.needs_attention),
    attentionReason: bo.attention_reason || null,
    missingDataEmailSentAt: bo.missing_data_email_sent_at || null,
    producerEmailSentAt: bo.producer_email_sent_at || null,
    producerEmailSentTo: bo.producer_email_sent_to || null,
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
  if (patch.packageType !== undefined) payload.package_type = patch.packageType;
  if (patch.timeLengthOfMix !== undefined) {
    payload.time_length_of_mix = patch.timeLengthOfMix;
  }
  if (patch.musicAffiliate !== undefined) {
    payload.music_affiliate = patch.musicAffiliate;
  }
  if (patch.affiliateFlagStatus !== undefined) {
    payload.affiliate_flag_status = patch.affiliateFlagStatus;
  }
  if (patch.musicAffiliateSelections !== undefined) {
    payload.music_affiliate_selections = patch.musicAffiliateSelections;
  }
  if (patch.routineNotes !== undefined) payload.routine_notes = patch.routineNotes;
  if (patch.powerMusicCovers !== undefined) {
    payload.power_music_covers = patch.powerMusicCovers;
  }
  if (patch.customVoiceovers !== undefined) {
    payload.custom_voiceovers = patch.customVoiceovers;
  }
  if (patch.voiceoverScript !== undefined) {
    payload.voiceover_script = patch.voiceoverScript;
  }
  if (patch.pronunciationGuidance !== undefined) {
    payload.pronunciation_guidance = patch.pronunciationGuidance;
  }
  if (patch.style !== undefined) payload.style = patch.style;
  if (patch.licensingRequired !== undefined) {
    payload.licensing_required = patch.licensingRequired;
  }
  if (patch.instrumentationNotes !== undefined) {
    payload.instrumentation_notes = patch.instrumentationNotes;
  }
  if (patch.lyricalNotes !== undefined) {
    payload.lyrical_notes = patch.lyricalNotes;
  }
  if (patch.isRushOrder !== undefined) {
    payload.is_rush_order = patch.isRushOrder;
  }
  if (patch.mergedFormOrderId !== undefined) {
    payload.merged_form_order_id = patch.mergedFormOrderId;
  }
  if (patch.mergedIntoManualOrderId !== undefined) {
    payload.merged_into_manual_order_id = patch.mergedIntoManualOrderId;
  }
  if (patch.manualOverlapSnapshot !== undefined) {
    payload.manual_overlap_snapshot = patch.manualOverlapSnapshot;
  }
  if (patch.suppressManualFormMerge !== undefined) {
    payload.suppress_manual_form_merge = patch.suppressManualFormMerge;
  }
  if (patch.isManualEntry !== undefined) {
    payload.is_manual_entry = patch.isManualEntry;
  }
  if (patch.nicknames !== undefined) payload.nicknames = patch.nicknames;
  if (patch.vocalsPreference !== undefined) {
    payload.vocals_preference = patch.vocalsPreference;
  }
  if (patch.instrumentalStylePreference !== undefined) {
    payload.instrumental_style_preference = patch.instrumentalStylePreference;
  }
  if (patch.mascot !== undefined) payload.mascot = patch.mascot;
  if (patch.colors !== undefined) payload.colors = patch.colors;
  if (patch.teamColors !== undefined) payload.team_colors = patch.teamColors;
  if (patch.schoolProgramColors !== undefined) {
    payload.colors = patch.schoolProgramColors;
    payload.team_colors = patch.schoolProgramColors;
  }
  if (patch.schoolBillingAddress !== undefined) {
    payload.school_billing_address = patch.schoolBillingAddress;
  }
  if (patch.schoolOrganizationName !== undefined) {
    payload.school_program_name = patch.schoolOrganizationName;
    payload.program_name = patch.schoolOrganizationName;
  }
  if (patch.musicContactName !== undefined) {
    payload.coach_name = patch.musicContactName;
  }
  if (patch.musicContactPhone !== undefined) {
    payload.coach_phone = patch.musicContactPhone;
  }
  if (patch.musicContactEmail !== undefined) {
    payload.coach_email = patch.musicContactEmail;
  }
  if (patch.songListSuggestions !== undefined) {
    payload.song_list_suggestions = patch.songListSuggestions;
  }
  if (patch.schoolProgramName !== undefined) {
    payload.school_program_name = patch.schoolProgramName;
  }
  if (patch.schoolAddress !== undefined) {
    payload.school_address = patch.schoolAddress;
  }
  if (patch.schoolGymAddress !== undefined) {
    payload.school_address = patch.schoolGymAddress;
  }
  if (patch.city !== undefined) payload.city = patch.city;
  if (patch.stateProvince !== undefined) {
    payload.state_province = patch.stateProvince;
  }
  if (patch.zipPostalCode !== undefined) {
    payload.zip_postal_code = patch.zipPostalCode;
  }
  if (patch.country !== undefined) payload.country = patch.country;
  if (patch.division !== undefined) payload.division = patch.division;
  if (patch.divisionOfTeam !== undefined) payload.division = patch.divisionOfTeam;
  if (patch.coachName !== undefined) payload.coach_name = patch.coachName;
  if (patch.coachPhone !== undefined) payload.coach_phone = patch.coachPhone;
  if (patch.coachEmail !== undefined) payload.coach_email = patch.coachEmail;
  if (patch.billingPersonName !== undefined) {
    payload.billing_person_name = patch.billingPersonName;
  }
  if (patch.billingPersonEmail !== undefined) {
    payload.billing_person_email = patch.billingPersonEmail;
  }
  if (patch.choreographerName !== undefined) {
    payload.choreographer_name = patch.choreographerName;
  }
  if (patch.choreographerEmail !== undefined) {
    payload.choreographer_email = patch.choreographerEmail;
  }
  if (patch.numberOfCopies !== undefined) {
    payload.number_of_copies = patch.numberOfCopies;
  }
  if (patch.couponCode !== undefined) payload.coupon_code = patch.couponCode;
  if (patch.formType !== undefined) payload.form_type = patch.formType;
  if (patch.danceFormSubtype !== undefined) {
    payload.dance_form_subtype = patch.danceFormSubtype;
  }
  if (patch.cheerFormSubtype !== undefined) {
    payload.cheer_form_subtype = patch.cheerFormSubtype;
  }
  if (patch.splitOrNoSplit !== undefined) {
    payload.split_or_no_split = patch.splitOrNoSplit;
  }
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.finalCustomerPrice !== undefined) {
    payload.final_customer_price = patch.finalCustomerPrice;
  }
  if (patch.finalCustomerPriceOverridden !== undefined) {
    payload.final_customer_price_overridden = patch.finalCustomerPriceOverridden;
  }
  if (patch.priceCompliance !== undefined) {
    payload.price_compliance = patch.priceCompliance;
  }
  if (patch.musicTheme !== undefined) payload.music_theme = patch.musicTheme;
  if (patch.editorRequest !== undefined) payload.editor_request = patch.editorRequest;
  if (patch.requestedProducer !== undefined) payload.requested_producer = patch.requestedProducer;
  if (patch.requestedEditor !== undefined) payload.requested_editor = patch.requestedEditor;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.needsAttention !== undefined) payload.needs_attention = patch.needsAttention;
  if (patch.attentionReason !== undefined) payload.attention_reason = patch.attentionReason;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
  if (patch.collectionStates !== undefined) payload.collection_states = patch.collectionStates;
  if ((patch as any).collection_states !== undefined) payload.collection_states = (patch as any).collection_states;
  if (patch.isReassigned !== undefined) payload.is_reassigned = patch.isReassigned;
  if (patch.missingDataEmailSentAt !== undefined) {
    payload.missing_data_email_sent_at = patch.missingDataEmailSentAt;
  }
  if (patch.producerEmailSentAt !== undefined) {
    payload.producer_email_sent_at = patch.producerEmailSentAt;
  }
  if (patch.producerEmailSentTo !== undefined) {
    payload.producer_email_sent_to = patch.producerEmailSentTo;
  }
  if ((patch as any).orderStatus !== undefined) payload.order_status = (patch as any).orderStatus;
  if ((patch as any).order_status !== undefined) payload.order_status = (patch as any).order_status;
  if (patch.assignedProducer !== undefined) payload.assigned_producer = patch.assignedProducer;
  if ((patch as any).assigned_producer !== undefined) payload.assigned_producer = (patch as any).assigned_producer;
  if (patch.mixStartDate !== undefined) {
    payload.mix_start_date = patch.mixStartDate || null;
  }
  if ((patch as any).mix_start_date !== undefined) {
    payload.mix_start_date = (patch as any).mix_start_date || null;
  }
  if (patch.mixEndDate !== undefined) {
    payload.mix_end_date = patch.mixEndDate || null;
  }
  if ((patch as any).mix_end_date !== undefined) {
    payload.mix_end_date = (patch as any).mix_end_date || null;
  }
  if (patch.haveSongs !== undefined) payload.have_songs = patch.haveSongs;
  if ((patch as any).have_songs !== undefined) payload.have_songs = (patch as any).have_songs;
  if (patch.eightCountSheet !== undefined) payload.eight_count_sheet = patch.eightCountSheet;
  if ((patch as any).eight_count_sheet !== undefined) payload.eight_count_sheet = (patch as any).eight_count_sheet;

  try {
    const res = await apiClient.patch<BackendOrder>(`/api/orders/${id}`, payload);
    return transformOrder(res);
  } catch (err) {
    // Never fake success — callers must handle failure or the UI lies.
    throw err;
  }
}
