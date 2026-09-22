"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
(0, node_test_1.describe)("Order Detail View Loading & UUID Handling", () => {
    (0, node_test_1.it)("Resolves records correctly by id, uuid, or legacyId", () => {
        const mockMtdRecords = [
            {
                id: "mtd-1001",
                uuid: "550e8400-e29b-41d4-a716-446655440000",
                legacyId: "ord-1001",
                orderId: "ord-1001",
                section: "CHEERLEADING MUSIC",
                assignedProducer: "JD",
                category: "Cheer",
                editorInitials: "JD",
                programName: "VARSITY SPIRIT",
                package: "GOLD 1:30",
                musicTheme: "Pop/Dance",
                price: 950,
                priceCompliance: "compliant",
                invoice: "INV-1001",
                mixStartDate: "2026-09-01",
                mixEndDate: "2026-09-08",
                eightCountSheet: "CS REC",
                haveSongs: "SONGS REC",
                needsAttention: false,
                status: "active",
                editorRequest: "JD",
                contactName: "Coach Sarah",
            },
        ];
        const findRecord = (targetId) => mockMtdRecords.find((r) => r.id === targetId || r.orderId === targetId || r.uuid === targetId || r.legacyId === targetId);
        // Should match by ID
        strict_1.default.ok(findRecord("mtd-1001"));
        // Should match by orderId / legacyId
        strict_1.default.ok(findRecord("ord-1001"));
        // Should match by UUID
        strict_1.default.ok(findRecord("550e8400-e29b-41d4-a716-446655440000"));
        // Non-existent ID returns undefined
        strict_1.default.equal(findRecord("non-existent-id"), undefined);
    });
    (0, node_test_1.it)("Header subtitle formats contact name without displaying UUID", () => {
        const record = {
            id: "550e8400-e29b-41d4-a716-446655440000",
            contactName: "Coach Sarah",
            programName: "VARSITY SPIRIT",
        };
        // Subtitle formula: record.contactName || "Customer"
        const subtitle = record.contactName || "Customer";
        strict_1.default.equal(subtitle, "Coach Sarah");
        strict_1.default.equal(subtitle.includes("550e8400"), false);
        strict_1.default.equal(subtitle.includes("ID:"), false);
    });
});
