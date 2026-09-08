export type PriceCompliance = "compliant" | "non-compliant";

export type EditorRequest = "FA" | "NA" | string;

export type MTDRecord = {
  id: string;
  legacyId?: string;
  uuid?: string;
  orderId?: string | null;
  section: string;
  assignedProducer: string | null;
  category: string;
  editorRequest: EditorRequest;
  contactName: string;
  editorInitials: string;
  programName: string;
  package: string;
  musicTheme: string;
  price: number;
  priceCompliance: PriceCompliance;
  invoice: string;
  mixStartDate: string;
  /** Target completion date for the mix */
  mixEndDate?: string;
  /** What production is waiting on (in-progress board) */
  waitingOn?: string | null;
  eightCountSheet: string;
  haveSongs: string;
  needsAttention: boolean;
  status: "active" | "outsourced" | "needs_attention" | "completed";
  recordStatus?: MTDRecordStatus;
  /** Completed mixes moved off the MTD board into payroll */
  inPayroll?: boolean;
  completedAt?: string;
  hasRallyMix?: boolean;
  hasExtend8ctAddon?: boolean;
  hasProcessing8ctSheetsAddon?: boolean;
  hasTraditionalVoiceover?: boolean;
  hasThemedVoiceover?: boolean;
  danceVoiceover?: "25" | "75" | "100" | null;
  cheerVoiceover20?: boolean;
  cheerVoiceover40?: boolean;
  rushFeeOption?: "none" | "single" | "double" | string | null;
  extraSongsQuantity?: number;
  extraSongEditingTimeQuantity?: number;
  hasSheetMusicAdd?: boolean;
  hasAddVocals?: boolean;
  isRushOrder?: "yes" | "no" | boolean | string;
  systemCalculatedCustomerPrice?: number | null;
  finalCustomerPrice?: number | null;
  finalCustomerPriceOverridden?: boolean;
  pricingBreakdown?: any;
  rateUsed?: number | null;
  rateSource?: string | null;
  producerPayout?: number | null;
  sltPortion?: number | null;
  payrollFinalized?: boolean;
  payrollBreakdown?: any;
};

export type Weekday =
  | "sun"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat";

export type ProducerTimeOff = {
  id: string;
  /** Inclusive start YYYY-MM-DD */
  startDate: string;
  /** Inclusive end YYYY-MM-DD (same as start for a single day) */
  endDate: string;
  type: "holiday" | "personal";
  reason: string;
};

export type ProducerCompensationModel =
  | "percentage_of_payroll_base"
  | "hourly_manual"
  | "not_paid_for_mixing"
  | null;

export type ProducerManualInputField = {
  label: string;
  rate_or_null: number | null;
};

export type Producer = {
  id: string;
  name: string;
  initials: string;
  email: string;
  /**
   * The producer's full list of supported categories.
   * Use this for all assignment and eligibility checks.
   */
  categories: string[];
  /**
   * Kept for backward-compatibility and display fallback.
   * Derived from categories[0] where possible.
   */
  specialty: string;
  avatar: string;
  mixesThisWeek: number;
  nextAvailable: string;
  status: "available" | "limited" | "unavailable";
  /** Days of the week this producer normally works */
  workDays: Weekday[];
  /** Holidays or personal unavailability windows */
  timeOff: ProducerTimeOff[];
  /** Max mixes per working day; null = no limit (default) */
  maxMixesPerDay: number | null;
  /** Max producer payroll cost per day; null = no limit (default) */
  maxProducerCostPerDay: number | null;
  /** One-off extra work days (YYYY-MM-DD), outside regular workDays */
  overtimeDays: string[];
  compensationModel?: ProducerCompensationModel;
  defaultRate?: number | null;
  ratesByCategory?: Record<string, number> | null;
  rateOverrides?: Record<string, number> | null;
  manualInputFields?: ProducerManualInputField[] | null;
  notes?: string | null;
};

export const WEEKDAYS: { id: Weekday; label: string; short: string }[] = [
  { id: "sun", label: "Sunday", short: "Sun" },
  { id: "mon", label: "Monday", short: "Mon" },
  { id: "tue", label: "Tuesday", short: "Tue" },
  { id: "wed", label: "Wednesday", short: "Wed" },
  { id: "thu", label: "Thursday", short: "Thu" },
  { id: "fri", label: "Friday", short: "Fri" },
  { id: "sat", label: "Saturday", short: "Sat" },
];

