import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_PRODUCER_EMAILS, normalizeProducer } from "../producers";
import mockData from "../../data/mock-data.json";

describe("Producer Email Verification & Seeding", () => {
  const expectedProducerMap: Array<{ name: string; initials: string; email: string }> = [
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

  it("has exact authoritative email mappings in CANONICAL_PRODUCER_EMAILS", () => {
    expectedProducerMap.forEach(({ initials, email }) => {
      assert.equal(CANONICAL_PRODUCER_EMAILS[initials], email, `Mismatch in CANONICAL_PRODUCER_EMAILS for ${initials}`);
    });
  });

  it("verifies mock-data contains all 18 producers with exact client emails", () => {
    const producers = mockData.producers;
    
    expectedProducerMap.forEach(({ name, initials, email }) => {
      const prod = producers.find(
        (p) => p.initials === initials || p.name === name
      );
      assert.ok(prod, `Producer ${name} (${initials}) should be present in mock data`);
      assert.equal(prod?.email, email, `Producer ${name} (${initials}) email mismatch`);
    });
  });

  it("preserves exact case for Joe Bell (Joe@soundslikethat.com) and Steven Vento (ds_in_ovations@mac.com)", () => {
    const joe = normalizeProducer({ id: "prod-18", name: "Joe Bell", initials: "JB" });
    assert.equal(joe.email, "Joe@soundslikethat.com");

    const steven = normalizeProducer({ id: "prod-19", name: "Steven Vento", initials: "SV" });
    assert.equal(steven.email, "ds_in_ovations@mac.com");
  });

  it("falls back to canonical email when normalizing a producer missing email", () => {
    const john = normalizeProducer({ id: "prod-15", name: "John Peters", initials: "JP" });
    assert.equal(john.email, "jp@soundslikethat.com");

    const griffin = normalizeProducer({ id: "prod-6", name: "Griffin Poole", initials: "GP" });
    assert.equal(griffin.email, "griffinp@powermusic.com");
  });
});
