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

  var VERSION = "2026-11-21.2";

  /* Review status at this version: chest, breathing, bleeding and clot were revised
     in the 21 November 2026 review. The groups from neuro onward are still the
     first draft. */

  /* One rule can hold several patterns. Any one of them matching is a match. */
  function any(list) {
    var parts = [];
    for (var i = 0; i < list.length; i++) parts.push(list[i].source);
    return new RegExp(parts.join("|"));
  }

  /* Pieces of the leg-swelling pattern in the clot rule. */
  var SWELL_PART = "(?:leg|legs|ankle|ankles|foot|feet)";
  var SWELL_WORD = "(?:swollen|swell\\w*)";
  /* "more" counts only next to the swelling word ("more swollen", "swelling more"),
     and "hard" does not count in "hard to", so "can I have more ice" and "hard to
     sleep" do not turn plain swelling into a match. */
  var SWELL_QUALIFIER = "\\b(?:worse|worsening|more (?:swollen|swelling)|(?:swollen|swelling|swells|swelled) more|sudden|suddenly|both|red|redder|redness|hot|hotter|hard(?! to)|harder(?! to)|tight|tighter|painful)\\b";

  /* Each rule: an id for the audit trail, and one pattern (see any() above). Text is lower-cased
     and curly apostrophes are straightened before matching. */
  var RULES = [
    /* ---- chest: reviewed 21 Nov 2026 ---- */
    { id: "chest", rx: any([
      /* "chest", then a symptom word */
      /\bchest\b.{0,30}\b(pain|pains|painful|hurt|hurts|hurting|pressure|tight|tightness|heavy|heaviness|sore|soreness|ache|aches|aching|discomfort|burning|sharp|stabbing|squeez\w*|crush\w*)\b/,
      /* a symptom word, then "chest", with any words between */
      /\b(pain|pains|painful|hurt|hurts|hurting|pressure|tight|tightness|heavy|heaviness|sore|soreness|ache|aches|aching|discomfort|burning|sharp|stabbing|squeez\w*|crush\w*)\b.{0,25}\bchest\b/,
      /* pain with breathing or coughing: "it hurts when I breathe", "pain when I take
         a deep breath"; "pain pill" and "pain medicine" do not count as pain here */
      /\b(hurt|hurts|hurting|pain|pains|painful)\b(?! (pill|pills|med|meds|medicine|medication|medications|killer|killers|reliever))\b.{0,12}\b(when|whenever|to|if|as|while|with|on|every time|each time)\b.{0,20}\b(breath\w*|cough\w*)/,
      /\bheart attack\b/
    ]) },

    /* ---- breathing: reviewed 21 Nov 2026 ---- */
    { id: "breathing", rx: any([
      /\b(can't|cant|cannot|can not|couldn't|hard to|trouble|difficulty|difficult to|struggling to|unable to)\b.{0,25}\bbreath\w*/,
      /\bbreathing\b.{0,20}\b(hard|harder|difficult|labored|laboured|fast|faster|worse)\b/,
      /\bshort(ness)? of breath\b/,
      /\bout of breath\b/,
      /\bcatch (my|his|her|their) breath\b/,
      /\bgasping\b/,
      /\bchoking\b/,
      /\b(not|stopped) breathing\b/,
      /\bwheez\w*/,
      /\bwinded\b/,
      /\bsuffocat\w*/,
      /* blue, purple or gray lips or face */
      /\b(lip|lips|face)\b.{0,20}\b(blue|bluish|purple|gray|grey)\b/,
      /\b(blue|bluish|purple|gray|grey)\b.{0,10}\b(lip|lips|face)\b/,
      /\bturn(s|ed|ing)? blue\b/
    ]) },

    /* ---- bleeding: reviewed 21 Nov 2026 ---- */
    { id: "bleeding", rx: any([
      /\bbleeding\b/,
      /\bbled\b/,
      /\bhemorrhag\w*/,
      /\bbleed\w*\b.{0,20}\b(through|a lot|won't stop|wont stop|everywhere)\b/,
      /\b(cough\w*|vomit\w*|throw\w* up|threw up|spit\w*)\b.{0,15}\bblood\b/,
      /\bblood\b.{0,20}\b(stool|urine|pee|poop|vomit|toilet)\b/,
      /* the same in the other order, but not "blood test", "blood thinner" and the like */
      /\b(stool|stools|urine|pee|poop|vomit)\b.{0,20}\bblood\b(?! (test|tests|work|draw|pressure|sugar|thinner|thinners|count|clot|clots))/,
      /\bbloody\b/,
      /* blood on, through or all over the dressing, sheets or incision */
      /\bblood\b.{0,15}\b(on|through|all over|under|around|from|in)\b.{0,12}\b(dressing|bandage|bandages|gauze|sheet|sheets|incision)\b/,
      /\bblood (is )?(everywhere|all over)\b/,
      /* "soaked" or "soaking", not "soak", so a question about soaking in a bath passes */
      /\b(soaked|soaking)\b.{0,25}\b(dressing|bandage|gauze|sheet|sheets)\b/
    ]) },

    /* ---- clot: reviewed 21 Nov 2026 ---- */
    { id: "clot", rx: any([
      /* calf and a symptom word, either order */
      /\b(calf|calves)\b.{0,30}\b(pain|pains|painful|hurt\w*|sore|swollen|swelling|swell\w*|cramp\w*|tender|red|hot|warm|hard|tight)\b/,
      /\b(pain|pains|painful|hurt\w*|sore|soreness|swollen|swelling|cramp\w*|tender|tenderness|tight|tightness)\b.{0,20}\b(calf|calves)\b/,
      /* pain in the back of the leg or the lower leg, either order */
      /\b(back of (my|his|her|their|the) (lower )?legs?|lower legs?)\b.{0,25}\b(pain|pains|painful|hurt\w*|sore|ache|aches|aching|cramp\w*|tender)\b/,
      /\b(pain|pains|painful|hurt\w*|sore|soreness|ache|aching|cramp\w*|tender|tenderness)\b.{0,20}\b(back of (my|his|her|their|the) (lower )?legs?|lower legs?)\b/,
      /* Leg, ankle or foot swelling fires only with a qualifier nearby (SWELL_QUALIFIER
         below). Every replaced joint swells, so "my leg is swollen" alone does not fire. */
      new RegExp(SWELL_QUALIFIER + ".{0,40}(?:\\b" + SWELL_PART + "\\b.{0,25}\\b" + SWELL_WORD + "\\b|\\b" + SWELL_WORD + "\\b.{0,25}\\b" + SWELL_PART + "\\b)"),
      new RegExp("\\b" + SWELL_PART + "\\b(?=.{0,60}" + SWELL_QUALIFIER + ").{0,25}\\b" + SWELL_WORD + "\\b"),
      new RegExp("\\b" + SWELL_WORD + "\\b(?=.{0,60}" + SWELL_QUALIFIER + ").{0,25}\\b" + SWELL_PART + "\\b"),
      /* a clot that is stated; "what is a blood clot" passes */
      /\b(have|having|got|feels like|might be|think it's|think its)\b.{0,15}\b(blood )?clot\b/,
      /\bis (this|that|it|there|my)\b.{0,25}\b(blood )?clot\b/,
      /\b(this|that|it|there) is\b.{0,15}\b(blood )?clot\b/
    ]) },

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