export const DEFAULT_WORK_DAYS: Weekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
];

/**
 * The 11 canonical producer categories used for assignment eligibility.
 * These are the values stored in Producer.categories[].
 */
export const PRODUCER_CATEGORIES = [
  "All-Star Cheer",
  "School Cheer",
  "Youth Rec Cheer",
  "Pom",
  "Hip Hop",
  "Team Performance / Variety",
  "Gameday",
  "Jazz / Kick",
  "Marching Band",
  "Sports Entertainment",
  "School Anthem",
] as const;

export type ProducerCategory = (typeof PRODUCER_CATEGORIES)[number];

export type OrderFormType =
  | "school-all-star-cheer"
  | "school-all-star-dance"
  | "marching-band"
  | "sports-entertainment"
  | "school-anthem";

export const ORDER_FORM_TABS: { id: OrderFormType; label: string }[] = [
  { id: "school-all-star-cheer", label: "All Star Cheer" },
  { id: "school-all-star-dance", label: "All Star Dance" },
  { id: "marching-band", label: "Marching Band" },
  { id: "sports-entertainment", label: "Sports Entertainment" },
  { id: "school-anthem", label: "School Anthem" },
];

export type CheerFormSubtype =
  | "all-star-cheer"
  | "school-cheer-viroc-yes"
  | "school-cheer-viroc-no"
  | "youth-rec-cheer";

export type CheerFormSubtypeFilter = "all" | CheerFormSubtype;

export const CHEER_FORM_SUBTABS: { id: CheerFormSubtype; label: string }[] = [
  { id: "all-star-cheer", label: "All Star Cheer" },
  { id: "school-cheer-viroc-yes", label: "School Cheer · VIROC Yes" },
  { id: "school-cheer-viroc-no", label: "School Cheer · VIROC No" },
  { id: "youth-rec-cheer", label: "Youth Rec Cheer" },
];

export const CHEER_FORM_SUBTABS_WITH_ALL: { id: CheerFormSubtypeFilter; label: string }[] = [
  { id: "all", label: "All Cheer" },
  ...CHEER_FORM_SUBTABS,
];

export type DanceFormSubtype =
  | "pom"
  | "hip-hop"
  | "team-performance-variety"
  | "gameday"
  | "jazz-kick";

export type DanceFormSubtypeFilter = "all" | DanceFormSubtype;

export const DANCE_FORM_SUBTABS: { id: DanceFormSubtype; label: string }[] = [
  { id: "pom", label: "POM" },
  { id: "hip-hop", label: "Hip Hop" },
  { id: "team-performance-variety", label: "Team Performance & Variety" },
  { id: "gameday", label: "Gameday" },
  { id: "jazz-kick", label: "Jazz/Kick" },
];

export const DANCE_FORM_SUBTABS_WITH_ALL: { id: DanceFormSubtypeFilter; label: string }[] = [
  { id: "all", label: "All Dance" },
  ...DANCE_FORM_SUBTABS,
];

export type BaseOrderAdminFields = {
  id: string;
  legacyId?: string;
  uuid?: string;
  mtdId?: string;
  customerName: string;
  contactName: string;
  programName: string;
  category: string;
  package: string;
  musicTheme: string;
  editorRequest: EditorRequest;
  requestedProducer: string;
  assignedProducer?: string | null;
  price: number;
  priceCompliance?: PriceCompliance;
  status: "new" | "active" | "needs_attention" | "completed" | "in_mtd";
  createdAt: string;
  completedAt?: string | null;
  needsAttention: boolean;
  attentionReason: string | null;
  eightCountSheet?: string;
  haveSongs?: string;
  invoice?: string;
  mixStartDate?: string;
  mixEndDate?: string;
  hasRallyMix?: boolean;
  hasExtend8ctAddon?: boolean;
  hasProcessing8ctSheetsAddon?: boolean;
  hasTraditionalVoiceover?: boolean;
  hasThemedVoiceover?: boolean;
  danceVoiceover?: "25" | "75" | "100" | null;
  cheerVoiceover20?: boolean;
  cheerVoiceover40?: boolean;
  rushFeeOption?: "none" | "single" | "double" | string | null;
  extraSongsQuantity?: number;
  extraSongEditingTimeQuantity?: number;
  hasSheetMusicAdd?: boolean;
  hasAddVocals?: boolean;
  isRushOrder?: "yes" | "no" | boolean | string;
  systemCalculatedCustomerPrice?: number | null;
  finalCustomerPrice?: number | null;
  finalCustomerPriceOverridden?: boolean;
  pricingBreakdown?: any;
  rateUsed?: number | null;
  rateSource?: string | null;
  producerPayout?: number | null;
  sltPortion?: number | null;
  payrollFinalized?: boolean;
  payrollBreakdown?: any;
};

