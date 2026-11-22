/* Heard: provider-side record of when a list was opened.

   The rule this file serves (physician owner, 21 November 2026): Heard records
   questions. It is not two-way communication. Questions are collected and then
   addressed at a later contact with the patient. Nothing on the patient or
   caregiver side changes because a provider looked at the list, and the patient
   is never told a question was seen or read. So nothing in this file is shown to
   a patient or caregiver. The test file enforces that.

   What it does: records when a provider device opened a patient's list (the
   rounding summary was generated) and tells the next provider who opened it last.
   "Opened" means a device showed the list. It does not mean a person read every
   line. In the demo the role is self-declared behind a shared PIN, so the role
   is a claim, not a verified identity. Times come from the provider device's clock.

   Loaded as a plain script in the browser (window.HeardLastRead) and imported by
   the Node tests (globalThis.HeardLastRead). */
(function (root) {
  "use strict";

  var MAX_READS = 50;            /* keep the most recent opens only */
  var SAME_OPEN_MS = 60 * 1000;  /* a second open by the same role within a minute is the same open */

  /* Provider-side wording only. Nothing here is shown to a patient or caregiver. */
  var TEXT = {
    providerNever: "This list has not been opened by a provider before.",
    providerStart: "Last opened by "
  };

  /* The provider roles offered at sign-in, in plain words. Anything else,
     including a missing role, is "a member of the care team". */
  var ROLE_LABEL = {
    "Physician": "a physician",
    "APP (PA or NP)": "a PA or NP",
    "Nurse": "a nurse",
    "MA": "a medical assistant"
  };
  function roleLabel(role) {
    return Object.prototype.hasOwnProperty.call(ROLE_LABEL, role) ? ROLE_LABEL[role] : "a member of the care team";
  }

  function clean(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r && typeof r.ts === "number" && isFinite(r.ts) && r.ts > 0) out.push({ ts: r.ts, role: typeof r.role === "string" ? r.role : "" });
    }
    return out;
  }

  /* Union of two lists of opens, oldest first, no duplicates, capped. Used wherever
     a record is written, so a save from the patient's phone can never erase an open
     recorded from the provider's device, and the other way round. */
  function mergeReads(a, b) {
    var all = clean(a).concat(clean(b));
    all.sort(function (x, y) { return x.ts - y.ts; });
    var out = [], seen = {};
    for (var i = 0; i < all.length; i++) {
      var k = all[i].ts + "|" + all[i].role;
      if (!seen[k]) { seen[k] = true; out.push(all[i]); }
    }
    return out.length > MAX_READS ? out.slice(out.length - MAX_READS) : out;
  }

  /* Adds an open to the list and returns the new list. */
  function recordRead(reads, role, now) {
    var list = clean(reads);
    var r = typeof role === "string" ? role : "";
    var last = list.length ? list[list.length - 1] : null;
    if (last && last.role === r && now - last.ts >= 0 && now - last.ts < SAME_OPEN_MS) return list;
    return mergeReads(list, [{ ts: now, role: r }]);
  }

  function lastRead(reads) {
    var list = clean(reads), best = null;
    for (var i = 0; i < list.length; i++) if (!best || list[i].ts > best.ts) best = list[i];
    return best;
  }

  function sameDay(a, b) {
    var x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  }
  /* "today at 3:10 PM", "yesterday at 9:02 AM", or "on Nov 19 at 9:02 AM". */
  function when(ts, now) {
    var d = new Date(ts);
    var time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (sameDay(ts, now)) return "today at " + time;
    if (sameDay(ts, now - 24 * 3600 * 1000)) return "yesterday at " + time;
    return "on " + d.toLocaleDateString([], { month: "short", day: "numeric" }) + " at " + time;
  }

  /* What the provider sees before opening: who opened it last. */
  function providerLine(reads, now) {
    var l = lastRead(reads);
    return l ? TEXT.providerStart + roleLabel(l.role) + " " + when(l.ts, now) + "." : TEXT.providerNever;
  }

  root.HeardLastRead = { TEXT: TEXT, MAX_READS: MAX_READS, SAME_OPEN_MS: SAME_OPEN_MS, roleLabel: roleLabel, mergeReads: mergeReads, recordRead: recordRead, lastRead: lastRead, when: when, providerLine: providerLine };
})(typeof globalThis !== "undefined" ? globalThis : this);
