// Run with: node --test
// The microphone (22 November 2026). On Steve's iPhone the first capture saved and later
// ones did not. One listening session must never reach into the next one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fnBody = (name) => { const at = html.indexOf("function " + name + "("); assert.ok(at > 0, name); return html.slice(at, html.indexOf("\n}", at)); };

test("each listening session ignores events once a newer session has started or the capture has finished", () => {
  const open = fnBody("openRec");
  assert.match(open, /dropRec\(\);[\s\S]*const mine = \+\+recSeq;/, "a new session first drops the old one and takes a new number");
  assert.equal((open.match(/if \(mine !== recSeq\) return;/g) || []).length, 3, "result, error and end each check the session number");
  assert.match(fnBody("finishCapture"), /recSeq\+\+; dropRec\(\);/);
  assert.match(fnBody("stopUI"), /recSeq\+\+; dropRec\(\);/);
  assert.match(fnBody("dropRec"), /old\.onresult = old\.onerror = old\.onend = null;[\s\S]*old\.abort\(\);/);
});

test("on an iPhone a session that closed by itself is saved, not reopened without a tap", () => {
  assert.match(fnBody("openRec"), /if \(wantRec && !silent && restarts < MAX_RESTARTS && !IS_IOS\) \{/);
});

test("a quick second tap saves the capture that was still pending, and an unknown error is shown", () => {
  assert.match(fnBody("startRec"), /if \(pending && pending !== lastSaved\) persistEntry\(pending\);/);
  assert.match(fnBody("finishCapture"), /The microphone stopped \(" \+ lastRecError \+ "\)\. /);
});

test("on an iPhone a capture that heard nothing sends the patient to the keyboard microphone", () => {
  // WebKit bug 321436 (open, 22 November 2026): later listening sessions on iPhone Safari hear
  // nothing and report no error. The page cannot fix that, so it must not leave the patient
  // tapping a button that will not work.
  const f = fnBody("finishCapture");
  assert.match(f, /if \(IS_IOS && !IS_IOS_NON_SAFARI\) \{\s*useKeyboardDictation\(/);
  assert.match(f, /setTimeout\(\(\) => \{ speechBlocked = false; \}, 120000\);/, "the button is tried again after two minutes");
});

test("on an iPhone, a tap inside two minutes of a spoken question shows the pop-up and does not listen", () => {
  // Steve, 22 November 2026: a gate, not three failed attempts. The pop-up says there is a
  // known fault in Safari and recommends the microphone key on the keyboard.
  assert.match(html, /const MIC_GAP_MS = 120000;/);
  assert.match(fnBody("toggleRec"), /if \(!wantRec && micGated\(\)\) \{ showMicNotice\(\); return; \}/);
  assert.match(fnBody("micGated"), /if \(!IS_IOS \|\| IS_IOS_NON_SAFARI\) return false;/, "only iPhone Safari is gated");
  assert.match(fnBody("finishCapture"), /markListened\(\);/);
  assert.match(html, /why: "iPhone Safari has a known fault\./);
  assert.match(html, /what: "Heard recommends: tap the box below, then tap the microphone key on your keyboard and speak\."/);
});
