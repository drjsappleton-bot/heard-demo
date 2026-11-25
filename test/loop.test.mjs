// Run with: node --test
// The loop on one question: open, addressed by the care team, closed by the patient.
// Edit loop.js and this file together.
//
// Demo recommendation 4 (physician owner, 22 November 2026): "I was heard" is locked
// until the care team has marked the question addressed, and its meaning is on the
// screen, not in a hover tooltip. Wording uses "addressed", never "answered".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
await import("../loop.js");
const L = globalThis.HeardLoop;
const page = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const T0 = new Date(2026, 10, 22, 9, 0, 0).getTime(), MIN = 60 * 1000;
const q = (over) => Object.assign({ ts: T0, text: "When can I shower?" }, over || {});

test("I was heard is locked until the care team marks the question addressed", () => {
  const e = q();
  assert.equal(L.canMarkHeard(e), false);
  assert.equal(L.markHeard(e, true, T0 + MIN), false, "a tick on an unaddressed question must be refused");
  assert.equal(e.heard, undefined);
  assert.equal(L.isClosed(e), false);
  L.address(e, T0 + 2 * MIN, "Dr. Example");
  assert.equal(L.canMarkHeard(e), true);
  assert.equal(L.isClosed(e), false, "addressed is not closed until the patient ticks");
  assert.equal(L.markHeard(e, true, T0 + 3 * MIN), true);
  assert.equal(L.isClosed(e), true);
  assert.equal(e.addressedBy, "Dr. Example");
});

test("a tick made before the team's mark never closes a question", () => {
  // Saved before the lock existed: ticked early, no time on the tick.
  const old = q({ heard: true });
  assert.equal(L.confirmed(old), false);
  L.address(old, T0 + MIN);
  assert.equal(L.isClosed(old), false, "an early tick closed the question the moment it was addressed");
  // The same early tick sitting in a phone's cache, merged with the server's addressed copy.
  const server = q({ addressed: true, addressedAt: T0 + MIN, heard: false });
  const cache = q({ heard: true });
  L.mergeHeard(server, cache); L.settle(server);
  assert.equal(server.heard, false);
  assert.equal(L.isClosed(server), false);
});

test("a tick is final: it cannot be removed, and Not heard no longer applies", () => {
  // Physician owner, 24 November 2026. The patient asks a new question instead.
  const e = q(); L.address(e, T0);
  assert.equal(L.markHeard(e, true, T0 + MIN), true);
  const ticked = JSON.stringify(e);
  assert.equal(L.markHeard(e, false, T0 + 2 * MIN), false, "an untick was accepted");
  assert.equal(L.markHeard(e, true, T0 + 2 * MIN), false, "a second tick moved the time of the first");
  assert.equal(L.bounce(e, T0 + 3 * MIN), false, "Not heard was accepted on a ticked question");
  assert.equal(L.address(e, T0 + 4 * MIN, "Dr. Test"), false, "a closed question was marked again, which removes the tick");
  assert.equal(JSON.stringify(e), ticked, "a refused tap changed the question");
  assert.equal(L.isClosed(e), true);
  // An untick is refused on an open, addressed question too: there is nothing to remove.
  const f = q(); L.address(f, T0);
  assert.equal(L.markHeard(f, false, T0 + MIN), false);
  assert.equal(f.heardAt, undefined);
});

test("a tick is final across devices: a Not heard from a device that had not seen the tick does not undo it", () => {
  const server = q(); L.address(server, T0);
  const other = JSON.parse(JSON.stringify(server));       // a second device, same question, before the tick
  L.markHeard(server, true, T0 + MIN);
  assert.equal(L.bounce(other, T0 + 2 * MIN), true);      // it has not seen the tick, so its own rules allow it
  for (const [into, from] of [[server, other], [other, server]]) {
    const t = JSON.parse(JSON.stringify(into)), e = JSON.parse(JSON.stringify(from));
    // the page's merge: the later tick, the team's mark from either copy, the later Not heard
    L.mergeHeard(t, e);
    if (e.addressed) t.addressed = true;
    if ((e.addressedAt || 0) > (t.addressedAt || 0)) t.addressedAt = e.addressedAt;
    if ((e.bouncedAt || 0) > (t.bouncedAt || 0)) t.bouncedAt = e.bouncedAt;
    L.settle(t);
    assert.equal(L.isClosed(t), true, "the tick was undone by the other device");
    assert.equal(L.isAddressed(t), true);
  }
});

test("a Not heard with no tick still stands, and a later mark by the team opens the tick again", () => {
  const e = q(); L.address(e, T0); L.bounce(e, T0 + MIN); L.settle(e);
  assert.equal(L.isAddressed(e), false);
  assert.equal(L.isClosed(e), false);
  L.address(e, T0 + 2 * MIN);
  assert.equal(L.markHeard(e, true, T0 + 3 * MIN), true);
  L.settle(e);
  assert.equal(L.isClosed(e), true);
});

test("an untick saved before the rule is left alone: a stale tick does not come back over it", () => {
  // Data from before 24 November 2026 can hold heard:false with a later time than a tick.
  const e = q(); L.address(e, T0); L.markHeard(e, true, T0 + MIN);
  const stale = JSON.parse(JSON.stringify(e));
  e.heard = false; e.heardAt = T0 + 2 * MIN;              // how an untick was stored
  L.mergeHeard(e, stale); L.settle(e);
  assert.equal(e.heard, false);
  L.mergeHeard(stale, e); L.settle(stale);
  assert.equal(stale.heard, false, "the merge must give the same answer in either direction");
});

