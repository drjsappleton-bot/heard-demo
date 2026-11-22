// Run with: node --test
// Demo recommendation 6 (physician owner agreed, 22 November 2026): four bugs.
// Edit codes.js and this file together.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
await import("../codes.js");
const C = globalThis.HeardCodes;
const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const toml = readFileSync(new URL("netlify.toml", root), "utf8");

const doc = { pts: {
  k7m2pq: { first: "Margaret", share: { code: "7KQ4MP" } },
  abc234: { first: "Ana" }
} };

test("a patient who types their page code in capitals reaches their own page", () => {
  assert.deepEqual(C.resolve("K7M2PQ", doc), { v: "patient", id: "k7m2pq" });
  assert.deepEqual(C.resolve(" k7m2pq ", doc), { v: "patient", id: "k7m2pq" });
  assert.deepEqual(C.resolve("ABC234", doc), { v: "patient", id: "abc234" });
});

test("a caregiver's invite code works in either case, and an unknown code goes to the patient page, which says so", () => {
  assert.deepEqual(C.resolve("7KQ4MP", doc), { v: "care", code: "7KQ4MP" });
  assert.deepEqual(C.resolve("7kq4mp", doc), { v: "care", code: "7KQ4MP" });
  assert.deepEqual(C.resolve("ZZZZZZ", doc), { v: "patient", id: "zzzzzz" });
  assert.deepEqual(C.resolve("", doc), { v: "none" });
  // A code cannot reach into the object itself.
  assert.deepEqual(C.resolve("constructor", { pts: {} }), { v: "patient", id: "constructor" });
  // If the shared document cannot be loaded, the old rule of thumb still applies.
  assert.deepEqual(C.resolve("7KQ4MP", null), { v: "care", code: "7KQ4MP" });
  assert.deepEqual(C.resolve("k7m2pq", null), { v: "patient", id: "k7m2pq" });
});

test("the page looks the code up and no longer guesses from its case", () => {
  assert.ok(html.includes("window.HeardCodes.resolve(c, doc)"));
  assert.ok(!html.includes("c === c.toUpperCase() && /^[A-Z2-9]{6}$/.test(c)"), "openMyPage still guesses from the case");
});

test("escaping covers the apostrophe", () => {
  assert.equal(C.esc(`O'Brien & <b>"x"</b>`), "O&#39;Brien &amp; &lt;b&gt;&quot;x&quot;&lt;/b&gt;");
  assert.equal(C.esc(null), "null");
  assert.ok(html.includes("function esc(s){ return window.HeardCodes.esc(s); }"), "the page has its own escaping again");
  // A name with an apostrophe inside the one single-quoted attribute on the page.
  const names = ["Dr. O'Brien", "Dr O'Brien"];
  const attr = C.esc(JSON.stringify(JSON.stringify(names)));
  assert.ok(!attr.includes("'"), "an apostrophe would end the attribute early");
});

test("an id from the shared document is never written straight into a handler", () => {
  assert.ok(!/\/dr\/' \+ q\.id \+ '/.test(html), "a patient id is concatenated into an onclick string");
  assert.ok(!/data-id="' \+ q\.id \+ '"/.test(html), "a patient id is written into an attribute unescaped");
  assert.equal((html.match(/data-p="' \+ esc\(q\.id\) \+ '" onclick="location\.hash=/g) || []).length, 2);
});

test("replacing the caregiver code says what it does", () => {
  assert.ok(!/stay joined/i.test(html), "the page still promises that joined caregivers stay joined");
  assert.ok(html.includes("caregivers who already joined lose access until you give them the new code"));
});

test("no page loads a script, stylesheet or font from another site", () => {
  // The QR script was moved onto this site, then removed with the provider QR code on
  // the patient page (demo recommendation 7). Nothing on the site draws a QR code now.
  for (const name of ["index.html", "tour.html", "intro.html"]) {
    const src = readFileSync(new URL(name, root), "utf8");
    assert.ok(!/<script[^>]+src="https?:/i.test(src), name + " loads a script from another site");
    assert.ok(!/<link[^>]+href="https?:/i.test(src), name + " loads a stylesheet or font from another site");
  }
  assert.ok(!/QRCode|qrcode\.min\.js/.test(html), "the QR script is back");
});

test("every page is sent with a content security policy that names no outside script host", () => {
  const csp = toml.match(/Content-Security-Policy = "([^"]+)"/)[1];
  const part = (name) => (csp.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + " ")) || "").slice(name.length + 1);
  assert.equal(part("default-src"), "'self'");
  assert.equal(part("script-src"), "'self' 'unsafe-inline'");
  assert.equal(part("object-src"), "'none'");
  assert.equal(part("frame-ancestors"), "'none'");
  assert.equal(part("base-uri"), "'self'");
  assert.ok(!/cdnjs|cloudflare|unsafe-eval|\*/.test(csp), "the policy is wider than it should be");
  assert.match(toml, /for = "\/\*"/);
  assert.match(toml, /X-Content-Type-Options = "nosniff"/);
  // The page uses no eval, which the policy would block.
  assert.ok(!/\beval\(|new Function\(/.test(html));
});
