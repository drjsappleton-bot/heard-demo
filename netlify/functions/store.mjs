// Heard demo store.
// Replaces jsonblob.com, which stopped returning CORS headers on POST and PUT.
// This runs on the same origin as the site, so CORS does not apply at all.

import { getStore } from "@netlify/blobs";

const STORE = "heard-demo";
const VALID_ID = /^[A-Za-z0-9_-]{1,64}$/;
const EMPTY_DOC = () => ({ idx: [], pts: {}, providers: [] });

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });

function siteId(req, context) {
  const fromParams = context && context.params && context.params.id;
  if (fromParams) return String(fromParams).trim();
  const m = new URL(req.url).pathname.match(/^\/api\/store\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]).trim() : "";
}

export default async (req, context) => {
  let store;
  try {
    // Strong consistency: without it a read straight after a write can miss,
    // which showed up as "Patient page not found" right after signing in.
    store = getStore({ name: STORE, consistency: "strong" });
  } catch (e) {
    return json({ error: "Blob store unavailable: " + (e.message || e) }, 500);
  }

  const id = siteId(req, context);

  try {
    // Create a new demo site. Returns { id } in the body, so nothing
    // depends on reading a Location header across origins.
    if (req.method === "POST") {
      const doc = await req.json().catch(() => EMPTY_DOC());
      const newId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      await store.setJSON(newId, doc);
      return json({ id: newId });
    }

    if (!id || !VALID_ID.test(id)) {
      return json({ error: "Missing or invalid demo site id" }, 400);
    }

    if (req.method === "GET") {
      const doc = await store.get(id, { type: "json" });
      if (doc === null || doc === undefined) return json({ error: "No such demo site" }, 404);
      return json(doc);
    }

    if (req.method === "PUT") {
      const doc = await req.json().catch(() => null);
      if (!doc || typeof doc !== "object") return json({ error: "Body must be JSON" }, 400);
      await store.setJSON(id, doc);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: e.message || String(e) }, 500);
  }
};

export const config = { path: ["/api/store", "/api/store/:id"] };