/** All-Star Cheer (all-star-cheer) customer-submitted fields */
export type AllStarCheerCustomerFields = {
  gymName: string;
  gymBillingAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  teamName: string;
  division: string;
  teamCoedAllGirl: string;
  teamColors: string;
  numberOfCopies: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  requestedEditor: string;
  packageType: string;
  timeLengthOfMix: string;
  musicAffiliate: string;
  sendingEightCountSheets: string;
  songListSuggestions: string;
  routineNotes: string;
  couponCode: string;
  howDidYouFindOut: string;
};

/** School Cheer, VIROC Yes (school-cheer-viroc-yes) customer-submitted fields */
export type SchoolCheerVirocYesCustomerFields = {
  varsityVirocCustomer: "Yes";
  schoolName: string;
  schoolBillingAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  mascot: string;
  division: string;
  teamCoedAllGirl: string;
  teamColors: string;
  numberOfCopies: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  virocChoreographerName: string;
  virocChoreographerEmail: string;
  requestedEditor: string;
  packageType: string;
  timeLengthOfMix: string;
  splitOrNoSplit: string;
  musicAffiliate: string;
  sendingEightCountSheets: string;
  songListSuggestions: string;
  routineNotes: string;
  couponCode: string;
  howDidYouFindOut: string;
};

/** School Cheer, VIROC No (school-cheer-viroc-no) customer-submitted fields */
export type SchoolCheerVirocNoCustomerFields = {
  varsityVirocCustomer: "No";
  schoolName: string;
  schoolBillingAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  mascot: string;
  division: string;
  teamCoedAllGirl: string;
  teamColors: string;
  numberOfCopies: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  choreographerName: string;
  choreographerEmail: string;
  requestedEditor: string;
  packageType: string;
  timeLengthOfMix: string;
  splitOrNoSplit: string;
  musicAffiliate: string;
  sendingEightCountSheets: string;
  songListSuggestions: string;
  routineNotes: string;
  couponCode: string;
  howDidYouFindOut: string;
};

/** Youth Rec Cheer (youth-rec-cheer) customer-submitted fields */
export type YouthRecCheerCustomerFields = {
  programName: string;
  teamName: string;
  colors: string;
  billingAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  coachContactFullName: string;
  coachEmailAddress: string;
  coachPhone: string;
  emailAddress: string;
  packageType: string;
  timeLengthOfMix: string;
  splitOrNoSplit: string;
  numberOfCopies: string;
  usingEightCountSheets: string;
  songListSuggestions: string;
  routineNotes: string;
  couponCode: string;
  howDidYouFindOut: string;
};

/** POM (pom) customer-submitted fields */
export type PomCustomerFields = {
  schoolProgramName: string;
  schoolGymAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  divisionOfTeam: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  choreographerName: string;
  choreographerEmail: string;
  numberOfCopies: string;
  packageType: string;
  requestedEditor: string;
  timeLengthOfMix: string;
  musicAffiliate: string;
  routineNotes: string;
  customVoiceovers: "yes" | "no" | string;
  voiceoverScript: string;
  pronunciationGuidance: string;
  couponCode: string;
};

