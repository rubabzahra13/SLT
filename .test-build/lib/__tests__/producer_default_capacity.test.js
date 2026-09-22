"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const producers_1 = require("../producers");
(0, node_test_1.describe)("Producer Default Capacity Settings", () => {
    (0, node_test_1.it)("defaults unconfigured producers to 1 mix/day and $2,000/day", () => {
        const producer = (0, producers_1.normalizeProducer)({
            id: "prod-test-1",
            name: "Test Producer",
            initials: "TP",
            email: "test@example.com",
        });
        strict_1.default.equal(producer.maxMixesPerDay, producers_1.DEFAULT_MAX_MIXES_PER_DAY);
        strict_1.default.equal(producer.maxMixesPerDay, 1);
        strict_1.default.equal(producer.maxProducerCostPerDay, producers_1.DEFAULT_MAX_PRODUCER_COST_PER_DAY);
        strict_1.default.equal(producer.maxProducerCostPerDay, 2000);
    });
    (0, node_test_1.it)("preserves explicit configured limits on existing producers", () => {
        const cmProducer = (0, producers_1.normalizeProducer)({
            id: "prod-cm",
            name: "Casey Marshall",
            initials: "CM",
            email: "casey@soundslikethat.com",
            maxMixesPerDay: 4,
            maxProducerCostPerDay: 5000,
        });
        strict_1.default.equal(cmProducer.maxMixesPerDay, 4);
        strict_1.default.equal(cmProducer.maxProducerCostPerDay, 5000);
    });
    (0, node_test_1.it)("applies cost default if only mix limit is specified, and vice versa", () => {
        const mixOnly = (0, producers_1.normalizeProducer)({
            id: "prod-mix-only",
            name: "Mix Only",
            initials: "MO",
            email: "mix@example.com",
            maxMixesPerDay: 3,
        });
        strict_1.default.equal(mixOnly.maxMixesPerDay, 3);
        strict_1.default.equal(mixOnly.maxProducerCostPerDay, 2000);
        const costOnly = (0, producers_1.normalizeProducer)({
            id: "prod-cost-only",
            name: "Cost Only",
            initials: "CO",
            email: "cost@example.com",
            maxProducerCostPerDay: 1500,
        });
        strict_1.default.equal(costOnly.maxMixesPerDay, 1);
        strict_1.default.equal(costOnly.maxProducerCostPerDay, 1500);
    });
    (0, node_test_1.it)("formats default and custom capacity limits correctly for UI display", () => {
        strict_1.default.equal((0, producers_1.formatMaxMixCapacity)(1), "1 mix per day max");
        strict_1.default.equal((0, producers_1.formatMaxMixCapacity)(4), "4 mixes per day max");
        strict_1.default.equal((0, producers_1.formatMaxMixCapacity)(null), "1 mix per day max");
        strict_1.default.equal((0, producers_1.formatMaxCostCapacity)(2000), "$2,000 max per day");
        strict_1.default.equal((0, producers_1.formatMaxCostCapacity)(5000), "$5,000 max per day");
        strict_1.default.equal((0, producers_1.formatMaxCostCapacity)(null), "$2,000 max per day");
    });
});
