"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { MTDRecord, Order } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import { findLinkedOrder } from "@/lib/editor-assignment";
import {
  getDanceSongsConfirmText,
  getFormNotesText,
  getFormSongListStoredText,
  getOrderRequirements,
  isAllStarDanceOrder,
  isMarchingBandOrder,
  mergeOrderFormFieldsForRequirements,
  type OrderRequirementItem,
  type RequirementCategory,
} from "@/lib/order-requirements";
import { buildLegacyMusicTheme } from "@/lib/order-form";
import {
  packDanceSongCovers,
  parseDanceSongCovers,
} from "@/lib/dance-song-covers";
import { hasMeaningfulFieldValue } from "@/lib/empty-field-tokens";
import {
  mtdPatchFromOrderField,
  orderPatchFromOrderField,
} from "@/lib/mtd-order-sync";
import { mtdRecordCoversOrder } from "@/lib/order-staging";
import { HoverTip } from "@/components/ui/HoverTip";
import {
  SongsNotesToggleModal,
  type SongsNotesToggleDirection,
  type SongsNotesToggleKind,
} from "@/components/orders/SongsNotesToggleModal";

function requirementPillTip(
  item: OrderRequirementItem,
  opts: {
    isGreen: boolean;
    isWhite: boolean;
    lockedGreen: boolean;
    lockReason?: string | null;
  }
): string {
  const { isGreen, isWhite, lockedGreen, lockReason } = opts;
  if (item.label === "CS") {
    if (isWhite) {
      return "CS: Not applicable, client did not agree to send 8CS";
    }
    if (lockedGreen) {
      return `CS: Client agreed to send 8CS, collected. ${lockReason}`;
    }
    if (isGreen) {
      return "CS: Client agreed to send 8CS, collected";
    }
    return "CS: Client agreed to send 8CS, waiting for CS";
  }
  if (item.id === "songs") {
    if (isWhite) return `${item.label}: Not applicable`;
    return `${item.label}: ${isGreen ? "Have: click to remove" : "Not have: click to add"}`;
  }
  if (item.id === "notes") {
    if (isWhite) return `${item.label}: Not applicable`;
    return `${item.label}: ${
      isGreen ? "Have: click to remove" : "Not have: click to add"
    }`;
  }
  if (item.id === "mix" || item.id === "time_of_mix") {
    if (isWhite) return `${item.label}: Not applicable`;
    return `${item.label}: ${
      isGreen ? "Collected: click to remove" : "Missing: click to mark collected"
    }`;
  }
  if (item.id === "form") {
    return isGreen
      ? "Form: Matched Magento form (automatic)"
      : "Form: Waiting for Magento form name match (automatic)";
  }
  if (isWhite) return `${item.label}: Not applicable`;
  if (lockedGreen) return `${item.label}: Collected. ${lockReason}`;
  return `${item.label}: ${isGreen ? "Collected" : "Missing"}`;
}

export function OrderRequirementPill({
  item,
  onToggle,
  disabled = false,
  lockReason,
}: {
  item: OrderRequirementItem;
  onToggle?: (item: OrderRequirementItem) => void;
  disabled?: boolean;
  /** When set, green pills cannot be flipped to red. */
  lockReason?: string | null;
}) {
  const isGreen = item.state === "green";
  const isRed = item.state === "red";
  const isWhite = item.state === "white";
  const lockedGreen = Boolean(lockReason) && isGreen;

  const isInteractive =
    !disabled && !lockedGreen && (isGreen || isRed) && Boolean(onToggle);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInteractive && onToggle) {
      onToggle(item);
    }
  };

  const tip = requirementPillTip(item, {
    isGreen,
    isWhite,
    lockedGreen,
    lockReason,
  });

  return (
    <HoverTip label={tip} placement="top" zIndex={300}>
      <button
        type="button"
        disabled={!isInteractive}
        onClick={handleClick}
        className={clsx(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none transition shadow-2xs select-none focus:outline-none focus:ring-1 focus:ring-slate-400/40",
          isGreen &&
            "bg-[#c2e7d9] text-[#0f5236] border border-[#9edbb8]",
          isRed && "bg-[#f9d7d7] text-[#901313] border border-[#ebafaf]",
          isWhite &&
            "bg-white text-slate-400 border border-slate-200/80 opacity-85",
          isInteractive
            ? "cursor-pointer hover:brightness-95 active:scale-95"
            : "cursor-default"
        )}
      >
        <span>{item.label}</span>
      </button>
    </HoverTip>
  );
}

