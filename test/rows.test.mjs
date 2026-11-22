// Run with: node --test
// What a provider sees on a patient row, and the order of the provider's lists.
// Edit rows.js and this file together.
//
// The rule (physician owner, 21 November 2026): Heard records questions. It is not
// two-way communication. Nothing on the patient or caregiver side changes because a
// provider looked at a list. The first test below enforces that for this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
await import("../redflags.js");
await import("../rows.js");
const RF = globalThis.HeardRedFlags;
const ROWS = globalThis.HeardRows;
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const NOON = new Date(2026, 10, 22, 12, 0, 0).getTime();   // 22 November 2026, noon, local time
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
// An entry as the patient page saves it: the safety trail is stored with the entry.
function entry(text, ts, extra) {
  const e = { text, ts, ...(extra || {}) };
  const r = RF.check(text);
  if (r.hit) { e.rf = r.ids; e.rfVer = r.version; e.rfTier = r.tier || "red"; e.rfShownAt = ts; }
  return e;
}

test("row counts, marks and list order are used on the provider side only", () => {
  // Every use of the module in the page comes after the provider section starts.
  // The patient page, the caregiver page and the entry they both draw are above it.
  const cut = html.indexOf("/* ---------- provider home ---------- */");
  assert.ok(cut > 0, "the provider section marker is missing");
  const before = html.slice(0, cut);
  for (const fn of ["function renderPatient", "function renderCaregiver", "function drawCaregiver", "function entryHTML", "function renderEntries"]) {
    assert.ok(before.includes(fn), fn + " should be above the provider section");
  }
  assert.deepEqual(before.match(/\bROWS\.\w+/g) || [], [], "a patient-side use of the row summary appeared");
  // Steve, 22 November 2026: the provider home now shows each patient's open questions on
  // the list itself, and that counts as opening that patient's list. It is recorded only
  // for patients whose questions were put on screen, and only on the provider side.
  const home = html.slice(cut, html.indexOf("async function joinCareTeam"));
  assert.match(home, /if \(open\.length\) roundShown\.push\(q\.id\);/, "only a patient with open questions on screen is recorded");
  assert.match(home, /if \(roundShown\.length\) recordRoundOpens\(roundShown\);/);
  assert.ok(!/recordRoundOpens|roundShown|LR\.recordRead/.test(before), "the patient side must not record or read opens");
  // The patient's entry badge is unchanged.
  // The badge wording lives in loop.js since 22 November 2026 and is unchanged.
  assert.ok(html.includes("esc(T.waiting) + '</span>'"));
  assert.ok(readFileSync(new URL("../loop.js", import.meta.url), "utf8").includes('waiting: "Waiting for your care team"'));
});

test("the wording states facts and never a judgement of urgency", () => {
  for (const v of Object.values(ROWS.TEXT)) {
    assert.ok(!/triage|urgent|emergen|priority|critical|stat\b/i.test(v), "wording judges urgency: " + v);
    assert.ok(!/\bread\b|replied|seen/i.test(v), "wording claims a reader: " + v);
  }
  assert.match(ROWS.TEXT.legend, /Heard notifies no one\.$/);
});

test("a row counts open entries and marks the ones that matched the safety list", () => {
  const rec = { entries: [
    entry("When can I drive again?", NOON - 5 * HOUR),
    entry("I have chest pain", NOON - 4 * HOUR),
    entry("My calf feels tight and sore", NOON - 3 * HOUR),
    entry("my calf is tight again", NOON - 2 * HOUR),
    entry("What time is therapy?", NOON - HOUR, { addressed: true, addressedAt: NOON - 30 * MIN })
  ] };
  const s = ROWS.summarize(rec, RF.check);
  assert.equal(s.total, 5);
  assert.equal(s.open, 4);
  assert.deepEqual(s.red, { n: 1, ts: NOON - 4 * HOUR });
  assert.deepEqual(s.amber, { n: 2, ts: NOON - 2 * HOUR });
  assert.equal(s.lastOpen, NOON - 2 * HOUR);
  assert.equal(ROWS.openText(s), "4 open");
  assert.match(ROWS.badgeText("red", s.red, NOON), /^Red · today 8:00/);
  assert.match(ROWS.badgeText("amber", s.amber, NOON), /^Amber 2 · latest today 10:00/);
});

test("a mark goes away when the team marks the entry addressed, and comes back if the patient says not heard", () => {
  const e = entry("I have chest pain", NOON - HOUR);
  assert.equal(ROWS.summarize({ entries: [e] }, RF.check).red.n, 1);
  e.addressed = true; e.addressedAt = NOON - 30 * MIN;
  const done = ROWS.summarize({ entries: [e] }, RF.check);
  assert.equal(done.red.n, 0);
  assert.equal(done.open, 0);
  assert.equal(ROWS.openText(done), "Nothing open");
  assert.equal(ROWS.badgeText("red", done.red, NOON), "");
  // "Not heard" on the patient page sets addressed back to false.
  e.addressed = false; e.bouncedAt = NOON - 10 * MIN;
  assert.equal(ROWS.summarize({ entries: [e] }, RF.check).red.n, 1);
});

