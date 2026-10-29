import type { MTDRecord, Order, Producer, PayrollAddon } from "@/types";
import { formatPrice } from "./data";
import {
  doDateRangesOverlap,
  formatDisplayDateTime,
  toIsoDateString,
} from "./dates";
import {
  findLinkedOrder,
  findProducerByAssignmentKey,
  formatRequestedEditorLabel,
} from "./editor-assignment";
import { isPreMTDOrderRecord, resolveMTDFormMeta } from "./mtd-filters";
import { orderFromMTDRecord } from "./order-detail-fields";
import { getOrderDetailSections, getFormTypeLabel } from "./order-detail-sections";
import { parsePackage } from "./package";
import { payrollAmountsForRow } from "./order-package-price";
import {
  computeClientPayroll,
  finalizedPayrollRate,
  packagePayoutMatchingCompliance,
} from "./pricing-display";
import { formatCompensationPercent } from "./producers";
import { payrollRowIsRushOrder } from "./forward-order-mail";
import {
  finalizeMixPayout,
  resolveRushFeeSelection,
  rushFeeAddonForRecord,
  sportsEntertainmentIncludedRushFeeAmount,
} from "./rush-fee";
import {
  applyMiscAdjustmentToPayout,
  formatSignedMiscAdjustment,
  miscAdjustmentAmount,
} from "./misc-payroll-adjustment";

import { inferMTDRecordStatus } from "./mtd-status";

/**
 * Dance Extra Songs qty — MTD board toggle, order mirror, or pricing_breakdown
 * from Complete-to-Payroll (addon_id extra_song / extra_songs).
 */
export function resolveDanceExtraSongsQuantity(
  rec: Pick<MTDRecord, "extraSongsQuantity">,
  order?: Order | null
): number {
  const fromRec = Math.max(0, Math.floor(Number(rec.extraSongsQuantity) || 0));
  if (fromRec > 0) return fromRec;
  const fromOrder = Math.max(
    0,
    Math.floor(Number(order?.extraSongsQuantity) || 0)
  );
  if (fromOrder > 0) return fromOrder;
  const addons = (
    order as { pricingBreakdown?: { addons?: Array<{ addon_id?: string; quantity?: number }> } } | null
  )?.pricingBreakdown?.addons;
  if (Array.isArray(addons)) {
    for (const a of addons) {
      const id = String(a?.addon_id || "");
      if (
        (id === "extra_song" || id === "extra_songs") &&
        Number(a.quantity) > 0
      ) {
        return Math.floor(Number(a.quantity));
      }
    }
  }
  return 0;
}

/** Dance Extra Song Editing Time qty ($30/unit). */
export function resolveDanceExtraSongTimeQuantity(
  rec: Pick<MTDRecord, "extraSongEditingTimeQuantity">,
  order?: Order | null
): number {
  const fromRec = Math.max(
    0,
    Math.floor(Number(rec.extraSongEditingTimeQuantity) || 0)
  );
  if (fromRec > 0) return fromRec;
  const fromOrder = Math.max(
    0,
    Math.floor(Number(order?.extraSongEditingTimeQuantity) || 0)
  );
  if (fromOrder > 0) return fromOrder;
  const addons = (
    order as { pricingBreakdown?: { addons?: Array<{ addon_id?: string; quantity?: number }> } } | null
  )?.pricingBreakdown?.addons;
  if (Array.isArray(addons)) {
    for (const a of addons) {
      const id = String(a?.addon_id || "");
      if (
        (id === "extra_song_added_time_fee" ||
          id === "extra_song_editing_time") &&
        Number(a.quantity) > 0
      ) {
        return Math.floor(Number(a.quantity));
      }
    }
  }
  return 0;
}

export function isEligibleProducerScheduleRecord(rec: MTDRecord): boolean {
  if (!rec) return false;

  // 1. Must have an assigned producer/editor
  if (!rec.assignedProducer || !rec.assignedProducer.trim()) {
    return false;
  }

  // 2. Must NOT be completed or in payroll
  const isCompleted =
    rec.status === "completed" ||
    (rec.status as string) === "Completed" ||
    (rec as any).recordStatus === "completed" ||
    (rec as any).recordStatus === "Completed" ||
    Boolean(rec.inPayroll) ||
    Boolean((rec as any).in_payroll);
  if (isCompleted) return false;

  // 3. Must be Ongoing status (not Waiting for Data, Outsourced, Completed, etc.)
  const mtdStatus = inferMTDRecordStatus(rec);
  if (mtdStatus !== "Ongoing") {
    return false;
  }

  // 4. Must have a valid Mix Start Date
  const startDate = toIsoDateString(rec.mixStartDate);
  if (!startDate) return false;

  // 5. Must have a valid Mix End Date
  const endDate = toIsoDateString(rec.mixEndDate);
  if (!endDate) return false;

  return true;
}

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvString(
  headers: { key: string; label: string }[],
  rows: Record<string, unknown>[]
): string {
  const headerRow = headers.map((h) => escapeCsvCell(h.label)).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h.key])).join(",")
  );
  return [headerRow, ...dataRows].join("\r\n");
}

export function triggerCsvDownload(filename: string, csvText: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function extractDetailFieldsMap(order: Order): Map<string, { label: string; value: string }> {
  const map = new Map<string, { label: string; value: string }>();
  const sections = getOrderDetailSections(order);

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.value && field.value !== "—") {
        map.set(field.key, { label: field.label, value: field.value });
      }
    }
  }

  return map;
}

