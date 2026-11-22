// Run with: node --test
// Provider sign-in (22 November 2026). Steve's decisions: the username is an email
// address; his own account is the administrator and approves every new account before it
// sees a patient; a device stays signed in for 14 days. These tests pin those rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeAuth, SESSION_DAYS } from "../netlify/lib/auth-core.mjs";

function world(envValues = { HEARD_ADMIN_EMAIL: "Admin@Example.test", HEARD_SETUP_CODE: "setup-code-for-tests-1" }) {
  const data = new Map(); let clock = 1_800_000_000_000;
  const store = {
    get: async (k) => (data.has(k) ? JSON.parse(data.get(k)) : null),
    set: async (k, v) => { data.set(k, JSON.stringify(v)); },
    delete: async (k) => { data.delete(k); },
    list: async (p) => [...data.keys()].filter((k) => k.startsWith(p))
  };
  const auth = makeAuth({ store, env: (n) => envValues[n], now: () => clock });
  const call = (action, body, cookie, method) => auth.handle({ method: method || (body === undefined ? "GET" : "POST"), action, body, cookie: cookie || "" });
  const jar = (r) => (r.cookie || "").split(";")[0];
  return { call, jar, data, env: envValues, tick: (ms) => { clock += ms; } };
}
const ADMIN = { email: "admin@example.test", code: "setup-code-for-tests-1", name: "Dr Test Admin", password: "correct horse 1" };
const NURSE = { email: "nurse@example.test", name: "Test Nurse", role: "Nurse", lead: "Dr Test Admin", password: "battery staple 2" };

test("the administrator seat is fixed by the server settings, and the setup code works once", async () => {
  const none = world({});
  assert.equal((await none.call("setup", ADMIN)).status, 503, "no settings, no administrator");
  const w = world();
  assert.equal((await w.call("me")).body.adminClaimed, false);
  assert.equal((await w.call("setup", { ...ADMIN, code: "wrong" })).status, 403);
  assert.equal((await w.call("setup", { ...ADMIN, email: "someone@else.test" })).status, 403, "only the configured address");
  const made = await w.call("setup", ADMIN);
  assert.equal(made.status, 200); assert.equal(made.body.account.admin, true); assert.equal(made.body.account.status, "approved");
  assert.equal((await w.call("me")).body.adminClaimed, true);
  assert.equal((await w.call("setup", { ...ADMIN, password: "another one 99" })).status, 403, "a used code does not work again");
  w.env.HEARD_SETUP_CODE = "a-new-setup-code-2";
  assert.equal((await w.call("setup", { ...ADMIN, code: "a-new-setup-code-2", password: "another one 99" })).status, 200, "a new code lets the administrator back in");
  assert.equal((await w.call("login", { email: ADMIN.email, password: ADMIN.password })).status, 401, "the old password is gone");
});

test("a new account waits for the administrator and is not listed as a physician until approved", async () => {
  const w = world(); const admin = w.jar(await w.call("setup", ADMIN));
  assert.equal((await w.call("register", { ...NURSE, password: "short" })).status, 400);
  assert.equal((await w.call("register", { ...NURSE, lead: "" })).status, 400, "a non-physician names the physician they work with");
  assert.equal((await w.call("register", { ...NURSE, email: ADMIN.email })).status, 400);
  const reg = await w.call("register", NURSE); const nurse = w.jar(reg);
  assert.equal(reg.body.account.status, "pending");
  assert.equal((await w.call("register", NURSE)).status, 409);
  assert.equal((await w.call("me", undefined, nurse)).body.account.status, "pending");
  await w.call("register", { email: "doc2@example.test", name: "Dr Second", role: "Physician", password: "long enough pw" });
  assert.deepEqual((await w.call("physicians")).body.physicians, ["Dr Test Admin"]);
  // only the administrator sees accounts or decides
  assert.equal((await w.call("accounts", undefined, nurse)).status, 403);
  assert.equal((await w.call("decide", { email: "doc2@example.test", action: "approve" }, nurse)).status, 403);
  assert.equal((await w.call("accounts", undefined, "")).status, 403);
  const list = await w.call("accounts", undefined, admin);
  assert.equal(list.body.accounts.length, 3);
  assert.ok(!JSON.stringify(list.body).match(/salt|hash/), "no password material leaves the server");
  assert.equal((await w.call("decide", { email: NURSE.email, action: "approve" }, admin)).body.account.status, "approved");
  assert.equal((await w.call("me", undefined, nurse)).body.account.status, "approved", "approval reaches a device that is already signed in");
  assert.equal((await w.call("decide", { email: "doc2@example.test", action: "decline" }, admin)).body.removed, true);
  assert.equal((await w.call("decide", { email: ADMIN.email, action: "disable" }, admin)).status, 400, "the administrator cannot be switched off from the page");
});