/** Hip Hop (hip-hop) customer-submitted fields (no Division of Team) */
export type HipHopCustomerFields = {
  schoolProgramName: string;
  schoolGymAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  choreographerName: string;
  choreographerEmail: string;
  numberOfCopies: string;
  packageType: string;
  requestedEditor: string;
  timeLengthOfMix: string;
  musicAffiliate: string;
  routineNotes: string;
  customVoiceovers: "yes" | "no" | string;
  voiceoverScript: string;
  pronunciationGuidance: string;
  couponCode: string;
};

/** Team Performance & Variety (team-performance-variety) customer-submitted fields */
export type TeamPerformanceVarietyCustomerFields = {
  schoolProgramName: string;
  schoolGymAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  choreographerName: string;
  choreographerEmail: string;
  numberOfCopies: string;
  divisionOfTeam: string;
  style: string;
  requestedEditor: string;
  packageType: string;
  timeLengthOfMix: string;
  musicAffiliate: string;
  routineNotes: string;
  customVoiceovers: "yes" | "no" | string;
  voiceoverScript: string;
  pronunciationGuidance: string;
  couponCode: string;
};

/** Gameday (gameday) customer-submitted fields (no Division of Team, no generic Style field) */
export type GamedayCustomerFields = {
  schoolProgramName: string;
  schoolGymAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  choreographerName: string;
  choreographerEmail: string;
  numberOfCopies: string;
  packageType: string;
  styleOfGamedayMix: string;
  timeLengthOfMix: string;
  requestedEditor: string;
  musicAffiliate: string;
  routineNotes: string;
  customVoiceovers: "yes" | "no" | string;
  voiceoverScript: string;
  pronunciationGuidance: string;
  couponCode: string;
};

/** Jazz/Kick (jazz-kick) customer-submitted fields */
export type JazzKickCustomerFields = {
  schoolProgramName: string;
  schoolGymAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  choreographerName: string;
  choreographerEmail: string;
  numberOfCopies: string;
  divisionOfTeam: string;
  style: string;
  requestedEditor: string;
  packageType: string;
  timeLengthOfMix: string;
  licensingRequired: "yes" | "no" | string;
  musicAffiliate: string;
  routineNotes: string;
  customVoiceovers: "yes" | "no" | string;
  voiceoverScript: string;
  pronunciationGuidance: string;
  couponCode: string;
};

/** Marching Band (marching-band) customer-submitted fields (no subtype) */
export type MarchingBandCustomerFields = {
  schoolProgramName: string;
  schoolGymAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  packageType: string;
  timeLengthOfMix: string;
  instrumentationNotes: string;
  lyricalNotes: string;
};

/** Sports Entertainment (sports-entertainment) customer-submitted fields (no subtype) */
export type SportsEntertainmentCustomerFields = {
  organizationName: string;
  billingAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  musicContactName: string;
  musicContactPhone: string;
  musicContactEmail: string;
  billingContactName: string;
  billingContactEmail: string;
  packageType: string;
  isRushOrder: "yes" | "no" | boolean | string;
  timeLengthOfMix: string;
  customerSongs: string;
  additionalNotes: string;
};

/** School Anthems (school-anthem) customer-submitted fields (no subtype) */
export type SchoolAnthemCustomerFields = {
  schoolOrganizationName: string;
  schoolBillingAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  musicContactName: string;
  musicContactPhone: string;
  musicContactEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  mascot: string;
  schoolProgramColors: string;
  nicknames: string;
  vocalsPreference: string;
  instrumentalStylePreference: string;
  lyricalNotes: string;
  couponCode: string;
};

export type AllStarCheerOrder = BaseOrderAdminFields &
  AllStarCheerCustomerFields & {
    formType: "school-all-star-cheer";
    cheerFormSubtype: "all-star-cheer";
  };

export type SchoolCheerVirocYesOrder = BaseOrderAdminFields &
  SchoolCheerVirocYesCustomerFields & {
    formType: "school-all-star-cheer";
    cheerFormSubtype: "school-cheer-viroc-yes";
  };

export type SchoolCheerVirocNoOrder = BaseOrderAdminFields &
  SchoolCheerVirocNoCustomerFields & {
    formType: "school-all-star-cheer";
    cheerFormSubtype: "school-cheer-viroc-no";
  };