export function generateOrdersCsv(records: MTDRecord[], allOrders: Order[]): string {
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  const baseHeaders = [
    { key: "id", label: "Order ID" },
    { key: "createdAt", label: "Timestamp" },
    { key: "formType", label: "Category" },
    { key: "subtype", label: "Subtype" },
    { key: "contactName", label: "Contact Name" },
    { key: "programName", label: "Program Name" },
    { key: "assignedProducer", label: "Assigned Producer" },
    { key: "mixStartDate", label: "Mix Start Date" },
    { key: "mixEndDate", label: "Mix End Date" },
    { key: "status", label: "Status" },
  ];

  const detailFieldHeadersMap = new Map<string, string>();
  const preparedRows: Record<string, unknown>[] = [];

  for (const rec of records) {
    const linked = findLinkedOrder(rec, allOrders);
    const order = orderFromMTDRecord(rec, linked, orderById);
    const meta = resolveMTDFormMeta(rec, orderById);
    const detailsMap = extractDetailFieldsMap(order);

    for (const [key, { label }] of detailsMap.entries()) {
      if (!detailFieldHeadersMap.has(key)) {
        detailFieldHeadersMap.set(key, label);
      }
    }

    const row: Record<string, unknown> = {
      id: rec.orderId || rec.id,
      createdAt: formatDisplayDateTime(
        linked?.createdAt || order.createdAt || ""
      ),
      formType: getFormTypeLabel(meta.formType),
      subtype: meta.canonicalSubtypeId,
      contactName: rec.contactName || order.contactName || "",
      programName: rec.programName || order.programName || "",
      assignedProducer: rec.assignedProducer?.trim()
        ? rec.assignedProducer
        : "No assigned producer yet",
      mixStartDate: toIsoDateString(rec.mixStartDate)
        ? toIsoDateString(rec.mixStartDate)
        : "No scheduled start",
      mixEndDate: toIsoDateString(rec.mixEndDate)
        ? toIsoDateString(rec.mixEndDate)
        : "No scheduled end",
      status: isPreMTDOrderRecord(rec) ? "Pre-MTD Orders" : rec.status,
    };

    for (const [key, { value }] of detailsMap.entries()) {
      row[key] = value;
    }

    preparedRows.push(row);
  }

  const detailHeaders = Array.from(detailFieldHeadersMap.entries()).map(([key, label]) => ({
    key,
    label,
  }));

  return buildCsvString([...baseHeaders, ...detailHeaders], preparedRows);
}

export function generateMTDCsv(
  records: MTDRecord[],
  allOrders: Order[],
  producers: Producer[]
): string {
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  const baseHeaders = [
    { key: "id", label: "Record ID" },
    { key: "createdAt", label: "Timestamp" },
    { key: "formType", label: "Category" },
    { key: "subtype", label: "Subtype" },
    { key: "contactName", label: "Contact Name" },
    { key: "programName", label: "Program Name" },
    { key: "invoice", label: "Invoice #" },
    { key: "package", label: "Package" },
    { key: "packageTier", label: "Package Tier" },
    { key: "timeLimit", label: "Mix Length" },
    { key: "split", label: "Split / No Split" },
    { key: "price", label: "Customer Price" },
    { key: "priceCompliance", label: "Price Compliance" },
    { key: "assignedProducer", label: "Assigned Producer" },
    { key: "requestedProducer", label: "Requested Producer" },
    { key: "mixStartDate", label: "Mix Start Date" },
    { key: "mixEndDate", label: "Mix End Date" },
    { key: "rushFee", label: "Rush Fee Option" },
    { key: "danceExtraSongs", label: "Dance Extra Songs ($15/ea)" },
    { key: "danceExtraSongTime", label: "Dance Extra Song Time ($30/ea)" },
    { key: "voiceover", label: "Voiceover Selection" },
    { key: "eightCountSheet", label: "8-Count Sheet Checklist" },
    { key: "haveSongs", label: "Have Songs Checklist" },
    { key: "status", label: "Status" },
  ];

  const detailFieldHeadersMap = new Map<string, string>();
  const preparedRows: Record<string, unknown>[] = [];

  for (const rec of records) {
    const linked = findLinkedOrder(rec, allOrders);
    const order = orderFromMTDRecord(rec, linked, orderById);
    const meta = resolveMTDFormMeta(rec, orderById);
    const detailsMap = extractDetailFieldsMap(order);
    const parsedPkg = parsePackage(rec.package);

    for (const [key, { label }] of detailsMap.entries()) {
      if (!detailFieldHeadersMap.has(key)) {
        detailFieldHeadersMap.set(key, label);
      }
    }

    const rushQty =
      typeof rec.rushFeeQuantity === "number"
        ? rec.rushFeeQuantity
        : rec.rushFeeOption === "double"
        ? 2
        : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
        ? 1
        : 0;

    const isDance = meta.formType === "school-all-star-dance";

    const row: Record<string, unknown> = {
      id: rec.id,
      createdAt: formatDisplayDateTime(
        linked?.createdAt || order.createdAt || ""
      ),
      formType: getFormTypeLabel(meta.formType),
      subtype: meta.canonicalSubtypeId,
      contactName: rec.contactName,
      programName: rec.programName,
      invoice: rec.invoice || "",
      package: rec.package,
      packageTier: parsedPkg.tier,
      timeLimit: parsedPkg.limit,
      split: parsedPkg.split,
      price: formatPrice(rec.finalCustomerPrice ?? rec.price),
      priceCompliance: rec.priceCompliance || "Compliant",
      assignedProducer: rec.assignedProducer || "Unassigned",
      requestedProducer: formatRequestedEditorLabel(rec, producers, linked),
      mixStartDate: toIsoDateString(rec.mixStartDate) || "",
      mixEndDate: toIsoDateString(rec.mixEndDate) || "",
      rushFee:
        rushQty === 2 ? "Double Rush ($300)" : rushQty === 1 ? "Rush Fee ($150)" : "None",
      danceExtraSongs: isDance
        ? (() => {
            const qty = resolveDanceExtraSongsQuantity(rec, linked ?? order);
            return qty > 0 ? `${qty} ($${qty * 15})` : "0";
          })()
        : "",
      danceExtraSongTime: isDance
        ? (() => {
            const qty = resolveDanceExtraSongTimeQuantity(rec, linked ?? order);
            return qty > 0 ? `${qty} ($${qty * 30})` : "0";
          })()
        : "",
      voiceover:
        rec.danceVoiceover ||
        (rec.cheerVoiceover40
          ? "Cheer $40 VO"
          : rec.cheerVoiceover20
          ? "Cheer $20 VO"
          : "None"),
      eightCountSheet: rec.eightCountSheet || "Missing",
      haveSongs: rec.haveSongs || "Missing",
      status: rec.status,
    };

    for (const [key, { value }] of detailsMap.entries()) {
      row[key] = value;
    }

    preparedRows.push(row);
  }

  const detailHeaders = Array.from(detailFieldHeadersMap.entries()).map(([key, label]) => ({
    key,
    label,
  }));

  return buildCsvString([...baseHeaders, ...detailHeaders], preparedRows);
}

