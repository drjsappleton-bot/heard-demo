// Run with: node --test
// Wording on the site that was decided by the physician owner and must not drift.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");

test("the landing page carries the tagline chosen on 21 November 2026", () => {
  // Steve, 21 Nov 2026, 11:18 PM: Say it when you think of it. Leave your next visit saying, "I'm heard."
  // In the page source the quotation marks are &quot; and the apostrophe is escaped for the script string.
  const html = page("index.html");
  assert.ok(html.includes(`<div class="tag">Say it when you think of it. Leave your next visit saying, &quot;I\\'m heard.&quot;</div>`));
});

test("no page promises that anyone is listening between visits", () => {
  // The old tagline was wrong: the care team is not listening between visits. Heard records
  // questions for the next contact. It is not two-way communication.
  for (const name of ["index.html", "intro.html", "tour.html"]) {
    const html = page(name);
    assert.ok(!/care team is listening/i.test(html), name + " says the care team is listening");
    assert.ok(!/even between visits/i.test(html), name + " still carries the old tagline");
  }
});

// The two films (intro.html and tour.html) show the app. They must show what the
// app does today. Each film names its example questions as constants; these tests
// run them through the live list.
await import("../redflags.js");
const RF = globalThis.HeardRedFlags;
function constantsOf(html, prefix) {
  const out = [];
  const re = new RegExp("const (" + prefix + "\\w*) = \"([^\"]+)\";", "g");
  let m; while ((m = re.exec(html))) out.push([m[1], m[2]]);
  return out;
}

test("the films' ordinary example questions show no safety message in the app", () => {
  for (const name of ["intro.html", "tour.html"]) {
    const plain = constantsOf(page(name), "Q_PLAIN");
    assert.ok(plain.length >= 2, name + " should name its ordinary questions");
    for (const [k, q] of plain) assert.equal(RF.check(q).hit, false, name + " " + k + " now shows a safety message: " + q);
  }
});

test("the films' safety example shows the amber message, and the films read the message from the list", () => {
  for (const name of ["intro.html", "tour.html"]) {
    const html = page(name);
    const safety = constantsOf(html, "Q_SAFETY");
    assert.equal(safety.length, 1, name + " should name one safety example");
    assert.equal(RF.check(safety[0][1]).tier, "amber", name + " safety example is no longer amber: " + safety[0][1]);
    assert.ok(html.includes('<script src="redflags.js"></script>'), name + " must load the live list");
    assert.ok(html.includes("RFX.MESSAGES.amber") && html.includes("RFX.MESSAGE.standing"), name + " must take its wording from the list");
    // No example question is written straight into the markup any more.
    assert.ok(!/calf to feel tight/i.test(html), name + " still shows the calf question as an ordinary capture");
  }
});

test("the standing statement under the microphone is the wording chosen on 22 November 2026", () => {
  // Steve, 22 Nov 2026: use the film's line. It says what the tool is for, that it is not real time
  // communication, and where to turn. The app, both films and the intro film's spoken note share it.
  const line = "This tool is for recording your questions. It is not real time communication with your care team. For anything urgent or emergent: use your call light in the hospital, call your doctor's office, or call 911.";
  assert.equal(RF.MESSAGE.standing, line);
  for (const name of ["index.html", "intro.html", "tour.html"]) {
    const html = page(name);
    assert.ok(html.includes(line), name + " does not carry the standing statement as its fallback");
    assert.ok(!html.includes("Need help now? In the hospital, press your call button. At home, call 911."), name + " still carries the old standing line");
  }
});
