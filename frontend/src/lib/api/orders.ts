import { apiClient } from "./client";
import { parseDanceSongCovers } from "@/lib/dance-song-covers";
import type { Order, OrderFormType, CheerFormSubtype, DanceFormSubtype } from "@/types";

export interface BackendOrder {
  id: string;
  form_type?: string;
  cheer_form_subtype?: string | null;
  dance_form_subtype?: string | null;
  /** @deprecated alias of school_gym_name — kept for older payloads */
  school_program_name?: string | null;
  school_gym_name?: string | null;
  school_gym_billing_address?: string | null;
  /** @deprecated alias of school_gym_billing_address */
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
  /** @deprecated packed into song_list_suggestions */
  power_music_covers?: string | null;
  /** @deprecated packed into song_list_suggestions */
  unleash_the_beats_covers?: string | null;
  routine_notes?: string | null;
  custom_voiceovers?: string | null;
  voiceover_script?: string | null;
  pronunciation_guidance?: string | null;
  style?: string | null;
  licensing_required?: string | null;
  instrumentation_notes?: string | null;
  lyrical_notes?: string | null;
  is_rush_order?: string | null;
  client_requested_rush_order?: string | null;
  nicknames?: string | null;
  vocals_preference?: string | null;
  instrumental_style_preference?: string | null;
  gym_name?: string | null;
  /** @deprecated alias of school_gym_billing_address */
  gym_billing_address?: string | null;
  team_name?: string | null;
  team_coed_all_girl?: string | null;
  colors?: string | null;
  /** @deprecated alias of colors */
  team_colors?: string | null;
  /** @deprecated alias of school_gym_name */
  school_name?: string | null;
  /** @deprecated alias of school_gym_billing_address */
  school_billing_address?: string | null;
  mascot?: string | null;
  split_or_no_split?: string | null;
  varsity_viroc_customer?: string | null;
  /** @deprecated alias of choreographer_name */
  viroc_choreographer_name?: string | null;
  /** @deprecated alias of choreographer_email */
  viroc_choreographer_email?: string | null;
  /** @deprecated alias of colors */
  youth_rec_colors?: string | null;
  /** @deprecated alias of colors */
  school_program_colors?: string | null;
  /** @deprecated alias of school_gym_billing_address */
  youth_rec_billing_address?: string | null;
  /** @deprecated alias of school_gym_billing_address */
  organization_billing_address?: string | null;
  /** @deprecated alias of coach_name */
  coach_contact_full_name?: string | null;
  /** @deprecated alias of coach_email */
  coach_email_address?: string | null;
  /** @deprecated alias of billing_person_email (Youth Rec Magento label). */
  youth_rec_extra_email_address?: string | null;
  /** @deprecated alias of billing_person_email */
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
  client_requested_mix_due_date?: string | null;
  received_eight_count_sheet?: string | null;
  have_songs?: string | null;

  customer_name: string;
  contact_name: string;
  program_name?: string | null;
  category?: string | null;
  package: string;
  music_theme?: string | null;
  editor_initials?: string | null;
  /** @deprecated alias of editor_initials */
  editor_request?: string | null;
  /** @deprecated alias of requested_editor */
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
}