export function generatePayrollCsv(
  records: MTDRecord[],
  allOrders: Order[],
  producers: Producer[],
  payrollAddons: PayrollAddon[] = []
): string {
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  const baseHeaders = [
    { key: "id", label: "Record ID" },
    { key: "createdAt", label: "Timestamp" },
    { key: "completedDate", label: "Completed Date" },
    { key: "formType", label: "Category" },
    { key: "subtype", label: "Subtype" },
    { key: "contactName", label: "Contact Name" },
    { key: "programName", label: "Program Name" },
    { key: "assignedProducer", label: "Assigned Producer" },
    { key: "customerPrice", label: "Customer Price" },
    { key: "payrollBasePrice", label: "Payroll Base Price" },
    { key: "producerRate", label: "Producer Rate" },
    { key: "voiceoverPayout", label: "Voiceover Payout" },
    { key: "rushPayout", label: "Rush Fee Payout" },
    { key: "miscellaneousAdjustment", label: "Miscellaneous Adjustment" },
    { key: "danceExtraSongsPayout", label: "Dance Extra Songs Payout" },
    { key: "danceExtraSongTimePayout", label: "Dance Extra Song Time Payout" },
    { key: "totalProducerPayout", label: "Total Producer Payout" },
    { key: "couponCode", label: "Coupon Code" },
  ];

  const detailFieldHeadersMap = new Map<string, string>();
  const preparedRows: Record<string, unknown>[] = [];

  for (const rec of records) {
    const linked = findLinkedOrder(rec, allOrders);
    const order = orderFromMTDRecord(rec, linked, orderById);
    const meta = resolveMTDFormMeta(rec, orderById);
    const detailsMap = extractDetailFieldsMap(order);
    const producerObj = findProducerByAssignmentKey(rec.assignedProducer, producers);

    for (const [key, { label }] of detailsMap.entries()) {
      if (!detailFieldHeadersMap.has(key)) {
        detailFieldHeadersMap.set(key, label);
      }
    }

    const priced = payrollAmountsForRow(rec, order, meta, orderById);
    const custPrice = priced.customerPrice;
    const payrollPrice = priced.payrollPrice;
    const rush = resolveRushFeeSelection({
      isRush: payrollRowIsRushOrder(rec, linked),
      producerRate: producerObj?.rushFeeRate,
      producerId: producerObj?.id,
      addon: rushFeeAddonForRecord(rec.id, rec.orderId, payrollAddons),
    });

    // Mix editor CSV rows: package (+ SE Magento rush × rushFeeRate). Cheer
    // Rushby and VO addons are listed separately.
    const seRushFee =
      meta.formType === "sports-entertainment"
        ? sportsEntertainmentIncludedRushFeeAmount({
            isRush: payrollRowIsRushOrder(rec, linked),
            formType: meta.formType,
            category: linked?.category || rec.category,
            finalCustomerPrice: custPrice,
            finalPayrollPrice: payrollPrice,
          })
        : 0;
    const calc = computeClientPayroll(
      producerObj,
      custPrice,
      null,
      finalizedPayrollRate(order) ?? order?.rateUsed ?? null,
      rec.manualPayoutInput ?? null,
      meta.canonicalSubtypeId,
      payrollPrice,
      {
        rushFeeQuantity: 0,
        includeRushFeeInPayout: false,
        sportsEntertainmentRushFee: seRushFee,
        rushFeeCompensationRate: producerObj?.rushFeeRate ?? 1.0,
        danceVoiceover: null,
        hasTraditionalVoiceover: false,
        hasThemedVoiceover: false,
        cheerVoiceover20: false,
        cheerVoiceover40: false,
        formType: meta.formType,
      }
    );

    const isDance = meta.formType === "school-all-star-dance";
    const basePayout =
      packagePayoutMatchingCompliance(
        order,
        calc.producerPayout,
        priced.savedPayrollPrice,
        payrollPrice,
        meta.formType
      ) ?? 0;
    const rushPayout = rush.compensation;
    const withRush = finalizeMixPayout(basePayout, calc.status, rush) ?? basePayout;
    const miscAdj = miscAdjustmentAmount(rec.id, rec.orderId, payrollAddons);
    const payoutTotal =
      applyMiscAdjustmentToPayout(withRush, miscAdj) ?? withRush;

    const row: Record<string, unknown> = {
      id: rec.id,
      createdAt: formatDisplayDateTime(
        linked?.createdAt || order.createdAt || ""
      ),
      completedDate:
        toIsoDateString(rec.completedAt) || toIsoDateString(rec.mixEndDate) || "",
      formType: getFormTypeLabel(meta.formType),
      subtype: meta.canonicalSubtypeId,
      contactName: rec.contactName,
      programName: rec.programName,
      assignedProducer: rec.assignedProducer || "",
      customerPrice: formatPrice(custPrice),
      payrollBasePrice: formatPrice(payrollPrice),
      producerRate:
        formatCompensationPercent(
          finalizedPayrollRate(order) ?? order?.rateUsed ?? calc.rateUsed
        ) ?? "Default",
      voiceoverPayout: formatPrice(0),
      rushPayout: formatPrice(rushPayout),
      miscellaneousAdjustment:
        miscAdj !== 0 ? formatSignedMiscAdjustment(miscAdj) : "",
      danceExtraSongsPayout: isDance
        ? formatPrice(
            resolveDanceExtraSongsQuantity(rec, linked ?? order) * 15
          )
        : "",
      danceExtraSongTimePayout: isDance
        ? formatPrice(
            resolveDanceExtraSongTimeQuantity(rec, linked ?? order) * 30
          )
        : "",
      totalProducerPayout: formatPrice(payoutTotal),
      couponCode: rec.couponCode || order?.couponCode || "",
    };

    for (const [key, { value }] of detailsMap.entries()) {
      row[key] = value;
    }

    preparedRows.push(row);
  }

  // VO addons as separate rows attributed to the VO producer
  for (const addon of payrollAddons) {
    if (addon.addonType !== "voiceover") continue;
    const voProducer =
      producers.find((p) => p.id === addon.producerId) ||
      findProducerByAssignmentKey(addon.producerInitials, producers);
    preparedRows.push({
      id: addon.id,
      completedDate: toIsoDateString(addon.createdAt) || addon.createdAt,
      formType: addon.category,
      subtype: "Voiceover Add-on",
      contactName: addon.contactName || "",
      programName: addon.teamName
        ? `${addon.programName} (${addon.teamName})`
        : addon.programName,
      assignedProducer: voProducer?.name || addon.producerInitials || "",
      customerPrice: "",
      payrollBasePrice: "",
      producerRate: "—",
      voiceoverPayout: formatPrice(addon.amount),
      rushPayout: formatPrice(0),
      miscellaneousAdjustment: "",
      danceExtraSongsPayout: "",
      danceExtraSongTimePayout: "",
      totalProducerPayout: formatPrice(addon.amount),
      couponCode: "",
    });
  }

  const detailHeaders = Array.from(detailFieldHeadersMap.entries()).map(([key, label]) => ({
    key,
    label,
  }));

  return buildCsvString([...baseHeaders, ...detailHeaders], preparedRows);
}

