// Run with: node --test
// Demo recommendation 5 (physician owner agreed, 22 November 2026): allow zoom, raise the
// smallest type, label the inputs, darken the coral, enlarge the tick buttons.
// The patients are older adults after surgery, often without their glasses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const html = page("index.html");

test("the page can be zoomed", () => {
  const vp = html.match(/<meta name="viewport" content="([^"]+)">/)[1];
  assert.ok(!/user-scalable\s*=\s*no/i.test(vp), "pinch zoom is switched off");
  assert.ok(!/maximum-scale/i.test(vp), "zoom is capped");
});

test("no type on the page is smaller than 14px, and what the patient says or types is 16px", () => {
  const sizes = [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => +m[1]);
  assert.ok(sizes.length > 100);
  assert.ok(Math.min(...sizes) >= 14, "smallest type is " + Math.min(...sizes) + "px");
  // 16px in a field also stops iPhone Safari zooming the page when the field is tapped.
  assert.match(html, /\.entry \{[^}]*font-size: 16px/);
  assert.match(html, /\.typebox input \{[^}]*font-size: 16px/);
  assert.match(html, /input\.txt, select\.txt \{[^}]*font-size: 16px/);
});

test("every field has a label, not only a placeholder", () => {
  const fields = [...html.matchAll(/<(input|select)\b([^>]*?)\bid="(\w+)"([^>]*)>/g)].filter((m) => !/type="checkbox"/.test(m[0]));
  assert.ok(fields.length >= 10, "the fields were not found");
  for (const m of fields) {
    const id = m[3], labelled = html.includes('<label for="' + id + '"') || /aria-label="/.test(m[0]);
    assert.ok(labelled, "field " + id + " has no label");
  }
  // The sign-up fields a patient fills in carry a label that stays on screen.
  for (const id of ["npFirst", "npLast", "npDoc", "npDocOther", "npTeam", "reCode", "cgName"]) {
    assert.ok(html.includes('<label for="' + id + '"'), id + " has no visible label");
  }
});

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test("white text on the coral buttons meets 4.5 to 1, in the app and in both films", () => {
  for (const name of ["index.html", "tour.html", "intro.html"]) {
    const src = page(name);
    for (const v of ["--coral", "--coral-deep"]) {
      const m = src.match(new RegExp(v + ":\\s*(#[0-9a-f]{6})", "i"));
      if (!m) { assert.equal(name + v, "intro.html--coral-deep"); continue; }   // the intro film has no deep coral
      assert.ok(contrast(m[1], "#ffffff") >= 4.5, name + " " + v + " " + m[1] + " is " + contrast(m[1], "#ffffff").toFixed(2) + " to 1");
    }
  }
});

test("the tick boxes are 24px and their touch targets 44px", () => {
  for (const cls of ["heardchk", "itemchk", "rndchk"]) {
    assert.match(html, new RegExp("\\." + cls + " \\{[^}]*min-height: 44px"), cls + " touch target");
    assert.match(html, new RegExp("\\." + cls + " input \\{[^}]*width: 24px; height: 24px"), cls + " box");
  }
  assert.match(html, /\.nhx \{[^}]*min-height: 44px/);
});
