// Run with: node --test
// The provider-side record of when a patient's list was opened.
// Edit lastread.js and this file together.
//
// The rule (physician owner, 21 November 2026): Heard records questions. It is not
// two-way communication. Nothing on the patient or caregiver side changes because a
// provider looked at the list. The first test below enforces that.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
await import("../lastread.js");
const LR = globalThis.HeardLastRead;

const NOON = new Date(2026, 10, 21, 12, 0, 0).getTime();   // 21 November 2026, noon, local time
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

test("the patient and caregiver pages show nothing about a provider opening the list", () => {
  // No patient-facing wording exists in the module.
  assert.deepEqual(Object.keys(LR.TEXT).sort(), ["providerNever", "providerStart"]);
  assert.equal(LR.status, undefined);
  assert.equal(LR.seen, undefined);
  // The page uses the record in exactly four places: the merge on save (never
  // displayed), the provider's line, the write when a provider opens a patient, and,
  // since 22 November 2026 on Steve's decision, the write when a patient's open questions
  // are shown on the provider home. All four are on the provider side.
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const uses = html.match(/\bLR\.\w+/g) || [];
  assert.deepEqual(uses.sort(), ["LR.mergeReads", "LR.mergeReads", "LR.providerLine", "LR.recordRead", "LR.recordRead"]);
  // The patient's entry badge is the one from before, and the page has no "seen" or "opened" status for patients.
  // The badge wording lives in loop.js since 22 November 2026 and is unchanged.
  assert.ok(html.includes("esc(T.waiting) + '</span>'"));
  assert.ok(readFileSync(new URL("../loop.js", import.meta.url), "utf8").includes('waiting: "Waiting for your care team"'));
  for (const gone of ['id="lastRead"', "renderLastRead", "refreshPatientView", "badgeSeen", "Not seen yet", "Your list was last opened"]) {
    assert.ok(!html.includes(gone), "patient-side indicator is back: " + gone);
  }
});

test("the provider sees who opened the list last, by role and time, never by name", () => {
  assert.equal(LR.providerLine([], NOON), "This list has not been opened by a provider before.");
  assert.match(LR.providerLine(LR.recordRead([], "Nurse", NOON - HOUR), NOON), /^Last opened by a nurse today at 11:00/);
  assert.match(LR.providerLine(LR.recordRead([], "Physician", NOON - DAY), NOON), /by a physician yesterday at 12:00/);
  assert.match(LR.providerLine(LR.recordRead([], "APP (PA or NP)", NOON - 3 * DAY), NOON), /by a PA or NP on Nov 18 at 12:00/);
  assert.match(LR.providerLine(LR.recordRead([], "MA", NOON - MIN), NOON), /by a medical assistant today/);
  // An unknown or missing role is never shown as typed.
  for (const role of ["Other", "", undefined, "Dr. Jane Smith", "constructor", "toString"]) {
    assert.match(LR.providerLine(LR.recordRead([], role, NOON - MIN), NOON), /by a member of the care team today/);
  }
});

test("the wording says opened, not read", () => {
  for (const v of Object.values(LR.TEXT)) assert.ok(!/\bread\b/i.test(v), "wording claims a read: " + v);
});

test("opens merge from both devices and nothing is lost or doubled", () => {
  const phone = [{ ts: NOON - 5 * HOUR, role: "Nurse" }];
  const server = [{ ts: NOON - 5 * HOUR, role: "Nurse" }, { ts: NOON - HOUR, role: "Physician" }];
  // The patient's phone holds an older copy. Saving from it must keep the newer open.
  assert.deepEqual(LR.mergeReads(server, phone), server);
  assert.deepEqual(LR.mergeReads(phone, server), server);
  assert.deepEqual(LR.lastRead(LR.mergeReads(phone, server)), { ts: NOON - HOUR, role: "Physician" });
  assert.deepEqual(LR.mergeReads(null, undefined), []);
  assert.deepEqual(LR.mergeReads([{ ts: "x" }, null, { role: "Nurse" }, { ts: -1 }], [{ ts: 5, role: 7 }]), [{ ts: 5, role: "" }]);
});

test("a second open by the same role within a minute is one open, and the list is capped", () => {
  let reads = LR.recordRead([], "Nurse", NOON);
  reads = LR.recordRead(reads, "Nurse", NOON + 20 * 1000);
  assert.equal(reads.length, 1);
  reads = LR.recordRead(reads, "Physician", NOON + 30 * 1000);
  assert.equal(reads.length, 2);
  reads = LR.recordRead(reads, "Physician", NOON + 5 * MIN);
  assert.equal(reads.length, 3);
  let many = [];
  for (let i = 0; i < 80; i++) many = LR.recordRead(many, "Nurse", NOON + i * HOUR);
  assert.equal(many.length, LR.MAX_READS);
  assert.equal(LR.lastRead(many).ts, NOON + 79 * HOUR);
});