function isSportsOrder(order: Order | MTDRecord): boolean {
  const formType = String(
    (order as Order).formType || (order as { form_type?: string }).form_type || ""
  ).toLowerCase();
  const category = String(order.category || "").toLowerCase();
  return formType.includes("sports") || category.includes("sports");
}

function isAnthemOrder(order: Order | MTDRecord): boolean {
  const formType = String(
    (order as Order).formType || (order as { form_type?: string }).form_type || ""
  ).toLowerCase();
  const category = String(order.category || "").toLowerCase();
  const pkg = String(
    (order as Order).packageType ||
      order.package ||
      (order as { package_type?: string }).package_type ||
      ""
  ).toUpperCase();
  return (
    formType.includes("anthem") ||
    category.includes("anthem") ||
    pkg.includes("SCHOOL ANTHEM")
  );
}

/** Magento / form field label shown in the green→red clear confirmation. */
function confirmClearFieldLabel(
  order: Order | MTDRecord,
  kind: SongsNotesToggleKind
): string | undefined {
  if (kind === "mix") return "Time Length of Mix";
  if (isAnthemOrder(order)) {
    return kind === "notes"
      ? "Lyrical Notes"
      : "Instrumental Style Preference";
  }
  if (isMarchingBandOrder(order)) {
    // Magento MB form always has both fields (not package-gated).
    return kind === "notes"
      ? "Notes to Producer Regarding Lyrics / Mix"
      : "Notes to Producer Regarding Instrumentation";
  }
  if (isAllStarDanceOrder(order)) {
    return kind === "notes"
      ? "Routine Notes"
      : "Power Music Covers / Unleash the Beats Covers";
  }
  if (isSportsOrder(order)) {
    return kind === "notes" ? "Additional Notes" : "Songs";
  }
  return undefined;
}