export type ProducerFacingPayrollRow = {
  completedDate: string;
  programName: string;
  category: string;
  subtype: string;
  package: string;
  timeLimit: string;
  voiceoverAddon: string;
  rushFee: string;
  danceExtraSongs: string;
  danceExtraSongTime: string;
  producerRate: string;
  voiceoverPayout: string;
  rushPayout: string;
  miscellaneousAdjustment: string;
  danceExtraSongsPayout: string;
  danceExtraSongTimePayout: string;
  totalPayout: string;
  producerName: string;
  recId: string;
  rawTotalPayout: number;
};

export const PRODUCER_STATEMENT_COLUMNS: { key: keyof ProducerFacingPayrollRow; label: string }[] = [
  { key: "completedDate", label: "Completed Date" },
  { key: "programName", label: "Program Name" },
  { key: "category", label: "Category" },
  { key: "subtype", label: "Subtype" },
  { key: "package", label: "Package" },
  { key: "timeLimit", label: "Mix Length" },
  { key: "voiceoverAddon", label: "Voiceover Add-on" },
  { key: "rushFee", label: "Rush Fee Option" },
  { key: "danceExtraSongs", label: "Dance Extra Songs" },
  { key: "danceExtraSongTime", label: "Dance Extra Song Time" },
  { key: "producerRate", label: "My Compensation Rate" },
  { key: "voiceoverPayout", label: "Voiceover Compensation" },
  { key: "rushPayout", label: "Rush Fee Compensation" },
  { key: "miscellaneousAdjustment", label: "Miscellaneous Adjustment" },
  { key: "danceExtraSongsPayout", label: "Dance Extra Songs Compensation" },
  { key: "danceExtraSongTimePayout", label: "Dance Extra Song Time Compensation" },
  { key: "totalPayout", label: "My Total Payout" },
];

