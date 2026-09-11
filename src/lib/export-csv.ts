import type { MTDRecord, Order, Producer } from "@/types";
import { formatPrice } from "./data";
import { doDateRangesOverlap, toIsoDateString } from "./dates";
import {
  findLinkedOrder,
  findProducerByAssignmentKey,
  getRequestedEditorFromRecord,
} from "./editor-assignment";
import { isPreMTDOrderRecord, resolveMTDFormMeta } from "./mtd-filters";
import { orderFromMTDRecord } from "./order-detail-fields";
import { getOrderDetailSections, getFormTypeLabel } from "./order-detail-sections";
import { parsePackage } from "./package";
import { computeClientPayroll } from "./pricing-display";

import { inferMTDRecordStatus } from "./mtd-status";

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
    { key: "formType", label: "Category" },
    { key: "subtype", label: "Subtype" },
    { key: "contactName", label: "Contact Name" },
    { key: "programName", label: "Program Name" },
    { key: "invoice", label: "Invoice #" },
    { key: "package", label: "Package" },
    { key: "packageTier", label: "Package Tier" },
    { key: "timeLimit", label: "Time Limit" },
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
      requestedProducer: getRequestedEditorFromRecord(rec, producers, linked) || "FA",
      mixStartDate: toIsoDateString(rec.mixStartDate) || "",
      mixEndDate: toIsoDateString(rec.mixEndDate) || "",
      rushFee:
        rushQty === 2 ? "Double Rush ($300)" : rushQty === 1 ? "Rush Fee ($150)" : "None",
      danceExtraSongs: isDance
        ? (rec as any).danceExtraSongs
          ? `${(rec as any).danceExtraSongs} ($${(rec as any).danceExtraSongs * 15})`
          : "0"
        : "",
      danceExtraSongTime: isDance
        ? (rec as any).danceExtraSongTime
          ? `${(rec as any).danceExtraSongTime} ($${(rec as any).danceExtraSongTime * 30})`
          : "0"
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
  producers: Producer[]
): string {
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  const baseHeaders = [
    { key: "id", label: "Record ID" },
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

    const custPrice = order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
    const payrollPrice = rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price;
    const rushQty =
      typeof rec.rushFeeQuantity === "number"
        ? rec.rushFeeQuantity
        : rec.rushFeeOption === "double"
        ? 2
        : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
        ? 1
        : 0;

    const calc = computeClientPayroll(
      producerObj,
      custPrice,
      null,
      rec.rateUsed ?? order?.rateUsed ?? null,
      rec.manualPayoutInput ?? null,
      meta.canonicalSubtypeId,
      payrollPrice,
      {
        rushFeeQuantity: rushQty,
        rushFeeCompensationRate:
          rec.rushFeeCompensationRate ?? producerObj?.rushFeeRate ?? 1.0,
        danceVoiceover: rec.danceVoiceover,
        hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
        hasThemedVoiceover: rec.hasThemedVoiceover,
        cheerVoiceover20: rec.cheerVoiceover20,
        cheerVoiceover40: rec.cheerVoiceover40,
        formType: meta.formType,
      }
    );

    const isDance = meta.formType === "school-all-star-dance";
    const payoutTotal = calc.producerPayout ?? rec.producerPayout ?? order?.producerPayout ?? 0;

    const row: Record<string, unknown> = {
      id: rec.id,
      completedDate:
        toIsoDateString(rec.completedAt) || toIsoDateString(rec.mixEndDate) || "",
      formType: getFormTypeLabel(meta.formType),
      subtype: meta.canonicalSubtypeId,
      contactName: rec.contactName,
      programName: rec.programName,
      assignedProducer: rec.assignedProducer || "",
      customerPrice: formatPrice(custPrice),
      payrollBasePrice: formatPrice(payrollPrice),
      producerRate: rec.rateUsed ?? order?.rateUsed ?? "Default",
      voiceoverPayout: formatPrice(calc.voiceoverPayout ?? 0),
      rushPayout: formatPrice(calc.rushFeePayout ?? 0),
      danceExtraSongsPayout: isDance
        ? formatPrice(((rec as any).danceExtraSongs || 0) * 15)
        : "",
      danceExtraSongTimePayout: isDance
        ? formatPrice(((rec as any).danceExtraSongTime || 0) * 30)
        : "",
      totalProducerPayout: formatPrice(payoutTotal),
      couponCode: rec.couponCode || order?.couponCode || "",
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
  { key: "timeLimit", label: "Time Limit" },
  { key: "voiceoverAddon", label: "Voiceover Add-on" },
  { key: "rushFee", label: "Rush Fee Option" },
  { key: "danceExtraSongs", label: "Dance Extra Songs" },
  { key: "danceExtraSongTime", label: "Dance Extra Song Time" },
  { key: "producerRate", label: "My Compensation Rate" },
  { key: "voiceoverPayout", label: "Voiceover Compensation" },
  { key: "rushPayout", label: "Rush Fee Compensation" },
  { key: "danceExtraSongsPayout", label: "Dance Extra Songs Compensation" },
  { key: "danceExtraSongTimePayout", label: "Dance Extra Song Time Compensation" },
  { key: "totalPayout", label: "My Total Payout" },
];

export function getProducerFacingPayrollRows(
  records: MTDRecord[],
  allOrders: Order[],
  producers: Producer[],
  targetProducerName: string,
  filterPeriod?: { start?: string; end?: string }
): ProducerFacingPayrollRow[] {
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  let periodMatchingRecords = records;
  if (filterPeriod && (filterPeriod.start || filterPeriod.end)) {
    periodMatchingRecords = records.filter((rec) => {
      const recStart = rec.completedAt || rec.mixStartDate || "";
      const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
      return doDateRangesOverlap({ start: recStart, end: recEnd }, filterPeriod);
    });
  }

  const producerRecords = periodMatchingRecords.filter((rec) => {
    if (!rec.assignedProducer) return false;
    const prodObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
    const resolvedName = prodObj?.name || rec.assignedProducer;
    return (
      resolvedName.trim().toUpperCase() === targetProducerName.trim().toUpperCase() ||
      rec.assignedProducer.trim().toUpperCase() === targetProducerName.trim().toUpperCase()
    );
  });

  const preparedRows: ProducerFacingPayrollRow[] = [];

  for (const rec of producerRecords) {
    const linked = findLinkedOrder(rec, allOrders);
    const order = orderFromMTDRecord(rec, linked, orderById);
    const meta = resolveMTDFormMeta(rec, orderById);
    const producerObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
    const parsedPkg = parsePackage(rec.package);

    const custPrice = order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
    const payrollPrice = rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price;
    const rushQty =
      typeof rec.rushFeeQuantity === "number"
        ? rec.rushFeeQuantity
        : rec.rushFeeOption === "double"
        ? 2
        : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
        ? 1
        : 0;

    const calc = computeClientPayroll(
      producerObj,
      custPrice,
      null,
      rec.rateUsed ?? order?.rateUsed ?? null,
      rec.manualPayoutInput ?? null,
      meta.canonicalSubtypeId,
      payrollPrice,
      {
        rushFeeQuantity: rushQty,
        rushFeeCompensationRate:
          rec.rushFeeCompensationRate ?? producerObj?.rushFeeRate ?? 1.0,
        danceVoiceover: rec.danceVoiceover,
        hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
        hasThemedVoiceover: rec.hasThemedVoiceover,
        cheerVoiceover20: rec.cheerVoiceover20,
        cheerVoiceover40: rec.cheerVoiceover40,
        formType: meta.formType,
      }
    );

    const isDance = meta.formType === "school-all-star-dance";
    const payoutTotal = calc.producerPayout ?? rec.producerPayout ?? order?.producerPayout ?? 0;

    const row: ProducerFacingPayrollRow = {
      completedDate:
        toIsoDateString(rec.completedAt) || toIsoDateString(rec.mixEndDate) || "",
      programName: rec.programName,
      category: getFormTypeLabel(meta.formType),
      subtype: meta.canonicalSubtypeId,
      package: rec.package,
      timeLimit: parsedPkg.limit,
      voiceoverAddon:
        rec.danceVoiceover ||
        (rec.cheerVoiceover40
          ? "Cheer $40 VO"
          : rec.cheerVoiceover20
          ? "Cheer $20 VO"
          : "None"),
      rushFee:
        rushQty === 2 ? "Double Rush ($300)" : rushQty === 1 ? "Rush Fee ($150)" : "None",
      danceExtraSongs: isDance
        ? (rec as any).danceExtraSongs
          ? String((rec as any).danceExtraSongs)
          : "0"
        : "",
      danceExtraSongTime: isDance
        ? (rec as any).danceExtraSongTime
          ? String((rec as any).danceExtraSongTime)
          : "0"
        : "",
      producerRate: String(rec.rateUsed ?? order?.rateUsed ?? "Default"),
      voiceoverPayout: formatPrice(calc.voiceoverPayout ?? 0),
      rushPayout: formatPrice(calc.rushFeePayout ?? 0),
      danceExtraSongsPayout: isDance
        ? formatPrice(((rec as any).danceExtraSongs || 0) * 15)
        : "",
      danceExtraSongTimePayout: isDance
        ? formatPrice(((rec as any).danceExtraSongTime || 0) * 30)
        : "",
      totalPayout: formatPrice(payoutTotal),
      producerName: producerObj?.name || rec.assignedProducer || "Unassigned",
      recId: rec.id,
      rawTotalPayout: payoutTotal,
    };

    preparedRows.push(row);
  }

  return preparedRows;
}

export function generateProducerFacingPayrollCsv(
  records: MTDRecord[],
  allOrders: Order[],
  producers: Producer[],
  targetProducerName: string,
  filterPeriod?: { start?: string; end?: string }
): string {
  const rows = getProducerFacingPayrollRows(
    records,
    allOrders,
    producers,
    targetProducerName,
    filterPeriod
  );
  return buildCsvString(PRODUCER_STATEMENT_COLUMNS, rows);
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

