"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const order_requirements_1 = require("../order-requirements");
(0, node_test_1.describe)("SLT Implementation 2: Package-Specific Data Collection Rules", () => {
    (0, node_test_1.it)("Dance Custom POM requires Songs, Time of Mix, Compliancy", () => {
        const order = {
            category: "Dance",
            package: "Custom POM 2:15",
            timeLengthOfMix: "2:15",
            musicAffiliate: "Power Music",
            songListSuggestions: "Have",
        };
        const reqs = (0, order_requirements_1.getOrderRequirements)(order);
        node_assert_1.default.strictEqual(reqs.allMet, true);
        const ids = reqs.all.map((r) => r.id);
        node_assert_1.default.deepStrictEqual(ids.sort(), ["compliancy", "songs", "time_of_mix"].sort());
        const songReq = reqs.songsArea.find((r) => r.id === "songs");
        node_assert_1.default.strictEqual(songReq?.label, "Songs");
    });
    (0, node_test_1.it)("Dance Jazz Simple Cut requires Song, Time of Mix, Notes (No Compliancy)", () => {
        const order = {
            category: "Dance",
            package: "Jazz Simple Cut 1:45",
            timeLengthOfMix: "1:45",
            routineNotes: "Soft acoustic transition",
            songListSuggestions: "Acoustic Track",
        };
        const reqs = (0, order_requirements_1.getOrderRequirements)(order);
        const ids = reqs.all.map((r) => r.id);
        node_assert_1.default.deepStrictEqual(ids.sort(), ["notes", "songs", "time_of_mix"].sort());
        const songReq = reqs.songsArea.find((r) => r.id === "songs");
        node_assert_1.default.strictEqual(songReq?.label, "Song");
    });
    (0, node_test_1.it)("Cheer Titanium requires Notes, 8-count Sheets, Video (No Songs)", () => {
        const order = {
            category: "Cheer",
            package: "Titanium 2:30",
            routineNotes: "Routine video attached https://vimeo.com/demo",
            sendingEightCountSheets: "Yes",
        };
        const reqs = (0, order_requirements_1.getOrderRequirements)(order);
        const ids = reqs.all.map((r) => r.id);
        node_assert_1.default.deepStrictEqual(ids.sort(), ["eight_count", "notes", "video"].sort());
        const songsPresent = reqs.all.some((r) => r.id === "songs");
        node_assert_1.default.strictEqual(songsPresent, false);
    });
    (0, node_test_1.it)("Cheer Platinum requires Songs, 8-count Sheets, Video", () => {
        const order = {
            category: "Cheer",
            package: "Platinum 2:30",
            songListSuggestions: "Have",
            sendingEightCountSheets: "Yes",
            routineNotes: "Video link provided",
        };
        const reqs = (0, order_requirements_1.getOrderRequirements)(order);
        const ids = reqs.all.map((r) => r.id);
        node_assert_1.default.deepStrictEqual(ids.sort(), ["eight_count", "songs", "video"].sort());
    });
    (0, node_test_1.it)("Marching Band Band Chant requires Song, Time of Mix", () => {
        const order = {
            category: "Marching Band",
            package: "Band Chant",
            timeLengthOfMix: "1:30",
            songListSuggestions: "Fight Song Track",
        };
        const reqs = (0, order_requirements_1.getOrderRequirements)(order);
        const ids = reqs.all.map((r) => r.id);
        node_assert_1.default.deepStrictEqual(ids.sort(), ["songs", "time_of_mix"].sort());
        const songReq = reqs.songsArea.find((r) => r.id === "songs");
        node_assert_1.default.strictEqual(songReq?.label, "Song");
    });
    (0, node_test_1.it)("Sports Entertainment requires Songs, Notes, Time of Mix", () => {
        const order = {
            category: "Sports Entertainment",
            package: "Stadium Mix 2:00",
            timeLengthOfMix: "2:00",
            routineNotes: "Organ sound FX",
            songListSuggestions: "Have",
        };
        const reqs = (0, order_requirements_1.getOrderRequirements)(order);
        const ids = reqs.all.map((r) => r.id);
        node_assert_1.default.deepStrictEqual(ids.sort(), ["notes", "songs", "time_of_mix"].sort());
    });
    (0, node_test_1.it)("correctly identifies orders that are Waiting for Data (missing >= 1 requirement)", () => {
        const completeOrder = {
            category: "Dance",
            package: "Custom POM 2:15",
            timeLengthOfMix: "2:15",
            musicAffiliate: "Power Music",
            songListSuggestions: "Have",
        };
        const incompleteOrder = {
            category: "Dance",
            package: "Custom POM 2:15",
            timeLengthOfMix: "", // Missing Time of Mix
            musicAffiliate: "Power Music",
            songListSuggestions: "Have",
        };
        node_assert_1.default.strictEqual((0, order_requirements_1.getOrderRequirements)(completeOrder).missingCount, 0);
        node_assert_1.default.strictEqual((0, order_requirements_1.getOrderRequirements)(incompleteOrder).missingCount, 1);
        node_assert_1.default.strictEqual((0, order_requirements_1.getOrderRequirements)(incompleteOrder).allMet, false);
    });
});