test("signing in: wrong passwords lock the account for a while, and turning an account off ends its sessions", async () => {
  const w = world(); const admin = w.jar(await w.call("setup", ADMIN));
  const nurse = w.jar(await w.call("register", NURSE));
  await w.call("decide", { email: NURSE.email, action: "approve" }, admin);
  assert.equal((await w.call("login", { email: "nobody@example.test", password: "whatever it is" })).status, 401);
  for (let i = 0; i < 5; i++) assert.equal((await w.call("login", { email: NURSE.email, password: "wrong " + i })).status, 401);
  assert.equal((await w.call("login", { email: NURSE.email, password: NURSE.password })).status, 429, "locked after five wrong attempts");
  w.tick(16 * 60000);
  const ok = await w.call("login", { email: " Nurse@Example.TEST ", password: NURSE.password });
  assert.equal(ok.status, 200, "the email is not case sensitive");
  await w.call("decide", { email: NURSE.email, action: "disable" }, admin);
  assert.equal((await w.call("me", undefined, nurse)).body.signedIn, false);
  assert.equal((await w.call("login", { email: NURSE.email, password: NURSE.password })).status, 403);
});

test("a device stays signed in for 14 days, in a cookie page scripts cannot read", async () => {
  assert.equal(SESSION_DAYS, 14);
  const w = world(); const r = await w.call("setup", ADMIN);
  assert.match(r.cookie, /HttpOnly/); assert.match(r.cookie, /Secure/); assert.match(r.cookie, /SameSite=Strict/); assert.match(r.cookie, /Max-Age=1209600/);
  const c = w.jar(r);
  w.tick(13 * 864e5); assert.equal((await w.call("me", undefined, c)).body.signedIn, true);
  w.tick(2 * 864e5); assert.equal((await w.call("me", undefined, c)).body.signedIn, false);
  const forged = c.slice(0, -3) + "abc";
  assert.equal((await w.call("me", undefined, forged)).body.signedIn, false, "a tampered cookie is refused");
});

test("a forgotten password: the administrator issues a one-time code", async () => {
  const w = world(); const admin = w.jar(await w.call("setup", ADMIN));
  const old = w.jar(await w.call("register", NURSE));
  assert.equal((await w.call("reset-code", { email: NURSE.email }, old)).status, 403);
  const code = (await w.call("reset-code", { email: NURSE.email }, admin)).body.code;
  assert.match(code, /^[A-Z2-9]{10}$/);
  assert.equal((await w.call("reset", { email: NURSE.email, code: "AAAAAAAAAA", password: "new password 3" })).status, 403);
  assert.equal((await w.call("reset", { email: NURSE.email, code: code.toLowerCase(), password: "new password 3" })).status, 200);
  assert.equal((await w.call("reset", { email: NURSE.email, code, password: "new password 4" })).status, 403, "the code works once");
  assert.equal((await w.call("me", undefined, old)).body.signedIn, false, "sessions from before the reset end");
  assert.equal((await w.call("login", { email: NURSE.email, password: "new password 3" })).status, 200);
});

test("passwords are never stored as written, and the public store cannot reach accounts", async () => {
  const w = world(); await w.call("setup", ADMIN); await w.call("register", NURSE);
  const dump = [...w.data.values()].join("\n");
  assert.ok(!dump.includes(ADMIN.password) && !dump.includes(NURSE.password) && !dump.includes(ADMIN.code));
  const storeFn = readFileSync(new URL("../netlify/functions/store.mjs", import.meta.url), "utf8");
  assert.ok(!storeFn.includes("heard-accounts"), "store.mjs must not open the account store");
  const authFn = readFileSync(new URL("../netlify/functions/auth.mjs", import.meta.url), "utf8");
  assert.ok(authFn.includes('name: "heard-accounts"'));
});

// ---- the page ----
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fnBody = (name) => { const at = html.indexOf("function " + name + "("); assert.ok(at > 0, name); return html.slice(at, html.indexOf("\n}", at)); };

test("the shared PIN is gone, and the provider screens open only for an approved, signed-in account", () => {
  for (const old of ["pinOverlay", "requirePin", "heard_pin", "demo default: 1111", "Change PIN"]) assert.ok(!html.includes(old), old + " is still in the page");
  const render = fnBody("render");
  assert.match(render, /route\.v === "drHome" \|\| route\.v === "drPatient"[\s\S]*await loadAuth\([\s\S]*if \(!providerOK\(\)\) return renderSignIn\(\);/);
  assert.match(fnBody("providerOK"), /AUTH\.signedIn && AUTH\.account && AUTH\.account\.status === "approved"/);
});

test("the patient and caregiver sides need no sign-in and never ask who is signed in", () => {
  for (const name of ["newPatient", "renderPatient", "renderCaregiver", "joinAsCaregiver", "renderEntries", "saveRecord"]) {
    assert.ok(!/\bAUTH\b|authApi|loadAuth/.test(fnBody(name)), name + " must not depend on a provider sign-in");
  }
});

test("who addressed a question is recorded for the provider side and not shown to the patient", () => {
  // Since 22 November 2026 both provider paths go through loop.js, which writes the name.
  assert.match(fnBody("completeItem"), /LOOP\.address\(e, Date\.now\(\), who\)/);
  assert.match(readFileSync(new URL("../loop.js", import.meta.url), "utf8"), /if \(who\) e\.addressedBy = who;/);
  assert.ok(!/addressedBy/.test(fnBody("renderEntries")), "the patient's list must not show who addressed an entry");
  assert.ok(!/addressedBy/.test(fnBody("renderPatient")));
});
