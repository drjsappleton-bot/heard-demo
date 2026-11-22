// Run with: node --test
// The films' narration is Steve's own voice, one clip per spoken line (22 November 2026).
// These tests keep the films, their tables of clip lengths and the clip files in step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const root = new URL("../", import.meta.url);
const page = (name) => readFileSync(new URL(name, root), "utf8");

function table(html, name) {
  const at = html.indexOf("const " + name + " = {");
  const body = html.slice(at, html.indexOf("};", at));
  const out = {};
  for (const m of body.matchAll(/"(\d\d)":\s*([\d.]+)/g)) out[m[1]] = +m[2];
  return out;
}
const introIds = (html) => [...new Set([...html.matchAll(/(?:my,\s*|voice\(|holdFor\([^,]+,\s*)"(\d\d)"\)/g)].map((m) => m[1]))].sort();
const tourIds = (html) => [...new Set([...html.matchAll(/(?:cap:\[[^\]]*?|caption\([^)]*?),\s*"(\d\d)"\s*[\])]/g)].map((m) => m[1]))].sort();

for (const [film, prefix, tableName, ids] of [["intro.html", "vo-", "DUR", introIds], ["tour.html", "tvo-", "DUR_T", tourIds]]) {
  test(film + ": every spoken line has a clip and a length, and nothing is left over", () => {
    const html = page(film), lengths = table(html, tableName), used = ids(html);
    assert.ok(used.length >= 20, "the film's spoken lines were not found");
    assert.deepEqual(Object.keys(lengths).sort(), used, "the table of lengths and the lines that are spoken");
    for (const id of used) {
      assert.ok(existsSync(new URL(prefix + id + ".mp3", root)), prefix + id + ".mp3 is missing");
      assert.ok(lengths[id] > 0.5 && lengths[id] < 20, "length of " + prefix + id);
    }
    const files = readdirSync(root).filter((f) => new RegExp("^" + prefix + "\\d\\d\\.mp3$").test(f)).map((f) => f.slice(prefix.length, -4)).sort();
    assert.deepEqual(files, used, "a clip file that no line plays, or a line with no clip file");
  });
}

test("the intro speaks its closing line, Be heard.", () => {
  // Steve, 22 November 2026: the closing line is "Be heard."
  const html = page("intro.html");
  assert.match(html, /tag\.textContent = "Be heard\.";\s*st\.appendChild\(tag\); on\(tag\);\s*voice\("27"\);/);
});