/** Lean columns for VO-only statements (no mix-editor rush / dance extras). */
export const PRODUCER_VO_STATEMENT_COLUMNS: {
  key: keyof ProducerFacingPayrollRow;
  label: string;
}[] = [
  { key: "completedDate", label: "Completed Date" },
  { key: "programName", label: "Program Name" },
  { key: "category", label: "Category" },
  { key: "subtype", label: "Subtype" },
  { key: "package", label: "Package" },
  { key: "timeLimit", label: "Mix Length" },
  { key: "voiceoverAddon", label: "Voiceover Add-on" },
  { key: "totalPayout", label: "My Total Payout" },
];

export function isVoiceoverStatementRow(row: ProducerFacingPayrollRow): boolean {
  return (
    String(row.subtype || "").includes("Voiceover") ||
    (Boolean(row.voiceoverAddon) &&
      row.voiceoverAddon !== "None" &&
      row.producerRate === "VO")
  );
}

export function isVoiceoverOnlyStatement(
  rows: ProducerFacingPayrollRow[]
): boolean {
  return rows.length > 0 && rows.every(isVoiceoverStatementRow);
}

export function producerStatementColumnsForRows(
  rows: ProducerFacingPayrollRow[]
): { key: keyof ProducerFacingPayrollRow; label: string }[] {
  if (isVoiceoverOnlyStatement(rows)) return PRODUCER_VO_STATEMENT_COLUMNS;

  const hasDanceExtras = rows.some(
    (r) =>
      (Number(r.danceExtraSongs) || 0) > 0 ||
      (Number(r.danceExtraSongTime) || 0) > 0 ||
      String(r.category || "")
        .toLowerCase()
        .includes("dance")
  );
  const hasVoiceover = rows.some(
    (r) =>
      Boolean(r.voiceoverAddon) &&
      r.voiceoverAddon !== "None" &&
      r.voiceoverAddon !== ""
  );
  const hasRush = rows.some(
    (r) => Boolean(r.rushFee) && r.rushFee !== "None" && r.rushFee !== ""
  );
  const hasMisc = rows.some(
    (r) =>
      Boolean(r.miscellaneousAdjustment) && r.miscellaneousAdjustment !== ""
  );

  return PRODUCER_STATEMENT_COLUMNS.filter((col) => {
    if (
      col.key === "danceExtraSongs" ||
      col.key === "danceExtraSongTime" ||
      col.key === "danceExtraSongsPayout" ||
      col.key === "danceExtraSongTimePayout"
    ) {
      return hasDanceExtras;
    }
    // Voiceover amount lives in My Total Payout (and VO-only statements).
    // Never surface a separate Voiceover Compensation column on mix statements.
    if (col.key === "voiceoverPayout") {
      return false;
    }
    if (col.key === "voiceoverAddon") {
      return hasVoiceover;
    }
    if (col.key === "rushFee" || col.key === "rushPayout") {
      return hasRush;
    }
    if (col.key === "miscellaneousAdjustment") {
      return hasMisc;
    }
    return true;
  });
}

export function isCompletedMix(rec: MTDRecord): boolean {
  if (!rec) return false;
  return (
    rec.status === "completed" ||
    (rec.status as string) === "Completed" ||
    (rec as any).recordStatus === "completed" ||
    (rec as any).recordStatus === "Completed" ||
    Boolean(rec.inPayroll) ||
    Boolean((rec as any).in_payroll)
  );
}

/** Resolve the payroll mix/order a VO or rush addon is for (same order, any producer). */
export function findMixForPayrollAddon(
  addon: PayrollAddon,
  records: MTDRecord[]
): MTDRecord | null {
  const aMtd = addon.mtdId ? String(addon.mtdId).trim() : "";
  const aOrd = addon.orderId ? String(addon.orderId).trim() : "";

  if (aMtd) {
    const byMtd = records.find(
      (r) =>
        String(r.id).trim() === aMtd ||
        String(r.orderId || "").trim() === aMtd
    );
    if (byMtd) return byMtd;
  }
  if (aOrd) {
    const byOrd = records.find(
      (r) =>
        String(r.orderId || "").trim() === aOrd ||
        String(r.id).trim() === aOrd
    );
    if (byOrd) return byOrd;
  }

  // Fallback: same program name (VO created before mix-id linking)
  const prog = addon.programName?.trim().toUpperCase();
  if (prog) {
    return (
      records.find(
        (r) => r.programName?.trim().toUpperCase() === prog
      ) ?? null
    );
  }
  return null;
}

