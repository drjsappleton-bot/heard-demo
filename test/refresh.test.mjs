// Run with: node --test
// The care team's mark reaches the patient's page without a reload (physician owner,
// 24 November 2026). These checks read the page's code. The behaviour itself was walked
// in headless Chrome when this was built: the mark arrives after one minute, and not
// while a question is being typed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fnBody = (name) => { const at = html.search(new RegExp("(async )?function " + name + "\\(")); assert.ok(at > 0, name); return html.slice(at, html.indexOf("\n}\n", at) + 3); };

test("the page asks for its list once a minute, and when it comes back to the front", () => {
  assert.ok(html.includes("const LIST_REFRESH_MS = 60 * 1000;"));
  assert.ok(html.includes("setInterval(refreshList, LIST_REFRESH_MS);"));
  assert.ok(html.includes('document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshList(); });'));
});

test("it only reads: nothing is saved and no open of the list is recorded", () => {
  const f = fnBody("refreshList");
  assert.ok(!/saveDoc|saveRecord|method:|LR\.|\.reads|ACK\.record/.test(f), "the refresh writes to the server, or touches the record of opens");
  assert.ok(f.includes("mergeEntries(srv.entries, rec.entries, rec.deleted)"), "the list is no longer merged through the loop rules");
  assert.ok(f.includes("renderEntries()"));
});

test("it never runs over words that are not saved yet", () => {
  const q = fnBody("listRefreshQuiet");
  for (const guard of ['route.v !== "patient" && route.v !== "care"', "document.hidden", "recording || wantRec || reviewOpen || rfPendingKey", "t.value || document.activeElement === t"]) {
    assert.ok(q.includes(guard), "the refresh no longer waits for: " + guard);
  }
  // checked before the request and again when the list comes back
  assert.equal((fnBody("refreshList").match(/listRefreshQuiet\(\)/g) || []).length, 2);
});
