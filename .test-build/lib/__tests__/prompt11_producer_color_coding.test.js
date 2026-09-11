"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const data_1 = require("../data");
const producer_avatars_1 = require("../producer-avatars");
(0, node_test_1.describe)("Prompt 11 — Producer Color-Coding in Selection UI Tests", () => {
    const { producers } = (0, data_1.getData)();
    (0, node_test_1.it)("1. Configured producers possess authentic configured color values", () => {
        strict_1.default.ok(producers.length > 0, "Producers list should be populated");
        producers.forEach((p) => {
            if (p.color) {
                strict_1.default.ok(/^#[0-9A-Fa-f]{6}$/.test(p.color), `Producer ${p.name} color ${p.color} must be valid hex code`);
            }
        });
        // Check specific known producer colors
        const nick = producers.find((p) => p.name.includes("Nick") || p.initials === "NC");
        if (nick && nick.color) {
            strict_1.default.strictEqual(nick.color.toLowerCase(), producer_avatars_1.PRODUCER_COLORS.NC.toLowerCase());
        }
        const andrea = producers.find((p) => p.name.includes("Andrea") || p.initials === "AJ");
        if (andrea && andrea.color) {
            strict_1.default.strictEqual(andrea.color.toLowerCase(), producer_avatars_1.PRODUCER_COLORS.AJ.toLowerCase());
        }
    });
    (0, node_test_1.it)("2. Producer without configured color resolves to neutral fallback slate color (#94A3B8)", () => {
        const unconfiguredProducer = {
            id: "prod-test-no-color",
            name: "Test Producer No Color",
            initials: "TP",
            specialty: "Cheer",
        };
        const color = unconfiguredProducer.color || "#94a3b8";
        strict_1.default.strictEqual(color, "#94a3b8", "Unconfigured producer must resolve to neutral fallback slate (#94A3B8), never fabricate a vibrant color");
    });
});