function buildSongsNotesPatches(
  order: Order | MTDRecord,
  kind: SongsNotesToggleKind,
  text: string
): { orderPatch: Partial<Order>; mtdPatch: Partial<MTDRecord> } {
  const filled = Boolean(text.trim());
  const existingOverrides =
    (order as MTDRecord).collectionStates ||
    (order as { collection_states?: Record<string, boolean> }).collection_states ||
    {};
  const parsedOverrides =
    typeof existingOverrides === "string"
      ? (() => {
          try {
            return JSON.parse(existingOverrides) as Record<string, boolean>;
          } catch {
            return {};
          }
        })()
      : { ...existingOverrides };

  if (kind === "songs") {
    const nextStates = { ...parsedOverrides };
    delete nextStates.songs;
    const existingNotes = String(
      (order as Order).routineNotes ||
        (order as { routine_notes?: string }).routine_notes ||
        ""
    ).trim();
    const affiliate = String(
      (order as Order).musicAffiliate ||
        (order as { music_affiliate?: string }).music_affiliate ||
        ""
    ).trim();
    const dance = isAllStarDanceOrder(order);
    const sports = isSportsOrder(order);
    const anthem = isAnthemOrder(order);
    const marchingBand = isMarchingBandOrder(order);
    // On clear: wipe musicTheme completely. Do not leave affiliate/notes in theme -
    // Form song list / Songs pill fall back to musicTheme and would stay green.
    // Cheer → songListSuggestions. Dance covers packed into song_list_suggestions.
    // School Anthem / MB Band Chant Song → song_list_suggestions.
    // Dance Songs = Power Music OR Unleash. Clear wipes both boxed covers.
    let dancePower = "";
    let danceUnleash = "";
    let dancePacked = "";
    if (dance) {
      if (filled) {
        const parsed = parseDanceSongCovers(text);
        dancePower =
          parsed.power || (!parsed.unleash ? text.trim() : "");
        danceUnleash = parsed.unleash;
        dancePacked = packDanceSongCovers(dancePower, danceUnleash);
      }
    }
    const nextTheme = filled
      ? dance
        ? buildLegacyMusicTheme({
            routineNotes: existingNotes,
            powerMusicCovers: dancePower,
            musicAffiliate: affiliate || undefined,
          })
        : anthem || marchingBand
          ? ""
          : text
      : "";
    const orderPatch: Partial<Order> = {
      songListSuggestions: dance
        ? dancePacked
        : anthem || marchingBand
          ? ""
          : text,
      powerMusicCovers: dance ? dancePower : "",
      unleashTheBeatsCovers: dance ? danceUnleash : "",
      // Keep notes explicit so normalizeOrder does not refill them from musicTheme.
      routineNotes: existingNotes,
      haveSongs: filled ? "HAVE SONGS" : "NEED SONGS",
      collectionStates: nextStates as Order["collectionStates"],
      musicTheme: nextTheme,
    };
    if (sports) {
      orderPatch.customerSongs = filled ? text : "";
    }
    if (anthem || marchingBand) {
      // Song pill ↔ song_list_suggestions (Anthem style / MB Band Chant).
      orderPatch.songListSuggestions = text;
      orderPatch.instrumentationNotes = text;
      if (anthem) {
        orderPatch.instrumentalStylePreference = text;
      }
    }
    const mtdPatch: Partial<MTDRecord> & {
      powerMusicCovers?: string;
      unleashTheBeatsCovers?: string;
      instrumentationNotes?: string;
    } = {
      songListSuggestions: orderPatch.songListSuggestions,
      haveSongs: filled ? "HAVE SONGS" : "NEED SONGS",
      collectionStates: nextStates as MTDRecord["collectionStates"],
      musicTheme: nextTheme,
      powerMusicCovers: orderPatch.powerMusicCovers,
      unleashTheBeatsCovers: orderPatch.unleashTheBeatsCovers,
    };
    if (anthem || marchingBand) {
      mtdPatch.instrumentationNotes = text;
    }
    return { orderPatch, mtdPatch };
  }

  const nextStates = { ...parsedOverrides };
  delete nextStates.notes;
  const anthem = isAnthemOrder(order);
  const marchingBand = isMarchingBandOrder(order);
  const affiliate = String(
    (order as Order).musicAffiliate ||
      (order as { music_affiliate?: string }).music_affiliate ||
      ""
  ).trim();
  const danceCovers = isAllStarDanceOrder(order)
    ? String((order as Order).powerMusicCovers || "").trim()
    : "";
  const nextTheme =
    anthem || marchingBand
      ? ""
      : buildLegacyMusicTheme({
          routineNotes: text,
          powerMusicCovers: danceCovers,
          musicAffiliate: affiliate || undefined,
        });
  // Magento Notes → routine_notes SoT (Anthem lyrical / MB lyrics / Dance-Cheer
  // routine / SE additional). Not package-gated.
  const orderPatch: Partial<Order> = {
    routineNotes: text,
    additionalNotes: text,
    lyricalNotes: text,
    collectionStates: nextStates as Order["collectionStates"],
    musicTheme: anthem || marchingBand ? "" : nextTheme,
  };
  const mtdPatch: Partial<MTDRecord> & { lyricalNotes?: string } = {
    routineNotes: text,
    lyricalNotes: text,
    collectionStates: nextStates as MTDRecord["collectionStates"],
    musicTheme: anthem || marchingBand ? "" : nextTheme,
  };
  return { orderPatch, mtdPatch };
}

