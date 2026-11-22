/* Heard: escaping, and telling a patient's page code from a caregiver's invite code.

   Demo recommendation 6 (physician owner agreed, 22 November 2026), two of its bugs.

   Escaping. Everything a person typed, and everything read from the shared
   document, goes through esc() before it is put on the page. It now covers the
   apostrophe as well, so a name such as O'Brien cannot end an attribute early.

   Codes. A patient's page code is six characters in lower case. A caregiver's
   invite code is six characters from the same alphabet in upper case. A phone
   keyboard often capitalises, so the case of what was typed proves nothing.
   resolve() looks the code up instead: a page code first, then an invite code.

   Loaded as a plain script in the browser (window.HeardCodes) and imported by
   the Node tests (globalThis.HeardCodes). */
(function (root) {
  "use strict";

  var MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return MAP[c]; }); }

  /* Where a typed code leads. doc is the shared document, or null if it could not
     be loaded, in which case the old rule of thumb applies: upper case means a
     caregiver's invite code. */
  function resolve(typed, doc) {
    var c = String(typed || "").trim();
    if (!c) return { v: "none" };
    var lower = c.toLowerCase(), upper = c.toUpperCase();
    var pts = doc && doc.pts && typeof doc.pts === "object" ? doc.pts : null;
    if (pts) {
      if (Object.prototype.hasOwnProperty.call(pts, lower) && pts[lower]) return { v: "patient", id: lower };
      for (var k in pts) {
        if (!Object.prototype.hasOwnProperty.call(pts, k)) continue;
        var r = pts[k];
        if (r && r.share && String(r.share.code).toUpperCase() === upper) return { v: "care", code: upper };
      }
      /* Not found either way. The patient page says so in plain words. */
      return { v: "patient", id: lower };
    }
    if (c === upper && /^[A-Z2-9]{6}$/.test(c)) return { v: "care", code: upper };
    return { v: "patient", id: lower };
  }

  root.HeardCodes = { esc: esc, resolve: resolve };
})(typeof globalThis !== "undefined" ? globalThis : this);
