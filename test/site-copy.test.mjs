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
