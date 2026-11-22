/* Heard last-read indicator.

   What this is: a record of when a provider last opened a patient's list, and the
   wording that tells the patient so. Product change 3 in the website proposal of
   21 November 2026: the patient should be able to see that the list is being
   looked at, and what happens next.

   What "opened" means, exactly: a provider device showed the list (the rounding
   summary was generated). Heard cannot know that a person read every line, so the
   patient is told the list was opened, not that it was read. In the demo the
   provider's role is self-declared behind a shared PIN, so the role shown is a
   claim, not a verified identity. Times come from the provider device's clock.

   What this is not: a promise of when the list will be opened next. The line about
   the next visit is fixed wording (NEXT below). A stated time window is a
   commitment that the practice and the hospital have to make, so none is invented
   here.

   It never replaces the safety message. An entry that matched the red-flag list
   keeps its "do not wait for a reply here" line whether or not the list was opened.

   Loaded as a plain script in the browser (window.HeardLastRead) and imported by
   the Node tests (globalThis.HeardLastRead). */
(function (root) {
  "use strict";

  var MAX_READS = 50;            /* keep the most recent opens only */
  var SAME_OPEN_MS = 60 * 1000;  /* a second open by the same role within a minute is the same open */

  /* All patient-facing wording in one place. */
  var TEXT = {
    never: "Your care team has not opened your list yet.",
    openedStart: "Your list was last opened by ",
    sinceOne: "1 item added since then has not been seen yet.",
    sinceMany: " items added since then have not been seen yet.",
    NEXT: "Your care team opens this list at their next visit.",
    badgeUnseen: "Not seen yet",
    badgeSeen: "Seen, waiting for an answer",
    providerNever: "This list has not been opened by a provider before.",
    providerStart: "Last opened by "
  };

  /* The provider roles offered at sign-in, as a patient would say them. Anything
     else, including a missing role, is "a member of your care team". */
  var ROLE_LABEL = {
    "Physician": "a physician",
    "APP (PA or NP)": "a PA or NP",
    "Nurse": "a nurse",
    "MA": "a medical assistant"
  };
  function roleLabel(role) {
    return Object.prototype.hasOwnProperty.call(ROLE_LABEL, role) ? ROLE_LABEL[role] : "a member of your care team";
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

  /* Union of two read lists, oldest first, no duplicates, capped. Used wherever a
     record is written, so a save from the patient's phone can never erase an open
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

  /* Was this entry on the list the last time it was opened? */
  function seen(entry, reads) {
    var l = lastRead(reads);
    return !!(l && entry && typeof entry.ts === "number" && entry.ts <= l.ts);
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

  /* What the patient page shows above the list. entries are the patient's open
     (unanswered) entries. Returns { opened, line, since, next, unseen }. */
  function status(reads, entries, now) {
    var l = lastRead(reads);
    var unseen = 0;
    var list = Array.isArray(entries) ? entries : [];
    for (var i = 0; i < list.length; i++) if (!seen(list[i], reads)) unseen++;
    if (!l) return { opened: false, line: TEXT.never, since: "", next: TEXT.NEXT, unseen: unseen };
    return {
      opened: true,
      line: TEXT.openedStart + roleLabel(l.role) + " " + when(l.ts, now) + ".",
      since: unseen === 0 ? "" : (unseen === 1 ? TEXT.sinceOne : unseen + TEXT.sinceMany),
      next: TEXT.NEXT,
      unseen: unseen
    };
  }

  /* What the provider sees before opening: who opened it last. */
  function providerLine(reads, now) {
    var l = lastRead(reads);
    return l ? TEXT.providerStart + roleLabel(l.role) + " " + when(l.ts, now) + "." : TEXT.providerNever;
  }

  root.HeardLastRead = { TEXT: TEXT, MAX_READS: MAX_READS, SAME_OPEN_MS: SAME_OPEN_MS, roleLabel: roleLabel, mergeReads: mergeReads, recordRead: recordRead, lastRead: lastRead, seen: seen, when: when, status: status, providerLine: providerLine };
})(typeof globalThis !== "undefined" ? globalThis : this);