export function transformOrder(bo: BackendOrder): Order {
  const formType = (bo.form_type as OrderFormType) || "school-all-star-cheer";
  const cheerFormSubtype = bo.cheer_form_subtype as CheerFormSubtype | undefined;
  const isAllStar =
    cheerFormSubtype === "all-star-cheer" ||
    (formType === "school-all-star-cheer" && !cheerFormSubtype);
  // SoT columns (UI aliases below mirror these — do not cross-leak identity ↔ contact).
  const schoolName = String(bo.school_gym_name || "").trim();
  const billing = String(bo.school_gym_billing_address || "").trim();
  const colors = String(bo.colors || "").trim();
  const coach = String(bo.coach_name || "").trim();
  const coachEmail = String(bo.coach_email || "").trim();
  const choreographer = String(bo.choreographer_name || "").trim();
  const choreographerEmail = String(bo.choreographer_email || "").trim();
  const sendingEight = String(bo.sending_eight_count_sheets || "").trim();
  const songList = String(bo.song_list_suggestions || "").trim();
  const routineNotes = String(bo.routine_notes || "").trim();
  const requestedEditor = String(bo.requested_editor || "").trim();
  // Youth Rec Magento "Email Address" shares billing_person_email SoT.
  const billingPersonEmail = String(bo.billing_person_email || "").trim();
  // Dance Magento cover boxes packed in song_list_suggestions.
  const danceCovers = parseDanceSongCovers(songList);
  const powerMusicCovers =
    String(bo.power_music_covers || "").trim() || danceCovers.power;
  const unleashTheBeatsCovers =
    String(bo.unleash_the_beats_covers || "").trim() || danceCovers.unleash;

  const personNotIdentity = (value: string | null | undefined) => {
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^(contact|customer)$/i.test(v)) return "";
    if (schoolName && v.toLowerCase() === schoolName.toLowerCase()) return "";
    return v;
  };

  // Board contact / Magento Coach / Music Contact → coach_name SoT.
  const personName =
    personNotIdentity(coach) ||
    personNotIdentity(bo.contact_name) ||
    personNotIdentity(bo.customer_name);

  const category =
    formType === "school-all-star-dance"
      ? "Dance"
      : formType === "marching-band"
        ? "Marching Band"
        : formType === "sports-entertainment"
          ? "Sports Entertainment"
          : formType === "school-anthem"
            ? "School Anthem"
            : "Cheer";

  return {
    // Always use the DB UUID — legacy_id is retired.
    id: bo.id,
    uuid: bo.id,
    formType,
    cheerFormSubtype,
    danceFormSubtype: bo.dance_form_subtype as DanceFormSubtype | undefined,
    // Identity aliases → school_gym_name.
    schoolProgramName: schoolName,
    schoolName: schoolName || undefined,
    organizationName: schoolName || undefined,
    schoolOrganizationName: schoolName || undefined,
    gymName: isAllStar ? schoolName || undefined : schoolName || undefined,
    // Billing aliases → school_gym_billing_address.
    schoolAddress: billing,
    schoolGymAddress: billing || undefined,
    gymBillingAddress: billing || undefined,
    schoolBillingAddress: billing || undefined,
    youthRecBillingAddress: billing || undefined,
    organizationBillingAddress: billing || undefined,
    city: bo.city || "",
    stateProvince: bo.state_province || "",
    zipPostalCode: bo.zip_postal_code || "",
    country: bo.country || "United States",
    division: bo.division || "",
    divisionOfTeam: bo.division || "",
    // Coach / Music Contact aliases → coach_name (never school identity).
    coachName: personName,
    coachContactFullName: personName || undefined,
    musicContactName: personName || undefined,
    coachPhone: bo.coach_phone || "",
    coachEmail,
    coachEmailAddress: coachEmail || undefined,
    billingPersonName: bo.billing_person_name || "",
    billingPersonEmail,
    billingContactName: bo.billing_person_name || "",
    billingContactEmail: billingPersonEmail,
    // Deprecated Youth Rec aliases → billing_person_email.
    youthRecExtraEmailAddress: billingPersonEmail || undefined,
    emailAddress: billingPersonEmail || undefined,
    // Choreographer aliases → choreographer_name / email.
    choreographerName: choreographer,
    choreographerEmail,
    virocChoreographerName: choreographer || undefined,
    virocChoreographerEmail: choreographerEmail || undefined,
    numberOfCopies: bo.number_of_copies || "",
    packageType:
      formType === "school-anthem"
        ? "SCHOOL ANTHEMS"
        : bo.package_type || "",
    requestedEditor,
    // Client form "Length of Mix" → time_length_of_mix.
    // Cheer may fall back to time encoded in package (GOLD 2:00); other forms
    // must not — package-time refill makes a cleared SE Time Length reappear.
    timeLengthOfMix:
      bo.time_length_of_mix ||
      (formType === "school-all-star-cheer"
        ? (() => {
            const fromPkg = String(bo.package || bo.package_type || "").match(
              /\d+:\d{2}/
            );
            return fromPkg ? fromPkg[0] : "";
          })()
        : ""),
    musicAffiliate: bo.music_affiliate || "",
    affiliateFlagStatus:
      bo.affiliate_flag_status === "open" ||
      bo.affiliate_flag_status === "resolved" ||
      bo.affiliate_flag_status === "released"
        ? bo.affiliate_flag_status
        : null,
    musicAffiliateSelections: bo.music_affiliate_selections || null,
    powerMusicCovers,
    unleashTheBeatsCovers,
    routineNotes,
    additionalNotes: routineNotes,
    // Anthem Lyrical Notes / MB fight-alma notes → routine_notes.
    lyricalNotes: routineNotes,
    songListSuggestions: songList || undefined,
    customerSongs: songList,
    // Anthem style preference / MB instrumentation → song_list_suggestions.
    instrumentationNotes: songList,
    instrumentalStylePreference: songList,
    customVoiceovers: bo.custom_voiceovers || "",
    voiceoverScript: bo.voiceover_script || "",
    pronunciationGuidance: bo.pronunciation_guidance || "",
    style: bo.style || "",
    styleOfGamedayMix: bo.style || "",
    licensingRequired: bo.licensing_required || "",
    isRushOrder: bo.is_rush_order || "",
    clientRequestedRushOrder: bo.client_requested_rush_order || "",
    nicknames: bo.nicknames || "",
    vocalsPreference: bo.vocals_preference || "",
    teamName: bo.team_name || undefined,
    teamCoedAllGirl: bo.team_coed_all_girl || undefined,
    // Colors aliases → colors.
    teamColors: colors || undefined,
    youthRecColors: colors || undefined,
    schoolProgramColors: colors || undefined,
    mascot: bo.mascot || undefined,
    splitOrNoSplit: bo.split_or_no_split || undefined,
    varsityVirocCustomer: (() => {
      const raw = String(bo.varsity_viroc_customer || "").trim().toLowerCase();
      if (raw === "yes" || raw === "y" || raw === "true") return "Yes";
      if (raw === "no" || raw === "n" || raw === "false") return "No";
      // Fall back from Magento subtype when the DB flag was never set.
      if (cheerFormSubtype === "school-cheer-viroc-yes") return "Yes";
      if (cheerFormSubtype === "school-cheer-viroc-no") return "No";
      return undefined;
    })(),
    sendingEightCountSheets: sendingEight || undefined,
    usingEightCountSheets: sendingEight || undefined,
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

    // Person columns only — never school_gym_name.
    customerName: personNotIdentity(bo.customer_name) || personName,
    contactName: personName,
    programName: schoolName,
    category,
    package:
      formType === "school-anthem"
        ? "SCHOOL ANTHEMS"
        : bo.package || bo.package_type || "TBD",
    musicTheme: bo.music_theme || "",
    // editor_initials = FA / short code; requested_editor = Magento producer name.
    editorRequest: bo.editor_initials || "FA",
    requestedProducer: requestedEditor,
    assignedProducer: bo.assigned_producer || null,
    mixStartDate: bo.mix_start_date || undefined,
    mixEndDate: bo.mix_end_date || undefined,
    clientRequestedMixDueDate:
      bo.client_requested_mix_due_date || undefined,
    eightCountSheet: bo.received_eight_count_sheet || undefined,
    haveSongs: (bo.have_songs as any) || undefined,
    price: formType === "school-anthem" ? 1250 : bo.price ?? 0,
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
  const formType = order.formType || "school-all-star-cheer";
  // Contact / customer are people — do not seed them from school/org identity.
  const personName =
    order.musicContactName ||
    order.coachName ||
    order.coachContactFullName ||
    order.contactName ||
    order.customerName ||
    "";
  const payload = {
    customer_name: personName || null,
    contact_name: personName || null,
    // Derived on the server from form_type; keep payload fields for older APIs.
    program_name: null,
    category:
      formType === "school-all-star-dance"
        ? "Dance"
        : formType === "marching-band"
          ? "Marching Band"
          : formType === "sports-entertainment"
            ? "Sports Entertainment"
            : formType === "school-anthem"
              ? "School Anthem"
              : "Cheer",
    school_gym_name:
      order.schoolName ||
      order.gymName ||
      order.schoolProgramName ||
      order.organizationName ||
      order.schoolOrganizationName ||
      order.programName ||
      null,
    package:
      formType === "school-anthem"
        ? "SCHOOL ANTHEMS"
        : order.package || "TBD",
    package_type:
      formType === "school-anthem"
        ? "SCHOOL ANTHEMS"
        : order.packageType || null,
    price: formType === "school-anthem" ? 1250 : order.price ?? 0,
    music_theme: order.musicTheme || null,
    editor_initials: order.editorRequest || "FA",
    requested_editor:
      order.requestedEditor || order.requestedProducer || null,
    form_type: formType,
    cheer_form_subtype: order.cheerFormSubtype || null,
    dance_form_subtype: order.danceFormSubtype || null,
    varsity_viroc_customer:
      order.varsityVirocCustomer ||
      (order.cheerFormSubtype === "school-cheer-viroc-yes"
        ? "Yes"
        : order.cheerFormSubtype === "school-cheer-viroc-no"
          ? "No"
          : null),
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
  const cheerSubtype = patch.cheerFormSubtype;
  const formType = patch.formType;
  const isAllStarCheer =
    formType === "school-all-star-cheer" &&
    (!cheerSubtype || cheerSubtype === "all-star-cheer");
  const isSchoolCheer =
    cheerSubtype === "school-cheer-viroc-yes" ||
    cheerSubtype === "school-cheer-viroc-no";

  // Identity SoT: school_gym_name for every form (Gym / School / Program / Org).
  payload.program_name = null;
  if (patch.category !== undefined || patch.formType !== undefined) {
    const ft = formType || "school-all-star-cheer";
    payload.category =
      ft === "school-all-star-dance"
        ? "Dance"
        : ft === "marching-band"
          ? "Marching Band"
          : ft === "sports-entertainment"
            ? "Sports Entertainment"
            : ft === "school-anthem"
              ? "School Anthem"
              : "Cheer";
  }

  // Prefer first *defined* alias (including "") so explicit clears stick.
  // Synced UI patches write the same value to every alias; non-empty-first
  // previously revived a stale sibling after the user cleared the field.
  const firstDefined = (
    aliases: Array<string | undefined | null>
  ): string | undefined => {
    for (const v of aliases) {
      if (v !== undefined && v !== null) return String(v);
    }
    return undefined;
  };
  const identityAliases = [
    patch.schoolName,
    patch.gymName,
    patch.schoolProgramName,
    patch.organizationName,
    patch.schoolOrganizationName,
    patch.programName,
  ];
  if (identityAliases.some((v) => v !== undefined)) {
    payload.school_gym_name = firstDefined(identityAliases) ?? "";
  }
  const billingAliases = [
    patch.gymBillingAddress,
    patch.schoolBillingAddress,
    patch.youthRecBillingAddress,
    patch.organizationBillingAddress,
    patch.schoolGymAddress,
    patch.schoolAddress,
  ];
  if (billingAliases.some((v) => v !== undefined)) {
    payload.school_gym_billing_address = firstDefined(billingAliases) ?? "";
  }
  if (patch.teamName !== undefined) {
    payload.team_name = patch.teamName;
  }
  if (patch.teamCoedAllGirl !== undefined) {
    payload.team_coed_all_girl = patch.teamCoedAllGirl;
  }
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
  if (
    patch.routineNotes !== undefined ||
    patch.additionalNotes !== undefined ||
    patch.lyricalNotes !== undefined
  ) {
    // Anthem Lyrical Notes / MB fight-alma → routine_notes SoT.
    payload.routine_notes =
      patch.routineNotes ??
      patch.additionalNotes ??
      patch.lyricalNotes ??
      null;
  }
  // Dance covers → aliases; backend packs into song_list_suggestions.
  if (patch.powerMusicCovers !== undefined) {
    payload.power_music_covers = patch.powerMusicCovers;
  }
  if (patch.unleashTheBeatsCovers !== undefined) {
    payload.unleash_the_beats_covers = patch.unleashTheBeatsCovers;
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
  if (patch.style !== undefined || patch.styleOfGamedayMix !== undefined) {
    payload.style = patch.style ?? patch.styleOfGamedayMix ?? null;
  }
  if (patch.licensingRequired !== undefined) {
    payload.licensing_required = patch.licensingRequired;
  }
  if (patch.isRushOrder !== undefined) {
    payload.is_rush_order = patch.isRushOrder;
  }
  if (patch.clientRequestedRushOrder !== undefined) {
    payload.client_requested_rush_order = patch.clientRequestedRushOrder;
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
  if (patch.mascot !== undefined) payload.mascot = patch.mascot;
  const colorAliases = [
    patch.teamColors,
    patch.youthRecColors,
    patch.schoolProgramColors,
  ];
  if (colorAliases.some((v) => v !== undefined)) {
    payload.colors = firstDefined(colorAliases) ?? "";
  }
  if (patch.musicContactPhone !== undefined) {
    payload.coach_phone = patch.musicContactPhone;
  }
  if (patch.musicContactEmail !== undefined) {
    payload.coach_email = patch.musicContactEmail;
  }
  if (
    patch.songListSuggestions !== undefined ||
    patch.customerSongs !== undefined ||
    patch.instrumentationNotes !== undefined ||
    patch.instrumentalStylePreference !== undefined
  ) {
    // Anthem style preference / MB instrumentation → song_list_suggestions SoT.
    payload.song_list_suggestions =
      patch.songListSuggestions ??
      patch.customerSongs ??
      patch.instrumentationNotes ??
      patch.instrumentalStylePreference ??
      null;
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
  // Coach / Music Contact Magento labels → coach_name SoT (+ board contact mirror).
  const coachNameAliases = [
    patch.coachName,
    patch.coachContactFullName,
    patch.musicContactName,
  ];
  if (coachNameAliases.some((v) => v !== undefined)) {
    const coach = firstDefined(coachNameAliases) ?? "";
    payload.coach_name = coach;
    if (patch.contactName === undefined) payload.contact_name = coach;
    if (patch.customerName === undefined) payload.customer_name = coach;
  }
  if (patch.coachPhone !== undefined) payload.coach_phone = patch.coachPhone;
  const coachEmailAliases = [patch.coachEmail, patch.coachEmailAddress];
  if (coachEmailAliases.some((v) => v !== undefined)) {
    payload.coach_email = firstDefined(coachEmailAliases) ?? "";
  }
  const billingNameAliases = [
    patch.billingPersonName,
    patch.billingContactName,
  ];
  if (billingNameAliases.some((v) => v !== undefined)) {
    payload.billing_person_name = firstDefined(billingNameAliases) ?? "";
  }
  const billingEmailAliases = [
    patch.billingPersonEmail,
    patch.billingContactEmail,
    patch.youthRecExtraEmailAddress,
    patch.emailAddress,
  ];
  if (billingEmailAliases.some((v) => v !== undefined)) {
    payload.billing_person_email = firstDefined(billingEmailAliases) ?? "";
  }
  const choreographerNameAliases = [
    patch.choreographerName,
    patch.virocChoreographerName,
  ];
  if (choreographerNameAliases.some((v) => v !== undefined)) {
    payload.choreographer_name = firstDefined(choreographerNameAliases) ?? "";
  }
  const choreographerEmailAliases = [
    patch.choreographerEmail,
    patch.virocChoreographerEmail,
  ];
  if (choreographerEmailAliases.some((v) => v !== undefined)) {
    payload.choreographer_email = firstDefined(choreographerEmailAliases) ?? "";
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
    if (patch.varsityVirocCustomer === undefined) {
      if (patch.cheerFormSubtype === "school-cheer-viroc-yes") {
        payload.varsity_viroc_customer = "Yes";
      } else if (patch.cheerFormSubtype === "school-cheer-viroc-no") {
        payload.varsity_viroc_customer = "No";
      }
    }
  }
  if (patch.varsityVirocCustomer !== undefined) {
    payload.varsity_viroc_customer = patch.varsityVirocCustomer;
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
  if (patch.editorRequest !== undefined) {
    payload.editor_initials = patch.editorRequest;
  }
  const requestedEditorAliases = [
    patch.requestedEditor,
    patch.requestedProducer,
  ];
  if (requestedEditorAliases.some((v) => v !== undefined)) {
    payload.requested_editor = firstDefined(requestedEditorAliases) ?? "";
  }
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
  if (patch.clientRequestedMixDueDate !== undefined) {
    payload.client_requested_mix_due_date =
      patch.clientRequestedMixDueDate || null;
  }
  if (patch.haveSongs !== undefined) payload.have_songs = patch.haveSongs;
  if ((patch as any).have_songs !== undefined) payload.have_songs = (patch as any).have_songs;
  if (patch.eightCountSheet !== undefined) {
    payload.received_eight_count_sheet = patch.eightCountSheet;
  }
  if ((patch as any).received_eight_count_sheet !== undefined) {
    payload.received_eight_count_sheet = (patch as any).received_eight_count_sheet;
  }
  // Magento sending/using 8-count sheets → one SoT column.
  if (
    patch.sendingEightCountSheets !== undefined ||
    patch.usingEightCountSheets !== undefined
  ) {
    payload.sending_eight_count_sheets =
      patch.sendingEightCountSheets ?? patch.usingEightCountSheets ?? null;
  }
  if (patch.howDidYouFindOut !== undefined) {
    payload.how_did_you_find_out = patch.howDidYouFindOut;
  }

  try {
    const res = await apiClient.patch<BackendOrder>(`/api/orders/${id}`, payload);
    return transformOrder(res);
  } catch (err) {
    // Never fake success — callers must handle failure or the UI lies.
    throw err;
  }
}
