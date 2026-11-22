/* Heard: a patient deleting their own question.

   Demo recommendation 9, on the physician owner's decisions of 22 November 2026:
   - A patient may delete any question on their list, including one that showed a
     safety message.
   - A deleted question that showed no safety message is gone from both sides.
   - A deleted question that showed a safety message leaves the patient's list and is
     kept for the provider side, in a section of its own, with the record of which
     message was shown. "At least for now", pending counsel (question 26).

   Because of the third point the patient is told the truth before deleting such a
   question: the care team will still be able to see that it was recorded and that it
   was deleted. Delete must not claim more than it does.

   Nothing here tells the patient that anyone looked at anything (rule of 21 November
   2026). The kept record is shown on the provider side only.

   Loaded as a plain script in the browser (window.HeardDeleted) and imported by the
   Node tests (globalThis.HeardDeleted). */
(function (root) {
  "use strict";

  var TEXT = {
    button: "Delete",
    confirm: "Delete this question? It will be removed from your list and from your care team's list.",
    confirmFlagged: "Delete this question? It showed a safety message. It will be removed from your list. Your care team will still be able to see that it was recorded and that you deleted it.",
    providerHeading: "Deleted by the patient: showed a safety message",
    providerNote: "The patient deleted these. Each one showed a safety message when it was saved, so it is kept here, and the patient was told so before deleting. A deleted question that showed no safety message is not kept.",
    homeLine: function (n) {
      return n + (n === 1 ? " deleted question" : " deleted questions") + " showed a safety message. Open the patient to see " + (n === 1 ? "it" : "them") + ".";
    }
  };

  function key(e) { return e.ts + "|" + e.text; }
  /* A safety message was shown for this question when it was saved. */
  function isFlagged(e) { return !!(e && Array.isArray(e.rf) && e.rf.length); }

  /* What is kept, for the provider side, of a deleted question that showed a safety message. */
  function record(e, now, addressed) {
    var r = { ts: e.ts, text: e.text, by: e.by || "patient", rf: e.rf.slice(), rfVer: e.rfVer, rfTier: e.rfTier === "amber" ? "amber" : "red",
      rfShownAt: e.rfShownAt || e.ts, addressed: !!addressed, deletedAt: now };
    if (e.byName) r.byName = e.byName;
    if (e.rfLists && e.rfLists.length) r.rfLists = e.rfLists.slice();
    if (e.rfAckAt) r.rfAckAt = e.rfAckAt;
    if (addressed && e.addressedAt) r.addressedAt = e.addressedAt;
    if (addressed && e.addressedBy) r.addressedBy = e.addressedBy;
    return r;
  }

  /* Deletes entry i from a patient record. The key goes on the record's list of
     deleted keys, so a copy on another device cannot bring the question back.
     Returns { ok, flagged }. */
  function remove(rec, i, now, addressed) {
    var e = rec && rec.entries && rec.entries[i];
    if (!e) return { ok: false, flagged: false };
    var flagged = isFlagged(e), k = key(e);
    if (!Array.isArray(rec.deleted)) rec.deleted = [];
    if (rec.deleted.indexOf(k) < 0) rec.deleted.push(k);
    if (flagged) rec.removed = merge(rec.removed, [record(e, now, addressed)], rec.removedClearedAt);
    rec.entries.splice(i, 1);
    return { ok: true, flagged: flagged };
  }

  /* Two copies of the kept records become one. The first time a question was deleted
     stands. Records from before a provider's "Clear ALL" stay cleared. */
  function merge(a, b, clearedAt) {
    var seen = {}, out = [], cut = clearedAt || 0;
    (a || []).concat(b || []).forEach(function (r) {
      if (!r || !r.deletedAt || r.deletedAt <= cut) return;
      var k = key(r);
      if (!seen[k]) { seen[k] = r; out.push(r); }
      else if (r.deletedAt < seen[k].deletedAt) seen[k].deletedAt = r.deletedAt;
    });
    out.sort(function (x, y) { return y.deletedAt - x.deletedAt; });
    return out;
  }

  /* A provider's "Clear ALL items" also clears the kept records, as its warning says. */
  function clearAll(rec, now) {
    rec.removed = [];
    rec.removedClearedAt = Math.max(now, rec.removedClearedAt || 0);
  }

  root.HeardDeleted = { TEXT: TEXT, key: key, isFlagged: isFlagged, record: record, remove: remove, merge: merge, clearAll: clearAll };
})(typeof globalThis !== "undefined" ? globalThis : this);
