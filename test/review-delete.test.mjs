// Run with: node --test
// Demo recommendation 9: the patient reviews dictation before it saves, and can delete
// an entry. Built on the physician owner's decisions of 22 November 2026:
//   1. The safety check runs after a save, not while the words are on screen.
//   2. A patient may delete an entry that showed a safety message.
//   3. The provider side keeps a separate section of deleted entries that showed one.
// Edit deleted.js and this file together.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
await import("../deleted.js");
const D = globalThis.HeardDeleted;
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fnBody = (name) => { const at = html.search(new RegExp("(async )?function " + name + "\\(")); assert.ok(at > 0, name); return html.slice(at, html.indexOf("\n}\n", at) + 3); };
const T0 = new Date(2026, 10, 22, 9, 0, 0).getTime(), MIN = 60 * 1000;
const plain = () => ({ ts: T0, text: "When can I shower?", by: "patient" });
const flagged = () => ({ ts: T0 + MIN, text: "My calf feels tight", by: "patient", rf: ["calf"], rfVer: "2026-11-21.10", rfTier: "amber", rfShownAt: T0 + MIN, rfAckAt: T0 + 2 * MIN });
const record = () => ({ entries: [plain(), flagged()], deleted: [], removed: [] });

// ---- deleting ----

test("a deleted question that showed no safety message is gone and nothing is kept", () => {
  const rec = record();
  assert.deepEqual(D.remove(rec, 0, T0 + 5 * MIN, false), { ok: true, flagged: false });
  assert.equal(rec.entries.length, 1);
  assert.deepEqual(rec.deleted, [D.key(plain())], "the key is kept so another device cannot bring the question back");
  assert.deepEqual(rec.removed, []);
});

test("a deleted question that showed a safety message leaves the list and is kept for the provider side", () => {
  const rec = record();
  assert.deepEqual(D.remove(rec, 1, T0 + 5 * MIN, false), { ok: true, flagged: true });
  assert.equal(rec.entries.length, 1);
  assert.ok(rec.deleted.includes(D.key(flagged())));
  assert.equal(rec.removed.length, 1);
  const r = rec.removed[0];
  assert.equal(r.text, "My calf feels tight");
  assert.equal(r.rfTier, "amber");
  assert.equal(r.rfShownAt, T0 + MIN);
  assert.equal(r.rfAckAt, T0 + 2 * MIN);
  assert.equal(r.deletedAt, T0 + 5 * MIN);
  assert.equal(r.addressed, false);
  assert.deepEqual(D.remove(rec, 7, T0, false), { ok: false, flagged: false });
});

test("the kept record survives a merge, is not doubled, and stays cleared after a provider's Clear ALL", () => {
  const a = record(), b = record();
  D.remove(a, 1, T0 + 5 * MIN, true);
  D.remove(b, 1, T0 + 6 * MIN, true);                       // the same deletion seen on a second device
  const merged = D.merge(a.removed, b.removed, 0);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].deletedAt, T0 + 5 * MIN, "the first deletion stands");
  assert.equal(D.merge([], a.removed, 0).length, 1, "an empty copy does not erase it");
  // Clear ALL on the provider side removes it, and a stale copy cannot bring it back.
  const srv = { removed: merged.slice() };
  D.clearAll(srv, T0 + 10 * MIN);
  assert.deepEqual(srv.removed, []);
  assert.deepEqual(D.merge(srv.removed, a.removed, srv.removedClearedAt), []);
  // A deletion after the clear is kept.
  const c = record(); D.remove(c, 1, T0 + 11 * MIN, false);
  assert.equal(D.merge(srv.removed, c.removed, srv.removedClearedAt).length, 1);
});

