// Heard provider sign-in, the Netlify side. The rules are in ../lib/auth-core.mjs.
// Accounts are kept in their own blob store, "heard-accounts". The public store function
// (store.mjs) reads and writes "heard-demo" only, so it can never serve an account.
import { getStore } from "@netlify/blobs";
import { makeAuth } from "../lib/auth-core.mjs";

function accountStore() {
  const s = getStore({ name: "heard-accounts", consistency: "strong" });
  return {
    get: async (key) => { const v = await s.get(key, { type: "json" }); return v === undefined ? null : v; },
    set: (key, value) => s.setJSON(key, value),
    delete: (key) => s.delete(key),
    list: async (prefix) => (await s.list({ prefix })).blobs.map((b) => b.key)
  };
}
const env = (name) => {
  try { if (typeof Netlify !== "undefined" && Netlify.env) { const v = Netlify.env.get(name); if (v !== undefined) return v; } } catch (e) {}
  return process.env[name];
};

export default async (req, context) => {
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  let auth;
  try { auth = makeAuth({ store: accountStore(), env }); }
  catch (e) { return new Response(JSON.stringify({ error: "Account store unavailable: " + (e.message || e) }), { status: 500, headers }); }
  const action = (context && context.params && context.params.action) || (new URL(req.url).pathname.match(/^\/api\/auth\/([^/]+)\/?$/) || [])[1] || "";
  let body = null;
  if (req.method === "POST") {
    // A JSON body only. A form posted from another site cannot set this content type without a preflight.
    if (!/^application\/json/i.test(req.headers.get("content-type") || "")) return new Response(JSON.stringify({ error: "Body must be JSON" }), { status: 400, headers });
    body = await req.json().catch(() => null);
  }
  const r = await auth.handle({ method: req.method, action, body, cookie: req.headers.get("cookie") || "" });
  if (r.cookie) headers["set-cookie"] = r.cookie;
  return new Response(JSON.stringify(r.body), { status: r.status, headers });
};

export const config = { path: "/api/auth/:action" };
