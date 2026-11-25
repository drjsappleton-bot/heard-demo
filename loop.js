/* Heard: the loop on one question. Open, then addressed by the care team, then
   closed once the patient ticks "I was heard".

   The rule this file serves (demo recommendation 4, agreed by the physician owner
   on 22 November 2026): "I was heard" is locked until the care team has marked the
   question addressed, and its meaning is written on the screen, not in a tooltip.

   What counts as a tick. A tick counts only if it was made after the team marked
   the question addressed. A tick made earlier, including one saved before this
   rule existed, does not count. That is what makes the lock hold when two devices
   merge their copies: an old tick sitting in a phone's cache cannot close a
   question the moment the team addresses it.

   Clocks. The patient's phone and the provider's device each stamp their own
   time. To keep a slow clock from undoing a tap, every stamp is placed at least
   one millisecond after the event it answers (see after()).

   A tick is final (physician owner, 24 November 2026). Once the patient has ticked
   "I was heard" after the team's mark, the tick cannot be removed, "Not heard" no
   longer applies to that question, and a "Not heard" tapped on another device that
   had not yet seen the tick does not undo it. The patient asks a new question
   instead. A caregiver never ticks: the page tells them to ask a new question.

   Wording follows the physician's rule of 21 November 2026: "addressed", never
   "answered", "read" or "replied". The names "I was heard" and "Not heard" are
   kept because both films say them in the recorded narration.

   Loaded as a plain script in the browser (window.HeardLoop) and imported by the
   Node tests (globalThis.HeardLoop). */
(function (root) {
  "use strict";

  var TEXT = {
    /* shown once, above the patient's list */
    key: "When your care team has addressed a question with you, it is marked “Heard by your care team”. Then it is your turn: tick “I was heard” if you agree, or tap “Not heard” to send it back to your open list.",
    /* under a question the team has not addressed yet */
    locked: "You can tick this after your care team has addressed it with you.",
    /* under a question the team has marked addressed */
    ready: "Your care team marked this addressed. Tick “I was heard” if you agree. If not, tap “Not heard” and it goes back on your open list. A tick cannot be removed.",
    /* under the closed list, and the reason given when a tick is refused */
    tickFinal: "A tick cannot be removed. If you still have a question, ask it as a new question.",
    /* on the caregiver's page */
    caregiverOnly: function (first) { return "Only " + first + " can tick “I was heard” or “Not heard”. If you disagree with how a question was addressed, ask a new question."; },
    waiting: "Waiting for your care team",
    addressed: "Heard by your care team",
    heardLabel: "I was heard",
    notHeardLabel: "Not heard",
    closedNote: "Your care team addressed these, and you confirmed you were heard.",
    closedNoteCaregiver: function (first) { return "The care team addressed these, and " + first + " confirmed."; },
    allClosed: "Everything so far has been addressed and closed."
  };

  /* A time stamp that is never earlier than the event it answers. */
  function after(now, t) { return Math.max(now || 0, (t || 0) + 1); }

  /* The team's mark stands unless the patient sent the question back later. */
  function isAddressed(e) {
    return !!(e && e.addressed && !((e.bouncedAt || 0) > (e.addressedAt || 0)));
  }
  /* The lock: the patient may tick only a question the team has marked addressed. */
  function canMarkHeard(e) { return isAddressed(e); }
  /* The patient's tick counts only if it was made after the team's mark. */
  function confirmed(e) {
    return !!(isAddressed(e) && e.heard && e.heardAt && e.heardAt >= (e.addressedAt || 0));
  }
  /* A question is closed when the team addressed it and the patient confirmed. */
  function isClosed(e) { return confirmed(e); }

  /* The patient ticks. Returns false, and changes nothing, when the question is
     locked, when it is already ticked, or when asked to remove a tick: a tick is final. */
  function markHeard(e, v, now) {
    if (!canMarkHeard(e)) return false;
    if (!v || confirmed(e)) return false;
    e.heard = true;
    e.heardAt = after(now, e.addressedAt);
    return true;
  }
  /* The patient taps "Not heard". The question goes back to the open list.
     Not after a tick: a ticked question is closed for good. */
  function bounce(e, now) {
    if (!isAddressed(e) || confirmed(e)) return false;
    e.bouncedAt = after(now, Math.max(e.addressedAt || 0, e.heardAt || 0));
    e.addressed = false;
    e.heard = false;
    return true;
  }
  /* The care team marks the question addressed. A tick made before this mark stops
     counting. A question the patient has already closed stays as it is. */
  function address(e, now, who) {
    if (!e || confirmed(e)) return false;
    e.addressed = true;
    e.addressedAt = after(now, Math.max(e.bouncedAt || 0, e.heardAt || 0));
    e.heard = false;
    if (who) e.addressedBy = who;
    return true;
  }

  /* Folds another copy's tick into this one. The later tap wins. A copy with no
     time on its tick (saved before this rule) never overrides one that has. */
  function mergeHeard(t, e) {
    var ta = t.heardAt || 0, ea = e.heardAt || 0;
    if (ea > ta) { t.heard = !!e.heard; t.heardAt = ea; }
    else if (ea === ta && e.heard) t.heard = true;
  }
  /* Run on every entry after a merge, so the saved flags agree with the rules. */
  function settle(e) {
    if (!e) return e;
    /* A tick is final. If one copy holds a tick made after the team's mark and another
       copy holds a "Not heard" against that same mark, the tick stands. */
    if (e.heard && e.heardAt && e.addressedAt && e.heardAt >= e.addressedAt && (e.bouncedAt || 0) > e.addressedAt) {
      e.bouncedAt = e.addressedAt; e.addressed = true;
    }
    if ((e.bouncedAt || 0) > (e.addressedAt || 0)) e.addressed = false;
    e.heard = confirmed(e);
    return e;
  }

  root.HeardLoop = { TEXT: TEXT, after: after, isAddressed: isAddressed, canMarkHeard: canMarkHeard, confirmed: confirmed,
    isClosed: isClosed, markHeard: markHeard, bounce: bounce, address: address, mergeHeard: mergeHeard, settle: settle };
})(typeof globalThis !== "undefined" ? globalThis : this);
