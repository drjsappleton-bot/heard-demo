// Run with: node --test
// The provider home (22 November 2026). Steve's decisions: the bare address opens one
// shared site; a provider lands on the patients of their own team; any approved provider
// can open another physician's list; a patient sees only their own questions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fnBody = (name) => { const at = html.indexOf("function " + name + "("); assert.ok(at > 0, name); return html.slice(at, html.indexOf("\n}", at)); };

test("the bare address opens the one shared site, and coded links still work", () => {
  assert.match(html, /const DEFAULT_SITE = "[A-Za-z0-9_-]{1,64}";/);
  const parse = fnBody("parseHash");
  assert.match(parse, /bucket = DEFAULT_SITE;\s*return \{ v: "landing" \};/);
  assert.match(parse, /if \(p\[0\] === "b" && p\[1\]\) \{\s*bucket = p\[1\];/, "a link with a site code opens that site");
  assert.ok(!/v: bucket \? "landing" : "setup"/.test(parse), "a new visitor is no longer sent to 'Create your demo site'");
});

test("a provider lands on their own team's patients, matched by exact name, and can open another physician's list", () => {
  const home = fnBody("renderDrHome");
  assert.match(home, /viewing = leadName \|\| "__all";/, "the default is the provider's own team");
  assert.match(home, /nameMatch\(x, y\) === "exact"/, "patients are matched to a physician by exact name");
  assert.match(home, /idx\.filter\(q => exact\(q\.doctor, viewing\)/);
  assert.match(home, /onchange="setViewing\(this\.value\)"/, "the list can be switched to another physician");
  assert.match(home, /const canAssign = viewing === "__none" && \(!onServer \|\| AUTH\.account\.admin\);/, "only the administrator links patients");
});

test("a patient's page is built from that patient's record alone", () => {
  const pt = fnBody("renderPatient");
  assert.match(pt, /doc\.pts\[route\.id\]/);
  assert.ok(!/doc\.idx|\.idx\.(map|filter|forEach)/.test(pt), "the patient page must not walk the list of patients");
  assert.ok(!/doc\.idx|\.idx\.(map|filter|forEach)/.test(fnBody("renderEntries")));
});

test("addressing from the list saves the provider's name and deletes nothing", () => {
  const f = fnBody("addressEntry");
  assert.match(f, /e\.addressed = true; e\.addressedAt = Date\.now\(\); if \(who\) e\.addressedBy = who;/);
  assert.ok(!/splice|deleted\.push|filter\(/.test(f));
});