export function matchAddonToRecord(
  addon: PayrollAddon,
  rec: MTDRecord,
  addonType: "voiceover" | "rush_fee" | "misc_adjustment",
  producerObj?: Producer | null
): boolean {
  if (addon.addonType !== addonType) return false;

  const aMtd = addon.mtdId ? String(addon.mtdId).trim() : null;
  const aOrd = addon.orderId ? String(addon.orderId).trim() : null;
  const rId = rec.id ? String(rec.id).trim() : null;
  const rOrd = rec.orderId ? String(rec.orderId).trim() : null;

  // 1. Direct ID matching (handling String conversion & nulls)
  if (aMtd && (aMtd === rId || aMtd === rOrd)) return true;
  if (aOrd && (aOrd === rOrd || aOrd === rId)) return true;

  // 2. Program Name & Producer matching fallback (when mtdId/orderId were stripped/null or non-UUID)
  if (addon.programName && rec.programName) {
    const normAddonProg = addon.programName.trim().toUpperCase();
    const normRecProg = rec.programName.trim().toUpperCase();
    if (normAddonProg === normRecProg) {
      const recProdName = rec.assignedProducer?.trim().toUpperCase() || "";
      const prodName = producerObj?.name?.trim().toUpperCase() || "";
      const prodInitials = producerObj?.initials?.trim().toUpperCase() || "";

      const addonProdId = addon.producerId ? String(addon.producerId).trim().toUpperCase() : "";
      const addonInitials = addon.producerInitials ? addon.producerInitials.trim().toUpperCase() : "";

      const producerMatches =
        !addonInitials && !addonProdId
          ? true
          : (addonInitials && (addonInitials === prodInitials || addonInitials === recProdName)) ||
            (addonProdId && (addonProdId === producerObj?.id.toUpperCase() || addonProdId === recProdName));

      if (producerMatches) {
        if (addon.teamName && (rec as any).teamName) {
          return (
            addon.teamName.trim().toUpperCase() ===
            String((rec as any).teamName).trim().toUpperCase()
          );
        }
        return true;
      }
    }
  }

  return false;
}

