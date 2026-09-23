"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Calendar, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { InlineDateInput } from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { Avatar } from "@/components/ui/Avatar";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { isIsoDateBefore, toIsoDateString } from "@/lib/dates";
import type {
  CheerFormSubtype,
  CheerFormSubtypeFilter,
  DanceFormSubtype,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  Producer,
  ScheduleEntry,
} from "@/types";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  ORDER_FORM_TABS,
} from "@/types";
import type { CreateManualSchedulePayload } from "@/lib/api/mtd";

type AddNewOrderModalProps = {
  open: boolean;
  onClose: () => void;
  producers: Producer[];
  mtdRecords?: MTDRecord[];
  allOrders?: Order[];
  schedule?: ScheduleEntry[];
  initialFormType?: OrderFormType;
  initialCheerSubtype?: CheerFormSubtypeFilter;
  initialDanceSubtype?: DanceFormSubtypeFilter;
  onAdd: (payload: CreateManualSchedulePayload) => Promise<MTDRecord>;
};

const CHEER_PACKAGES = [
  "BRONZE 1:30",
  "BRONZE 2:00",
  "SILVER 1:30",
  "SILVER 2:00",
  "GOLD 1:30",
  "GOLD 2:00",
  "GOLD 2:30",
  "PLATINUM 2:30",
  "TITANIUM 2:30",
];

const DANCE_PACKAGES: Record<string, string[]> = {
  pom: ["POM 1:30", "POM 2:00", "POM 2:15"],
  "hip-hop": ["HIP HOP 1:30", "HIP HOP 2:00", "HIP HOP 2:15"],
  "team-performance-variety": ["TEAM PERFORMANCE 1:30", "TEAM PERFORMANCE 2:00", "VARIETY 2:15"],
  gameday: ["GAMEDAY 1:30", "GAMEDAY 2:00"],
  "jazz-kick": ["JAZZ SIMPLE CUT", "JAZZ FULL EDIT", "KICK 2:00"],
};

const MARCHING_BAND_PACKAGES = [
  "Band Chant",
  "Drum Cadence",
  "Both Fight Song & Alma Mater",
  "Alma Mater",
  "Custom Marching Band",
];

const SPORTS_ENTERTAINMENT_PACKAGES = [
  "Stadium Mix 1:30",
  "Stadium Mix 2:00",
  "Player Intro",
  "In-Game FX",
  "Custom Sports Mix",
];

const SCHOOL_ANTHEM_PACKAGES = [
  "Full School Anthem",
  "Fight Song Arrangement",
  "Custom Anthem",
];

const actionButtonClass = (filled: boolean) =>
  clsx(
    "rounded-md border px-3 py-1 text-[11px] font-semibold transition shadow-sm cursor-pointer",
    filled
      ? "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line hover:bg-brand-bg/50"
      : "border-brand-orange-deep bg-brand-orange text-white hover:bg-brand-orange-hover"
  );

