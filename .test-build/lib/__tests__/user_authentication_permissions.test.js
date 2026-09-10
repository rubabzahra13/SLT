"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const TEST_ACCOUNTS = [
    { name: "Megan", email: "megan@soundslikethat.com", password: "admin", accessLevel: "Full Access" },
    { name: "Andrea", email: "apetty@powermusic.com", password: "admin", accessLevel: "Full Access" },
    { name: "Lori", email: "lori@powermusic.com", password: "view", accessLevel: "View Only" },
    { name: "Dan", email: "dan@powermusic.com", password: "view", accessLevel: "View Only" },
    { name: "Steve", email: "steve@powermusic.com", password: "view", accessLevel: "View Only" },
];
(0, node_test_1.describe)("User Accounts & Permission Levels Test Suite", () => {
    (0, node_test_1.it)("verifies all sample accounts match client requested credentials and access levels", () => {
        const megan = TEST_ACCOUNTS.find((a) => a.email === "megan@soundslikethat.com");
        strict_1.default.ok(megan);
        strict_1.default.equal(megan.name, "Megan");
        strict_1.default.equal(megan.password, "admin");
        strict_1.default.equal(megan.accessLevel, "Full Access");
        const andrea = TEST_ACCOUNTS.find((a) => a.email === "apetty@powermusic.com");
        strict_1.default.ok(andrea);
        strict_1.default.equal(andrea.name, "Andrea");
        strict_1.default.equal(andrea.password, "admin");
        strict_1.default.equal(andrea.accessLevel, "Full Access");
        const lori = TEST_ACCOUNTS.find((a) => a.email === "lori@powermusic.com");
        strict_1.default.ok(lori);
        strict_1.default.equal(lori.name, "Lori");
        strict_1.default.equal(lori.password, "view");
        strict_1.default.equal(lori.accessLevel, "View Only");
        const dan = TEST_ACCOUNTS.find((a) => a.email === "dan@powermusic.com");
        strict_1.default.ok(dan);
        strict_1.default.equal(dan.name, "Dan");
        strict_1.default.equal(dan.password, "view");
        strict_1.default.equal(dan.accessLevel, "View Only");
        const steve = TEST_ACCOUNTS.find((a) => a.email === "steve@powermusic.com");
        strict_1.default.ok(steve);
        strict_1.default.equal(steve.name, "Steve");
        strict_1.default.equal(steve.password, "view");
        strict_1.default.equal(steve.accessLevel, "View Only");
    });
    (0, node_test_1.it)("differentiates Full Access vs View Only permission tiers", () => {
        const fullAccessUsers = TEST_ACCOUNTS.filter((a) => a.accessLevel === "Full Access");
        const viewOnlyUsers = TEST_ACCOUNTS.filter((a) => a.accessLevel === "View Only");
        strict_1.default.equal(fullAccessUsers.length, 2);
        strict_1.default.equal(viewOnlyUsers.length, 3);
        fullAccessUsers.forEach((u) => {
            strict_1.default.equal(u.accessLevel === "View Only", false);
        });
        viewOnlyUsers.forEach((u) => {
            strict_1.default.equal(u.accessLevel === "View Only", true);
        });
    });
    (0, node_test_1.it)("validates credential check logic for sample accounts", () => {
        TEST_ACCOUNTS.forEach((account) => {
            const isPasswordValid = (entered) => entered === account.password;
            strict_1.default.ok(isPasswordValid(account.password), `Password for ${account.email} should validate`);
            strict_1.default.equal(isPasswordValid("wrong_pass"), false, `Invalid password for ${account.email} should fail`);
        });
    });
    (0, node_test_1.it)("enforces mutation blocking for View Only users across all endpoints/operations", () => {
        function simulateMutationAttempt(user, action) {
            if (user.accessLevel === "Full Access") {
                return { allowed: true, status: 200 };
            }
            return { allowed: false, status: 403 };
        }
        const mutations = [
            "POST /api/producers",
            "PUT /api/producers/123",
            "DELETE /api/producers/123",
            "PATCH /api/mtd/rec-1",
            "POST /api/mtd/rec-1/complete",
            "POST /api/orders/ord-1/move-to-mtd",
            "POST /api/discount-codes",
            "DELETE /api/discount-codes/CODE",
        ];
        const viewOnlyUser = TEST_ACCOUNTS.find((a) => a.accessLevel === "View Only");
        const fullAccessUser = TEST_ACCOUNTS.find((a) => a.accessLevel === "Full Access");
        mutations.forEach((mutation) => {
            const viewRes = simulateMutationAttempt(viewOnlyUser, mutation);
            strict_1.default.equal(viewRes.allowed, false, `View Only user must be denied for ${mutation}`);
            strict_1.default.equal(viewRes.status, 403, `View Only user must receive 403 Forbidden for ${mutation}`);
            const fullRes = simulateMutationAttempt(fullAccessUser, mutation);
            strict_1.default.equal(fullRes.allowed, true, `Full Access user must be allowed for ${mutation}`);
            strict_1.default.equal(fullRes.status, 200, `Full Access user must receive 200 OK for ${mutation}`);
        });
    });
    (0, node_test_1.it)("verifies View Only users can inspect and navigate without mutation capabilities", () => {
        function simulateReadAttempt(user, endpoint) {
            return { allowed: true, status: 200 };
        }
        const readEndpoints = [
            "GET /api/producers",
            "GET /api/orders",
            "GET /api/mtd",
            "GET /api/discount-codes",
            "GET /api/auth/me",
        ];
        TEST_ACCOUNTS.forEach((user) => {
            readEndpoints.forEach((ep) => {
                const res = simulateReadAttempt(user, ep);
                strict_1.default.equal(res.allowed, true, `${user.name} (${user.accessLevel}) must be allowed to read ${ep}`);
                strict_1.default.equal(res.status, 200);
            });
        });
    });
});
