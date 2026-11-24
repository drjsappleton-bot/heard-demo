// Run with: node --test
// The notice of purpose a patient or caregiver reads before first use (physician owner,
// 23 November 2026). Edit ack.js and this file together.
//
// What the notice is: a statement of what Heard is for and is not, and a record that a
// button was tapped. It is not terms of use, a privacy notice, consent or a release.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
await import("../ack.js");
await import("../redflags.js");
const A = globalThis.HeardAck, RF = globalThis.HeardRedFlags;
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fnBody = (name) => { const at = html.search(new RegExp("(async )?function " + name + "\\(")); assert.ok(at > 0, name); return html.slice(at, html.indexOf("\n}\n", at) + 3); };
const T0 = new Date(2026, 10, 23, 19, 0, 0).getTime(), MIN = 60 * 1000;
const patient = A.who("patient"), sam = A.who("caregiver", "Sam O'Brien");
const everyLine = (T) => [T.title, T.lead, ...T.points, T.agree, T.decline, T.under, T.caregiverLead("Pat"), T.caregiverUnder("Pat"), T.readAloud, T.stopReading, T.spokenButtons(), T.declined.title, T.declined.body, T.declined.bodyExisting, T.declined.again, T.declined.home];

// ---- the wording ----

test("the wording is pinned to its version: change one, change the other", () => {
  // If this fails you changed the notice. Give it a new VERSION in ack.js, so that
  // everyone is shown the new wording, then update both values here.
  assert.equal(A.VERSION, "2026-11-23.2");
  // What each line says, and their order, were set by the physician owner on 23 November
  // 2026 at 7:53 PM. He allowed licence in the words at 7:55 PM, the intent to stay.
  assert.deepEqual(A.TEXT.points, [
    "This is not real time communication with your care team. Heard only records your questions as they come up, so they can be heard at your next visit or call.",
    "Sometimes Heard shows a message telling you to get help right away. It does not catch every problem. No message does not mean you are okay.",
    "Heard is not a doctor or nurse. It cannot tell you what is wrong. When in doubt, ask your nurse or call your doctor's office.",
    "Heard does not start any care or contact anyone for you. Always take a strong concern to your nurse, your doctor's office or 911."
  ]);
  assert.equal(A.TEXT.title, "Before you start");
  assert.equal(A.TEXT.agree, "I understand");
  assert.equal(A.TEXT.decline, "Not now");
  assert.equal(A.TEXT.under, "Tap \u201cNot now\u201d and nothing is saved. Your care is the same either way.");
});

