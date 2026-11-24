/* Heard: the notice a person reads, and answers, before they use the patient side.

   Asked for by the physician owner on 23 November 2026: on the patient side, at
   sign-up, a screen that says what Heard is for and what it is not, with one button
   to go on and one to decline. Declining leaves the site without setting anything up.

   What this is. A notice of purpose, and a record that it was shown and which button
   was tapped. It is not terms of use, not a privacy notice, not a HIPAA authorisation,
   not informed consent, and not a release of any claim. It has no waiver wording, and
   its button says "I understand", not "I agree", on purpose: there are no terms here
   to agree to. Counsel decides what the real documents say.

   Where the wording came from. The physician owner rejected the first wording
   (version 2026-11-23.1, never merged) and on 23 November 2026 at 7:53 PM dictated what
   each line should say and the order of the screen: the standing statement in its red
   box first, four lines, the two buttons, and "Read this to me" at the very bottom.
   Two minutes later he allowed some licence in the wording, the intent to stay as he
   stated it. The first line is the exception: it is his own verbiage, given at 8:10 PM
   after he corrected a mis-transcription, and it was reworded because the earlier
   first line repeated the red box above. He first said "ensure answering of all your
   questions" and then, in the same minute, asked for "facilitate" in place of "ensure"
   if the legal seat objected to it. It had: the attorney seat of the role-played panel
   (an AI evaluator, not a lawyer) called "ensuring that they are answered" a promise
   of a result the care team controls. "Facilitate" claims help, not a result. The
   attorney seat has not been run on the new sentence. "Answering" stays as his word;
   it departs from his rule of 21 November 2026 that the care team "addresses" a
   question, and that is his to decide. Three changes were made to his dictated words
   in the other lines under the licence he gave:
     - "recommending you seek more immediate help" became "telling you to get help
       right away". Whether "Heard recommends" may be said at all is an open question
       for counsel (Q5).
     - "does not instigate or activate any direct care or communication" became "does
       not initiate any care or contact anyone for you". "Initiate" is the owner's
       word, chosen at 8:01 PM over "start", which he found too loose (version
       2026-11-23.3).
     - The last two lines name the nurse and the call light as well as the doctor's
       office and 911, so that they do not contradict the red box for a patient who
       is still in the hospital.
   The button labels, "I understand" and "Not now", and the absence of any release
   wording, follow the attorney seat of the role-played panel (an AI evaluator, not a
   lawyer). The wording is the owner's to change.

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

   "Read this to me" (owner agreed, 23 November 2026). A button on the notice has
   the device's own voice read it aloud, for a reader without their glasses or who
   reads little. It speaks the same lines that are on the screen, in the same order,
   then names the two buttons. It never taps a button for the reader. Only this
   fixed text is spoken; nothing a patient said or typed is ever read out. The page
   picks a voice stored on the device when there is one. Some browsers have only an
   online voice, and those send this fixed text to the browser's maker to be voiced.
   Where the browser has no voice at all, the button is not shown.

   Not built here, for the rebuild: a time from the server rather than the device,
   and a stored copy of the exact text shown.

   Loaded as a plain script in the browser (window.HeardAck) and imported by the
   Node tests (globalThis.HeardAck). */
(function (root) {
  "use strict";

  var VERSION = "2026-11-23.4";

  var TEXT = {
    title: "Before you start",
    lead: "Please read this. Then choose a button.",
    /* each line is one idea; the page shows them as a list */
    points: [
      "Heard is solely intended to record and facilitate answering of all your questions. These will not be seen or addressed until your next interaction with your care team. Heard does not send any real-time alerts or communication with your care team.",
      "Sometimes Heard shows a message telling you to get help right away. It does not catch every problem. No message does not mean you are okay.",
      "Heard is not a doctor or nurse. It cannot tell you what is wrong. When in doubt, ask your nurse or call your doctor's office.",
      "Heard does not initiate any care or contact anyone for you. Always take a strong concern to your nurse, your doctor's office or 911."
    ],
    /* the standing statement from redflags.js is shown above these lines, in its own red box */
    /* the read-aloud button, and what the voice says after the last line on the screen */
    readAloud: "Read this to me",
    stopReading: "Stop reading",
    spokenButtons: function () { return "There are two buttons. One says: " + TEXT.agree + ". The other says: " + TEXT.decline + "."; },
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