export function OrderRequirementsCell({
  record,
  category,
}: {
  record: Order | MTDRecord;
  category: RequirementCategory;
}) {
  const {
    updateMTD,
    updateOrder,
    addAlert,
    isViewOnly,
    allOrders,
    mtdRecords,
  } = useAppState();
  const requirementsRecord = useMemo(() => {
    const linked = findLinkedOrder(record as MTDRecord, allOrders);
    return mergeOrderFormFieldsForRequirements(record, linked);
  }, [record, allOrders]);
  const linkedOrder = useMemo(
    () => findLinkedOrder(record as MTDRecord, allOrders),
    [record, allOrders]
  );
  const reqs = getOrderRequirements(requirementsRecord);
  const items = (
    category === "collections" ? reqs.collections : reqs.songsArea
  ).filter((item) => item.isApplicable && item.state !== "white");
  const isReassign = reqs.needsReassign;
  const reassignLockReason = isReassign
    ? "Can't mark missing on Reassign off day/rush orders"
    : null;

  const [confirm, setConfirm] = useState<{
    kind: SongsNotesToggleKind;
    direction: SongsNotesToggleDirection;
    currentText: string;
  } | null>(null);

  if (!items || items.length === 0) {
    return (
      <span className="text-[11px] text-brand-ink-tertiary">None Applicable</span>
    );
  }

  const applyCollectionToggle = (item: OrderRequirementItem) => {
    const nextCollected = item.state === "red";

    const existingOverrides =
      (record as MTDRecord).collectionStates ||
      (record as { collection_states?: Record<string, boolean> }).collection_states ||
      {};
    const parsedOverrides =
      typeof existingOverrides === "string"
        ? (() => {
            try {
              return JSON.parse(existingOverrides);
            } catch {
              return {};
            }
          })()
        : existingOverrides;
    const updatedCollectionStates = {
      ...parsedOverrides,
      [item.id]: nextCollected,
    };

    const oldStatus = getOrderRequirements(requirementsRecord).status;
    const simulatedRecord = {
      ...requirementsRecord,
      collectionStates: updatedCollectionStates,
      collection_states: updatedCollectionStates,
      orderStatus: undefined,
      order_status: undefined,
    };
    const newStatus = getOrderRequirements(simulatedRecord).status;
    const statusChanged = oldStatus !== newStatus;

    const patch: Record<string, unknown> = {
      collectionStates: updatedCollectionStates,
      collection_states: updatedCollectionStates,
    };

    if (item.id === "cs" || item.id === "eight_count") {
      patch.eightCountSheet = nextCollected ? "HAVE CS" : "NEED CS";
    }

    void updateMTD(record.id, patch as Partial<MTDRecord>);

    if (statusChanged) {
      addAlert({
        tone: "success",
        title: "Data status updated",
        message: `Order marked as ${newStatus}.`,
      });
    }
  };

  const handleToggle = (item: OrderRequirementItem) => {
    if (isViewOnly) return;
    if (isReassign && item.state === "green") return;
    if (item.state === "white") return;
    // Form is automatic from Magento name-match: not manually toggleable.
    if (item.id === "form") return;

    if (item.id === "songs" || item.id === "notes") {
      const direction: SongsNotesToggleDirection =
        item.state === "green" ? "to_red" : "to_green";
      // Include placeholder tokens (none, N/A, …) so the amber
      // “Placeholder on file” panel shows for Songs/Notes on every category.
      const currentText =
        item.id === "songs"
          ? isAllStarDanceOrder(requirementsRecord)
            ? getDanceSongsConfirmText(requirementsRecord)
            : getFormSongListStoredText(requirementsRecord)
          : getFormNotesText(requirementsRecord);
      setConfirm({
        kind: item.id,
        direction,
        currentText,
      });
      return;
    }

    // Mix Time SoT = Time Length of Mix. Green↔red always goes through confirm
    // (clear field / enter field): never a toggle-only green with empty time.
    if (item.id === "mix" || item.id === "time_of_mix") {
      const currentText = String(
        (requirementsRecord as Order).timeLengthOfMix ||
          (requirementsRecord as { time_length_of_mix?: string })
            .time_length_of_mix ||
          ""
      ).trim();
      setConfirm({
        kind: "mix",
        direction: item.state === "green" ? "to_red" : "to_green",
        currentText,
      });
      return;
    }

    applyCollectionToggle(item);
  };

  const resolveCoveringMtd = (orderId: string | null) =>
    (linkedOrder &&
      mtdRecords.find((rec) => mtdRecordCoversOrder(rec, linkedOrder))) ||
    mtdRecords.find(
      (rec) =>
        rec.id === record.id ||
        rec.orderId === record.id ||
        rec.uuid === record.id ||
        rec.legacyId === record.id ||
        (orderId &&
          (rec.orderId === orderId ||
            rec.id === orderId ||
            rec.legacyId === orderId))
    );

  const handleSongsNotesConfirm = (text: string) => {
    if (!confirm) return;
    const { kind, direction } = confirm;
    const nextText = direction === "to_red" ? "" : text.trim();
    // Reject empty + sentinel placeholders (none, N/A, TBD, …).
    if (direction === "to_green" && !hasMeaningfulFieldValue(nextText)) return;

    const orderId =
      linkedOrder?.id ||
      (record as MTDRecord).orderId ||
      (record.id.startsWith("ord-") || record.id.includes("-")
        ? record.id
        : null);

    if (kind === "mix") {
      const orderSource = (linkedOrder || requirementsRecord) as Order;
      const orderPatch = orderPatchFromOrderField(
        "timeLengthOfMix",
        nextText,
        orderSource
      );
      const mtdFieldPatch = mtdPatchFromOrderField("timeLengthOfMix", nextText);
      const mtdPatch: Partial<MTDRecord> = {
        ...mtdFieldPatch,
        collectionStates: orderPatch.collectionStates as MTDRecord["collectionStates"],
        ...(typeof orderPatch.package === "string"
          ? { package: orderPatch.package }
          : {}),
      };

      if (orderId) {
        void updateOrder(orderId, orderPatch, linkedOrder || undefined);
      }
      const coveringMtd = resolveCoveringMtd(orderId);
      if (coveringMtd?.id) {
        void updateMTD(coveringMtd.id, mtdPatch);
      }

      addAlert({
        tone: "success",
        title: "Mix Time updated",
        message:
          direction === "to_red"
            ? "Time Length of Mix cleared. Mix Time marked as missing."
            : "Time Length of Mix saved. Mix Time marked as collected.",
      });
      setConfirm(null);
      return;
    }

    const { orderPatch, mtdPatch } = buildSongsNotesPatches(
      requirementsRecord,
      kind,
      nextText
    );

    // Order is source of truth for song list / notes. Only patch an existing MTD
    // staging row: never createMTD via updateMTD (that cloned Orders rows).
    if (orderId) {
      void updateOrder(orderId, orderPatch, linkedOrder || undefined);
    }
    const coveringMtd = resolveCoveringMtd(orderId);
    if (coveringMtd?.id) {
      void updateMTD(coveringMtd.id, mtdPatch);
    }

    const anthem = isAnthemOrder(requirementsRecord);
    const marchingBand = isMarchingBandOrder(requirementsRecord);
    const songsClearMsg = anthem
      ? "Instrumental style preference cleared. Song marked as not have."
      : marchingBand
        ? "Instrumentation notes cleared. Song marked as not have."
        : "Song list cleared. Songs marked as not have.";
    const songsSaveMsg = anthem
      ? "Instrumental style preference saved. Song marked as have."
      : marchingBand
        ? "Instrumentation notes saved. Song marked as have."
        : "Song list saved. Songs marked as have.";
    const notesClearMsg = anthem
      ? "Lyrical notes cleared. Notes marked as not have."
      : marchingBand
        ? "Lyrics / mix notes cleared. Notes marked as not have."
        : "Routine notes cleared. Notes marked as not have.";
    const notesSaveMsg = anthem
      ? "Lyrical notes saved. Notes marked as have."
      : marchingBand
        ? "Lyrics / mix notes saved. Notes marked as have."
        : "Routine notes saved. Notes marked as have.";
    addAlert({
      tone: "success",
      title: kind === "songs" ? "Songs updated" : "Notes updated",
      message:
        direction === "to_red"
          ? kind === "songs"
            ? songsClearMsg
            : notesClearMsg
          : kind === "songs"
            ? songsSaveMsg
            : notesSaveMsg,
    });
    setConfirm(null);
  };

  return (
    <>
      <div
        className="inline-flex items-center justify-center gap-1 rounded-full bg-[#f0f3f6] border border-[#e2e8f0] p-1 shadow-inner max-w-fit mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <OrderRequirementPill
            key={item.id}
            item={item}
            onToggle={item.id === "form" ? undefined : handleToggle}
            disabled={isViewOnly || item.id === "form"}
            lockReason={reassignLockReason}
          />
        ))}
      </div>

      <SongsNotesToggleModal
        open={Boolean(confirm)}
        kind={confirm?.kind || "songs"}
        direction={confirm?.direction || "to_red"}
        currentText={confirm?.currentText || ""}
        fieldLabel={
          confirm
            ? confirmClearFieldLabel(requirementsRecord, confirm.kind)
            : undefined
        }
        onClose={() => setConfirm(null)}
        onConfirm={handleSongsNotesConfirm}
      />
    </>
  );
}