test("the patient is told the truth before deleting a question that showed a safety message", () => {
  assert.match(D.TEXT.confirmFlagged, /showed a safety message/);
  assert.match(D.TEXT.confirmFlagged, /care team will still be able to see that it was recorded and that you deleted it/);
  assert.match(D.TEXT.confirm, /removed from your list and from your care team's list/);
  const del = fnBody("deleteEntry");
  assert.ok(del.includes("confirm(DEL.isFlagged(e) ? DEL.TEXT.confirmFlagged : DEL.TEXT.confirm)"));
  assert.ok(del.includes("RENDER_READONLY"), "a caregiver cannot delete");
  // The button is drawn on the patient's own page only.
  assert.ok(fnBody("entryHTML").includes("(!readOnly && DEL) ? '<button class=\"delx\""));
});

test("the patient's list never shows the kept records, and the provider side shows them in a section of their own", () => {
  for (const name of ["renderEntries", "entryHTML", "groupedHTML", "drawCaregiver"]) {
    assert.ok(!/removed/i.test(fnBody(name)), name + " touches the kept records");
  }
  assert.equal(D.TEXT.providerHeading, "Deleted by the patient: showed a safety message");
  assert.ok(fnBody("removedHTML").includes("DEL.TEXT.providerHeading"));
  assert.ok(fnBody("renderSummaryHTML").includes("res.innerHTML = html + removedHTML();"));
  assert.ok(fnBody("showList").includes("removedHTML()"), "the section must show even when the patient's list is empty");
  assert.ok(fnBody("clearPatientItems").includes("DEL.clearAll(rec, Date.now())"));
  assert.ok(!/urgent|triage/i.test(JSON.stringify(D.TEXT) + D.TEXT.homeLine(2)));
  assert.equal(D.TEXT.homeLine(1), "1 deleted question showed a safety message. Open the patient to see it.");
});

test("a save from the patient's phone carries the kept records, and writes under the code it was started for", () => {
  const save = fnBody("saveRecord");
  assert.ok(save.includes("const id = route.id, rec = ptRec;"));
  assert.ok(save.includes("doc.pts[id] = rec;"));
  assert.ok(!/doc\.pts\[route\.id\]/.test(save), "a save in flight could write under another page's code");
  assert.ok(save.includes("rec.removed = DEL.merge(srv.removed, rec.removed, rec.removedClearedAt);"));
});

// ---- review before saving ----

test("what the big button heard goes to the review box, not straight to the list", () => {
  const f = fnBody("finishCapture");
  assert.ok(f.includes("openReview(t);"));
  assert.ok(!f.includes("persistEntry("), "a spoken capture is saved without review");
  assert.match(html, /const REVIEW_SECONDS = 10;/);
  assert.equal((html.match(/'<div id="liveText"><\/div>' \+ reviewBoxHTML\(\) \+/g) || []).length, 2, "the patient and caregiver capture screens both have the box");
});

test("the safety check runs after the save, never on words still in the review box", () => {
  // Steve, 22 November 2026: the check should run after a save, not while they are typing.
  const start = html.indexOf("const REVIEW_SECONDS"), end = html.indexOf("function recUI(");
  const review = html.slice(start, end);
  assert.ok(review.length > 1500);
  assert.ok(!/rfCheck|RF\.check|showSafetyMessage|isRedFlag/.test(review), "the review code checks the words itself");
  const p = fnBody("persistEntry");
  assert.ok(p.indexOf("saveRecord();") > 0 && p.indexOf("saveRecord();") < p.indexOf("if (rf.hit) showSafetyMessage(e);"), "saved first, then the message");
  // Discarding keeps nothing and checks nothing.
  const d = fnBody("discardReview");
  assert.ok(!/persistEntry|saveRecord|ptRec/.test(d));
});

test("words waiting in the review box are never thrown away by a second tap or by leaving the page", () => {
  assert.match(fnBody("startRec"), /if \(reviewOpen\) commitReview\(\);/);
  assert.match(fnBody("stopUI"), /if \(reviewOpen\) commitReview\(\);/);
  assert.ok(html.includes('addEventListener("pagehide", () => { if (reviewOpen) commitReview(); });'));
  // Touching the words stops the clock.
  assert.match(fnBody("reviewBoxHTML"), /oninput="holdReview\(\)" onfocus="holdReview\(\)"/);
  assert.match(fnBody("holdReview"), /reviewLeft = -1;/);
});
