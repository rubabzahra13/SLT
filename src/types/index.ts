export type PriceCompliance = "compliant" | "non-compliant";

export type EditorRequest = "FA" | "NA" | string;

export type MTDRecord = {
  id: string;
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
  /** How long the assigned producer is booked for this order */
  bookedUntil?: string | null;
  eightCountSheet: string;
  haveSongs: string;
  needsAttention: boolean;
  status: "active" | "outsourced" | "needs_attention" | "completed";
};

export type Producer = {
  id: string;
  name: string;
  initials: string;
  email: string;
  specialty: string;
  avatar: string;
  mixesThisWeek: number;
  nextAvailable: string;
  status: "available" | "limited" | "unavailable";
};

export type OrderFormType =
  | "school-all-star-cheer"
  | "school-all-star-dance"
  | "marching-band"
  | "sports-entertainment"
  | "school-anthem";

export const ORDER_FORM_TABS: { id: OrderFormType; label: string }[] = [
  { id: "school-all-star-cheer", label: "School/All Star Cheer" },
  { id: "school-all-star-dance", label: "School/All Star Dance" },
  { id: "marching-band", label: "Marching Band" },
  { id: "sports-entertainment", label: "Sports Entertainment" },
  { id: "school-anthem", label: "School Anthem" },
];

export type CheerFormSubtype =
  | "all-star-cheer"
  | "school-cheer-viroc-yes"
  | "school-cheer-viroc-no"
  | "youth-rec-cheer";

export const CHEER_FORM_SUBTABS: { id: CheerFormSubtype; label: string }[] = [
  { id: "all-star-cheer", label: "All Star Cheer" },
  { id: "school-cheer-viroc-yes", label: "School Cheer · VIROC Yes" },
  { id: "school-cheer-viroc-no", label: "School Cheer · VIROC No" },
  { id: "youth-rec-cheer", label: "Youth Rec Cheer" },
];

export type DanceFormSubtype =
  | "pom"
  | "hip-hop"
  | "team-performance-variety"
  | "gameday"
  | "jazz-kick";

export const DANCE_FORM_SUBTABS: { id: DanceFormSubtype; label: string }[] = [
  { id: "pom", label: "POM" },
  { id: "hip-hop", label: "Hip Hop" },
  { id: "team-performance-variety", label: "Team Performance & Variety" },
  { id: "gameday", label: "Gameday" },
  { id: "jazz-kick", label: "Jazz/Kick" },
];

export type Order = {
  id: string;
  mtdId?: string;
  formType: OrderFormType;
  /** Cheer sub-form when formType is school-all-star-cheer */
  cheerFormSubtype?: CheerFormSubtype;
  /** Dance sub-form when formType is school-all-star-dance */
  danceFormSubtype?: DanceFormSubtype;
  /** POM order form — school / program */
  schoolProgramName: string;
  schoolAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  division: string;
  /** Contact */
  coachName: string;
  coachPhone: string;
  coachEmail: string;
  billingPersonName: string;
  billingPersonEmail: string;
  choreographerName: string;
  choreographerEmail: string;
  /** Mix */
  numberOfCopies: string;
  packageType: string;
  requestedEditor: string;
  timeLengthOfMix: string;
  musicAffiliate: string;
  powerMusicCovers: string;
  routineNotes: string;
  customVoiceovers: string;
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
};

export type ScheduleEntry = {
  producer: string;
  day: string;
  status: "mix" | "available" | "off";
  count: number;
};

export type AppNotification = {
  id: string;
  type: "new_order" | "mtd_move" | "schedule";
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export type AppData = {
  mtdRecords: MTDRecord[];
  producers: Producer[];
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

export const SONGS_OPTIONS = ["HAVE", "NEED SONGS", "HAVE MIX"] as const;

export const EDITOR_NAMES = [
  "CASEY",
  "MATT",
  "NATE",
  "ANNE",
  "STEVE",
  "BRENT",
  "MARK",
  "LAUREN",
  "WALTER",
  "SHELLY",
  "KENDALL",
] as const;