export type YouthRecCheerOrder = BaseOrderAdminFields &
  YouthRecCheerCustomerFields & {
    formType: "school-all-star-cheer";
    cheerFormSubtype: "youth-rec-cheer";
  };

export type CheerOrder =
  | AllStarCheerOrder
  | SchoolCheerVirocYesOrder
  | SchoolCheerVirocNoOrder
  | YouthRecCheerOrder;

export type PomOrder = BaseOrderAdminFields &
  PomCustomerFields & {
    formType: "school-all-star-dance";
    danceFormSubtype: "pom";
  };

export type HipHopOrder = BaseOrderAdminFields &
  HipHopCustomerFields & {
    formType: "school-all-star-dance";
    danceFormSubtype: "hip-hop";
  };

export type TeamPerformanceVarietyOrder = BaseOrderAdminFields &
  TeamPerformanceVarietyCustomerFields & {
    formType: "school-all-star-dance";
    danceFormSubtype: "team-performance-variety";
  };

export type GamedayOrder = BaseOrderAdminFields &
  GamedayCustomerFields & {
    formType: "school-all-star-dance";
    danceFormSubtype: "gameday";
  };

export type JazzKickOrder = BaseOrderAdminFields &
  JazzKickCustomerFields & {
    formType: "school-all-star-dance";
    danceFormSubtype: "jazz-kick";
  };

export type DanceOrder =
  | PomOrder
  | HipHopOrder
  | TeamPerformanceVarietyOrder
  | GamedayOrder
  | JazzKickOrder;

export type MarchingBandOrder = BaseOrderAdminFields &
  MarchingBandCustomerFields & {
    formType: "marching-band";
  };

export type SportsEntertainmentOrder = BaseOrderAdminFields &
  SportsEntertainmentCustomerFields & {
    formType: "sports-entertainment";
  };

export type SchoolAnthemOrder = BaseOrderAdminFields &
  SchoolAnthemCustomerFields & {
    formType: "school-anthem";
  };

export type Order = {
  id: string;
  legacyId?: string;
  uuid?: string;
  mtdId?: string;
  formType: OrderFormType;
  /** Cheer sub-form when formType is school-all-star-cheer */
  cheerFormSubtype?: CheerFormSubtype;
  /** Dance sub-form when formType is school-all-star-dance */
  danceFormSubtype?: DanceFormSubtype;
  varsityVirocCustomer?: "Yes" | "No";
  /** Add-on indicators */
  hasRallyMix?: boolean;
  hasExtend8ctAddon?: boolean;
  hasProcessing8ctSheetsAddon?: boolean;
  hasTraditionalVoiceover?: boolean;
  hasThemedVoiceover?: boolean;
  danceVoiceover?: "25" | "75" | "100" | null;
  cheerVoiceover20?: boolean;
  cheerVoiceover40?: boolean;
  rushFeeOption?: "none" | "single" | "double" | string | null;
  extraSongsQuantity?: number;
  extraSongEditingTimeQuantity?: number;
  hasSheetMusicAdd?: boolean;
  hasAddVocals?: boolean;
  isRushOrder?: "yes" | "no" | boolean | string;
  instrumentationNotes?: string;
  lyricalNotes?: string;
  organizationName?: string;
  musicContactName?: string;
  musicContactPhone?: string;
  musicContactEmail?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  customerSongs?: string;
  additionalNotes?: string;
  schoolOrganizationName?: string;
  schoolProgramColors?: string;
  nicknames?: string;
  vocalsPreference?: string;
  instrumentalStylePreference?: string;
  /** POM order form — school / program */
  schoolProgramName?: string;
  schoolAddress?: string;
  schoolGymAddress?: string;
  city?: string;
  stateProvince?: string;
  zipPostalCode?: string;
  country?: string;
  division?: string;
  divisionOfTeam?: string;
  style?: string;
  styleOfGamedayMix?: string;
  licensingRequired?: "yes" | "no" | string;
  voiceoverScript?: string;
  pronunciationGuidance?: string;
  /** Contact */
  coachName?: string;
  coachPhone?: string;
  coachEmail?: string;
  billingPersonName?: string;
  billingPersonEmail?: string;
  choreographerName?: string;
  choreographerEmail?: string;
  /** Mix */
  numberOfCopies?: string;
  packageType?: string;
  requestedEditor?: string;
  timeLengthOfMix?: string;
  musicAffiliate?: string;
  powerMusicCovers?: string;
  routineNotes?: string;
  customVoiceovers?: string;
  /** All Star Cheer */
  gymName?: string;
  gymBillingAddress?: string;
  teamName?: string;
  teamCoedAllGirl?: string;
  teamColors?: string;
  /** School Cheer */
  schoolName?: string;
  schoolBillingAddress?: string;
  mascot?: string;
  splitOrNoSplit?: string;
  virocChoreographerName?: string;
  virocChoreographerEmail?: string;
  /** Youth Rec Cheer */
  colors?: string;
  billingAddress?: string;
  coachContactFullName?: string;
  coachEmailAddress?: string;
  emailAddress?: string;
  /** Shared cheer fields */
  sendingEightCountSheets?: string;
  usingEightCountSheets?: string;
  songListSuggestions?: string;
  couponCode?: string;
  howDidYouFindOut?: string;
  /** Legacy / MTD bridge fields */
  customerName: string;
  contactName: string;
  programName: string;
  category: string;
  package: string;
  musicTheme: string;
  editorRequest: EditorRequest;
  requestedProducer: string;
  assignedProducer?: string | null;
  price: number;
  priceCompliance?: PriceCompliance;
  status: "new" | "active" | "needs_attention" | "completed" | "in_mtd";
  createdAt: string;
  completedAt?: string | null;
  needsAttention: boolean;
  attentionReason: string | null;
  systemCalculatedCustomerPrice?: number | null;
  finalCustomerPrice?: number | null;
  finalCustomerPriceOverridden?: boolean;
  pricingBreakdown?: any;
  rateUsed?: number | null;
  rateSource?: string | null;
  producerPayout?: number | null;
  sltPortion?: number | null;
  payrollFinalized?: boolean;
  payrollBreakdown?: any;
};