export function AddNewOrderModal({
  open,
  onClose,
  producers,
  mtdRecords = [],
  allOrders = [],
  schedule = [],
  initialFormType = "school-all-star-cheer",
  initialCheerSubtype = "all-star-cheer",
  initialDanceSubtype = "pom",
  onAdd,
}: AddNewOrderModalProps) {
  // Category & Subcategory inherited from current Orders filters
  const [formType, setFormType] = useState<OrderFormType>(initialFormType);
  const [cheerSubtype, setCheerSubtype] = useState<CheerFormSubtype>(
    initialCheerSubtype === "all" ? "all-star-cheer" : (initialCheerSubtype as CheerFormSubtype)
  );
  const [danceSubtype, setDanceSubtype] = useState<DanceFormSubtype>(
    initialDanceSubtype === "all" ? "pom" : (initialDanceSubtype as DanceFormSubtype)
  );

  // Scheduling Information
  const [mixStartDate, setMixStartDate] = useState("");
  const [mixEndDate, setMixEndDate] = useState("");
  const [assignedProducer, setAssignedProducer] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Order Information (100% Optional)
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [programName, setProgramName] = useState("");
  const [schoolProgramName, setSchoolProgramName] = useState("");
  const [pkg, setPkg] = useState("");
  const [timeLengthOfMix, setTimeLengthOfMix] = useState("");
  const [songListSuggestions, setSongListSuggestions] = useState("");
  const [routineNotes, setRoutineNotes] = useState("");
  const [customVoiceovers, setCustomVoiceovers] = useState("");

  // Cheer optionals
  const [eightCountSheet, setEightCountSheet] = useState("NEED CS");
  const [videoUrl, setVideoUrl] = useState("");
  const [hasRallyMix, setHasRallyMix] = useState(false);
  const [hasExtend8ctAddon, setHasExtend8ctAddon] = useState(false);
  const [hasProcessing8ctSheetsAddon, setHasProcessing8ctSheetsAddon] = useState(false);
  const [hasTraditionalVoiceover, setHasTraditionalVoiceover] = useState(false);
  const [hasThemedVoiceover, setHasThemedVoiceover] = useState(false);

  // Dance optionals
  const [musicAffiliate, setMusicAffiliate] = useState("Power Music Covers");
  const [danceVoiceover, setDanceVoiceover] = useState<"25" | "75" | "100" | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync modal state when opened with active Orders filter props
  useEffect(() => {
    if (open) {
      setError(null);
      setSaving(false);
      const nextForm = initialFormType || "school-all-star-cheer";
      setFormType(nextForm);

      if (nextForm === "school-all-star-cheer") {
        setCheerSubtype(
          !initialCheerSubtype || initialCheerSubtype === "all"
            ? "all-star-cheer"
            : (initialCheerSubtype as CheerFormSubtype)
        );
      } else if (nextForm === "school-all-star-dance") {
        setDanceSubtype(
          !initialDanceSubtype || initialDanceSubtype === "all"
            ? "pom"
            : (initialDanceSubtype as DanceFormSubtype)
        );
      }
    }
  }, [open, initialFormType, initialCheerSubtype, initialDanceSubtype]);

  // Handle Mix Start Date selection & auto-calculate Mix End Date (start + 7 days)
  const handleMixStartDateChange = (nextStart: string) => {
    setMixStartDate(nextStart);
    if (nextStart) {
      const endIso = toIsoDateString(mixEndDate);
      if (!endIso || !isIsoDateBefore(nextStart, endIso)) {
        const d = new Date(`${nextStart}T12:00:00`);
        d.setDate(d.getDate() + 7);
        setMixEndDate(d.toISOString().slice(0, 10));
      }
    }
  };

  // Handle Form / Category changes
  const handleFormChange = (nextForm: OrderFormType) => {
    setFormType(nextForm);
    setPkg("");
    if (nextForm === "school-all-star-cheer") {
      setCheerSubtype("all-star-cheer");
    } else if (nextForm === "school-all-star-dance") {
      setDanceSubtype("pom");
    }
  };

  // Available packages dynamically based on Category + Subcategory
  const availablePackages = useMemo(() => {
    if (formType === "school-all-star-cheer") return CHEER_PACKAGES;
    if (formType === "school-all-star-dance") {
      return DANCE_PACKAGES[danceSubtype] || ["Custom Dance Mix"];
    }
    if (formType === "marching-band") return MARCHING_BAND_PACKAGES;
    if (formType === "sports-entertainment") return SPORTS_ENTERTAINMENT_PACKAGES;
    if (formType === "school-anthem") return SCHOOL_ANTHEM_PACKAGES;
    return ["Standard 2:00", "Custom Length"];
  }, [formType, danceSubtype]);

  // Derive Category & Subcategory string for AssignEditorModal display
  const categoryStr = useMemo(() => {
    if (formType === "school-all-star-dance") return "Dance";
    if (formType === "school-all-star-cheer") return "Cheer";
    if (formType === "marching-band") return "Marching Band";
    if (formType === "sports-entertainment") return "Sports Entertainment";
    if (formType === "school-anthem") return "School Anthems";
    return "Cheer";
  }, [formType]);

  const subcategoryStr = useMemo(() => {
    if (formType === "school-all-star-cheer") {
      const match = CHEER_FORM_SUBTABS.find((s) => s.id === cheerSubtype);
      return match ? match.label : "All Star Cheer";
    }
    if (formType === "school-all-star-dance") {
      const match = DANCE_FORM_SUBTABS.find((s) => s.id === danceSubtype);
      return match ? match.label : "POM";
    }
    return categoryStr;
  }, [formType, cheerSubtype, danceSubtype, categoryStr]);

  // Synthetic draft record passed to AssignEditorModal
  const draftRecordForAssign = useMemo((): MTDRecord => {
    const dispProgram =
      programName.trim() ||
      schoolProgramName.trim() ||
      contactName.trim() ||
      subcategoryStr ||
      categoryStr;

    return {
      id: "draft-manual-entry",
      section: formType === "school-all-star-dance" ? "DANCE MUSIC" : "CHEERLEADING MUSIC",
      assignedProducer: assignedProducer || null,
      category: categoryStr,
      editorRequest: "FA",
      contactName: contactName.trim() || "Customer",
      editorInitials: assignedProducer || "",
      programName: dispProgram,
      package: pkg || subcategoryStr,
      musicTheme: "",
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      mixStartDate: mixStartDate || "",
      mixEndDate: mixEndDate || undefined,
      eightCountSheet: "NEED CS",
      haveSongs: "NEED SONGS",
      needsAttention: false,
      status: "active",
      isManualScheduleEntry: true,
    };
  }, [
    formType,
    categoryStr,
    subcategoryStr,
    assignedProducer,
    contactName,
    programName,
    schoolProgramName,
    pkg,
    mixStartDate,
    mixEndDate,
  ]);

  // Callback when producer selected in AssignEditorModal
  const handleAssignResult = (recordId: string, result: EditorAssignmentResult) => {
    if (result.assignedProducer) {
      setAssignedProducer(result.assignedProducer);
    }
    if (result.mixStartDate) {
      setMixStartDate(result.mixStartDate);
    }
    if (result.mixEndDate) {
      setMixEndDate(result.mixEndDate);
    }
    setAssignModalOpen(false);
  };

  const assignedProducerObj = useMemo(() => {
    if (!assignedProducer) return undefined;
    return findProducerByAssignmentKey(assignedProducer, producers);
  }, [assignedProducer, producers]);

  const handleSave = async () => {
    setError(null);

    // Minimum Required Scheduling Information Validation
    if (!mixStartDate.trim()) {
      setError("Please select a Mix Start Date.");
      return;
    }

    if (!mixEndDate.trim()) {
      setError("Please select a Mix End Date.");
      return;
    }

    if (!assignedProducer.trim()) {
      setError("Please assign a Producer.");
      return;
    }

    setSaving(true);

    let categoryStr = "Cheer";
    let subcategoryStr = "";

    if (formType === "school-all-star-cheer") {
      categoryStr = "All Star Cheer";
      const match = CHEER_FORM_SUBTABS.find((s) => s.id === cheerSubtype);
      subcategoryStr = match ? match.label : "All Star Cheer";
    } else if (formType === "school-all-star-dance") {
      categoryStr = "All Star Dance";
      const match = DANCE_FORM_SUBTABS.find((s) => s.id === danceSubtype);
      subcategoryStr = match ? match.label : "POM";
    } else if (formType === "marching-band") {
      categoryStr = "Marching Band";
      subcategoryStr = "Marching Band";
    } else if (formType === "sports-entertainment") {
      categoryStr = "Sports Entertainment";
      subcategoryStr = "Sports Entertainment";
    } else if (formType === "school-anthem") {
      categoryStr = "School Anthems";
      subcategoryStr = "School Anthem";
    }

    const selectedPkg = pkg.trim() || subcategoryStr || categoryStr;

    try {
      await onAdd({
        category: categoryStr,
        subcategory: subcategoryStr,
        mix_start_date: mixStartDate,
        mix_end_date: mixEndDate,
        assigned_producer: assignedProducer,

        // Optional Fields
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        coach_email: coachEmail.trim() || null,
        program_name: programName.trim() || null,
        school_program_name: schoolProgramName.trim() || null,
        package: selectedPkg,
        time_length_of_mix: timeLengthOfMix.trim() || null,
        song_list_suggestions: songListSuggestions.trim() || null,
        routine_notes: routineNotes.trim() || null,
        custom_voiceovers: customVoiceovers.trim() || null,
        eight_count_sheet: formType === "school-all-star-cheer" ? eightCountSheet : undefined,
        video_url: videoUrl.trim() || null,
        music_affiliate: formType === "school-all-star-dance" ? musicAffiliate : undefined,
        dance_voiceover: formType === "school-all-star-dance" ? danceVoiceover : undefined,
        has_rally_mix: hasRallyMix,
        has_extend_8ct_addon: hasExtend8ctAddon,
        has_processing_8ct_sheets_addon: hasProcessing8ctSheetsAddon,
        has_traditional_voiceover: hasTraditionalVoiceover,
        has_themed_voiceover: hasThemedVoiceover,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create manual schedule entry.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Scrim Backdrop */}
        <div
          className="fixed inset-0 bg-brand-scrim/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden
        />

        {/* Modal Card - Fixed max height for viewport and internal scroll */}
        <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-brand-line-strong/60 bg-white shadow-2xl overflow-hidden">
          {/* Modal Header (Fixed / Shrink 0) */}
          <div className="flex shrink-0 items-center justify-between border-b border-brand-line/60 px-6 py-4 bg-white z-20">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-signature/10 text-brand-signature">
                <Calendar className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.02em] text-brand-ink">
                  Add New Order
                </h2>
                <p className="text-[12px] text-brand-ink-tertiary">
                  Manually schedule a customer before formal order submission
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Category Dropdown */}
              <FilterMenu
                label="Form"
                hideLabel
                grouped
                portal
                portalZIndex={100}
                value={formType}
                onChange={(v) => handleFormChange(v as OrderFormType)}
                accent="blue"
                options={ORDER_FORM_TABS.map(({ id, label }) => ({
                  value: id,
                  label,
                }))}
              />

              {/* Subcategory Dropdown */}
              {formType === "school-all-star-cheer" ? (
                <FilterMenu
                  label="Cheer"
                  hideLabel
                  grouped
                  portal
                  portalZIndex={100}
                  value={cheerSubtype}
                  onChange={(v) => {
                    setCheerSubtype(v as CheerFormSubtype);
                    setPkg("");
                  }}
                  accent="orange"
                  options={CHEER_FORM_SUBTABS.map(({ id, label }) => ({
                    value: id,
                    label,
                  }))}
                />
              ) : null}

              {formType === "school-all-star-dance" ? (
                <FilterMenu
                  label="Dance"
                  hideLabel
                  grouped
                  portal
                  portalZIndex={100}
                  value={danceSubtype}
                  onChange={(v) => {
                    setDanceSubtype(v as DanceFormSubtype);
                    setPkg("");
                  }}
                  accent="orange"
                  options={DANCE_FORM_SUBTABS.map(({ id, label }) => ({
                    value: id,
                    label,
                  }))}
                />
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="ml-2 rounded-xl p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Body (Scrollable Internal Area) */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {error ? (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Section 1: Scheduling Information */}
            <div className="rounded-xl border border-brand-signature/20 bg-brand-signature/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-brand-signature">
                  Scheduling Information <span className="text-red-500">*</span>
                </h3>
                <span className="text-[11px] font-medium text-brand-signature/80">
                  Required for schedule entry
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                {/* Editor Column Assign Button reusing exact Assign functionality */}
                <div>
                  <label className="block text-[11px] font-semibold text-brand-ink-secondary mb-1">
                    Assigned Producer <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center h-8">
                    {assignedProducer ? (
                      <button
                        type="button"
                        onClick={() => setAssignModalOpen(true)}
                        title="Edit assignment"
                        className="inline-flex items-center gap-2 rounded-full border border-brand-line/70 bg-brand-bg/60 py-1 px-2.5 shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35"
                      >
                        <Avatar producer={assignedProducerObj} initials={assignedProducer} size="xs" />
                        <span className="text-[12px] font-bold text-brand-ink">{assignedProducer}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAssignModalOpen(true)}
                        className={actionButtonClass(false)}
                      >
                        Assign
                      </button>
                    )}
                  </div>
                </div>

                {/* Mix Start Date control reusing InlineDateInput & auto-setting End Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-brand-ink-secondary mb-1">
                    Mix Start Date <span className="text-red-500">*</span>
                  </label>
                  <InlineDateInput
                    value={mixStartDate}
                    onChange={handleMixStartDateChange}
                    placeholder="Select Date"
                    menuZIndex={100}
                  />
                </div>

                {/* Mix End Date control reusing InlineDateInput (Editable) */}
                <div>
                  <label className="block text-[11px] font-semibold text-brand-ink-secondary mb-1">
                    Mix End Date <span className="text-red-500">*</span>
                  </label>
                  <InlineDateInput
                    value={mixEndDate}
                    onChange={(val) => setMixEndDate(val)}
                    placeholder="Select Date"
                    min={toIsoDateString(mixStartDate) || undefined}
                    menuZIndex={100}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Order Information */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between border-b border-brand-line/50 pb-2">
                <h3 className="text-[14px] font-bold text-brand-ink">
                  Order Information
                </h3>
                <span className="text-[11px] text-brand-ink-tertiary">
                  Optional details (can be filled out now or added later)
                </span>
              </div>

              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    Customer / Contact Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    Coach Email
                  </label>
                  <input
                    type="email"
                    value={coachEmail}
                    onChange={(e) => setCoachEmail(e.target.value)}
                    placeholder="e.g. coach@school.edu"
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    Program Name
                  </label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="e.g. Cheer Dynamics"
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    School / Team Name
                  </label>
                  <input
                    type="text"
                    value={schoolProgramName}
                    onChange={(e) => setSchoolProgramName(e.target.value)}
                    placeholder="e.g. Varsity Coed"
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    Package
                  </label>
                  <select
                    value={pkg}
                    onChange={(e) => setPkg(e.target.value)}
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  >
                    <option value="">Select Package...</option>
                    {availablePackages.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    Time Length of Mix
                  </label>
                  <input
                    type="text"
                    value={timeLengthOfMix}
                    onChange={(e) => setTimeLengthOfMix(e.target.value)}
                    placeholder="e.g. 2:00, 2:15"
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>

                {/* Dance Specific: Music Affiliate */}
                {formType === "school-all-star-dance" ? (
                  <div>
                    <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                      Music Affiliate
                    </label>
                    <select
                      value={musicAffiliate}
                      onChange={(e) => setMusicAffiliate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                    >
                      <option value="Power Music Covers">Power Music Covers</option>
                      <option value="Unleash The Beats Covers">Unleash The Beats Covers</option>
                      <option value="Custom Licensed Tracks">Custom Licensed Tracks</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                ) : null}

                {/* Cheer Specific: 8-Count Sheet */}
                {formType === "school-all-star-cheer" ? (
                  <div>
                    <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                      8-Count Sheets
                    </label>
                    <select
                      value={eightCountSheet}
                      onChange={(e) => setEightCountSheet(e.target.value)}
                      className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                    >
                      <option value="NEED CS">NEED CS</option>
                      <option value="HAVE CS">HAVE CS</option>
                      <option value="HAVE CS & VIDEO">HAVE CS & VIDEO</option>
                    </select>
                  </div>
                ) : null}

                {/* Video URL */}
                <div>
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    Video Link (Vimeo / YouTube)
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>
              </div>

              {/* Cheer Add-ons */}
              {formType === "school-all-star-cheer" ? (
                <div className="pt-2">
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-2">
                    Cheer Add-ons & Voiceover Toggles
                  </label>
                  <div className="flex flex-wrap gap-4 text-[12px] text-brand-ink">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasRallyMix}
                        onChange={(e) => setHasRallyMix(e.target.checked)}
                        className="rounded border-brand-line text-brand-signature focus:ring-brand-signature/20"
                      />
                      <span>Rally Mix Add-on</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasExtend8ctAddon}
                        onChange={(e) => setHasExtend8ctAddon(e.target.checked)}
                        className="rounded border-brand-line text-brand-signature focus:ring-brand-signature/20"
                      />
                      <span>Extend 8ct Add-on</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasProcessing8ctSheetsAddon}
                        onChange={(e) => setHasProcessing8ctSheetsAddon(e.target.checked)}
                        className="rounded border-brand-line text-brand-signature focus:ring-brand-signature/20"
                      />
                      <span>Process 8ct Sheets Add-on</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasTraditionalVoiceover}
                        onChange={(e) => setHasTraditionalVoiceover(e.target.checked)}
                        className="rounded border-brand-line text-brand-signature focus:ring-brand-signature/20"
                      />
                      <span>Traditional Voiceover</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasThemedVoiceover}
                        onChange={(e) => setHasThemedVoiceover(e.target.checked)}
                        className="rounded border-brand-line text-brand-signature focus:ring-brand-signature/20"
                      />
                      <span>Themed Voiceover</span>
                    </label>
                  </div>
                </div>
              ) : null}

              {/* Dance Voiceover Options - Clean text without backslashes */}
              {formType === "school-all-star-dance" ? (
                <div className="pt-2">
                  <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                    Dance Voiceover Add-on
                  </label>
                  <div className="flex items-center gap-3">
                    {(["25", "75", "100"] as const).map((val) => (
                      <label key={val} className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer">
                        <input
                          type="radio"
                          name="danceVoiceover"
                          checked={danceVoiceover === val}
                          onChange={() => setDanceVoiceover(val)}
                          className="text-brand-signature focus:ring-brand-signature/20"
                        />
                        <span>${val} Voiceover</span>
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDanceVoiceover(null)}
                      className="text-[11px] text-brand-ink-tertiary underline hover:text-brand-ink ml-1"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Songs / Song Suggestions */}
              <div>
                <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                  Songs / Song List Suggestions
                </label>
                <textarea
                  rows={2}
                  value={songListSuggestions}
                  onChange={(e) => setSongListSuggestions(e.target.value)}
                  placeholder="Song titles, artists, or preferred tracks..."
                  className="w-full rounded-xl border border-brand-line/60 bg-white p-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>

              {/* Custom Voiceover Script */}
              <div>
                <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                  Custom Voiceover Details
                </label>
                <input
                  type="text"
                  value={customVoiceovers}
                  onChange={(e) => setCustomVoiceovers(e.target.value)}
                  placeholder="Specific words, names, or voiceover scripts..."
                  className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>

              {/* Routine Notes */}
              <div>
                <label className="block text-[12px] font-medium text-brand-ink-secondary mb-1">
                  Routine Notes / Production Instructions
                </label>
                <textarea
                  rows={3}
                  value={routineNotes}
                  onChange={(e) => setRoutineNotes(e.target.value)}
                  placeholder="Special notes, sound effects, transitions, or customer requests..."
                  className="w-full rounded-xl border border-brand-line/60 bg-white p-3 text-[13px] text-brand-ink font-medium outline-none transition placeholder:text-brand-ink-tertiary/60 placeholder:font-normal focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer (Fixed / Shrink 0) */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-brand-line/60 px-6 py-4 bg-brand-bg/40 z-20">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 rounded-xl border border-brand-line/70 bg-white px-4 text-[13px] font-medium text-brand-ink shadow-sm transition hover:bg-brand-bg disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex h-9 items-center gap-2 rounded-xl bg-brand-orange px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/20 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Order</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Exact AssignEditorModal from Orders Tab */}
      <AssignEditorModal
        open={assignModalOpen}
        record={draftRecordForAssign}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        producers={producers}
        schedule={schedule}
        onClose={() => setAssignModalOpen(false)}
        onAssign={handleAssignResult}
      />
    </>
  );
}
