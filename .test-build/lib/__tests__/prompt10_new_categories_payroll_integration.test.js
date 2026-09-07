"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const mtd_completion_1 = require("../mtd-completion");
const mtd_filters_1 = require("../mtd-filters");
(0, node_test_1.describe)("Prompt 10 — New Categories Payroll Integration Unit Tests", () => {
    const mbRecord = {
        id: "mtd-mb-01",
        section: "COMPLETED MIXES",
        assignedProducer: "Casey",
        category: "Marching Band",
        editorRequest: "FA",
        contactName: "John Smith",
        editorInitials: "CM",
        programName: "Lincoln High Band",
        package: "BAND CHANT",
        musicTheme: "",
        price: 600,
        priceCompliance: "compliant",
        invoice: "INV-MB-001",
        mixStartDate: "2026-09-01",
        mixEndDate: "2026-09-05",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        status: "completed",
        inPayroll: true,
        completedAt: "2026-09-05T10:00:00.000Z",
        hasSheetMusicAdd: true,
        hasAddVocals: true,
        finalCustomerPrice: 675,
        systemCalculatedCustomerPrice: 725,
        finalCustomerPriceOverridden: true,
        producerPayout: 270,
        sltPortion: 405,
        rateUsed: 0.70,
        rateSource: "rate_overrides[new_pricing]",
        payrollFinalized: true,
    };
    const seOtherRecord = {
        id: "mtd-se-01",
        section: "COMPLETED MIXES",
        assignedProducer: "Riley",
        category: "Sports Entertainment",
        editorRequest: "FA",
        contactName: "Sarah Connor",
        editorInitials: "RP",
        programName: "Apex Athletics",
        package: "OTHER (mixes longer than 2:30)",
        musicTheme: "",
        price: 0,
        priceCompliance: "compliant",
        invoice: "INV-SE-001",
        mixStartDate: "2026-09-02",
        mixEndDate: "2026-09-06",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        status: "completed",
        inPayroll: true,
        completedAt: "2026-09-06T12:00:00.000Z",
        finalCustomerPrice: 450,
        systemCalculatedCustomerPrice: 450,
        finalCustomerPriceOverridden: true,
        producerPayout: 315,
        sltPortion: 135,
        rateUsed: 0.70,
        rateSource: "default_rate",
        payrollFinalized: true,
    };
    const saRecord = {
        id: "mtd-sa-01",
        section: "COMPLETED MIXES",
        assignedProducer: "Casey",
        category: "School Anthems",
        editorRequest: "FA",
        contactName: "Michael Scott",
        editorInitials: "CM",
        programName: "Scranton High",
        package: "SCHOOL ANTHEMS",
        musicTheme: "",
        price: 1250,
        priceCompliance: "compliant",
        invoice: "INV-SA-001",
        mixStartDate: "2026-09-03",
        mixEndDate: "2026-09-07",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        status: "completed",
        inPayroll: true,
        completedAt: "2026-09-07T08:00:00.000Z",
        finalCustomerPrice: 1250,
        systemCalculatedCustomerPrice: 1250,
        finalCustomerPriceOverridden: false,
        producerPayout: 875,
        sltPortion: 375,
        rateUsed: 0.70,
        rateSource: "rate_overrides[new_pricing]",
        payrollFinalized: true,
    };
    const cheerRecord = {
        id: "mtd-cheer-01",
        section: "COMPLETED MIXES",
        assignedProducer: "Casey",
        category: "Cheer",
        editorRequest: "FA",
        contactName: "Jane Doe",
        editorInitials: "CM",
        programName: "Star Cheer",
        package: "GOLD 1:30",
        musicTheme: "Power Music",
        price: 700,
        priceCompliance: "compliant",
        invoice: "INV-CH-001",
        mixStartDate: "2026-09-01",
        mixEndDate: "2026-09-04",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        status: "completed",
        inPayroll: true,
        completedAt: "2026-09-04T15:00:00.000Z",
        finalCustomerPrice: 700,
        systemCalculatedCustomerPrice: 700,
        producerPayout: 490,
        sltPortion: 210,
        payrollFinalized: true,
    };
    const allRecords = [mbRecord, seOtherRecord, saRecord, cheerRecord];
    const orderMap = new Map();
    (0, node_test_1.it)("identifies all completed records in Payroll", () => {
        const payrollRecords = (0, mtd_completion_1.getPayrollRecords)(allRecords);
        strict_1.default.equal(payrollRecords.length, 4);
    });
    (0, node_test_1.it)("filters Payroll records cleanly by top-level formType without affecting Cheer", () => {
        const payrollRecords = (0, mtd_completion_1.getPayrollRecords)(allRecords);
        const mbFiltered = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { form: "marching-band", orderById: orderMap });
        strict_1.default.equal(mbFiltered.length, 1);
        strict_1.default.equal(mbFiltered[0].id, "mtd-mb-01");
        strict_1.default.equal(mbFiltered[0].finalCustomerPrice, 675);
        const seFiltered = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { form: "sports-entertainment", orderById: orderMap });
        strict_1.default.equal(seFiltered.length, 1);
        strict_1.default.equal(seFiltered[0].id, "mtd-se-01");
        strict_1.default.equal(seFiltered[0].finalCustomerPrice, 450); // Manually quoted OTHER package
        const saFiltered = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { form: "school-anthem", orderById: orderMap });
        strict_1.default.equal(saFiltered.length, 1);
        strict_1.default.equal(saFiltered[0].id, "mtd-sa-01");
        strict_1.default.equal(saFiltered[0].finalCustomerPrice, 1250);
        const cheerFiltered = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { form: "school-all-star-cheer", orderById: orderMap });
        strict_1.default.equal(cheerFiltered.length, 1);
        strict_1.default.equal(cheerFiltered[0].id, "mtd-cheer-01");
    });
    (0, node_test_1.it)("counts Payroll records accurately across all form types", () => {
        const payrollRecords = (0, mtd_completion_1.getPayrollRecords)(allRecords);
        const counts = (0, mtd_filters_1.countMTDByForm)(payrollRecords, orderMap);
        strict_1.default.equal(counts["school-all-star-cheer"], 1);
        strict_1.default.equal(counts["school-all-star-dance"], 0);
        strict_1.default.equal(counts["marching-band"], 1);
        strict_1.default.equal(counts["sports-entertainment"], 1);
        strict_1.default.equal(counts["school-anthem"], 1);
    });
});