test("each line carries the intent the owner stated", () => {
  const [one, two, three, four] = A.TEXT.points;
  // 1. Not real time communication; only a tool to record questions, so that they are heard.
  assert.match(one, /^This is not real time communication with your care team\./);
  assert.match(one, /only records your questions as they come up/);
  assert.match(one, /so they can be heard/);
  // 2. Sometimes a message; it does not catch everything; silence is not reassurance.
  assert.match(two, /^Sometimes Heard shows a message telling you to get help right away\./);
  assert.match(two, /It does not catch every problem\. No message does not mean you are okay\.$/);
  // 3. Not a medical professional; cannot tell you what is wrong; when in doubt, go to a person.
  assert.match(three, /not a doctor or nurse\. It cannot tell you what is wrong\. When in doubt,/);
  // 4. Heard sets nothing in motion; a strong concern always goes to a person or 911.
  assert.match(four, /^Heard does not start any care or contact anyone for you\./);
  assert.match(four, /Always take a strong concern to/);
  // The last two lines never leave out the nurse: a reader may still be in the hospital,
  // and the red box above them says to use the call light there.
  for (const line of [three, four]) assert.match(line, /your nurse/);
  for (const line of [three, four]) assert.match(line, /your doctor's office/);
  assert.match(four, /911\.$/);
});

test("the screen runs in the order the owner set: red box, lines, two buttons, read aloud last", () => {
  // Physician owner, 23 November 2026, 7:53 PM.
  const s = fnBody("showAck");
  const at = (x) => { const i = s.indexOf(x); assert.ok(i > 0, x); return i; };
  const order = [at("safeLineHTML()"), at("T.points.map"), at('id="ackYes"'), at('id="ackNo"'), at('class="ack-under"'), at('class="ack-read"')];
  assert.deepEqual(order, [...order].sort((x, y) => x - y));
});

test("the button says the reader understands, not that they agree", () => {
  // Attorney seat of the role-played panel, 23 November 2026 (an AI evaluator, not a lawyer):
  // there are no terms on this screen, so "agree" would claim a contract that is not there.
  // The safety message's own button already reads "I understand".
  assert.equal(A.TEXT.agree, RF.MESSAGE.button);
  assert.ok(!/agree/i.test(A.TEXT.agree + A.TEXT.decline));
});

test("the notice keeps the owner's vocabulary rules", () => {
  // 21 and 22 November 2026: the team "addresses" a question; nothing promises a listener,
  // an answer or a reply; "triage" and "urgent" stay out; Heard alerts no one.
  // "So they can be heard" says what the list is for. It does not say that anyone will.
  for (const line of everyLine(A.TEXT)) {
    assert.ok(!/\banswer|\brepl(y|ies)\b|listening|we will|someone will|will be heard|ensure|guarantee|make sure/i.test(line), "a promise in: " + line);
    assert.ok(!/triage|urgent/i.test(line), "triage or urgent in: " + line);
    assert.ok(!/\balert|notif|monitor/i.test(line), "says someone is alerted or watching: " + line);
    assert.ok(!/recommend/i.test(line), "Heard recommends (counsel question 5 is open): " + line);
  }
});

test("the notice is a notice: no release, waiver or legal wording", () => {
  for (const line of everyLine(A.TEXT)) {
    assert.ok(!/waive|release|liab|indemn|hold harmless|hereby|terms|agree to|at your own risk|sue\b|claim/i.test(line), "legal wording in: " + line);
  }
});

test("the notice is short and plainly written", () => {
  const words = A.TEXT.points.join(" ").split(/\s+/);
  assert.ok(words.length <= 130, "the body is " + words.length + " words");
  for (const p of A.TEXT.points) for (const s of p.split(/(?<=\.)\s+/)) assert.ok(s.split(/\s+/).length <= 20, "a long sentence: " + s);
});

test("the standing statement on the notice comes from the safety list, not a second copy", () => {
  assert.ok(fnBody("showAck").includes("safeLineHTML()"));
  assert.ok(fnBody("ackDecline").includes("safeLineHTML()"));
  assert.ok(!readFileSync(new URL("../ack.js", import.meta.url), "utf8").includes(RF.MESSAGE.standing));
});

// ---- who must see it, and the record ----

test("a record with no acknowledgement needs the notice; one tap settles it for that person", () => {
  const rec = { entries: [] };
  assert.equal(A.needed(rec, patient), true);
  const e = A.record(rec, patient, T0);
  assert.deepEqual(e, { ver: A.VERSION, at: T0, by: "patient" });
  assert.equal(A.needed(rec, patient), false);
  A.record(rec, patient, T0 + MIN);                      // a second tap adds nothing
  assert.equal(rec.acks.length, 1);
  assert.equal(rec.acks[0].at, T0);
});

test("each person answers for themselves: the patient's tap does not cover a caregiver, or the reverse", () => {
  const rec = {};
  A.record(rec, patient, T0);
  assert.equal(A.needed(rec, sam), true);
  A.record(rec, sam, T0 + MIN);
  assert.equal(A.needed(rec, sam), false);
  assert.equal(A.needed(rec, A.who("caregiver", "  sam o'brien ")), false, "the same name in another case is the same caregiver");
  assert.equal(A.needed(rec, A.who("caregiver", "Lee")), true, "a second caregiver reads it too");
  const only = {}; A.record(only, sam, T0);
  assert.equal(A.needed(only, patient), true, "a caregiver cannot answer for the patient");
  assert.deepEqual(rec.acks[1], { ver: A.VERSION, at: T0 + MIN, by: "caregiver", name: "Sam O'Brien" });
});

test("a record made under an earlier wording needs the notice again", () => {
  const rec = { acks: [{ ver: "2026-01-01.1", at: T0, by: "patient" }] };
  assert.equal(A.needed(rec, patient), true);
  A.record(rec, patient, T0 + MIN);
  assert.equal(rec.acks.length, 2, "the earlier record is kept");
});

test("two devices' copies merge without losing a record, and the earlier time wins", () => {
  const phone = [{ ver: A.VERSION, at: T0 + MIN, by: "patient" }, { ver: A.VERSION, at: T0 + 2 * MIN, by: "caregiver", name: "Sam O'Brien" }];
  const server = [{ ver: A.VERSION, at: T0, by: "patient" }, { ver: "2026-01-01.1", at: T0 - MIN, by: "patient" }];
  const m = A.merge(phone, server);
  assert.equal(m.length, 3);
  assert.equal(m.find((e) => e.by === "patient" && e.ver === A.VERSION).at, T0);
  assert.deepEqual(A.merge(m, m), m, "merging twice changes nothing");
  assert.deepEqual(A.merge(undefined, null), []);
  assert.deepEqual(A.merge([null, {}, { ver: "x" }], []), [], "malformed entries are dropped");
});

test("the provider's line says what the record is, and what it does not show", () => {
  const fmt = (t) => "T" + (t - T0) / MIN;
  assert.equal(A.providerLine({}, fmt), "Notice of purpose: no tap on record.");
  assert.equal(A.providerLine({ acks: [{ ver: "2026-01-01.1", at: T0, by: "patient" }] }, fmt), "Notice of purpose: a tap on record for an earlier wording only.");
  const rec = {}; A.record(rec, patient, T0); A.record(rec, sam, T0 + MIN);
  const line = A.providerLine(rec, fmt);
  assert.ok(line.includes("shown, and \u201cI understand\u201d tapped, on the patient\u2019s page, T0; by a person giving the name Sam O'Brien, T1."));
  assert.ok(line.endsWith("It does not show who tapped, or that the notice was read or understood."));
  // A typed name and a page code prove no identity, consent, understanding or capacity.
  assert.ok(!/consent|agreed|acknowledg|accepted|waiv|verified|the patient tapped/i.test(line), "the provider line over-claims");
});

// ---- the page ----

test("nothing is created at sign-up until the person taps the button to go on", () => {
  const np = fnBody("newPatient"), cp = fnBody("createPatient");
  assert.ok(!/saveDoc|loadDoc|localStorage/.test(np), "newPatient saves or reads before the notice");
  assert.match(np, /askAck\(ACK\.who\("patient"\), null, \(at\) => createPatient\(/);
  assert.ok(cp.includes("saveDoc(doc)") && cp.includes('ACK.record(doc.pts[id], ACK.who("patient"), ackAt)'));
  assert.equal((html.match(/createPatient\(/g) || []).length, 2, "createPatient is reached only through the notice");
});

test("the patient page, an older page and the caregiver page all pass through the notice", () => {
  const rp = fnBody("renderPatient");
  assert.match(rp, /if \(!ACK \|\| ACK\.needed\(ptRec, ACK\.who\("patient"\)\)\)/);
  assert.ok(rp.indexOf("ACK.needed") < rp.indexOf("drawPatient();"), "the capture screen is drawn before the check");
  assert.ok(!rp.includes("recBtn"), "renderPatient draws the microphone itself");
  assert.equal((html.match(/drawPatient\(\)/g) || []).length, 3, "drawPatient is reached another way");
  const rc = fnBody("renderCaregiver"), jc = fnBody("joinAsCaregiver");
  assert.match(rc, /if \(!ACK \|\| ACK\.needed\(ptRec, ACK\.who\("caregiver", stored\)\)\)/);
  assert.ok(jc.indexOf("askAck(") > 0 && jc.indexOf("askAck(") < jc.indexOf("localStorage.setItem"), "a caregiver is joined before the notice");
});

test("a missing ack.js closes the patient side, it does not open it", () => {
  assert.ok(html.includes('<script src="ack.js"></script>'));
  assert.match(fnBody("newPatient"), /if \(!ACK\) \{[^}]*ACK_UNAVAILABLE[^}]*return; \}/);
  assert.match(fnBody("joinAsCaregiver"), /if \(!ACK\) \{[^}]*ACK_UNAVAILABLE[^}]*return; \}/);
  assert.equal(html.match(/const ACK_UNAVAILABLE = "([^"]+)";/)[1], A.TEXT.unavailable);
});

