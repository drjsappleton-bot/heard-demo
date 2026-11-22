/* Heard: what a provider sees on a patient row before opening the patient, and
   the order of the provider's lists.

   The rule this file serves (physician owner, 21 November 2026): Heard records
   questions. It is not two-way communication. Nothing on the patient or caregiver
   side changes because a provider looked at a list. So nothing in this file is
   shown to a patient or caregiver. The test file enforces that.

   What it does, from data the provider page has already loaded:
   - counts a patient's open entries (not yet marked addressed by the team);
   - says whether any open entry matched the safety list, in which tier, and when
     the latest one was captured;
   - orders patient rows: red first, then amber, then patients with open entries,
     then the rest, newest first inside each group;
   - orders the "Review first" section: red above amber, newest first.

   What it does not do. It does not judge how urgent anything is. The tier is the
   tier of the fixed safety message for the phrase that matched (redflags.js), and
   the badge states that fact and a time. Heard notifies no one, and a badge is
   seen only when a provider opens the provider page.

   Loaded as a plain script in the browser (window.HeardRows) and imported by the
   Node tests (globalThis.HeardRows). */
(function (root) {
  "use strict";

  /* Provider-side wording only. Nothing here is shown to a patient or caregiver. */
  var TEXT = {
    red: "Red",
    amber: "Amber",
    latest: "latest",
    open: "open",
    nothingOpen: "Nothing open",
    nothingCaptured: "Nothing captured",
    captured: "Captured",
    legend: "Red and amber mark open entries that matched the safety list, with the time the latest one was captured. Patients with a mark are listed first. Heard notifies no one."
  };

  function isOpen(e) { return !!e && !e.addressed; }

  /* The tier of an entry: "red", "amber" or null.
     An entry that was shown a safety message keeps the tier it was shown, even if
     the list has changed since. An entry with no stored trail (captured before the
     list existed) is run through the list as it is now. `check` is
     HeardRedFlags.check, or nothing when the list did not load. */
  function tierOf(e, check) {
    if (!e) return null;
    if (Array.isArray(e.rf) && e.rf.length > 0) return e.rfTier === "amber" ? "amber" : "red";
    if (typeof check !== "function") return null;
    var r = check(e.text);
    if (!r || !r.hit) return null;
    return r.tier === "amber" ? "amber" : "red";
  }

  function ts(e) { return e && typeof e.ts === "number" && isFinite(e.ts) ? e.ts : 0; }

  /* One patient record in, the row's facts out. */
  function summarize(rec, check) {
    var entries = rec && Array.isArray(rec.entries) ? rec.entries : [];
    var s = { total: entries.length, open: 0, lastOpen: 0, red: { n: 0, ts: 0 }, amber: { n: 0, ts: 0 } };
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!isOpen(e)) continue;
      s.open++;
      if (ts(e) > s.lastOpen) s.lastOpen = ts(e);
      var t = tierOf(e, check);
      if (t) { s[t].n++; if (ts(e) > s[t].ts) s[t].ts = ts(e); }
    }
    return s;
  }

  /* 0 red, 1 amber, 2 open entries with no mark, 3 nothing open. */
  function rank(s) {
    if (!s) return 3;
    if (s.red.n) return 0;
    if (s.amber.n) return 1;
    return s.open ? 2 : 3;
  }
  function rankTime(s) {
    var r = rank(s);
    return r === 0 ? s.red.ts : r === 1 ? s.amber.ts : r === 2 ? s.lastOpen : 0;
  }

  /* rows: [{ s: summary, created: sign-in time, ... }]. Returns a new array.
     Inside a group the newest comes first; rows with nothing open fall back to
     the newest sign-in, which is the order the list had before. */
  function sortRows(rows) {
    return (rows || []).map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
      var ra = rank(a.r.s), rb = rank(b.r.s);
      if (ra !== rb) return ra - rb;
      var ta = rankTime(a.r.s), tb = rankTime(b.r.s);
      if (ta !== tb) return tb - ta;
      var ca = a.r.created || 0, cb = b.r.created || 0;
      if (ca !== cb) return cb - ca;
      return a.i - b.i;
    }).map(function (x) { return x.r; });
  }

  /* items: [{ tier: "red" | "amber" | null, ts: number, ... }]. Returns a new
     array: red, then amber, then anything with no tier, newest first in each. */
  function sortReview(items) {
    var order = { red: 0, amber: 1 };
    return (items || []).map(function (it, i) { return { it: it, i: i }; }).sort(function (a, b) {
      var oa = Object.prototype.hasOwnProperty.call(order, a.it.tier) ? order[a.it.tier] : 2;
      var ob = Object.prototype.hasOwnProperty.call(order, b.it.tier) ? order[b.it.tier] : 2;
      if (oa !== ob) return oa - ob;
      var ta = a.it.ts || 0, tb = b.it.ts || 0;
      if (ta !== tb) return tb - ta;
      return a.i - b.i;
    }).map(function (x) { return x.it; });
  }

  function sameDay(a, b) {
    var x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  }
  /* "today 3:10 PM", "yesterday 9:02 AM", or "Nov 19 9:02 AM". */
  function when(t, now) {
    var d = new Date(t);
    var time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (sameDay(t, now)) return "today " + time;
    if (sameDay(t, now - 24 * 3600 * 1000)) return "yesterday " + time;
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + time;
  }

  /* "Red · today 2:14 AM" for one entry, "Red 2 · latest today 2:14 AM" for more. */
  function badgeText(tier, flag, now) {
    if (!flag || !flag.n) return "";
    var label = tier === "amber" ? TEXT.amber : TEXT.red;
    var t = flag.ts ? when(flag.ts, now) : "";
    if (flag.n === 1) return label + (t ? " · " + t : "");
    return label + " " + flag.n + (t ? " · " + TEXT.latest + " " + t : "");
  }
  function openText(s) {
    if (!s || !s.total) return TEXT.nothingCaptured;
    return s.open ? s.open + " " + TEXT.open : TEXT.nothingOpen;
  }
  function capturedText(t, now) { return t ? TEXT.captured + " " + when(t, now) : ""; }

  root.HeardRows = { TEXT: TEXT, isOpen: isOpen, tierOf: tierOf, summarize: summarize, rank: rank, sortRows: sortRows, sortReview: sortReview, when: when, badgeText: badgeText, openText: openText, capturedText: capturedText };
})(typeof globalThis !== "undefined" ? globalThis : this);
