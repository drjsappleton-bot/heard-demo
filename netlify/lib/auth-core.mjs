// Heard provider sign-in: the rules, with no knowledge of Netlify.
//
// WHAT THIS IS. Provider accounts: an email address as the username, a password, and an
// administrator who approves each new account before it sees a patient. The first and
// only administrator is fixed by two settings on the server (HEARD_ADMIN_EMAIL and
// HEARD_SETUP_CODE), so nobody can claim that seat from the sign-in page.
//
// WHAT THIS IS NOT. It is identity, not a security boundary. On the current stack every
// phone still downloads the one shared document from /api/store with no access check.
// Sign-in decides who the provider screens let in and whose name goes on an action.
// The real boundary belongs to the AWS rebuild.
//
// Accounts live in their own store, which the public store function never serves.
// Passwords are kept only as salted scrypt hashes. The session is a signed cookie that
// page scripts cannot read.
import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHmac, createHash } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);

export const SESSION_DAYS = 14;
export const ROLES = ["Physician", "APP (PA or NP)", "Nurse", "MA", "Other"];
export const MIN_PASSWORD = 10;
const MAX_FAILS = 5, LOCK_MINUTES = 15, MAX_PENDING = 50, RESET_HOURS = 24;
const COOKIE = "heard_session";

const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clean = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
const acctKey = (email) => "acct/" + Buffer.from(email, "utf8").toString("hex");
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const b64 = (buf) => Buffer.from(buf).toString("base64url");
function same(a, b) {
  const x = Buffer.from(sha(a), "hex"), y = Buffer.from(sha(b), "hex");
  return timingSafeEqual(x, y);
}
async function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const hash = await scrypt(String(password), salt, 64);
  return { salt: salt.toString("hex"), hash: Buffer.from(hash).toString("hex") };
}
async function passwordMatches(acct, password) {
  if (!acct || !acct.salt || !acct.hash) return false;
  const h = await hashPassword(password, acct.salt);
  return timingSafeEqual(Buffer.from(h.hash, "hex"), Buffer.from(acct.hash, "hex"));
}
function passwordProblem(pw) {
  pw = String(pw || "");
  if (pw.length < MIN_PASSWORD) return "Choose a password of at least " + MIN_PASSWORD + " characters.";
  if (pw.length > 200) return "That password is too long.";
  return "";
}
const publicView = (a) => ({ email: a.email, name: a.name, role: a.role, lead: a.lead || "", status: a.status, admin: !!a.admin, created: a.created, approvedAt: a.approvedAt || null });

/* store: { get(key), set(key, value), delete(key), list(prefix) -> [keys] }, all async.
   env:   (name) -> string | undefined.   now: () -> milliseconds. */
