"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCER_SCHEDULE_COLUMNS = exports.PRODUCER_STATEMENT_COLUMNS = void 0;
exports.isEligibleProducerScheduleRecord = isEligibleProducerScheduleRecord;
exports.escapeCsvCell = escapeCsvCell;
exports.buildCsvString = buildCsvString;
exports.triggerCsvDownload = triggerCsvDownload;
exports.generateOrdersCsv = generateOrdersCsv;
exports.generateMTDCsv = generateMTDCsv;
exports.generatePayrollCsv = generatePayrollCsv;
exports.isCompletedMix = isCompletedMix;
exports.matchAddonToRecord = matchAddonToRecord;
exports.getProducerFacingPayrollRows = getProducerFacingPayrollRows;
exports.generateProducerFacingPayrollCsv = generateProducerFacingPayrollCsv;
exports.getProducerFacingScheduleRows = getProducerFacingScheduleRows;
exports.generateScheduleCsv = generateScheduleCsv;
const data_1 = require("./data");
const dates_1 = require("./dates");
const editor_assignment_1 = require("./editor-assignment");
const mtd_filters_1 = require("./mtd-filters");
const order_detail_fields_1 = require("./order-detail-fields");
const order_detail_sections_1 = require("./order-detail-sections");
const package_1 = require("./package");
const pricing_display_1 = require("./pricing-display");
const mtd_status_1 = require("./mtd-status");
function isEligibleProducerScheduleRecord(rec) {
    if (!rec)
        return false;
    // 1. Must have an assigned producer/editor
    if (!rec.assignedProducer || !rec.assignedProducer.trim()) {
        return false;
    }
    // 2. Must NOT be completed or in payroll
    const isCompleted = rec.status === "completed" ||
        rec.status === "Completed" ||
        rec.recordStatus === "completed" ||
        rec.recordStatus === "Completed" ||
        Boolean(rec.inPayroll) ||
        Boolean(rec.in_payroll);
    if (isCompleted)
        return false;
    // 3. Must be Ongoing status (not Waiting for Data, Outsourced, Completed, etc.)
    const mtdStatus = (0, mtd_status_1.inferMTDRecordStatus)(rec);
    if (mtdStatus !== "Ongoing") {
        return false;
    }
    // 4. Must have a valid Mix Start Date
    const startDate = (0, dates_1.toIsoDateString)(rec.mixStartDate);
    if (!startDate)
        return false;
    // 5. Must have a valid Mix End Date
    const endDate = (0, dates_1.toIsoDateString)(rec.mixEndDate);
    if (!endDate)
        return false;
    return true;
}
function escapeCsvCell(value) {
    if (value === null || value === undefined)
        return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function buildCsvString(headers, rows) {
    const headerRow = headers.map((h) => escapeCsvCell(h.label)).join(",");
    const dataRows = rows.map((row) => headers.map((h) => escapeCsvCell(row[h.key])).join(","));
    return [headerRow, ...dataRows].join("\r\n");
}
function triggerCsvDownload(filename, csvText) {
    if (typeof window === "undefined")
        return;
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
function extractDetailFieldsMap(order) {
    const map = new Map();
    const sections = (0, order_detail_sections_1.getOrderDetailSections)(order);
    for (const section of sections) {
        for (const field of section.fields) {
            if (field.value && field.value !== "—") {
                map.set(field.key, { label: field.label, value: field.value });
            }
        }
    }
    return map;
}
function generateOrdersCsv(records, allOrders) {
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
    const detailFieldHeadersMap = new Map();
    const preparedRows = [];
    for (const rec of records) {
        const linked = (0, editor_assignment_1.findLinkedOrder)(rec, allOrders);
        const order = (0, order_detail_fields_1.orderFromMTDRecord)(rec, linked, orderById);
        const meta = (0, mtd_filters_1.resolveMTDFormMeta)(rec, orderById);
        const detailsMap = extractDetailFieldsMap(order);
        for (const [key, { label }] of detailsMap.entries()) {
            if (!detailFieldHeadersMap.has(key)) {
                detailFieldHeadersMap.set(key, label);
            }
        }
        const row = {
            id: rec.orderId || rec.id,
            formType: (0, order_detail_sections_1.getFormTypeLabel)(meta.formType),
            subtype: meta.canonicalSubtypeId,
            contactName: rec.contactName || order.contactName || "",
            programName: rec.programName || order.programName || "",
            assignedProducer: rec.assignedProducer?.trim()
                ? rec.assignedProducer
                : "No assigned producer yet",
            mixStartDate: (0, dates_1.toIsoDateString)(rec.mixStartDate)
                ? (0, dates_1.toIsoDateString)(rec.mixStartDate)
                : "No scheduled start",
            mixEndDate: (0, dates_1.toIsoDateString)(rec.mixEndDate)
                ? (0, dates_1.toIsoDateString)(rec.mixEndDate)
                : "No scheduled end",
            status: (0, mtd_filters_1.isPreMTDOrderRecord)(rec) ? "Pre-MTD Orders" : rec.status,
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
function generateMTDCsv(records, allOrders, producers) {
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
    const detailFieldHeadersMap = new Map();
    const preparedRows = [];
    for (const rec of records) {
        const linked = (0, editor_assignment_1.findLinkedOrder)(rec, allOrders);
        const order = (0, order_detail_fields_1.orderFromMTDRecord)(rec, linked, orderById);
        const meta = (0, mtd_filters_1.resolveMTDFormMeta)(rec, orderById);
        const detailsMap = extractDetailFieldsMap(order);
        const parsedPkg = (0, package_1.parsePackage)(rec.package);
        for (const [key, { label }] of detailsMap.entries()) {
            if (!detailFieldHeadersMap.has(key)) {
                detailFieldHeadersMap.set(key, label);
            }
        }
        const rushQty = typeof rec.rushFeeQuantity === "number"
            ? rec.rushFeeQuantity
            : rec.rushFeeOption === "double"
                ? 2
                : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
                    ? 1
                    : 0;
        const isDance = meta.formType === "school-all-star-dance";
        const row = {
            id: rec.id,
            formType: (0, order_detail_sections_1.getFormTypeLabel)(meta.formType),
            subtype: meta.canonicalSubtypeId,
            contactName: rec.contactName,
            programName: rec.programName,
            invoice: rec.invoice || "",
            package: rec.package,
            packageTier: parsedPkg.tier,
            timeLimit: parsedPkg.limit,
            split: parsedPkg.split,
            price: (0, data_1.formatPrice)(rec.finalCustomerPrice ?? rec.price),
            priceCompliance: rec.priceCompliance || "Compliant",
            assignedProducer: rec.assignedProducer || "Unassigned",
            requestedProducer: (0, editor_assignment_1.getRequestedEditorFromRecord)(rec, producers, linked) || "FA",
            mixStartDate: (0, dates_1.toIsoDateString)(rec.mixStartDate) || "",
            mixEndDate: (0, dates_1.toIsoDateString)(rec.mixEndDate) || "",
            rushFee: rushQty === 2 ? "Double Rush ($300)" : rushQty === 1 ? "Rush Fee ($150)" : "None",
            danceExtraSongs: isDance
                ? rec.danceExtraSongs
                    ? `${rec.danceExtraSongs} ($${rec.danceExtraSongs * 15})`
                    : "0"
                : "",
            danceExtraSongTime: isDance
                ? rec.danceExtraSongTime
                    ? `${rec.danceExtraSongTime} ($${rec.danceExtraSongTime * 30})`
                    : "0"
                : "",
            voiceover: rec.danceVoiceover ||
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
function generatePayrollCsv(records, allOrders, producers, payrollAddons = []) {
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
    const detailFieldHeadersMap = new Map();
    const preparedRows = [];
    for (const rec of records) {
        const linked = (0, editor_assignment_1.findLinkedOrder)(rec, allOrders);
        const order = (0, order_detail_fields_1.orderFromMTDRecord)(rec, linked, orderById);
        const meta = (0, mtd_filters_1.resolveMTDFormMeta)(rec, orderById);
        const detailsMap = extractDetailFieldsMap(order);
        const producerObj = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
        for (const [key, { label }] of detailsMap.entries()) {
            if (!detailFieldHeadersMap.has(key)) {
                detailFieldHeadersMap.set(key, label);
            }
        }
        const custPrice = order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
        const payrollPrice = rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price;
        const rushQty = typeof rec.rushFeeQuantity === "number"
            ? rec.rushFeeQuantity
            : rec.rushFeeOption === "double"
                ? 2
                : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
                    ? 1
                    : 0;
        const calc = (0, pricing_display_1.computeClientPayroll)(producerObj, custPrice, null, rec.rateUsed ?? order?.rateUsed ?? null, rec.manualPayoutInput ?? null, meta.canonicalSubtypeId, payrollPrice, {
            rushFeeQuantity: rushQty,
            rushFeeCompensationRate: rec.rushFeeCompensationRate ?? producerObj?.rushFeeRate ?? 1.0,
            danceVoiceover: rec.danceVoiceover,
            hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
            hasThemedVoiceover: rec.hasThemedVoiceover,
            cheerVoiceover20: rec.cheerVoiceover20,
            cheerVoiceover40: rec.cheerVoiceover40,
            formType: meta.formType,
        });
        const isDance = meta.formType === "school-all-star-dance";
        const rowVoAddon = payrollAddons?.find((a) => (a.mtdId === rec.id || a.orderId === rec.orderId) && a.addonType === "voiceover");
        const rowRushAddon = payrollAddons?.find((a) => (a.mtdId === rec.id || a.orderId === rec.orderId) && a.addonType === "rush_fee");
        const basePayout = calc.producerPayout ?? rec.producerPayout ?? order?.producerPayout ?? 0;
        const voPayout = rowVoAddon ? rowVoAddon.amount : (calc.voiceoverPayout ?? 0);
        const rushPayout = rowRushAddon ? rowRushAddon.amount : (calc.rushFeePayout ?? 0);
        const payoutTotal = basePayout + (rowVoAddon ? rowVoAddon.amount : 0) + (rowRushAddon ? rowRushAddon.amount : 0);
        const row = {
            id: rec.id,
            completedDate: (0, dates_1.toIsoDateString)(rec.completedAt) || (0, dates_1.toIsoDateString)(rec.mixEndDate) || "",
            formType: (0, order_detail_sections_1.getFormTypeLabel)(meta.formType),
            subtype: meta.canonicalSubtypeId,
            contactName: rec.contactName,
            programName: rec.programName,
            assignedProducer: rec.assignedProducer || "",
            customerPrice: (0, data_1.formatPrice)(custPrice),
            payrollBasePrice: (0, data_1.formatPrice)(payrollPrice),
            producerRate: rec.rateUsed ?? order?.rateUsed ?? "Default",
            voiceoverPayout: (0, data_1.formatPrice)(voPayout),
            rushPayout: (0, data_1.formatPrice)(rushPayout),
            danceExtraSongsPayout: isDance
                ? (0, data_1.formatPrice)((rec.danceExtraSongs || 0) * 15)
                : "",
            danceExtraSongTimePayout: isDance
                ? (0, data_1.formatPrice)((rec.danceExtraSongTime || 0) * 30)
                : "",
            totalProducerPayout: (0, data_1.formatPrice)(payoutTotal),
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
exports.PRODUCER_STATEMENT_COLUMNS = [
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
function isCompletedMix(rec) {
    if (!rec)
        return false;
    return (rec.status === "completed" ||
        rec.status === "Completed" ||
        rec.recordStatus === "completed" ||
        rec.recordStatus === "Completed" ||
        Boolean(rec.inPayroll) ||
        Boolean(rec.in_payroll));
}
function matchAddonToRecord(addon, rec, addonType, producerObj) {
    if (addon.addonType !== addonType)
        return false;
    const aMtd = addon.mtdId ? String(addon.mtdId).trim() : null;
    const aOrd = addon.orderId ? String(addon.orderId).trim() : null;
    const rId = rec.id ? String(rec.id).trim() : null;
    const rOrd = rec.orderId ? String(rec.orderId).trim() : null;
    // 1. Direct ID matching (handling String conversion & nulls)
    if (aMtd && (aMtd === rId || aMtd === rOrd))
        return true;
    if (aOrd && (aOrd === rOrd || aOrd === rId))
        return true;
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
            const producerMatches = !addonInitials && !addonProdId
                ? true
                : (addonInitials && (addonInitials === prodInitials || addonInitials === recProdName)) ||
                    (addonProdId && (addonProdId === producerObj?.id.toUpperCase() || addonProdId === recProdName));
            if (producerMatches) {
                if (addon.teamName && rec.teamName) {
                    return (addon.teamName.trim().toUpperCase() ===
                        String(rec.teamName).trim().toUpperCase());
                }
                return true;
            }
        }
    }
    return false;
}
function getProducerFacingPayrollRows(records, allOrders, producers, targetProducerName, filterPeriod, payrollAddons) {
    const orderById = new Map(allOrders.map((o) => [o.id, o]));
    // Filter for completed mixes assigned to target producer
    let filtered = records.filter((rec) => {
        if (!isCompletedMix(rec))
            return false;
        if (!rec.assignedProducer)
            return false;
        const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
        const resolvedName = prodObj?.name || rec.assignedProducer;
        return (resolvedName.trim().toUpperCase() === targetProducerName.trim().toUpperCase() ||
            rec.assignedProducer.trim().toUpperCase() === targetProducerName.trim().toUpperCase());
    });
    if (filterPeriod && (filterPeriod.start || filterPeriod.end)) {
        filtered = filtered.filter((rec) => {
            const recStart = rec.completedAt || rec.mixStartDate || "";
            const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
    }
    const preparedRows = [];
    const usedAddonIds = new Set();
    for (const rec of filtered) {
        const linked = (0, editor_assignment_1.findLinkedOrder)(rec, allOrders);
        const order = (0, order_detail_fields_1.orderFromMTDRecord)(rec, linked, orderById);
        const meta = (0, mtd_filters_1.resolveMTDFormMeta)(rec, orderById);
        const producerObj = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
        const parsedPkg = (0, package_1.parsePackage)(rec.package);
        const custPrice = order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
        const payrollPrice = rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price;
        const rushQty = typeof rec.rushFeeQuantity === "number"
            ? rec.rushFeeQuantity
            : rec.rushFeeOption === "double"
                ? 2
                : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
                    ? 1
                    : 0;
        const calc = (0, pricing_display_1.computeClientPayroll)(producerObj, custPrice, null, rec.rateUsed ?? order?.rateUsed ?? null, rec.manualPayoutInput ?? null, meta.canonicalSubtypeId, payrollPrice, {
            rushFeeQuantity: rushQty,
            rushFeeCompensationRate: rec.rushFeeCompensationRate ?? producerObj?.rushFeeRate ?? 1.0,
            danceVoiceover: rec.danceVoiceover,
            hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
            hasThemedVoiceover: rec.hasThemedVoiceover,
            cheerVoiceover20: rec.cheerVoiceover20,
            cheerVoiceover40: rec.cheerVoiceover40,
            formType: meta.formType,
        });
        const isDance = meta.formType === "school-all-star-dance";
        const rowVoAddon = payrollAddons?.find((a) => matchAddonToRecord(a, rec, "voiceover", producerObj));
        const rowRushAddon = payrollAddons?.find((a) => matchAddonToRecord(a, rec, "rush_fee", producerObj));
        if (rowVoAddon)
            usedAddonIds.add(rowVoAddon.id);
        if (rowRushAddon)
            usedAddonIds.add(rowRushAddon.id);
        const basePayout = calc.producerPayout ?? rec.producerPayout ?? order?.producerPayout ?? 0;
        const categoryBasePayout = Math.max(0, basePayout - (calc.voiceoverPayout ?? 0) - (calc.rushFeePayout ?? 0));
        const voPayout = rowVoAddon ? rowVoAddon.amount : (calc.voiceoverPayout ?? 0);
        const rushPayout = rowRushAddon ? rowRushAddon.amount : (calc.rushFeePayout ?? 0);
        const payoutTotal = categoryBasePayout + voPayout + rushPayout;
        const voLabel = rowVoAddon
            ? (0, data_1.formatPrice)(rowVoAddon.amount)
            : rec.danceVoiceover
                ? `$${rec.danceVoiceover}`
                : rec.cheerVoiceover40
                    ? "Cheer $40 VO"
                    : rec.cheerVoiceover20
                        ? "Cheer $20 VO"
                        : rec.hasTraditionalVoiceover && rec.hasThemedVoiceover
                            ? "$100"
                            : rec.hasThemedVoiceover
                                ? "$75"
                                : rec.hasTraditionalVoiceover
                                    ? "$25"
                                    : "None";
        const rushLabel = rowRushAddon
            ? (0, data_1.formatPrice)(rowRushAddon.amount)
            : rushQty === 2
                ? "Double Rush ($300)"
                : rushQty === 1
                    ? "Rush Fee ($150)"
                    : "None";
        const row = {
            completedDate: (0, dates_1.toIsoDateString)(rec.completedAt) || (0, dates_1.toIsoDateString)(rec.mixEndDate) || "",
            programName: rec.programName,
            category: (0, order_detail_sections_1.getFormTypeLabel)(meta.formType),
            subtype: meta.canonicalSubtypeId,
            package: rec.package,
            timeLimit: parsedPkg.limit,
            voiceoverAddon: voLabel,
            rushFee: rushLabel,
            danceExtraSongs: isDance
                ? rec.danceExtraSongs
                    ? String(rec.danceExtraSongs)
                    : "0"
                : "",
            danceExtraSongTime: isDance
                ? rec.danceExtraSongTime
                    ? String(rec.danceExtraSongTime)
                    : "0"
                : "",
            producerRate: String(rec.rateUsed ?? order?.rateUsed ?? "Default"),
            voiceoverPayout: (0, data_1.formatPrice)(voPayout),
            rushPayout: (0, data_1.formatPrice)(rushPayout),
            danceExtraSongsPayout: isDance
                ? (0, data_1.formatPrice)((rec.danceExtraSongs || 0) * 15)
                : "",
            danceExtraSongTimePayout: isDance
                ? (0, data_1.formatPrice)((rec.danceExtraSongTime || 0) * 30)
                : "",
            totalPayout: (0, data_1.formatPrice)(payoutTotal),
            producerName: producerObj?.name || rec.assignedProducer || "Unassigned",
            recId: rec.id,
            rawTotalPayout: payoutTotal,
        };
        preparedRows.push(row);
    }
    // Append standalone / unlinked add-on rows attributed to this producer
    if (payrollAddons && payrollAddons.length > 0) {
        const targetUpper = targetProducerName.trim().toUpperCase();
        const addonRows = payrollAddons.filter((addon) => {
            // Ignore add-ons already linked/matched to a mix row above
            if (usedAddonIds.has(addon.id))
                return false;
            if (addon.mtdId || addon.orderId)
                return false;
            if (!addon.producerInitials && !addon.producerId)
                return false;
            // Match by initials or producer name
            const producerObj = producers.find((p) => p.name.toUpperCase() === targetUpper ||
                p.initials.toUpperCase() === targetUpper);
            if (!producerObj)
                return false;
            return (addon.producerInitials?.toUpperCase() === producerObj.initials.toUpperCase() ||
                addon.producerId === producerObj.id);
        });
        for (const addon of addonRows) {
            const typeLabel = addon.addonType === "voiceover" ? "Voiceover" : "Rush Fee";
            const addonRow = {
                completedDate: (0, dates_1.toIsoDateString)(addon.createdAt) || addon.createdAt,
                programName: addon.teamName ? `${addon.programName} (${addon.teamName})` : addon.programName,
                category: addon.category,
                subtype: `${typeLabel} Add-on`,
                package: "—",
                timeLimit: "—",
                voiceoverAddon: addon.addonType === "voiceover" ? (0, data_1.formatPrice)(addon.amount) : "—",
                rushFee: addon.addonType === "rush_fee" ? (0, data_1.formatPrice)(addon.amount) : "—",
                danceExtraSongs: "",
                danceExtraSongTime: "",
                producerRate: "—",
                voiceoverPayout: addon.addonType === "voiceover" ? (0, data_1.formatPrice)(addon.amount) : "$0.00",
                rushPayout: addon.addonType === "rush_fee" ? (0, data_1.formatPrice)(addon.amount) : "$0.00",
                danceExtraSongsPayout: "",
                danceExtraSongTimePayout: "",
                totalPayout: (0, data_1.formatPrice)(addon.amount),
                producerName: addon.producerInitials ?? targetProducerName,
                recId: addon.id,
                rawTotalPayout: addon.amount,
            };
            preparedRows.push(addonRow);
        }
    }
    return preparedRows;
}
function generateProducerFacingPayrollCsv(records, allOrders, producers, targetProducerName, filterPeriod, payrollAddons) {
    const rows = getProducerFacingPayrollRows(records, allOrders, producers, targetProducerName, filterPeriod, payrollAddons);
    return buildCsvString(exports.PRODUCER_STATEMENT_COLUMNS, rows);
}
exports.PRODUCER_SCHEDULE_COLUMNS = [
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
function getProducerFacingScheduleRows(records, allOrders, producers, targetProducerName, filterPeriod) {
    const orderById = new Map(allOrders.map((o) => [o.id, o]));
    // Source dataset: Strictly eligible Ongoing MTD records with an assigned producer and valid dates
    let filtered = records.filter(isEligibleProducerScheduleRecord);
    if (targetProducerName && targetProducerName !== "all" && targetProducerName !== "All Editors") {
        filtered = filtered.filter((rec) => {
            if (!rec.assignedProducer)
                return false;
            const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
            const resolvedName = prodObj?.name || rec.assignedProducer;
            return (resolvedName.trim().toUpperCase() === targetProducerName.trim().toUpperCase() ||
                rec.assignedProducer.trim().toUpperCase() === targetProducerName.trim().toUpperCase());
        });
    }
    if (filterPeriod && (filterPeriod.start || filterPeriod.end)) {
        filtered = filtered.filter((rec) => {
            const recStart = rec.mixStartDate || rec.completedAt || "";
            const recEnd = rec.mixEndDate || rec.mixStartDate || rec.completedAt || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
    }
    const preparedRows = [];
    for (const rec of filtered) {
        const meta = (0, mtd_filters_1.resolveMTDFormMeta)(rec, orderById);
        const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
        const prodName = prodObj?.name || rec.assignedProducer || "Unassigned";
        preparedRows.push({
            mixStartDate: (0, dates_1.toIsoDateString)(rec.mixStartDate) || "—",
            mixEndDate: (0, dates_1.toIsoDateString)(rec.mixEndDate ?? rec.mixStartDate) || "—",
            assignedProducer: prodName,
            programName: rec.programName || "—",
            contactName: rec.contactName || "—",
            invoice: rec.invoice || "—",
            category: (0, order_detail_sections_1.getFormTypeLabel)(meta.formType),
            subtype: meta.canonicalSubtypeId || "—",
            package: rec.package || "—",
            status: "Ongoing",
            recId: rec.id,
        });
    }
    return preparedRows;
}
function generateScheduleCsv(records, allOrders, producers, targetProducerName, filterPeriod) {
    const rows = getProducerFacingScheduleRows(records, allOrders, producers, targetProducerName, filterPeriod);
    return buildCsvString(exports.PRODUCER_SCHEDULE_COLUMNS, rows);
}
