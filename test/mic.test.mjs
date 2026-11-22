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