export type ScheduleEntry = {
  producer: string;
  day: string;
  status: "mix" | "available" | "off";
  count: number;
};

/**
 * All possible statuses for a producer schedule cell.
 * "capacity" = producer has reached their daily mix or cost limit.
 */
export type ScheduleCellStatus = "available" | "mix" | "off" | "capacity";

export type AppNotification = {
  id: string;
  type: "new_order" | "mtd_move" | "schedule" | "payroll";
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export type DiscountCodeType = "fixed" | "percentage";

export type DiscountCode = {
  id: string;
  /** Customer-facing promo code (stored uppercase) */
  code: string;
  description?: string;
  discountType?: DiscountCodeType;
  discountValue?: number;
};

export type AppData = {
  mtdRecords: MTDRecord[];
  producers: Producer[];
  discountCodes: DiscountCode[];
  orders: Order[];
  pastOrders: Order[];
  schedule: ScheduleEntry[];
  stats: {
    newOrders: number;
    needsAttention: number;
    activeMixes: number;
    outsourced: number;
  };
};

export type OrderTab = "active" | "all" | "past";

export const EDITOR_REQUEST_OPTIONS = ["FA", "NA"] as const;

export const EIGHT_CS_OPTIONS = [
  "HAVE CS",
  "HAVE CS & VIDEO",
  "NEED CS",
  "NEED ORDER FORM & CS",
  "NEED ORDER FORM, CS, & VIDEO",
] as const;

export const SONGS_OPTIONS = ["HAVE", "NEED SONGS", "NEED NOTES", "NO"] as const;

export const MTD_RECORD_STATUS_OPTIONS = [
  "Waiting for Data",
  "Completed",
  "Outsourced",
  "Ongoing",
] as const;

export type MTDRecordStatus = (typeof MTD_RECORD_STATUS_OPTIONS)[number];

export const EDITOR_NAMES = [
  "CM",
  "MS",
  "NC",
  "ANNE",
  "SS",
  "BV",
  "MM",
  "LAUREN",
  "WALTER",
  "SHELLY",
  "KENDALL",
  "JD",
  "G",
  "JM",
  "JOP",
  "R",
] as const;
