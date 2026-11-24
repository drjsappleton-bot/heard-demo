/* Heard: the notice a person reads, and answers, before they use the patient side.

   Asked for by the physician owner on 23 November 2026: on the patient side, at
   sign-up, a screen that says what Heard is for and what it is not, with one button
   to go on and one to decline. Declining leaves the site without setting anything up.

   What this is. A notice of purpose, and a record that it was shown and which button
   was tapped. It is not terms of use, not a privacy notice, not a HIPAA authorisation,
   not informed consent, and not a release of any claim. It has no waiver wording, and
   its button says "I understand", not "I agree", on purpose: there are no terms here
   to agree to. Counsel decides what the real documents say.

   Where the wording came from. The owner dictated what the notice should cover. The
   lines below follow the recommendations of the attorney seat of the role-played panel
   (23 November 2026), which is an AI evaluator and not a lawyer. Three of the owner's
   phrases were changed on that advice: "ensuring that they are answered" (a promise
   Heard cannot keep, and "answered" breaks the owner's own rule), "may alert" (no one
   is alerted), and "not medical advice" (the safety messages do tell a person to call
   911, so the notice says instead that Heard is not a doctor or nurse). The wording
   is the owner's to change.

   Who sees it. A new patient before their page is created. A patient whose page has
   no record for the current wording. A caregiver before they join, and a caregiver
   who comes back after the wording changed. Each person answers for themselves: a
   caregiver's tap is recorded under the caregiver's name and says nothing about the
   patient.

   What is recorded, on the patient's record: the version of the wording, the time on
   that device's clock, and who tapped (patient, or caregiver by the name they typed).
   That shows the screen was displayed on a device and a button was tapped. It does
   not show who held the device, that they read it, or that they understood it.
   A decline records nothing.

   Wording. Change TEXT and VERSION together. A new VERSION shows the notice again
   to everyone. The standing statement is not copied here: the page takes it from
   redflags.js, so the two cannot drift apart. Vocabulary follows the owner's rules:
   the care team "addresses" a question; nothing promises a listener, a reply or an
   answer; Heard "shows a message", it does not alert anyone.

   Not built here, for the rebuild: a time from the server rather than the device,
   a stored copy of the exact text shown, and a spoken version of the notice.

   Loaded as a plain script in the browser (window.HeardAck) and imported by the
   Node tests (globalThis.HeardAck). */
(function (root) {
  "use strict";

  var VERSION = "2026-11-23.1";

  var TEXT = {
    title: "Before you start",
    lead: "Please read this. Then choose a button.",
    /* each line is one idea; the page shows them as a list */
    points: [
      "Record your questions here. Your care team can address them at their next visit or call.",
      "No one is watching Heard. It does not tell anyone you need help.",
      "Heard is not a doctor or nurse. It cannot tell you what is wrong.",
      "Sometimes Heard shows a message telling you to get help. It does not catch every problem. No message does not mean you are okay.",
      "You do not need Heard to get care."
    ],
    /* the standing statement from redflags.js is shown here, in its own box */
    agree: "I understand",
    decline: "Not now",
    under: "Tap \u201cNot now\u201d and nothing is saved. Your care is the same either way.",
    caregiverLead: function (first) { return "You are helping " + first + ". This is for you to read. Then choose a button."; },
    caregiverUnder: function (first) { return "Tap \u201cNot now\u201d and nothing is saved. Care for " + first + " is the same either way."; },
    declined: {
      title: "Heard is not set up",
      body: "Nothing was saved. Your care does not change. You can still ask your questions. Tell your nurse or doctor, or write them down for your next visit. You can come back any time.",
      /* a page that already holds questions: they are still there */
      bodyExisting: "Nothing new was saved. Your care does not change. You can still ask your questions. Tell your nurse or doctor, or write them down for your next visit. You can come back any time.",
      again: "Read it again",
      home: "Back to the start"
    },
    unavailable: "Heard could not load the notice it must show first. Check your connection and reload the page.",
    /* provider side only. The line says what was recorded and no more. */
    providerNone: "Notice of purpose: no tap on record.",
    providerOld: "Notice of purpose: a tap on record for an earlier wording only.",
    providerStart: "Notice of purpose (wording ",
    providerShown: "shown, and \u201cI understand\u201d tapped, ",
    providerPatient: "on the patient\u2019s page",
    providerCaregiver: "by a person giving the name ",
    providerNote: "This records a tap on a device. It does not show who tapped, or that the notice was read or understood."
  };

  function norm(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }
  /* who is answering: the patient, or a caregiver under the name they typed */
  function who(by, name) { return by === "caregiver" ? { by: "caregiver", name: String(name || "").trim() } : { by: "patient", name: "" }; }
  function same(a, w) { return !!a && a.by === w.by && (w.by !== "caregiver" || norm(a.name) === norm(w.name)); }
  function list(rec) { return rec && Array.isArray(rec.acks) ? rec.acks : []; }

  /* The record of this person for this wording, or null. */
  function find(rec, w, ver) {
    var v = ver || VERSION, a = list(rec);
    for (var i = 0; i < a.length; i++) if (a[i] && a[i].ver === v && same(a[i], w)) return a[i];
    return null;
  }
  /* Must the notice be shown to this person before they go on? */
  function needed(rec, w) { return !find(rec, w, VERSION); }

  /* Records the tap. Does nothing if this person already has one for this wording. */
  function record(rec, w, now) {
    if (!rec) return null;
    if (!Array.isArray(rec.acks)) rec.acks = [];
    var have = find(rec, w, VERSION);
    if (have) return have;
    var e = { ver: VERSION, at: now || 0, by: w.by };
    if (w.by === "caregiver") e.name = w.name;
    rec.acks.push(e);
    return e;
  }

  /* Two devices' copies of one record. Nothing is ever dropped; the earlier time wins. */
  function merge(a, b) {
    var seen = {}, out = [];
    (Array.isArray(a) ? a : []).concat(Array.isArray(b) ? b : []).forEach(function (e) {
      if (!e || !e.ver || !e.by) return;
      var k = e.ver + "|" + e.by + "|" + (e.by === "caregiver" ? norm(e.name) : "");
      if (!seen[k]) { seen[k] = { ver: e.ver, at: e.at || 0, by: e.by }; if (e.by === "caregiver") seen[k].name = e.name; out.push(seen[k]); }
      else if ((e.at || 0) && (!seen[k].at || e.at < seen[k].at)) seen[k].at = e.at;
    });
    out.sort(function (x, y) { return (x.at || 0) - (y.at || 0); });
    return out;
  }

  /* One line for the provider's view of a patient. fmt turns a time into words. */
  function providerLine(rec, fmt) {
    var f = fmt || function (t) { return new Date(t).toLocaleString(); };
    var a = list(rec), cur = a.filter(function (e) { return e && e.ver === VERSION; });
    if (!cur.length) return a.length ? TEXT.providerOld : TEXT.providerNone;
    var parts = cur.map(function (e) { return (e.by === "caregiver" ? TEXT.providerCaregiver + e.name : TEXT.providerPatient) + ", " + f(e.at); });
    return TEXT.providerStart + VERSION + "): " + TEXT.providerShown + parts.join("; ") + ". " + TEXT.providerNote;
  }

  root.HeardAck = { VERSION: VERSION, TEXT: TEXT, who: who, find: find, needed: needed, record: record, merge: merge, providerLine: providerLine };
})(typeof globalThis !== "undefined" ? globalThis : this);
