// Run with: node --test
// The last-read indicator: when a provider last opened a patient's list, and what
// the patient is told. Edit lastread.js and this file together.
import { test } from "node:test";
import assert from "node:assert/strict";
await import("../lastread.js");
const LR = globalThis.HeardLastRead;

const NOON = new Date(2026, 10, 21, 12, 0, 0).getTime();   // 21 November 2026, noon, local time
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

test("a list nobody has opened says so, and promises no time", () => {
  const s = LR.status([], [{ ts: NOON - HOUR, text: "when can I go home" }], NOON);
  assert.equal(s.opened, false);
  assert.equal(s.line, "Your care team has not opened your list yet.");
  assert.equal(s.unseen, 1);
  assert.equal(s.next, "Your care team opens this list at their next visit.");
  // No clock time and no window is stated for the next visit. That is a commitment
  // for the practice and the hospital to make, not the software.
  assert.ok(!/\d/.test(s.next));
  assert.deepEqual(LR.status(undefined, undefined, NOON).unseen, 0);
});

test("an opened list names the role and the time, never a person", () => {
  const reads = LR.recordRead([], "Nurse", NOON - 2 * HOUR);
  const s = LR.status(reads, [{ ts: NOON - 3 * HOUR, text: "a" }], NOON);
  assert.equal(s.opened, true);
  assert.match(s.line, /^Your list was last opened by a nurse today at 10:00/);
  assert.equal(s.since, "");
  assert.equal(s.unseen, 0);
  assert.match(LR.status(LR.recordRead([], "Physician", NOON - DAY), [], NOON).line, /by a physician yesterday at 12:00/);
  assert.match(LR.status(LR.recordRead([], "APP (PA or NP)", NOON - 3 * DAY), [], NOON).line, /by a PA or NP on Nov 18 at 12:00/);
  assert.match(LR.status(LR.recordRead([], "MA", NOON - MIN), [], NOON).line, /by a medical assistant today/);
  // An unknown or missing role is never shown as typed.
  for (const role of ["Other", "", undefined, "Dr. Jane Smith", "constructor", "toString"]) {
    assert.match(LR.status(LR.recordRead([], role, NOON - MIN), [], NOON).line, /by a member of your care team today/);
  }
});

test("the patient is told the list was opened, not that it was read", () => {
  for (const v of Object.values(LR.TEXT)) assert.ok(!/\bread\b/i.test(v), "wording claims a read: " + v);
});

test("items added after the last open are counted as not seen", () => {
  const reads = LR.recordRead([], "Physician", NOON - HOUR);
  const before = { ts: NOON - 2 * HOUR, text: "before" };
  const after1 = { ts: NOON - 30 * MIN, text: "after" };
  const after2 = { ts: NOON - 10 * MIN, text: "after again" };
  assert.equal(LR.seen(before, reads), true);
  assert.equal(LR.seen(after1, reads), false);
  assert.equal(LR.seen(before, []), false);
  assert.equal(LR.status(reads, [before, after1], NOON).since, "1 item added since then has not been seen yet.");
  assert.equal(LR.status(reads, [before, after1, after2], NOON).since, "2 items added since then have not been seen yet.");
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

test("the provider sees who opened the list last", () => {
  assert.equal(LR.providerLine([], NOON), "This list has not been opened by a provider before.");
  assert.match(LR.providerLine(LR.recordRead([], "Nurse", NOON - HOUR), NOON), /^Last opened by a nurse today at 11:00/);
});