export function getProducerFacingPayrollRows(
  records: MTDRecord[],
  allOrders: Order[],
  producers: Producer[],
  targetProducerName: string,
  filterPeriod?: { start?: string; end?: string },
  payrollAddons?: PayrollAddon[]
): ProducerFacingPayrollRow[] {
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  // Filter for completed mixes assigned to target producer
  let filtered = records.filter((rec) => {
    if (!isCompletedMix(rec)) return false;
    if (!rec.assignedProducer) return false;
    const prodObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
    const resolvedName = prodObj?.name || rec.assignedProducer;
    return (
      resolvedName.trim().toUpperCase() === targetProducerName.trim().toUpperCase() ||
      rec.assignedProducer.trim().toUpperCase() === targetProducerName.trim().toUpperCase()
    );
  });

  if (filterPeriod && (filterPeriod.start || filterPeriod.end)) {
    filtered = filtered.filter((rec) => {
      const recStart = rec.completedAt || rec.mixStartDate || "";
      const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
      return doDateRangesOverlap({ start: recStart, end: recEnd }, filterPeriod);
    });
  }

  const preparedRows: ProducerFacingPayrollRow[] = [];
  const usedAddonIds = new Set<string>();

  for (const rec of filtered) {
    const linked = findLinkedOrder(rec, allOrders);
    const order = orderFromMTDRecord(rec, linked, orderById);
    const meta = resolveMTDFormMeta(rec, orderById);
    const producerObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
    const parsedPkg = parsePackage(rec.package);

    const priced = payrollAmountsForRow(rec, order, meta, orderById);
    const custPrice = priced.customerPrice;
    const payrollPrice = priced.payrollPrice;
    const rowRushAddon = payrollAddons?.find((a) =>
      matchAddonToRecord(a, rec, "rush_fee", producerObj)
    );
    const rush = resolveRushFeeSelection({
      isRush: payrollRowIsRushOrder(rec, linked),
      producerRate: producerObj?.rushFeeRate,
      producerId: producerObj?.id,
      addon: rowRushAddon,
    });

    // Mix editor rows: package (+ SE Magento rush × rushFeeRate). Cheer Rushby
    // and VO pay separately.
    const seRushFee =
      meta.formType === "sports-entertainment"
        ? sportsEntertainmentIncludedRushFeeAmount({
            isRush: payrollRowIsRushOrder(rec, linked),
            formType: meta.formType,
            category: linked?.category || rec.category,
            finalCustomerPrice: custPrice,
            finalPayrollPrice: payrollPrice,
          })
        : 0;
    const calc = computeClientPayroll(
      producerObj,
      custPrice,
      null,
      finalizedPayrollRate(order) ?? order?.rateUsed ?? null,
      rec.manualPayoutInput ?? null,
      meta.canonicalSubtypeId,
      payrollPrice,
      {
        rushFeeQuantity: 0,
        includeRushFeeInPayout: false,
        sportsEntertainmentRushFee: seRushFee,
        rushFeeCompensationRate: producerObj?.rushFeeRate ?? 1.0,
        danceVoiceover: null,
        hasTraditionalVoiceover: false,
        hasThemedVoiceover: false,
        cheerVoiceover20: false,
        cheerVoiceover40: false,
        formType: meta.formType,
      }
    );

    const isDance = meta.formType === "school-all-star-dance";

    if (rowRushAddon && rush.quantity > 0) usedAddonIds.add(rowRushAddon.id);

    const basePayout =
      packagePayoutMatchingCompliance(
        order,
        calc.producerPayout,
        priced.savedPayrollPrice,
        payrollPrice,
        meta.formType
      ) ?? 0;
    const rushPayout = rush.compensation;
    const withRush = finalizeMixPayout(basePayout, calc.status, rush) ?? basePayout;
    const miscAdj = miscAdjustmentAmount(
      rec.id,
      rec.orderId,
      payrollAddons ?? []
    );
    const payoutTotal =
      applyMiscAdjustmentToPayout(withRush, miscAdj) ?? withRush;

    const rushLabel =
      rush.quantity > 0 ? formatPrice(rush.total) : "None";

    const row: ProducerFacingPayrollRow = {
      completedDate:
        toIsoDateString(rec.completedAt) || toIsoDateString(rec.mixEndDate) || "",
      programName: rec.programName,
      category: getFormTypeLabel(meta.formType),
      subtype: meta.canonicalSubtypeId,
      package: rec.package,
      timeLimit: parsedPkg.limit,
      voiceoverAddon: "None",
      rushFee: rushLabel,
      danceExtraSongs: isDance
        ? String(resolveDanceExtraSongsQuantity(rec, linked ?? order))
        : "",
      danceExtraSongTime: isDance
        ? String(resolveDanceExtraSongTimeQuantity(rec, linked ?? order))
        : "",
      producerRate:
        formatCompensationPercent(
          finalizedPayrollRate(order) ?? order?.rateUsed ?? calc.rateUsed
        ) ?? "Default",
      voiceoverPayout: formatPrice(0),
      rushPayout: formatPrice(rushPayout),
      miscellaneousAdjustment:
        miscAdj !== 0 ? formatSignedMiscAdjustment(miscAdj) : "",
      danceExtraSongsPayout: isDance
        ? formatPrice(
            resolveDanceExtraSongsQuantity(rec, linked ?? order) * 15
          )
        : "",
      danceExtraSongTimePayout: isDance
        ? formatPrice(
            resolveDanceExtraSongTimeQuantity(rec, linked ?? order) * 30
          )
        : "",
      totalPayout: formatPrice(payoutTotal),
      producerName: producerObj?.name || rec.assignedProducer || "Unassigned",
      recId: rec.id,
      rawTotalPayout: payoutTotal,
    };

    preparedRows.push(row);
  }

  // Append add-ons attributed to this producer:
  // - Voiceovers: pay ONLY the VO producer (producerId preferred), never the mix editor.
  // - Rush fees: only standalone (unlinked) rows; mix-linked rush is on the mix row.
  if (payrollAddons && payrollAddons.length > 0) {
    const targetUpper = targetProducerName.trim().toUpperCase();
    const producerObj =
      producers.find((p) => p.name.toUpperCase() === targetUpper) ||
      producers.find((p) => p.initials.toUpperCase() === targetUpper) ||
      findProducerByAssignmentKey(targetProducerName, producers) ||
      null;

    const addonRows = payrollAddons.filter((addon) => {
      if (usedAddonIds.has(addon.id)) return false;
      if (!addon.producerInitials && !addon.producerId) return false;
      if (!producerObj) return false;

      // Prefer producerId so mix-editor initials never steal a VO payout
      const paysThisProducer = addon.producerId
        ? addon.producerId === producerObj.id
        : (() => {
            const key = addon.producerInitials?.trim().toUpperCase() || "";
            if (!key) return false;
            return (
              key === producerObj.initials.toUpperCase() ||
              key === producerObj.name.toUpperCase()
            );
          })();
      if (!paysThisProducer) return false;

      if (filterPeriod && (filterPeriod.start || filterPeriod.end)) {
        const linked = findMixForPayrollAddon(addon, records);
        const rangeStart =
          linked?.completedAt ||
          linked?.mixStartDate ||
          addon.createdAt ||
          "";
        const rangeEnd =
          linked?.completedAt ||
          linked?.mixEndDate ||
          linked?.mixStartDate ||
          addon.createdAt ||
          "";
        if (
          !doDateRangesOverlap(
            { start: rangeStart, end: rangeEnd },
            filterPeriod
          )
        ) {
          return false;
        }
      }

      // Misc adjustments stay on the mix row — never emit a second line.
      if (addon.addonType === "misc_adjustment") return false;
      if (addon.addonType === "voiceover") return true;
      // Rush: standalone only
      return !addon.mtdId && !addon.orderId;
    });

    for (const addon of addonRows) {
      const typeLabel =
        addon.addonType === "voiceover" ? "Voiceover" : "Rush Fee";
      const voProducer =
        producers.find((p) => p.id === addon.producerId) ||
        findProducerByAssignmentKey(addon.producerInitials, producers);

      // Same order/mix as the editor row — fill package & dates from that mix
      const linkedMix = findMixForPayrollAddon(addon, records);
      const mixMeta = linkedMix
        ? resolveMTDFormMeta(linkedMix, orderById)
        : null;
      const parsedPkg = linkedMix ? parsePackage(linkedMix.package) : null;
      const standaloneRush =
        addon.addonType === "rush_fee"
          ? resolveRushFeeSelection({
              isRush: true,
              producerRate: voProducer?.rushFeeRate,
              producerId: voProducer?.id ?? addon.producerId,
              addon,
            })
          : null;
      const standaloneAmount = standaloneRush
        ? standaloneRush.compensation
        : addon.amount;

      const addonRow: ProducerFacingPayrollRow = {
        completedDate:
          toIsoDateString(linkedMix?.completedAt) ||
          toIsoDateString(linkedMix?.mixEndDate) ||
          toIsoDateString(addon.createdAt) ||
          addon.createdAt,
        programName: linkedMix?.programName || addon.programName,
        category: mixMeta
          ? getFormTypeLabel(mixMeta.formType)
          : addon.category,
        subtype: mixMeta
          ? `${mixMeta.canonicalSubtypeId} · ${typeLabel}`
          : `${typeLabel} Add-on`,
        package: linkedMix?.package || "—",
        timeLimit: parsedPkg?.limit || "—",
        voiceoverAddon:
          addon.addonType === "voiceover" ? formatPrice(addon.amount) : "",
        // Rush is for mix editors only — leave blank on VO rows
        rushFee: standaloneRush ? formatPrice(standaloneRush.total) : "",
        // Mix-editor fields — not used on VO statement columns
        danceExtraSongs: "",
        danceExtraSongTime: "",
        producerRate: addon.addonType === "voiceover" ? "VO" : "—",
        voiceoverPayout:
          addon.addonType === "voiceover"
            ? formatPrice(addon.amount)
            : "",
        rushPayout: standaloneRush ? formatPrice(standaloneRush.compensation) : "",
        miscellaneousAdjustment: "",
        danceExtraSongsPayout: "",
        danceExtraSongTimePayout: "",
        totalPayout: formatPrice(standaloneAmount),
        producerName:
          voProducer?.name ?? addon.producerInitials ?? targetProducerName,
        recId: addon.id,
        rawTotalPayout: standaloneAmount,
      };
      preparedRows.push(addonRow);
    }
  }

  return preparedRows;
}