test("the page says a tick is final, and tells a caregiver to ask a new question", () => {
  const html = page("index.html");
  assert.equal(L.TEXT.tickFinal, "A tick cannot be removed. If you still have a question, ask it as a new question.");
  // The owner chose on 24 November 2026 not to add the sentence under an addressed question; it is on the closed list only.
  assert.ok(!/cannot be removed/.test(L.TEXT.ready));
  assert.match(L.TEXT.ready, /goes back on your open list\.$/);
  assert.equal(L.TEXT.caregiverOnly("Margaret"), "Only Margaret can tick \u201cI was heard\u201d or \u201cNot heard\u201d. If you disagree with how a question was addressed, ask a new question.");
  assert.ok(html.includes("esc(LOOP.TEXT.closedNote) + ' ' + esc(LOOP.TEXT.tickFinal)"), "the closed list no longer says a tick is final");
  assert.ok(html.includes("esc(LOOP.TEXT.caregiverOnly(ptRec.first))"), "the caregiver page no longer carries the line");
  assert.ok(!html.includes("You can see it, and you cannot set it."));
  // A ticked box is drawn ticked and off. A caregiver is never drawn a box at all.
  assert.ok(html.includes("(heard ? 'checked disabled' : '')"));
  assert.match(html, /const control = readOnly\s*\? '<span class="heardchk"/);
});

test("Not heard sends the question back, and it locks again until the team re-addresses it", () => {
  const e = q(); L.address(e, T0);
  assert.equal(L.bounce(e, T0 + MIN), true);
  assert.equal(L.isAddressed(e), false);
  assert.equal(L.markHeard(e, true, T0 + 2 * MIN), false, "locked again after Not heard");
  L.address(e, T0 + 3 * MIN);
  assert.equal(L.isAddressed(e), true);
  assert.equal(L.isClosed(e), false);
  assert.equal(L.bounce(q(), T0), false, "Not heard does nothing on a question the team has not addressed");
});

test("a slow clock on one device cannot undo a tap", () => {
  // The provider's device is five minutes ahead of the patient's phone.
  const e = q(); L.address(e, T0 + 5 * MIN);
  assert.equal(L.markHeard(e, true, T0 + MIN), true);
  assert.equal(L.isClosed(e), true, "the tick was dropped because the phone's clock is behind");
  const f = q(); L.address(f, T0 + 5 * MIN);
  L.bounce(f, T0 + MIN); L.settle(f);
  assert.equal(L.isAddressed(f), false, "Not heard was dropped because the phone's clock is behind");
  // The provider's device is behind the phone when it addresses the question again.
  L.address(f, T0); L.settle(f);
  assert.equal(L.isAddressed(f), true, "the second mark was dropped because the provider's clock is behind");
});

test("the meaning is on the screen and no tooltip carries it", () => {
  const html = page("index.html");
  assert.ok(html.includes('<script src="loop.js"></script>'));
  for (const use of ["LOOP.TEXT.key", "T.ready : T.locked", "LOOP.markHeard(e, v, Date.now())", "LOOP.bounce(e, Date.now())", "out.forEach(x => LOOP.settle(x))"]) {
    assert.ok(html.includes(use), "the page no longer uses " + use);
  }
  // The checkbox is drawn disabled while the question is not addressed.
  assert.ok(html.includes("(addressed ? '' : ' disabled')"));
  // The patient's tick box and the Not heard button carry no hover text.
  assert.ok(!/class="heardchk[^>]*title=/.test(html), "the tick box has a tooltip again");
  assert.ok(!/class="nhx"[^>]*title=/.test(html), "the Not heard button has a tooltip again");
  assert.match(L.TEXT.locked, /after your care team has addressed it/);
  assert.match(L.TEXT.ready, /Tick .I was heard. if you agree/);
});

test("the provider side marks a question addressed through the same rules", () => {
  const html = page("index.html");
  assert.equal((html.match(/LOOP\.address\(e, Date\.now\(\), who\)/g) || []).length, 2);
  assert.ok(!/e\.addressed = true; e\.addressedAt = Date\.now\(\)/.test(html), "a provider path bypasses loop.js");
});

test("the patient side says addressed, not answered", () => {
  // Physician's rule, 21 November 2026: "opened", "seen", "addressed". Not "read", "replied", "answered".
  for (const [k, v] of Object.entries(L.TEXT)) {
    const s = typeof v === "function" ? v("Margaret") : v;
    assert.ok(!/\banswer|\bread\b|\brepl(y|ied)/i.test(s), "loop wording " + k + " breaks the rule: " + s);
  }
  for (const name of ["index.html", "tour.html"]) {
    const html = page(name);
    assert.ok(!/care team answered these/i.test(html), name + " still says the care team answered");
    assert.ok(!/has been answered and closed/i.test(html), name + " still says answered and closed");
  }
  // The names both films speak are unchanged.
  assert.equal(L.TEXT.heardLabel, "I was heard");
  assert.equal(L.TEXT.notHeardLabel, "Not heard");
  assert.equal(L.TEXT.addressed, "Heard by your care team");
  assert.equal(L.TEXT.waiting, "Waiting for your care team");
});
