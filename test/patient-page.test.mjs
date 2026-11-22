// Run with: node --test
// Demo recommendation 7 (physician owner agreed, 22 November 2026): provider and demo
// material comes off the patient page, the API key box goes, and the AI prompt loses
// the words "triage" and "urgent".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const toml = readFileSync(new URL("netlify.toml", root), "utf8");
const fnBody = (name) => { const at = html.search(new RegExp("(async )?function " + name + "\\(")); return html.slice(at, html.indexOf("\n}\n", at) + 3); };

test("the patient's page carries nothing for providers and no demo links", () => {
  const body = fnBody("renderPatient");
  assert.ok(body.length > 500, "renderPatient was not found");
  for (const gone of ["For your care team", "Demo links", "Provider view", "Copy provider link", "PIN", "qrDr", "/dr/"]) {
    assert.ok(!body.includes(gone), "the patient page still shows: " + gone);
  }
  // The caregiver page never had them. Keep it that way.
  for (const gone of ["Provider view", "/dr/", "PIN"]) assert.ok(!fnBody("drawCaregiver").includes(gone));
  // No stale mention of the PIN that the provider sign-in replaced.
  assert.ok(!/provider PIN|PIN required/i.test(html));
});

test("there is no API key box, no saved key, and no call from the browser to an AI service", () => {
  for (const gone of ['id="apiKey"', "saveKey", "clearKey", "Sort with AI", "x-api-key", "api.anthropic.com", "dangerous-direct-browser-access", "AI mode"]) {
    assert.ok(!html.includes(gone), "still on the page: " + gone);
  }
  assert.match(html, /try \{ localStorage\.removeItem\(LS\.key\); \} catch \(e\) \{\}/, "a key saved by an earlier version must be removed");
  const csp = toml.match(/Content-Security-Policy = "([^"]+)"/)[1];
  assert.ok(csp.includes("connect-src 'self';"), "the page may send data somewhere other than this site");
  assert.ok(!/https?:/.test(csp), "the policy names an outside address");
});

test("the wording kept for a later AI sorter sorts only, and never says triage or urgent", () => {
  const prompt = fnBody("aiSortPrompt");
  assert.ok(prompt.includes("Do not judge how serious anything is"));
  assert.ok(!/triage|urgent|urgency|dangerous/i.test(prompt), "the prompt asks the AI to judge urgency");
  assert.ok(!/\burgent\b\s*\(/.test(prompt), "the prompt still has an urgent list");
  // Nothing calls it.
  assert.equal((html.match(/aiSortPrompt\(/g) || []).length, 1);
});

test("triage and urgent do not appear in anything shown on screen, apart from the standing statement", () => {
  // Physician's rule, 22 November 2026. The standing statement, in Steve's own wording of
  // the same day, says "For anything urgent or emergent"; it is the one exception.
  const shown = html.replace(/SAFE_LINE_FALLBACK = "[^"]*"/, "").match(/'[^'\n]*'|"[^"\n]*"/g) || [];
  const hits = shown.filter((t) => /triage|\bUrgent\b|\burgent [a-z]/i.test(t) && /[ <>]/.test(t));
  assert.deepEqual(hits, []);
});
