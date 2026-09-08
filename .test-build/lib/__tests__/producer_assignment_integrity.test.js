"use strict";
/**
 * Comprehensive Unit and Regression Tests for Producer Roster Specializations,
 * Assignment Eligibility, Requested Editor Data Preservation, and Demo Seeding Correctness.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const mock_data_json_1 = __importDefault(require("../../data/mock-data.json"));
const cheer_demo_orders_1 = require("../../data/cheer-demo-orders");
const dance_demo_orders_1 = require("../../data/dance-demo-orders");
const new_categories_demo_orders_1 = require("../../data/new-categories-demo-orders");
const editor_assignment_1 = require("../editor-assignment");
const producers_1 = require("../producers");
const producers = mock_data_json_1.default.producers.map((p) => (0, producers_1.normalizeProducer)(p));
(0, node_test_1.describe)("Producer Roster Multi-Category Specializations (BUG 1)", () => {
    (0, node_test_1.it)("normalizes legacy single-category or specialty producer records to full canonical array", () => {
        const caseyLegacy = (0, producers_1.normalizeProducer)({
            id: "prod-1",
            name: "Casey",
            initials: "CM",
            categories: ["Cheer"],
            specialty: "Cheer",
        });
        strict_1.default.deepEqual(caseyLegacy.categories, [
            "Pom",
            "School Cheer",
            "All-Star Cheer",
            "Youth Rec Cheer",
        ]);
    });
    (0, node_test_1.it)("verifies every producer in the roster has the exact canonical specializations", () => {
        const expectedMap = {
            CM: ["Pom", "School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
            MS: ["School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
            NC: ["School Cheer", "Youth Rec Cheer"],
            MM: ["Pom", "Team Performance / Variety", "School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
            BV: ["Marching Band"],
            SS: ["Pom", "Team Performance / Variety", "Jazz / Kick", "Gameday", "Sports Entertainment", "Youth Rec Cheer"],
            AJ: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday"],
            LV: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday"],
            RF: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday", "Hip Hop"],
            JM: ["Pom", "Gameday"],
            JOP: ["Pom", "Gameday", "School Cheer", "Youth Rec Cheer"],
            GP: ["Pom", "Gameday"],
            JD: ["Pom", "Gameday", "School Cheer", "Youth Rec Cheer"],
            JP: ["Pom", "Gameday", "Jazz / Kick", "Team Performance / Variety"],
            MT: ["Hip Hop", "Gameday", "Sports Entertainment"],
            CC: ["Hip Hop", "Gameday", "Sports Entertainment"],
            JB: ["Hip Hop", "Gameday", "Sports Entertainment"],
        };
        for (const [initials, expectedCats] of Object.entries(expectedMap)) {
            const p = (0, editor_assignment_1.findProducerByAssignmentKey)(initials, producers);
            strict_1.default.ok(p, `Producer with initials ${initials} must exist in roster`);
            strict_1.default.deepEqual(p.categories, expectedCats, `Producer ${p.name} (${initials}) categories mismatch`);
        }
    });
    (0, node_test_1.it)("verifies multi-category assignment eligibility filtering", () => {
        // Hip Hop: Rory (RF), Max (MT), Chris (CC), Joe (JB)
        const hipHopProducers = (0, editor_assignment_1.getProducersForCategory)(producers, "Hip Hop").map((p) => p.initials);
        strict_1.default.ok(hipHopProducers.includes("RF"));
        strict_1.default.ok(hipHopProducers.includes("MT"));
        strict_1.default.ok(hipHopProducers.includes("CC"));
        strict_1.default.ok(hipHopProducers.includes("JB"));
        strict_1.default.ok(!hipHopProducers.includes("CM"), "Casey should not be in Hip Hop");
        // All-Star Cheer: Casey (CM), Matt (MS), Mark (MM), Riley (R)
        const cheerProducers = (0, editor_assignment_1.getProducersForCategory)(producers, "All-Star Cheer").map((p) => p.initials);
        strict_1.default.ok(cheerProducers.includes("CM"));
        strict_1.default.ok(cheerProducers.includes("MS"));
        strict_1.default.ok(cheerProducers.includes("MM"));
        strict_1.default.ok(!cheerProducers.includes("BV"), "Brent should not be in Cheer");
    });
});
(0, node_test_1.describe)("Demo MTD Editor Assignments & Requested Editor Separation (BUG 2)", () => {
    (0, node_test_1.it)("preserves Requested Editor values and does not globally set them to FA", () => {
        // Specific requested producers in demo orders should be preserved
        const specificRequests = cheer_demo_orders_1.CHEER_DEMO_ORDERS.filter((o) => o.requestedProducer && o.requestedProducer !== "FA");
        strict_1.default.ok(specificRequests.length > 0, "Seeded demo orders must contain specific requested producers (not all FA)");
        const caOrder = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.id === "ord-demo-cheer-01");
        strict_1.default.equal(caOrder?.requestedProducer, "CASEY");
        strict_1.default.equal(caOrder?.editorRequest, "CM");
    });
    (0, node_test_1.it)("populates actual Editor assignments with a realistic distribution of valid producers", () => {
        const allDemoMtdRecords = [
            ...cheer_demo_orders_1.CHEER_DEMO_MTD_RECORDS,
            ...dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS,
            ...new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS,
        ];
        const assignedSet = new Set(allDemoMtdRecords.map((r) => r.assignedProducer).filter(Boolean));
        // Verify multiple different producers are assigned across demo MTD records (not just CM!)
        strict_1.default.ok(assignedSet.size > 5, "Actual Editor assignments must be distributed across multiple producers");
        strict_1.default.ok(assignedSet.has("CM"), "CM should be among assigned editors");
        strict_1.default.ok(assignedSet.has("MS") || assignedSet.has("MM"), "MS or MM should be among assigned editors");
    });
    (0, node_test_1.it)("ensures getSuggestedEditors returns available editors for every category so Assign Producer modal has suggestions", () => {
        const categories = [
            "All-Star Cheer",
            "School Cheer",
            "Youth Rec Cheer",
            "Pom",
            "Hip Hop",
            "Team Performance / Variety",
            "Gameday",
            "Jazz / Kick",
            "Marching Band",
            "Sports Entertainment",
            "School Anthem",
        ];
        for (const cat of categories) {
            const suggestions = (0, editor_assignment_1.getSuggestedEditors)([], producers, [], cat);
            strict_1.default.ok(suggestions.length > 0, `Category ${cat} must have at least 1 suggested available editor`);
        }
    });
    (0, node_test_1.it)("full dataset audit: 0 invalid producer assignments across all records in system", () => {
        const allRecords = [
            ...cheer_demo_orders_1.CHEER_DEMO_MTD_RECORDS,
            ...dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS,
            ...new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS,
            ...mock_data_json_1.default.mtdRecords,
        ];
        for (const rec of allRecords) {
            if (rec.assignedProducer !== null && rec.assignedProducer !== undefined) {
                const producer = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
                strict_1.default.ok(producer, `Assigned editor "${rec.assignedProducer}" in MTD record ${rec.id} must resolve to a real producer`);
                strict_1.default.ok((0, editor_assignment_1.producerSupportsCategory)(producer, rec.category), `Producer ${producer.name} (${rec.assignedProducer}) must support category "${rec.category}" for MTD record ${rec.id}`);
            }
        }
    });
});