test("an entry keeps the tier of the message the patient was shown", () => {
  // Shown amber under an older list. The phrase is red today. The row says amber, which is what happened.
  const shownAmber = { text: "I am breathing heavily", ts: NOON, rf: ["breathing"], rfTier: "amber", rfShownAt: NOON };
  assert.equal(RF.check(shownAmber.text).tier, "red");
  assert.equal(ROWS.tierOf(shownAmber, RF.check), "amber");
  // Saved before tiers existed: the one message then was the red one.
  assert.equal(ROWS.tierOf({ text: "x", ts: NOON, rf: ["chest"] }, RF.check), "red");
  // No stored trail (captured before the list existed): the list as it is now decides.
  assert.equal(ROWS.tierOf({ text: "I have chest pain", ts: NOON }, RF.check), "red");
  assert.equal(ROWS.tierOf({ text: "My calf feels tight and sore", ts: NOON }, RF.check), "amber");
  assert.equal(ROWS.tierOf({ text: "When can I drive again?", ts: NOON }, RF.check), null);
  // If the list did not load, nothing is marked and nothing breaks.
  assert.equal(ROWS.tierOf({ text: "I have chest pain", ts: NOON }, null), null);
  assert.deepEqual(ROWS.summarize(null, RF.check), { total: 0, open: 0, lastOpen: 0, red: { n: 0, ts: 0 }, amber: { n: 0, ts: 0 } });
  assert.equal(ROWS.openText(ROWS.summarize({ entries: [] }, RF.check)), "Nothing captured");
});

test("patient rows: red, then amber, then open, then the rest, newest first in each", () => {
  const row = (name, created, entries) => ({ name, created, s: ROWS.summarize({ entries }, RF.check) });
  const rows = [
    row("none-old", NOON - 9 * DAY, []),
    row("open-old", NOON - 8 * DAY, [entry("When can I drive again?", NOON - 6 * HOUR)]),
    row("amber-old", NOON - 7 * DAY, [entry("My calf feels tight and sore", NOON - 5 * HOUR)]),
    row("red-old", NOON - 6 * DAY, [entry("I have chest pain", NOON - 4 * HOUR)]),
    row("none-new", NOON - 1 * DAY, [entry("What time is therapy?", NOON - HOUR, { addressed: true })]),
    row("open-new", NOON - 2 * DAY, [entry("Can I shower?", NOON - 2 * HOUR)]),
    row("amber-new", NOON - 3 * DAY, [entry("my calf is tight", NOON - 3 * HOUR)]),
    row("red-new", NOON - 4 * DAY, [entry("I can't breathe", NOON - HOUR), entry("my calf is tight", NOON - 30 * MIN)])
  ];
  const before = rows.map(r => r.name);
  assert.deepEqual(ROWS.sortRows(rows).map(r => r.name),
    ["red-new", "red-old", "amber-new", "amber-old", "open-new", "open-old", "none-new", "none-old"]);
  assert.deepEqual(rows.map(r => r.name), before, "the input list must not be reordered in place");
  assert.deepEqual(ROWS.sortRows(null), []);
});

test("Review first: red above amber, newest first in each", () => {
  const items = [
    { id: "amber-old", tier: "amber", ts: NOON - 5 * HOUR },
    { id: "red-old", tier: "red", ts: NOON - 4 * HOUR },
    { id: "ai-only", tier: null, ts: 0 },
    { id: "amber-new", tier: "amber", ts: NOON - HOUR },
    { id: "red-new", tier: "red", ts: NOON - 2 * HOUR }
  ];
  assert.deepEqual(ROWS.sortReview(items).map(i => i.id), ["red-new", "red-old", "amber-new", "amber-old", "ai-only"]);
});

test("times read today, yesterday, or a date", () => {
  assert.match(ROWS.when(NOON - HOUR, NOON), /^today 11:00/);
  assert.match(ROWS.when(NOON - DAY, NOON), /^yesterday 12:00/);
  assert.match(ROWS.when(NOON - 3 * DAY, NOON), /^Nov 19 12:00/);
  assert.match(ROWS.capturedText(NOON - HOUR, NOON), /^Captured today 11:00/);
  assert.equal(ROWS.capturedText(0, NOON), "");
});

test("the patient's list shows when it is opened, and Clear ALL is in Settings", () => {
  // No button stands between opening a patient and seeing the list.
  assert.ok(!html.includes("Generate rounding summary"), "the Generate button is back");
  const open = html.slice(html.indexOf("async function renderDrPatient"), html.indexOf("function settingsHTML"));
  assert.ok(/\bshowList\(\);/.test(open), "opening a patient must show the list");
  assert.ok(!open.includes("clearPatientItems"), "Clear ALL is back beside the list");
  const settings = html.slice(html.indexOf("function settingsHTML"), html.indexOf("/* ---------- summarization"));
  assert.ok(settings.includes("clearPatientItems()"), "Clear ALL should be inside Settings");
  // Showing the list on open uses the keyword sorter. It never calls the AI by itself.
  const show = html.slice(html.indexOf("function showList"), html.indexOf("function entriesForItem"));
  assert.ok(show.includes("mockSummarize") && !/aiSummarize|aiSortPrompt|fetch\(/.test(show), "showing the list must not call the AI");
});