test("declining records nothing, and the screen after it promises nothing", () => {
  const d = fnBody("ackDecline");
  assert.ok(!/ACK\.record|saveRecord|saveDoc|localStorage/.test(d), "a decline writes something");
  for (const b of [A.TEXT.declined.body, A.TEXT.declined.bodyExisting]) {
    assert.match(b, /Your care does not change/);
    assert.match(b, /Tell your nurse or doctor, or write them down for your next visit/);
    assert.match(b, /You can come back any time/);
  }
  assert.match(A.TEXT.declined.body, /^Nothing was saved\./);
  assert.match(A.TEXT.declined.bodyExisting, /^Nothing new was saved\./, "an older page still holds its questions");
});

test("the two buttons are the same size, and the first focus is the title, not a button", () => {
  const s = fnBody("showAck");
  assert.ok(s.includes('id="ackYes"') && s.includes('id="ackNo"'));
  assert.match(html, /\.ack-card \.btn \{ font-size: 18px; min-height: 58px; \}/);
  assert.match(html, /\.ack-card \.btn\.sub \{ font-size: 18px;/);
  assert.match(s, /getElementById\("ackTitle"\)[\s\S]*focus\(/);
  assert.ok(!/ackYes"\)\.focus|ackNo"\)\.focus/.test(s));
  // No pre-ticked box, no timer, no way past it other than the two buttons.
  assert.ok(!/checked|setTimeout|Escape/.test(s));
});

test("a save from one device cannot erase the record made on another", () => {
  assert.ok(fnBody("saveRecord").includes("if (ACK) rec.acks = ACK.merge(srv.acks, rec.acks);"));
  assert.ok(fnBody("renderPatient").includes("if (ACK) ptRec.acks = ACK.merge(ptRec.acks, cached.acks);"));
});

// ---- "Read this to me" ----

test("the voice reads what is on the screen, in order, then names the two buttons", () => {
  // Owner agreed, 23 November 2026. For a reader without their glasses, or who reads little.
  const lines = fnBody("ackSpokenLines");
  assert.match(lines, /return \[T\.title, RF \? RF\.MESSAGE\.standing : SAFE_LINE_FALLBACK\]\.concat\(T\.points, \[T\.spokenButtons\(\), cg \? T\.caregiverUnder\(ackCtx\.first\) : T\.under\]\);/);
  assert.equal(A.TEXT.spokenButtons(), "There are two buttons. One says: I understand. The other says: Not now.");
  assert.equal(A.TEXT.readAloud, "Read this to me");
  assert.equal(A.TEXT.stopReading, "Stop reading");
});

test("reading aloud never answers for the reader, stops when the notice closes, and is hidden where there is no voice", () => {
  const t = fnBody("ackToggleSpeak");
  assert.ok(!/ackAgree|ackDecline|ACK\.record|\.click\(/.test(t), "the voice taps a button");
  assert.match(fnBody("ackHide"), /^function ackHide\(\)\{ ackStopSpeaking\(\);/);
  assert.ok(fnBody("ackStopSpeaking").includes("speechSynthesis.cancel()"));
  assert.ok(fnBody("showAck").includes("(ACK_CAN_SPEAK ? '<button type=\"button\" class=\"ack-read\""));
  // Its own look, never one of the two answer buttons.
  assert.ok(!/class="btn[^"]*" id="ackRead"/.test(html));
  assert.match(html, /\.ack-card \.ack-read \{[^}]*min-height: 48px/);
  // Only the fixed notice is spoken: nothing a patient said or typed.
  assert.ok(!/ptRec|entries|\.text\b/.test(fnBody("ackSpokenLines") + t));
  // A voice stored on the device is preferred.
  assert.ok(t.includes("v.localService"));
});
