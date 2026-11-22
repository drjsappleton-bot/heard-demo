/* Heard red-flag safety check.

   What this is: a fixed list of phrases. When something a patient or caregiver
   captures matches one, the page shows one fixed safety message telling them to
   contact their nurse (in the hospital) or call 911 (at home).

   What this is not: triage. It does not name a condition, score urgency, give a
   recommendation specific to the patient, or notify anyone. The message is the
   same every time. Keep it that way; changing any of those is a regulatory
   question, not a code change.

   Rules for editing this list:
   - It is clinical content. The physician who owns the product reviews every change.
   - It is deliberately plain pattern matching, not AI, so the same words always
     produce the same result and the list can be read and audited.
   - It errs toward showing the message. It does not try to understand "no chest
     pain"; that still shows the message.
   - It only catches symptoms that are stated. It cannot catch a worry that is
     phrased as a question ("is my blood thinner working?"), a mis-heard word, or
     anything not on the list. No message never means "this is fine". The page
     carries a standing safety line for that reason.

   Loaded as a plain script in the browser (window.HeardRedFlags) and imported by
   the Node tests (globalThis.HeardRedFlags). */
(function (root) {
  "use strict";

  var VERSION = "2026-11-21.1";

  /* Each rule: an id for the audit trail, and one pattern. Text is lower-cased
     and curly apostrophes are straightened before matching. */
  var RULES = [
    { id: "chest",
      rx: /\bchest\b.{0,30}\b(pain|pains|hurt|hurts|hurting|pressure|tight|tightness|heavy|heaviness|squeez\w*|crush\w*)\b|\b(pain|pains|pressure|tightness|heaviness)\b.{0,15}\b(in|on)\b.{0,10}\bchest\b|\bheart attack\b/ },

    { id: "breathing",
      rx: /\b(can't|cant|cannot|can not|couldn't|hard to|trouble|difficulty|difficult to|struggling to|unable to)\b.{0,12}\bbreath\w*|\bshort(ness)? of breath\b|\bout of breath\b|\bcatch (my|his|her|their) breath\b|\bgasping\b|\bchoking\b|\b(not|stopped) breathing\b/ },

    { id: "bleeding",
      rx: /\bbleeding\b|\bbled\b|\bhemorrhag\w*|\bbleed\w*\b.{0,20}\b(through|a lot|won't stop|wont stop|everywhere)\b|\b(cough\w*|vomit\w*|throw\w* up|threw up|spit\w*)\b.{0,15}\bblood\b|\bblood\b.{0,20}\b(stool|urine|pee|poop|vomit|toilet)\b|\bsoak\w*\b.{0,25}\b(dressing|bandage|gauze|sheet|sheets)\b/ },

    { id: "clot",
      rx: /\b(calf|calves)\b.{0,30}\b(pain|pains|hurt\w*|sore|swollen|swelling|swell\w*|cramp\w*|tender|red|hot|warm|hard)\b|\b(pain|swelling|cramp\w*)\b.{0,15}\b(in|on)\b.{0,10}\b(calf|calves)\b|\b(have|having|got|is|feels like|might be|think it's|think its)\b.{0,15}\b(blood )?clot\b/ },

    { id: "neuro",
      rx: /\bslurr\w*|\bface\b.{0,15}\bdroop\w*|\bdroop\w*\b.{0,15}\bface\b|\b(can't|cant|cannot) (feel|move)\b.{0,20}\b(arm|arms|leg|legs|foot|feet|toes|hand|hands|fingers|side)\b|\bnumb\w*|\bworst headache\b|\bconfus(ed|ion)\b(?!\s+(about|by|on|as to|why|what|when|which|how|with))|\bdisoriented\b|\bseizure\w*|\bconvuls\w*|\bstroke\b|\b(lost|losing|loss of)\b.{0,10}\b(vision|sight)\b|\bparaly\w*/ },

    { id: "faint",
      rx: /\bpass(ed|ing)? out\b|\bfaint\w*|\bblack(ed|ing)? out\b|\bcollaps\w*|\bunresponsive\b|\bunconscious\b|\b(won't|wont|can't|cant|cannot)\b.{0,10}\bwake\b/ },

    { id: "fall",
      rx: /\b(fell|fallen)\b(?!\s+(asleep|behind|in love|short|through|apart))/ },

    { id: "wound",
      rx: /\b(wound|incision|stitches|staples|sutures)\b.{0,30}\b(open\w*|split\w*|gap\w*|burst\w*|came apart|coming apart|pus|ooz\w*)\b|\bpus\b|\bdislocat\w*|\bpopped out\b/ },

    { id: "allergic",
      rx: /\b(throat|tongue|lips|face)\b.{0,20}\b(swell\w*|swollen|clos\w*|tight\w*)\b|\ballergic reaction\b|\banaphyla\w*/ },

    { id: "overdose",
      rx: /\boverdos\w*|\btook too (many|much)\b|\btoo many pills\b/ },

    { id: "severe_pain",
      rx: /\bunbearable\b|\bexcruciating\b|\bworst pain\b|\bpain\b.{0,15}\b(10|ten) out of (10|ten)\b|\b(can't|cant|cannot) (stand|take) (the|this) pain\b/ },

    { id: "self_harm",
      rx: /\bsuicid\w*|\bkill myself\b|\bend my life\b|\b(hurt|harm) myself\b|\b(don't|dont|do not) want to (live|be here|go on)\b|\bwant to die\b|\bbetter off dead\b/ }
  ];

  function normalize(text) {
    return String(text == null ? "" : text)
      .toLowerCase()
      .replace(/[‘’ʼ]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Returns { hit, ids, version }. ids lists every rule that matched, for the
     audit trail. It is never shown to the patient. */
  function check(text) {
    var t = normalize(text);
    var ids = [];
    if (t) {
      for (var i = 0; i < RULES.length; i++) {
        if (RULES[i].rx.test(t)) ids.push(RULES[i].id);
      }
    }
    return { hit: ids.length > 0, ids: ids, version: VERSION };
  }

  /* The one fixed message. No condition is named and nothing is tailored to the
     patient, apart from the crisis-line sentence for the self_harm rule. */
  var MESSAGE = {
    title: "This may need help right now",
    notMonitored: "Heard is not monitored. No one is reading this right now.",
    hospitalLabel: "In the hospital",
    hospitalAction: "Contact your nurse immediately. Press your call button.",
    homeLabel: "At home",
    homeAction: "Call 911.",
    homeNote: "If you are sure it is not an emergency, call your surgeon's office now. Do not wait for a reply here.",
    crisis: "If you are thinking about harming yourself, call or text 988.",
    saved: "Your words were saved for your care team to see at their next visit.",
    button: "I understand",
    standing: "Heard is not monitored. Need help now? In the hospital, press your call button. At home, call 911."
  };

  var api = { VERSION: VERSION, RULES: RULES, MESSAGE: MESSAGE, check: check, normalize: normalize };
  root.HeardRedFlags = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
