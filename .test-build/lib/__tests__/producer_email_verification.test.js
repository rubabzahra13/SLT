"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const producers_1 = require("../producers");
const mock_data_json_1 = __importDefault(require("../../data/mock-data.json"));
(0, node_test_1.describe)("Producer Email Verification & Seeding", () => {
    const expectedProducerMap = [
        { name: "Casey Marlow", initials: "CM", email: "casey@soundslikethat.com" },
        { name: "Matt Sturgis", initials: "MS", email: "matt@soundslikethat.com" },
        { name: "Nate Cryns", initials: "NC", email: "nate@soundslikethat.com" },
        { name: "Brent Vincent", initials: "BV", email: "bvincent@powermusic.com" },
        { name: "Mark Maynor", initials: "MM", email: "mark@soundslikethat.com" },
        { name: "Steve Stettler", initials: "SS", email: "steve@soundslikethat.com" },
        { name: "Anne Jacobs", initials: "AJ", email: "anne@soundslikethat.com" },
        { name: "Lauren Von'Ohlen", initials: "LV", email: "lauren@soundslikethat.com" },
        { name: "Rory Fowler", initials: "RF", email: "rory@soundslikethat.com" },
        { name: "Joel Piedt", initials: "JOP", email: "joel@soundslikethat.com" },
        { name: "Justin Delgado", initials: "JD", email: "justin@soundslikethat.com" },
        { name: "John Peters", initials: "JP", email: "jp@soundslikethat.com" },
        { name: "Max Thompson", initials: "MT", email: "max@soundslikethat.com" },
        { name: "Chris Chawi", initials: "CC", email: "chris@soundslikethat.com" },
        { name: "Joe Bell", initials: "JB", email: "Joe@soundslikethat.com" },
        { name: "Steven Vento", initials: "SV", email: "ds_in_ovations@mac.com" },
        { name: "Josh Munnell", initials: "JM", email: "josh@soundslikethat.com" },
        { name: "Griffin Poole", initials: "GP", email: "griffinp@powermusic.com" },
    ];
    (0, node_test_1.it)("has exact authoritative email mappings in CANONICAL_PRODUCER_EMAILS", () => {
        expectedProducerMap.forEach(({ initials, email }) => {
            strict_1.default.equal(producers_1.CANONICAL_PRODUCER_EMAILS[initials], email, `Mismatch in CANONICAL_PRODUCER_EMAILS for ${initials}`);
        });
    });
    (0, node_test_1.it)("verifies mock-data contains all 18 producers with exact client emails", () => {
        const producers = mock_data_json_1.default.producers;
        expectedProducerMap.forEach(({ name, initials, email }) => {
            const prod = producers.find((p) => p.initials === initials || p.name === name);
            strict_1.default.ok(prod, `Producer ${name} (${initials}) should be present in mock data`);
            strict_1.default.equal(prod?.email, email, `Producer ${name} (${initials}) email mismatch`);
        });
    });
    (0, node_test_1.it)("preserves exact case for Joe Bell (Joe@soundslikethat.com) and Steven Vento (ds_in_ovations@mac.com)", () => {
        const joe = (0, producers_1.normalizeProducer)({ id: "prod-18", name: "Joe Bell", initials: "JB" });
        strict_1.default.equal(joe.email, "Joe@soundslikethat.com");
        const steven = (0, producers_1.normalizeProducer)({ id: "prod-19", name: "Steven Vento", initials: "SV" });
        strict_1.default.equal(steven.email, "ds_in_ovations@mac.com");
    });
    (0, node_test_1.it)("falls back to canonical email when normalizing a producer missing email", () => {
        const john = (0, producers_1.normalizeProducer)({ id: "prod-15", name: "John Peters", initials: "JP" });
        strict_1.default.equal(john.email, "jp@soundslikethat.com");
        const griffin = (0, producers_1.normalizeProducer)({ id: "prod-6", name: "Griffin Poole", initials: "GP" });
        strict_1.default.equal(griffin.email, "griffinp@powermusic.com");
    });
});
