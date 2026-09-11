"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCER_STATEMENT_COLUMNS = void 0;
exports.escapeCsvCell = escapeCsvCell;
exports.buildCsvString = buildCsvString;
exports.triggerCsvDownload = triggerCsvDownload;
exports.generateOrdersCsv = generateOrdersCsv;
exports.generateMTDCsv = generateMTDCsv;
exports.generatePayrollCsv = generatePayrollCsv;
exports.getProducerFacingPayrollRows = getProducerFacingPayrollRows;
exports.generateProducerFacingPayrollCsv = generateProducerFacingPayrollCsv;
exports.generateScheduleCsv = generateScheduleCsv;
const data_1 = require("./data");
const dates_1 = require("./dates");
const editor_assignment_1 = require("./editor-assignment");
const mtd_filters_1 = require("./mtd-filters");
const order_detail_fields_1 = require("./order-detail-fields");
const order_detail_sections_1 = require("./order-detail-sections");
const package_1 = require("./package");
const pricing_display_1 = require("./pricing-display");
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
function generatePayrollCsv(records, allOrders, producers) {
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
        const payoutTotal = calc.producerPayout ?? rec.producerPayout ?? order?.producerPayout ?? 0;
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
            voiceoverPayout: (0, data_1.formatPrice)(calc.voiceoverPayout ?? 0),
            rushPayout: (0, data_1.formatPrice)(calc.rushFeePayout ?? 0),
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
function getProducerFacingPayrollRows(records, allOrders, producers, targetProducerName, filterPeriod) {
    const orderById = new Map(allOrders.map((o) => [o.id, o]));
    let periodMatchingRecords = records;
    if (filterPeriod && (filterPeriod.start || filterPeriod.end)) {
        periodMatchingRecords = records.filter((rec) => {
            const recStart = rec.completedAt || rec.mixStartDate || "";
            const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
    }
    const producerRecords = periodMatchingRecords.filter((rec) => {
        if (!rec.assignedProducer)
            return false;
        const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
        const resolvedName = prodObj?.name || rec.assignedProducer;
        return (resolvedName.trim().toUpperCase() === targetProducerName.trim().toUpperCase() ||
            rec.assignedProducer.trim().toUpperCase() === targetProducerName.trim().toUpperCase());
    });
    const preparedRows = [];
    for (const rec of producerRecords) {
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
        const payoutTotal = calc.producerPayout ?? rec.producerPayout ?? order?.producerPayout ?? 0;
        const row = {
            completedDate: (0, dates_1.toIsoDateString)(rec.completedAt) || (0, dates_1.toIsoDateString)(rec.mixEndDate) || "",
            programName: rec.programName,
            category: (0, order_detail_sections_1.getFormTypeLabel)(meta.formType),
            subtype: meta.canonicalSubtypeId,
            package: rec.package,
            timeLimit: parsedPkg.limit,
            voiceoverAddon: rec.danceVoiceover ||
                (rec.cheerVoiceover40
                    ? "Cheer $40 VO"
                    : rec.cheerVoiceover20
                        ? "Cheer $20 VO"
                        : "None"),
            rushFee: rushQty === 2 ? "Double Rush ($300)" : rushQty === 1 ? "Rush Fee ($150)" : "None",
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
            voiceoverPayout: (0, data_1.formatPrice)(calc.voiceoverPayout ?? 0),
            rushPayout: (0, data_1.formatPrice)(calc.rushFeePayout ?? 0),
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
    return preparedRows;
}
function generateProducerFacingPayrollCsv(records, allOrders, producers, targetProducerName, filterPeriod) {
    const rows = getProducerFacingPayrollRows(records, allOrders, producers, targetProducerName, filterPeriod);
    return buildCsvString(exports.PRODUCER_STATEMENT_COLUMNS, rows);
}
function generateScheduleCsv(records, allOrders, producers, targetProducerName, filterPeriod) {
    const orderById = new Map(allOrders.map((o) => [o.id, o]));
    const headers = [
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
    let filtered = records;
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
            mixStartDate: (0, dates_1.toIsoDateString)(rec.mixStartDate),
            mixEndDate: (0, dates_1.toIsoDateString)(rec.mixEndDate ?? rec.mixStartDate),
            assignedProducer: prodName,
            programName: rec.programName,
            contactName: rec.contactName,
            invoice: rec.invoice,
            category: (0, order_detail_sections_1.getFormTypeLabel)(meta.formType),
            subtype: meta.canonicalSubtypeId,
            package: rec.package,
            status: rec.status,
        });
    }
    return buildCsvString(headers, preparedRows);
}
