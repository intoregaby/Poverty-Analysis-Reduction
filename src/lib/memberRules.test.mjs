import test from "node:test";
import assert from "node:assert/strict";
import { amountForHousehold, electionState, hasVoted, insuranceSummary, maskPhone, nextVisit } from "./memberRules.js";

const now = new Date("2026-10-29T10:00:00Z");

test("election is upcoming, open or closed by its dates", () => {
  assert.equal(electionState({ starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-03T00:00:00Z" }, now), "upcoming");
  assert.equal(electionState({ starts_at: "2026-10-28T00:00:00Z", ends_at: "2026-11-03T00:00:00Z" }, now), "open");
  assert.equal(electionState({ starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-10-05T00:00:00Z" }, now), "closed");
});

test("voted state comes from the member's own votes only", () => {
  assert.equal(hasVoted([{ election_id: "a" }], "a"), true);
  assert.equal(hasVoted([{ election_id: "a" }], "b"), false);
});

test("insurance is paid, partial or unpaid, with the balance", () => {
  const row = { amount_due: 12000, amount_paid: 0, period_start: "2026-07-01", period_end: "2027-06-30" };
  assert.equal(insuranceSummary(row, now).status, "unpaid");
  assert.equal(insuranceSummary({ ...row, amount_paid: 6000 }, now).balance, 6000);
  assert.equal(insuranceSummary({ ...row, amount_paid: 12000 }, now).status, "paid");
  assert.equal(insuranceSummary({ ...row, period_end: "2026-10-01" }, now).overdue, true);
  assert.equal(insuranceSummary(null), null);
});

test("the amount depends on category and household size", () => {
  const rates = [{ category: "mutuelle_2", annual_per_person: 3000 }, { category: "mutuelle_1", annual_per_person: 0 }];
  assert.equal(amountForHousehold("mutuelle_2", 4, rates), 12000);
  assert.equal(amountForHousehold("mutuelle_1", 6, rates), 0);
  assert.equal(amountForHousehold("rama", 2, rates), null);
});

test("next visit is the soonest scheduled one in the future", () => {
  const visits = [{ status: "Done", scheduled_at: "2026-10-30T07:00:00Z" }, { status: "Scheduled", scheduled_at: "2026-11-20T07:00:00Z" }, { status: "Scheduled", scheduled_at: "2026-11-01T07:00:00Z" }];
  assert.equal(nextVisit(visits, now).scheduled_at, "2026-11-01T07:00:00Z");
});

test("phone numbers are masked", () => assert.equal(maskPhone("+250788310445"), "+250•••445"));