export function generateProducerFacingPayrollCsv(
  records: MTDRecord[],
  allOrders: Order[],
  producers: Producer[],
  targetProducerName: string,
  filterPeriod?: { start?: string; end?: string },
  payrollAddons?: PayrollAddon[]
): string {
  const rows = getProducerFacingPayrollRows(
    records,
    allOrders,
    producers,
    targetProducerName,
    filterPeriod,
    payrollAddons
  );
  return buildCsvString(producerStatementColumnsForRows(rows), rows);
}

export type ProducerFacingScheduleRow = {
  mixStartDate: string;
  mixEndDate: string;
  assignedProducer: string;
  programName: string;
  contactName: string;
  invoice: string;
  category: string;
  subtype: string;
  package: string;
  status: string;
  recId: string;
  [key: string]: unknown;
};

export const PRODUCER_SCHEDULE_COLUMNS = [
  { key: "mixStartDate", label: "Mix Start Date" },
  { key: "mixEndDate", label: "Mix End Date" },
  { key: "assignedProducer", label: "Producer" },
  { key: "programName", label: "Program Name" },
  { key: "contactName", label: "Contact Name" },
  { key: "invoice", label: "Invoice #" },
  { key: "category", label: "Category" },
  { key: "subtype", label: "Subtype" },
  { key: "package", label: "Package" },
  { key: "status", label: "Status" },
];

export function getProducerFacingScheduleRows(
  records: MTDRecord[],
  allOrders: Order[],
  producers: Producer[],
  targetProducerName?: string,
  filterPeriod?: { start?: string; end?: string }
): ProducerFacingScheduleRow[] {
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  // Source dataset: Strictly eligible Ongoing MTD records with an assigned producer and valid dates
  let filtered = records.filter(isEligibleProducerScheduleRecord);

  if (targetProducerName && targetProducerName !== "all" && targetProducerName !== "All Editors") {
    filtered = filtered.filter((rec) => {
      if (!rec.assignedProducer) return false;
      const prodObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
      const resolvedName = prodObj?.name || rec.assignedProducer;
      return (
        resolvedName.trim().toUpperCase() === targetProducerName.trim().toUpperCase() ||
        rec.assignedProducer.trim().toUpperCase() === targetProducerName.trim().toUpperCase()
      );
    });
  }

  if (filterPeriod && (filterPeriod.start || filterPeriod.end)) {
    filtered = filtered.filter((rec) => {
      const recStart = rec.mixStartDate || rec.completedAt || "";
      const recEnd = rec.mixEndDate || rec.mixStartDate || rec.completedAt || "";
      return doDateRangesOverlap({ start: recStart, end: recEnd }, filterPeriod);
    });
  }

  const preparedRows: ProducerFacingScheduleRow[] = [];

  for (const rec of filtered) {
    const meta = resolveMTDFormMeta(rec, orderById);
    const prodObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
    const prodName = prodObj?.name || rec.assignedProducer || "Unassigned";

    preparedRows.push({
      mixStartDate: toIsoDateString(rec.mixStartDate) || "—",
      mixEndDate: toIsoDateString(rec.mixEndDate ?? rec.mixStartDate) || "—",
      assignedProducer: prodName,
      programName: rec.programName || "—",
      contactName: rec.contactName || "—",
      invoice: rec.invoice || "—",
      category: getFormTypeLabel(meta.formType),
      subtype: meta.canonicalSubtypeId || "—",
      package: rec.package || "—",
      status: "Ongoing",
      recId: rec.id,
    });
  }

  return preparedRows;
}

export function generateScheduleCsv(
  records: MTDRecord[],
  allOrders: Order[],
  producers: Producer[],
  targetProducerName?: string,
  filterPeriod?: { start?: string; end?: string }
): string {
  const rows = getProducerFacingScheduleRows(
    records,
    allOrders,
    producers,
    targetProducerName,
    filterPeriod
  );
  return buildCsvString(PRODUCER_SCHEDULE_COLUMNS, rows);
}