export function makeAuth({ store, env, now = () => Date.now() }) {
  const out = (status, body, cookie) => ({ status, body, cookie });
  const fail = (status, error) => out(status, { error });

  async function signingKey() {
    let k = await store.get("session-key");
    if (!k || !k.hex) { k = { hex: randomBytes(32).toString("hex"), created: now() }; await store.set("session-key", k); }
    return Buffer.from(k.hex, "hex");
  }
  async function makeCookie(acct) {
    const payload = b64(JSON.stringify({ e: acct.email, x: now() + SESSION_DAYS * 864e5, v: acct.tv || 0 }));
    const sig = b64(createHmac("sha256", await signingKey()).update(payload).digest());
    return COOKIE + "=" + payload + "." + sig + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_DAYS * 86400;
  }
  const clearCookie = COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";

  /* The account behind a request's cookie, or null. A changed password or a disabled
     account ends every session that was signed before it. */
  async function accountOf(cookieHeader) {
    const m = String(cookieHeader || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
    if (!m) return null;
    const [payload, sig] = m[1].split(".");
    if (!payload || !sig) return null;
    const want = b64(createHmac("sha256", await signingKey()).update(payload).digest());
    if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
    let p; try { p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch (e) { return null; }
    if (!p || !p.e || !(p.x > now())) return null;
    const acct = await store.get(acctKey(p.e));
    if (!acct || acct.status === "disabled" || (acct.tv || 0) !== (p.v || 0)) return null;
    return acct;
  }
  async function allAccounts() {
    const keys = await store.list("acct/");
    const list = [];
    for (const k of keys) { const a = await store.get(k); if (a) list.push(a); }
    return list.sort((a, b) => (a.created || 0) - (b.created || 0));
  }
  const adminEmail = () => normEmail(env("HEARD_ADMIN_EMAIL"));
  const setupCode = () => String(env("HEARD_SETUP_CODE") || "");

  const actions = {
    /* Who is signed in on this device, and whether the administrator seat is taken. */
    async me(req) {
      const acct = await accountOf(req.cookie);
      const admin = adminEmail() ? await store.get(acctKey(adminEmail())) : null;
      return out(200, { signedIn: !!acct, account: acct ? publicView(acct) : null, adminConfigured: !!(adminEmail() && setupCode()), adminClaimed: !!admin, sessionDays: SESSION_DAYS });
    },

    /* First-time setup of the administrator, and the administrator's own way back in after a
       forgotten password. Both need the setup code from the server settings. A code works once. */
    async setup(req) {
      const b = req.body || {}, email = normEmail(b.email);
      if (!adminEmail() || !setupCode()) return fail(503, "The administrator has not been set up on the server yet. Two settings are needed in Netlify: HEARD_ADMIN_EMAIL and HEARD_SETUP_CODE.");
      if (setupCode().length < 12) return fail(503, "The setup code in the server settings is too short. Use at least 12 characters.");
      const used = (await store.get("used-setup-codes")) || { list: [] };
      const okCode = same(b.code || "", setupCode()), okEmail = same(email, adminEmail());
      if (!okCode || !okEmail || used.list.includes(sha(setupCode()))) return fail(403, "That email and setup code do not match the server settings, or the code has already been used. Set a new HEARD_SETUP_CODE in Netlify to use setup again.");
      const pw = passwordProblem(b.password); if (pw) return fail(400, pw);
      const existing = await store.get(acctKey(email));
      const name = clean(b.name, 80) || (existing && existing.name);
      if (!name) return fail(400, "Enter your name as it should appear on the provider side.");
      const h = await hashPassword(b.password);
      const acct = Object.assign({}, existing || { email, created: now() }, { name, role: "Physician", lead: "", status: "approved", admin: true, salt: h.salt, hash: h.hash, fails: 0, lockedUntil: 0, tv: ((existing && existing.tv) || 0) + 1, approvedAt: (existing && existing.approvedAt) || now() });
      await store.set(acctKey(email), acct);
      used.list.push(sha(setupCode())); await store.set("used-setup-codes", used);
      return out(200, { ok: true, account: publicView(acct) }, await makeCookie(acct));
    },

    /* A new provider asks for access. The account exists but sees no patient until the
       administrator approves it. */
    async register(req) {
      const b = req.body || {}, email = normEmail(b.email);
      if (!validEmail(email)) return fail(400, "Enter a valid email address. It is your sign-in name.");
      if (adminEmail() && email === adminEmail()) return fail(400, "That address is the administrator's. Use first-time setup.");
      const name = clean(b.name, 80); if (!name) return fail(400, "Enter your name as it should appear on the provider side.");
      const role = ROLES.includes(b.role) ? b.role : "";
      if (!role) return fail(400, "Choose your role.");
      const lead = role === "Physician" ? "" : clean(b.lead, 80);
      if (role !== "Physician" && !lead) return fail(400, "Choose the physician you work with.");
      const pw = passwordProblem(b.password); if (pw) return fail(400, pw);
      if (await store.get(acctKey(email))) return fail(409, "An account with that email already exists. Sign in instead.");
      const pending = (await allAccounts()).filter((a) => a.status === "pending").length;
      if (pending >= MAX_PENDING) return fail(429, "Too many requests are waiting for approval. Ask the administrator.");
      const h = await hashPassword(b.password);
      const acct = { email, name, role, lead, status: "pending", admin: false, salt: h.salt, hash: h.hash, fails: 0, lockedUntil: 0, tv: 1, created: now() };
      await store.set(acctKey(email), acct);
      return out(200, { ok: true, account: publicView(acct) }, await makeCookie(acct));
    },

    async login(req) {
      const b = req.body || {}, email = normEmail(b.email);
      const acct = validEmail(email) ? await store.get(acctKey(email)) : null;
      const wrong = "That email and password do not match.";
      if (!acct) { await hashPassword(String(b.password || "x")); return fail(401, wrong); }   // same work either way
      if (acct.lockedUntil && acct.lockedUntil > now()) return fail(429, "Too many wrong attempts. Try again in " + Math.ceil((acct.lockedUntil - now()) / 60000) + " minutes.");
      if (!(await passwordMatches(acct, b.password))) {
        acct.fails = (acct.fails || 0) + 1;
        if (acct.fails >= MAX_FAILS) { acct.lockedUntil = now() + LOCK_MINUTES * 60000; acct.fails = 0; }
        await store.set(acctKey(email), acct);
        return fail(401, wrong);
      }
      if (acct.status === "disabled") return fail(403, "This account has been turned off. Ask the administrator.");
      if (acct.fails || acct.lockedUntil) { acct.fails = 0; acct.lockedUntil = 0; await store.set(acctKey(email), acct); }
      return out(200, { ok: true, account: publicView(acct) }, await makeCookie(acct));
    },

    async logout() { return out(200, { ok: true }, clearCookie); },

    /* The names of approved physicians, for the "physician you work with" list. */
    async physicians() {
      const list = (await allAccounts()).filter((a) => a.status === "approved" && a.role === "Physician").map((a) => a.name);
      return out(200, { physicians: list });
    },

    /* ---- administrator only ---- */
    async accounts(req) {
      const me = await accountOf(req.cookie);
      if (!me || !me.admin) return fail(403, "Administrator only.");
      return out(200, { accounts: (await allAccounts()).map(publicView) });
    },
    async decide(req) {
      const me = await accountOf(req.cookie);
      if (!me || !me.admin) return fail(403, "Administrator only.");
      const b = req.body || {}, email = normEmail(b.email), acct = await store.get(acctKey(email));
      if (!acct) return fail(404, "No such account.");
      if (acct.admin) return fail(400, "The administrator account cannot be changed here.");
      if (b.action === "approve" || b.action === "enable") { acct.status = "approved"; acct.approvedAt = now(); acct.approvedBy = me.name; }
      else if (b.action === "disable") { acct.status = "disabled"; acct.tv = (acct.tv || 0) + 1; }
      else if (b.action === "decline") { await store.delete(acctKey(email)); return out(200, { ok: true, removed: true }); }
      else return fail(400, "Unknown action.");
      await store.set(acctKey(email), acct);
      return out(200, { ok: true, account: publicView(acct) });
    },
    /* A forgotten password: the administrator makes a one-time code and gives it to the
       person directly. There is no email in this build. */
    async "reset-code"(req) {
      const me = await accountOf(req.cookie);
      if (!me || !me.admin) return fail(403, "Administrator only.");
      const email = normEmail((req.body || {}).email), acct = await store.get(acctKey(email));
      if (!acct || acct.admin) return fail(404, "No such account.");
      const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", bytes = randomBytes(10);
      let code = ""; for (let i = 0; i < 10; i++) code += alphabet[bytes[i] % alphabet.length];
      acct.resetHash = sha(code); acct.resetUntil = now() + RESET_HOURS * 36e5;
      await store.set(acctKey(email), acct);
      return out(200, { ok: true, code, hours: RESET_HOURS });
    },

    /* ---- anyone with a reset code, or signed in ---- */
    async reset(req) {
      const b = req.body || {}, email = normEmail(b.email), acct = validEmail(email) ? await store.get(acctKey(email)) : null;
      const bad = "That email and reset code do not match, or the code has expired.";
      if (!acct || !acct.resetHash || !(acct.resetUntil > now()) || !same(sha(String(b.code || "").trim().toUpperCase()), acct.resetHash)) return fail(403, bad);
      const pw = passwordProblem(b.password); if (pw) return fail(400, pw);
      const h = await hashPassword(b.password);
      Object.assign(acct, { salt: h.salt, hash: h.hash, fails: 0, lockedUntil: 0, tv: (acct.tv || 0) + 1 });
      delete acct.resetHash; delete acct.resetUntil;
      await store.set(acctKey(email), acct);
      return out(200, { ok: true, account: publicView(acct) }, await makeCookie(acct));
    },
    async password(req) {
      const me = await accountOf(req.cookie);
      if (!me) return fail(401, "Sign in first.");
      const b = req.body || {};
      if (!(await passwordMatches(me, b.current))) return fail(403, "The current password is not right.");
      const pw = passwordProblem(b.next); if (pw) return fail(400, pw);
      const h = await hashPassword(b.next);
      Object.assign(me, { salt: h.salt, hash: h.hash, tv: (me.tv || 0) + 1 });
      await store.set(acctKey(me.email), me);
      return out(200, { ok: true }, await makeCookie(me));
    }
  };
  const GETS = new Set(["me", "physicians", "accounts"]);

  /* req: { method, action, body, cookie } -> { status, body, cookie? } */
  async function handle(req) {
    const fn = Object.prototype.hasOwnProperty.call(actions, req.action) ? actions[req.action] : null;
    if (!fn) return fail(404, "Unknown action.");
    if (GETS.has(req.action) ? req.method !== "GET" : req.method !== "POST") return fail(405, "Method not allowed.");
    try { return await fn(req); } catch (e) { return fail(500, e && e.message ? e.message : String(e)); }
  }
  return { handle, accountOf };
}
