// Run with: node --test
// record.html is the temporary page on which the films' narration is recorded. Its script
// must be the films' own words, clip for clip, so a recording cannot be made of a line the
// films no longer show. These tests read the lines out of intro.html and tour.html and
// compare them with the table in record.html.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");

const rec = page("record.html");
const LINES = JSON.parse(rec.slice(rec.indexOf("const LINES = ") + 14, rec.indexOf("\n];", rec.indexOf("const LINES = ")) + 2));
const S = '"((?:[^"\\\\]|\\\\.)*)"';
const un = (s) => JSON.parse('"' + s + '"');

function durations(html, name) {
  const out = {};
  const head = html.slice(html.indexOf("const " + name + " = {"), html.indexOf("const player"));
  for (const m of head.matchAll(/"(\d\d)":\s*([\d.]+)/g)) out[m[1]] = +m[2];
  for (const m of html.matchAll(new RegExp(name + '\\["(\\d\\d)"\\]\\s*=\\s*([\\d.]+)', "g"))) out[m[1]] = +m[2];
  return out;
}
function introLines() {
  const html = page("intro.html"), body = html.slice(html.indexOf("const SCENES = ["));
  const re = new RegExp(
    'line\\(st,\\s*"\\w+",\\s*' + S + ',\\s*my,\\s*"(\\d\\d)"\\)' +
    '|sayLine\\(sc,\\s*' + S + ',\\s*my,\\s*"(\\d\\d)"\\)' +
    '|say\\(sc,\\s*' + S + '\\);\\s*voice\\("(\\d\\d)"\\)' +
    '|\\.textContent = ' + S + ';[^;]*;[^;]*;\\s*voice\\("(\\d\\d)"\\)', "g");
  const out = [];
  for (const m of body.matchAll(re)) for (let i = 1; i < 9; i += 2) if (m[i] !== undefined) out.push({ id: m[i + 1], main: "", text: un(m[i]) });
  return { lines: out, dur: durations(html, "DUR") };
}
function tourLines() {
  const html = page("tour.html"), body = html.slice(html.indexOf("const STEPS = ["));
  const re = new RegExp('cap:\\[\\s*' + S + '\\s*,\\s*' + S + '\\s*,\\s*"(\\d\\d)"\\s*\\]|caption\\(\\s*' + S + '\\s*,\\s*' + S + '\\s*,\\s*"(\\d\\d)"\\s*\\)', "g");
  const out = [];
  for (const m of body.matchAll(re)) out.push(m[3] ? { id: m[3], main: un(m[1]), text: un(m[2]) } : { id: m[6], main: un(m[4]), text: un(m[5]) });
  return { lines: out, dur: durations(html, "DUR_T") };
}

for (const [film, prefix, get] of [["intro", "vo-", introLines], ["tour", "tvo-", tourLines]]) {
  test("the recording script carries every voiced line of " + film + ".html, in film order, word for word", () => {
    const { lines, dur } = get();
    const mine = LINES.filter((l) => l.film === film);
    assert.ok(lines.length >= 20, "the film's lines were not found; the film's code may have changed shape");
    assert.deepEqual(mine.map((l) => l.id), lines.map((l) => l.id));
    for (let i = 0; i < lines.length; i++) {
      assert.equal(mine[i].text, lines[i].text, prefix + lines[i].id);
      assert.equal(mine[i].main, lines[i].main, prefix + lines[i].id);
      assert.equal(mine[i].key, prefix + lines[i].id);
      assert.equal(mine[i].clip, prefix + lines[i].id + ".mp3");
      assert.equal(mine[i].ref, dur[lines[i].id], "clip length of " + prefix + lines[i].id);
    }
  });
}

test("the recording page sends no recording anywhere", () => {
  // Recordings stay in the browser until the person downloads them. The page says so.
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|\.netlify\/functions/.test(rec));
  assert.ok(rec.includes("Nothing is sent to Heard's servers."));
});

test("the way in to the recording page is on the provider side only", () => {
  const html = page("index.html");
  assert.equal(html.split('href="record.html"').length - 1, 1, "one link to record.html");
  const at = html.indexOf('href="record.html"');
  const start = html.lastIndexOf("\nfunction ", at), startAsync = html.lastIndexOf("\nasync function ", at);
  const fn = html.slice(Math.max(start, startAsync), at);
  assert.match(fn, /^\n(async )?function renderDrHome\(/, "the link sits in the provider home screen");
});
