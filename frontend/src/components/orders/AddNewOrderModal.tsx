"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Calendar, Loader2, AlertCircle } from "lucide-react";
import { FilterMenu } from "@/components/ui/FilterMenu";
import type {
  CheerFormSubtype,
  CheerFormSubtypeFilter,
  DanceFormSubtype,
  DanceFormSubtypeFilter,
  Order,
  OrderFormType,
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
  initialFormType?: OrderFormType;
  initialCheerSubtype?: CheerFormSubtypeFilter;
  initialDanceSubtype?: DanceFormSubtypeFilter;
  onAdd: (payload: CreateManualSchedulePayload) => Promise<Order>;
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
  "team-performance-variety": [
    "TEAM PERFORMANCE 1:30",
    "TEAM PERFORMANCE 2:00",
    "VARIETY 2:15",
  ],
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

export function AddNewOrderModal({
  open,
  onClose,
  initialFormType = "school-all-star-cheer",
  initialCheerSubtype = "all-star-cheer",
  initialDanceSubtype = "pom",
  onAdd,
}: AddNewOrderModalProps) {
  const [formType, setFormType] = useState<OrderFormType>(initialFormType);
  const [cheerSubtype, setCheerSubtype] = useState<CheerFormSubtype>(
    initialCheerSubtype === "all"
      ? "all-star-cheer"
      : (initialCheerSubtype as CheerFormSubtype)
  );
  const [danceSubtype, setDanceSubtype] = useState<DanceFormSubtype>(
    initialDanceSubtype === "all"
      ? "pom"
      : (initialDanceSubtype as DanceFormSubtype)
  );

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

  const [eightCountSheet, setEightCountSheet] = useState("NEED CS");
  const [videoUrl, setVideoUrl] = useState("");
  const [musicAffiliate, setMusicAffiliate] = useState("Power Music Covers");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setContactName("");
    setEmail("");
    setCoachEmail("");
    setProgramName("");
    setSchoolProgramName("");
    setPkg("");
    setTimeLengthOfMix("");
    setSongListSuggestions("");
    setRoutineNotes("");
    setCustomVoiceovers("");
    setEightCountSheet("NEED CS");
    setVideoUrl("");
    setMusicAffiliate("Power Music Covers");
    setError(null);
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
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
  }, [
    open,
    initialFormType,
    initialCheerSubtype,
    initialDanceSubtype,
    resetForm,
  ]);

  const handleFormChange = (nextForm: OrderFormType) => {
    setFormType(nextForm);
    setPkg("");
    if (nextForm === "school-all-star-cheer") {
      setCheerSubtype("all-star-cheer");
    } else if (nextForm === "school-all-star-dance") {
      setDanceSubtype("pom");
    }
  };

  const availablePackages = useMemo(() => {
    if (formType === "school-all-star-cheer") return CHEER_PACKAGES;
    if (formType === "school-all-star-dance") {
      return DANCE_PACKAGES[danceSubtype] || ["Custom Dance Mix"];
    }
    if (formType === "marching-band") return MARCHING_BAND_PACKAGES;
    if (formType === "sports-entertainment") {
      return SPORTS_ENTERTAINMENT_PACKAGES;
    }
    if (formType === "school-anthem") return SCHOOL_ANTHEM_PACKAGES;
    return ["Standard 2:00", "Custom Length"];
  }, [formType, danceSubtype]);

  const handleSave = async () => {
    setError(null);
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
        form_type: formType,
        cheer_form_subtype:
          formType === "school-all-star-cheer" ? cheerSubtype : undefined,
        dance_form_subtype:
          formType === "school-all-star-dance" ? danceSubtype : undefined,
        // Assign producer + dates from the Orders table after create.
        mix_start_date: null,
        mix_end_date: null,
        assigned_producer: null,

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
        eight_count_sheet:
          formType === "school-all-star-cheer" ? eightCountSheet : undefined,
        video_url: videoUrl.trim() || null,
        music_affiliate:
          formType === "school-all-star-dance" ? musicAffiliate : undefined,
      });

      resetForm();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create manual schedule entry.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-brand-scrim/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-brand-line-strong/60 bg-white shadow-2xl">
        <div className="z-20 flex shrink-0 items-center justify-between border-b border-brand-line/60 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-signature/10 text-brand-signature">
              <Calendar className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-[18px] font-bold tracking-[-0.02em] text-brand-ink">
                Add New Order
              </h2>
              <p className="text-[12px] text-brand-ink-tertiary">
                Assign producer and dates from the Orders table after saving
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FilterMenu
              label="Form"
              hideLabel
              portal
              portalZIndex={100}
              value={formType}
              onChange={(v) => handleFormChange(v as OrderFormType)}
              accent="orange"
              options={ORDER_FORM_TABS.map(({ id, label }) => ({
                value: id,
                label,
              }))}
            />

            {formType === "school-all-star-cheer" ? (
              <FilterMenu
                label="Cheer"
                hideLabel
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

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-brand-line/50 pb-2">
              <h3 className="text-[14px] font-bold text-brand-ink">
                Order Information
              </h3>
              <span className="text-[11px] text-brand-ink-tertiary">
                Optional details (can be filled out now or added later)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Customer / coach name"
                  className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                  Program Name
                </label>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="Team / program name"
                  className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                  School / Organization
                </label>
                <input
                  type="text"
                  value={schoolProgramName}
                  onChange={(e) => setSchoolProgramName(e.target.value)}
                  placeholder="School or organization"
                  className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                  Package
                </label>
                <select
                  value={pkg}
                  onChange={(e) => setPkg(e.target.value)}
                  className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                >
                  <option value="">Select package</option>
                  {availablePackages.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                  Coach Email
                </label>
                <input
                  type="email"
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  placeholder="coach@email.com"
                  className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                  Time Length of Mix
                </label>
                <input
                  type="text"
                  value={timeLengthOfMix}
                  onChange={(e) => setTimeLengthOfMix(e.target.value)}
                  placeholder="e.g. 2:00"
                  className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>

              {formType === "school-all-star-cheer" ? (
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                    8-Count Sheet
                  </label>
                  <select
                    value={eightCountSheet}
                    onChange={(e) => setEightCountSheet(e.target.value)}
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  >
                    <option value="NEED CS">NEED CS</option>
                    <option value="HAVE CS">HAVE CS</option>
                  </select>
                </div>
              ) : null}

              {formType === "school-all-star-dance" ? (
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                    Music Affiliate
                  </label>
                  <input
                    type="text"
                    value={musicAffiliate}
                    onChange={(e) => setMusicAffiliate(e.target.value)}
                    className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                Video URL
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
                className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                Song List / Suggestions
              </label>
              <input
                type="text"
                value={songListSuggestions}
                onChange={(e) => setSongListSuggestions(e.target.value)}
                placeholder="Song ideas or list..."
                className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                Custom Voiceover Details
              </label>
              <input
                type="text"
                value={customVoiceovers}
                onChange={(e) => setCustomVoiceovers(e.target.value)}
                placeholder="Specific words, names, or voiceover scripts..."
                className="h-9 w-full rounded-xl border border-brand-line/60 bg-white px-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-ink-secondary">
                Routine Notes / Production Instructions
              </label>
              <textarea
                rows={3}
                value={routineNotes}
                onChange={(e) => setRoutineNotes(e.target.value)}
                placeholder="Special notes, sound effects, transitions, or customer requests..."
                className="w-full rounded-xl border border-brand-line/60 bg-white p-3 text-[13px] font-medium text-brand-ink outline-none transition placeholder:font-normal placeholder:text-brand-ink-tertiary/60 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
              />
            </div>
          </div>
        </div>

        <div className="z-20 flex shrink-0 items-center justify-end gap-3 border-t border-brand-line/60 bg-brand-bg/40 px-6 py-4">
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
            onClick={() => void handleSave()}
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
  );
}
