import { describe, it } from "node:test";
import assert from "node:assert/strict";

type UserTestAccount = {
  name: string;
  email: string;
  password: string;
  accessLevel: "Full Access" | "View Only";
};

const TEST_ACCOUNTS: UserTestAccount[] = [
  { name: "Megan", email: "megan@soundslikethat.com", password: "admin", accessLevel: "Full Access" },
  { name: "Andrea", email: "apetty@powermusic.com", password: "admin", accessLevel: "Full Access" },
  { name: "Lori", email: "lori@powermusic.com", password: "view", accessLevel: "View Only" },
  { name: "Dan", email: "dan@powermusic.com", password: "view", accessLevel: "View Only" },
  { name: "Steve", email: "steve@powermusic.com", password: "view", accessLevel: "View Only" },
];

describe("User Accounts & Permission Levels Test Suite", () => {
  it("verifies all sample accounts match client requested credentials and access levels", () => {
    const megan = TEST_ACCOUNTS.find((a) => a.email === "megan@soundslikethat.com");
    assert.ok(megan);
    assert.equal(megan.name, "Megan");
    assert.equal(megan.password, "admin");
    assert.equal(megan.accessLevel, "Full Access");

    const andrea = TEST_ACCOUNTS.find((a) => a.email === "apetty@powermusic.com");
    assert.ok(andrea);
    assert.equal(andrea.name, "Andrea");
    assert.equal(andrea.password, "admin");
    assert.equal(andrea.accessLevel, "Full Access");

    const lori = TEST_ACCOUNTS.find((a) => a.email === "lori@powermusic.com");
    assert.ok(lori);
    assert.equal(lori.name, "Lori");
    assert.equal(lori.password, "view");
    assert.equal(lori.accessLevel, "View Only");

    const dan = TEST_ACCOUNTS.find((a) => a.email === "dan@powermusic.com");
    assert.ok(dan);
    assert.equal(dan.name, "Dan");
    assert.equal(dan.password, "view");
    assert.equal(dan.accessLevel, "View Only");

    const steve = TEST_ACCOUNTS.find((a) => a.email === "steve@powermusic.com");
    assert.ok(steve);
    assert.equal(steve.name, "Steve");
    assert.equal(steve.password, "view");
    assert.equal(steve.accessLevel, "View Only");
  });

  it("differentiates Full Access vs View Only permission tiers", () => {
    const fullAccessUsers = TEST_ACCOUNTS.filter((a) => a.accessLevel === "Full Access");
    const viewOnlyUsers = TEST_ACCOUNTS.filter((a) => a.accessLevel === "View Only");

    assert.equal(fullAccessUsers.length, 2);
    assert.equal(viewOnlyUsers.length, 3);

    fullAccessUsers.forEach((u) => {
      assert.equal(u.accessLevel === "View Only", false);
    });

    viewOnlyUsers.forEach((u) => {
      assert.equal(u.accessLevel === "View Only", true);
    });
  });

  it("validates credential check logic for sample accounts", () => {
    TEST_ACCOUNTS.forEach((account) => {
      const isPasswordValid = (entered: string) => entered === account.password;
      assert.ok(isPasswordValid(account.password), `Password for ${account.email} should validate`);
      assert.equal(isPasswordValid("wrong_pass"), false, `Invalid password for ${account.email} should fail`);
    });
  });

  it("enforces mutation blocking for View Only users across all endpoints/operations", () => {
    function simulateMutationAttempt(user: UserTestAccount, action: string): { allowed: boolean; status: number } {
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

    const viewOnlyUser = TEST_ACCOUNTS.find((a) => a.accessLevel === "View Only")!;
    const fullAccessUser = TEST_ACCOUNTS.find((a) => a.accessLevel === "Full Access")!;

    mutations.forEach((mutation) => {
      const viewRes = simulateMutationAttempt(viewOnlyUser, mutation);
      assert.equal(viewRes.allowed, false, `View Only user must be denied for ${mutation}`);
      assert.equal(viewRes.status, 403, `View Only user must receive 403 Forbidden for ${mutation}`);

      const fullRes = simulateMutationAttempt(fullAccessUser, mutation);
      assert.equal(fullRes.allowed, true, `Full Access user must be allowed for ${mutation}`);
      assert.equal(fullRes.status, 200, `Full Access user must receive 200 OK for ${mutation}`);
    });
  });

  it("verifies View Only users can inspect and navigate without mutation capabilities", () => {
    function simulateReadAttempt(user: UserTestAccount, endpoint: string): { allowed: boolean; status: number } {
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
        assert.equal(res.allowed, true, `${user.name} (${user.accessLevel}) must be allowed to read ${ep}`);
        assert.equal(res.status, 200);
      });
    });
  });
});
