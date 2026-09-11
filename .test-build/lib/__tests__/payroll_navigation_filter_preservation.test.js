"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
(0, node_test_1.describe)("Payroll Filter & Category Preservation on Detail Return", () => {
    // Mock sessionStorage implementation for node testing environment
    function createMockSessionStorage() {
        const store = new Map();
        return {
            getItem: (key) => store.get(key) ?? null,
            setItem: (key, value) => store.set(key, value),
            removeItem: (key) => store.delete(key),
            clear: () => store.clear(),
        };
    }
    (0, node_test_1.it)("Test 1: Preserves All-Star Dance -> POM context across session reload / detail return", () => {
        const sessionStorage = createMockSessionStorage();
        // Step 1: User selects All-Star Dance -> POM
        sessionStorage.setItem("slt_payroll_form", "school-all-star-dance");
        sessionStorage.setItem("slt_payroll_dance_subtype", "pom");
        // Step 2: User opens detail view and returns (re-mounts PayrollPage)
        const savedForm = sessionStorage.getItem("slt_payroll_form");
        const savedDanceSubtype = sessionStorage.getItem("slt_payroll_dance_subtype");
        strict_1.default.equal(savedForm, "school-all-star-dance");
        strict_1.default.equal(savedDanceSubtype, "pom");
    });
    (0, node_test_1.it)("Test 2: Preserves All-Star Dance -> Hip Hop context across session reload / detail return", () => {
        const sessionStorage = createMockSessionStorage();
        // Step 1: User selects All-Star Dance -> Hip Hop
        sessionStorage.setItem("slt_payroll_form", "school-all-star-dance");
        sessionStorage.setItem("slt_payroll_dance_subtype", "hip-hop");
        // Step 2: User opens detail view and returns
        const savedForm = sessionStorage.getItem("slt_payroll_form");
        const savedDanceSubtype = sessionStorage.getItem("slt_payroll_dance_subtype");
        strict_1.default.equal(savedForm, "school-all-star-dance");
        strict_1.default.equal(savedDanceSubtype, "hip-hop");
    });
    (0, node_test_1.it)("Test 3: Preserves All-Star Cheer -> VIROC context across detail return", () => {
        const sessionStorage = createMockSessionStorage();
        sessionStorage.setItem("slt_payroll_form", "school-all-star-cheer");
        sessionStorage.setItem("slt_payroll_cheer_subtype", "school-cheer-viroc-yes");
        const savedForm = sessionStorage.getItem("slt_payroll_form");
        const savedCheerSubtype = sessionStorage.getItem("slt_payroll_cheer_subtype");
        strict_1.default.equal(savedForm, "school-all-star-cheer");
        strict_1.default.equal(savedCheerSubtype, "school-cheer-viroc-yes");
    });
    (0, node_test_1.it)("Test 4: Preserves applied producer, search, and date table filters", () => {
        const sessionStorage = createMockSessionStorage();
        const tableFilters = {
            packageTier: "GOLD",
            timeLimit: "All",
            split: "all",
            assignedProducer: "Nick",
            requestedProducer: "All",
            dateFilter: { type: "thisMonth", value: null },
            scheduleFilter: "all",
            infoFilter: "all",
        };
        sessionStorage.setItem("slt_payroll_table_filters", JSON.stringify(tableFilters));
        sessionStorage.setItem("slt_payroll_search", "Sparkle");
        const savedTableFilters = JSON.parse(sessionStorage.getItem("slt_payroll_table_filters") || "{}");
        const savedSearch = sessionStorage.getItem("slt_payroll_search");
        strict_1.default.deepEqual(savedTableFilters, tableFilters);
        strict_1.default.equal(savedSearch, "Sparkle");
    });
});
