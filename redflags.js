/* Heard red-flag safety check.

   What this is: a fixed list of phrases, each in one of two tiers. When something a
   patient or caregiver captures matches the list, the page shows one of two fixed
   messages.
   - red:   in the hospital, contact your nurse immediately; at home, call 911.
   - amber: in the hospital, tell your nurse now; at home, call your surgeon's
            office now. It always carries a line on what to do if it is severe or
            getting worse.
   If an entry matches both tiers, the red message is shown.

   What this is not: triage of the patient. It does not name a condition, give a
   recommendation specific to the patient, or notify anyone. Which message appears
   depends only on which listed phrase was matched. The two-message design was a
   deliberate decision by the product's physician on 21 November 2026; it replaced
   the single message. The tier of a phrase, the wording of either message, and any
   move toward naming a condition or notifying someone are regulatory questions, not
   code changes.

   Rules for editing this list:
   - It is clinical content. The physician who owns the product reviews every change.
   - It is deliberately plain pattern matching, not AI, so the same words always
     produce the same result and the list can be read and audited.
   - It errs toward showing a message. It does not try to understand "no chest
     pain"; that still shows the message.
   - It only catches symptoms that are stated. It cannot catch a worry that is
     phrased as a question ("is my blood thinner working?"), a mis-heard word, or
     anything not on the list. No message never means "this is fine". The page
     carries a standing safety line for that reason.

   Loaded as a plain script in the browser (window.HeardRedFlags) and imported by
   the Node tests (globalThis.HeardRedFlags). */
(function (root) {
  "use strict";

  var VERSION = "2026-11-21.4";

  /* Review status at this version (21 November 2026 review):
     - revised and tiered: chest, breathing, bleeding, bleeding_other, black_stool,
       clot, heart, faint, dizzy, bp_drop, fall, near_fall, wound, dislocation, fever
     - still the first draft: neuro, allergic, overdose, severe_pain, self_harm */

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

  /* Things that "fell" without a person falling: bedside objects, wound closures,
     and readings. "My pillow fell" shows nothing. "My blood pressure fell" is the
     amber bp_drop rule. */
  var FELL_NOT_A_PERSON = "pillow|pillows|phone|blanket|blankets|remote|glasses|book|cup|tray|pen|tablet|ipad|charger|cane|walker|crutch|crutches|it|staple|staples|stitch|stitches|suture|sutures|pressure|bp|sugar|level|levels|count|numbers";

  /* Words for the surgical wound. */
  var W = "(?:wound|incision|stitch|stitches|staple|staples|suture|sutures|surgical site)";

  /* Each rule: an id for the audit trail, a tier ("red" or "amber"), and one pattern
     (see any() above). Text is lower-cased and curly apostrophes are straightened
     before matching. */
  var RULES = [
    /* ---- chest: reviewed 21 Nov 2026 ---- */
    { id: "chest", tier: "red", rx: any([
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
    { id: "breathing", tier: "red", rx: any([
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

    /* ---- bleeding (red): heavy or internal bleeding. Reviewed 21 Nov 2026 ---- */
    { id: "bleeding", tier: "red", rx: any([
      /\bhemorrhag\w*/,
      /* bleeding that is heavy or will not stop */
      /\bbleed\w*\b.{0,20}\b(a lot|won't stop|wont stop|will not stop|everywhere|heavily|badly)\b/,
      /\b(won't|wont|will not|can't|cant|cannot|not)\b.{0,10}\bstop\w*\b.{0,10}\bbleed\w*/,
      /\b(heavy|heavily|a lot of|lots of|so much|too much)\b.{0,10}\b(bleeding|blood)\b/,
      /\b(gush\w*|pour\w*|spurt\w*|squirt\w*)\b.{0,15}\bblood\b/,
      /\bblood\b.{0,15}\b(gush\w*|pour\w*|spurt\w*|squirt\w*)\b/,
      /\bblood (is )?(everywhere|all over)\b/,
      /* coughing or vomiting blood */
      /\b(cough\w*|vomit\w*|throw\w* up|threw up|spit\w*)\b.{0,15}\bblood\b/,
      /* blood in the stool, urine or vomit, either order; not "blood test" and the like */
      /\bblood\b.{0,20}\b(stool|urine|pee|poop|vomit|toilet)\b/,
      /\b(stool|stools|urine|pee|poop|vomit)\b.{0,20}\bblood\b(?! (test|tests|work|draw|pressure|sugar|thinner|thinners|count|clot|clots))/,
      /\bbloody (stool|stools|urine|pee|poop|vomit|diarrhea)\b/
    ]) },

    /* ---- bleeding_other (amber): any other bleeding, a dressing that is soaked or
       leaking, nosebleed. Reviewed 21 Nov 2026 ---- */
    { id: "bleeding_other", tier: "amber", rx: any([
      /\bbleeding\b/,
      /\bbled\b/,
      /\bbleed\w*\b.{0,20}\bthrough\b/,
      /\bbloody\b/,
      /* blood on, through or under the dressing, sheets or incision */
      /\bblood\b.{0,15}\b(on|through|all over|under|around|from|in)\b.{0,12}\b(dressing|bandage|bandages|gauze|sheet|sheets|incision)\b/,
      /* a dressing that is soaked, leaking or not holding, in either word order.
         "soaked" or "soaking", not "soak", so a question about soaking in a bath passes */
      /\b(soaked|soaking)\b.{0,25}\b(dressing|bandage|bandages|gauze|sheet|sheets)\b/,
      /\b(dressing|bandage|bandages|gauze)\b.{0,25}\b(soaked|soaking|saturated|drenched|dripping|leak\w*|coming through|not holding|won't hold|wont hold|isn't holding|isnt holding)\b/,
      /\b(leak\w*|seep\w*|drain\w*|dripping|coming)\b.{0,6}\b(through|out of|from|under|around|past)\b.{0,12}\b(dressing|bandage|bandages|gauze)\b/,
      /* nosebleed */
      /\bnose ?bleeds?\b/
    ]) },

    /* ---- black_stool (amber): black or tarry stool, either order. With dizzy or
       lightheaded in the same entry it becomes red (see COMBOS). Reviewed 21 Nov 2026 ---- */
    { id: "black_stool", tier: "amber", rx: any([
      /\b(black|tarry)\b.{0,15}\b(stool|stools|poop|bowel movement|bowel movements)\b/,
      /\b(stool|stools|poop|bowel movement|bowel movements)\b.{0,20}\b(black|tarry)\b/
    ]) },

    /* ---- clot: reviewed 21 Nov 2026 ---- */
    { id: "clot", tier: "red", rx: any([
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

    /* ---- heart (amber): racing, pounding, palpitations. Reviewed 21 Nov 2026 ---- */
    { id: "heart", tier: "amber", rx: any([
      /\bheart\b.{0,20}\b(racing|races|raced|pounding|pounds|pounded|fluttering|flutters|beating (so |very |really |too )?(fast|hard))\b/,
      /\bpalpitation\w*/
    ]) },

    { id: "neuro", tier: "red",
      rx: /\bslurr\w*|\bface\b.{0,15}\bdroop\w*|\bdroop\w*\b.{0,15}\bface\b|\b(can't|cant|cannot) (feel|move)\b.{0,20}\b(arm|arms|leg|legs|foot|feet|toes|hand|hands|fingers|side)\b|\bnumb\w*|\bworst headache\b|\bconfus(ed|ion)\b(?!\s+(about|by|on|as to|why|what|when|which|how|with))|\bdisoriented\b|\bseizure\w*|\bconvuls\w*|\bstroke\b|\b(lost|losing|loss of)\b.{0,10}\b(vision|sight)\b|\bparaly\w*/ },

    /* ---- faint (red). Reviewed 21 Nov 2026 ---- */
    { id: "faint", tier: "red", rx: any([
      /\bpass(ed|ing)? out\b/,
      /\bfaint\w*/,
      /\bblack(ed|ing)? out\b/,
      /\bcollaps\w*/,
      /\bunresponsive\b/,
      /\bunconscious\b/,
      /\b(won't|wont|can't|cant|cannot)\b.{0,10}\bwake\b/,
      /\bhard to (wake|rouse|arouse)\b/,
      /\bnot waking\b/,
      /* a person who is not responding. The word before must not be nurse, doctor,
         staff, office, button, light, pain, it, they, I, we or you, so "the nurse is
         not responding" and "I'm not responding to the medicine" pass */
      /(?:^|\s)(?!nurse\s|nurses\s|doctor\s|doctors\s|dr\s|staff\s|office\s|button\s|light\s|pain\s|it\s|they\s|i\s|i'm\s|im\s|we\s|you\s|is\s|was\s|are\s|has\s)\S+\s(?:is |was |are |has )?(?:not|isn't|isnt|won't|wont|doesn't|doesnt|wasn't|wasnt|stopped)\s(?:been )?respond\w*/
    ]) },

    /* ---- dizzy (amber): dizzy, lightheaded. Reviewed 21 Nov 2026 ---- */
    { id: "dizzy", tier: "amber", rx: any([
      /\bdizz\w*/,
      /\blight[ -]?headed\w*/
    ]) },

    /* ---- bp_drop (amber): blood pressure fell or dropped. Reviewed 21 Nov 2026 ---- */
    { id: "bp_drop", tier: "amber", rx: any([
      /\b(pressure|bp)\b.{0,10}\b(fell|dropped)\b/
    ]) },

    /* ---- fall (red): a fall that happened. Reviewed 21 Nov 2026 ---- */
    { id: "fall", tier: "red", rx: any([
      /* "fell" or "fallen", unless the word before is almost, nearly, or one of the
         FELL_NOT_A_PERSON words, and not "fell asleep" and the like */
      new RegExp("(?:^|(?:^|\\s)(?!(?:almost|nearly|" + FELL_NOT_A_PERSON + ")\\s)\\S+\\s)(fell|fallen)\\b(?!\\s+(asleep|behind|in love|short|through|apart))"),
      /* "had a fall", "took a bad fall"; not "have a fall risk bracelet" */
      /\b(had|took|taken|have|having)\b.{0,12}\bfall\b(?! (risk|precaution|precautions|alarm|prevention))/,
      /\bkeep\w* falling\b/,
      /\bfalling down\b/,
      /* a person slipping or tripping, not "the dressing slipped" or "tripped the alarm" */
      /\b(i|he|she|we|mom|mother|dad|father|husband|wife)(?: just| have| has| had)? (slipped|tripped)\b(?! (the|a|an|me|him|her|it|my)\b)/
    ]) },

    /* ---- near_fall (amber): almost fell. Reviewed 21 Nov 2026 ---- */
    { id: "near_fall", tier: "amber", rx: any([
      /\b(almost|nearly)\b.{0,6}\b(fell|fall|fallen|slipped|tripped)\b/
    ]) },

    /* ---- wound (amber). The amber message adds the wound line when this rule
       matches. Reviewed 21 Nov 2026 ---- */
    { id: "wound", tier: "amber", rx: any([
      /* opening up; "open to air" passes */
      new RegExp("\\b" + W + "\\b.{0,30}\\b(open(?! to (the )?air)\\w*|split\\w*|gap\\w*|burst\\w*|came apart|coming apart|pus|ooz\\w*)\\b"),
      /\bpus\b/,
      /\boozing\b/,
      /* drainage or leaking, either order. "drain" alone is the surgical drain and passes */
      new RegExp("\\b" + W + "\\b.{0,30}\\b(drainage|draining|drained|leak\\w*|ooz\\w*|weep\\w*|seep\\w*)\\b"),
      new RegExp("\\b(drainage|draining|leak\\w*|ooz\\w*|weep\\w*|seep\\w*)\\b.{0,25}\\b" + W + "\\b"),
      /* discharge from the wound, not discharge from the hospital */
      new RegExp("\\b(yellow|green|bloody|cloudy|thick|smelly|foul)\\b.{0,10}\\b(discharge|drainage|fluid)\\b"),
      new RegExp("\\bdischarge\\b.{0,6}\\b(from|coming|out of)\\b.{0,15}\\b" + W + "\\b"),
      /* infected, or a stated infection; "how do I prevent infection" passes */
      /\binfected\b/,
      /\b(have|has|having|got|getting|looks like|look like|think it's|think its|might be|could be|is it|is this)\b.{0,15}\binfection\b/,
      /* heat, spreading redness, streaks, getting worse; plain "a little red" passes */
      new RegExp("\\b" + W + "\\b.{0,30}\\b(hot|warm|spreading|streak\\w*|redder|more red|red and swollen|swollen and red|worse)\\b"),
      /\bred streak\w*/,
      /\b(red|redness)\b.{0,15}\bspreading\b/,
      /\bspreading\b.{0,10}\b(red|redness)\b/,
      /* smell */
      new RegExp("\\b" + W + "\\b.{0,30}\\b(smell\\w*|odor|stink\\w*|foul)\\b"),
      new RegExp("\\b(smell\\w*|odor|foul)\\b.{0,25}\\b" + W + "\\b"),
      /* a staple or stitch that came out or broke; "when do the staples come out" passes */
      new RegExp("\\b" + W + "\\b.{0,20}\\b(came out|coming out|fell out|popped out|popped|broke|broken|came loose)\\b")
    ]) },

    /* ---- dislocation (amber): a stated dislocation; "dislocation precautions"
       passes. Reviewed 21 Nov 2026 ---- */
    { id: "dislocation", tier: "amber", rx: any([
      /\bdislocated\b/,
      /\b(hip|knee|shoulder|joint|leg)\b.{0,20}\b(popped out|out of (the |its )?(socket|joint|place)|came out|slipped out)\b/,
      /\b(have|had|is|it's|its|think|feels like)\b.{0,15}\bdislocation\b(?! precaution)/
    ]) },

    /* ---- fever (amber): fever, chills. Reviewed 21 Nov 2026 ---- */
    { id: "fever", tier: "amber", rx: any([
      /\bfever\w*/,
      /\bchills\b/,
      /\b(temp|temperature)\b.{0,12}\b10[0-9](\.\d)?\b/
    ]) },

    { id: "allergic", tier: "red",
      rx: /\b(throat|tongue|lips|face)\b.{0,20}\b(swell\w*|swollen|clos\w*|tight\w*)\b|\ballergic reaction\b|\banaphyla\w*/ },

    { id: "overdose", tier: "red",
      rx: /\boverdos\w*|\btook too (many|much)\b|\btoo many pills\b/ },

    { id: "severe_pain", tier: "red",
      rx: /\bunbearable\b|\bexcruciating\b|\bworst pain\b|\bpain\b.{0,15}\b(10|ten) out of (10|ten)\b|\b(can't|cant|cannot) (stand|take) (the|this) pain\b/ },

    { id: "self_harm", tier: "red",
      rx: /\bsuicid\w*|\bkill myself\b|\bend my life\b|\b(hurt|harm) myself\b|\b(don't|dont|do not) want to (live|be here|go on)\b|\bwant to die\b|\bbetter off dead\b/ }
  ];

  /* Two amber rules that together are red. Each combo has its own id for the audit
     trail. Decided 21 Nov 2026: black stool with dizzy or lightheaded. */
  var COMBOS = [
    { id: "black_stool_with_dizzy", all: ["black_stool", "dizzy"], tier: "red" }
  ];

  function normalize(text) {
    return String(text == null ? "" : text)
      .toLowerCase()
      .replace(/[‘’ʼ]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Returns { hit, ids, tier, version }. ids lists every rule that matched, for the
     audit trail. It is never shown to the patient. tier is "red" if any red rule
     or red combo matched, otherwise "amber" if any amber rule matched, otherwise null. */
  function check(text) {
    var t = normalize(text);
    var ids = [];
    var tier = null;
    if (t) {
      for (var i = 0; i < RULES.length; i++) {
        if (RULES[i].rx.test(t)) {
          ids.push(RULES[i].id);
          if (RULES[i].tier === "red") tier = "red";
          else if (!tier) tier = "amber";
        }
      }
      for (var c = 0; c < COMBOS.length; c++) {
        var all = true;
        for (var k = 0; k < COMBOS[c].all.length; k++) {
          if (ids.indexOf(COMBOS[c].all[k]) === -1) all = false;
        }
        if (all) { ids.push(COMBOS[c].id); if (COMBOS[c].tier === "red") tier = "red"; }
      }
    }
    return { hit: ids.length > 0, ids: ids, tier: tier, version: VERSION };
  }

  /* The red message. No condition is named and nothing is tailored to the patient,
     apart from the crisis-line sentence for the self_harm rule. */
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

  /* The amber message. Wording approved by the product's physician on 21 November
     2026. No condition is named. The wound line is added only when the wound
     rule matched. The escalate line is always shown. */
  var MESSAGE_AMBER = {
    title: "Tell your care team about this",
    notMonitored: MESSAGE.notMonitored,
    hospitalLabel: "In the hospital",
    hospitalAction: "Tell your nurse now.",
    homeLabel: "At home",
    homeAction: "Call your surgeon's office now.",
    homeNote: "Do not wait for a reply here.",
    wound: "For a wound concern, call your surgeon's office first, before you go to an emergency room or urgent care.",
    escalate: "If it is severe or getting worse: in the hospital, press your call button. At home, call 911.",
    saved: MESSAGE.saved,
    button: MESSAGE.button
  };

  var MESSAGES = { red: MESSAGE, amber: MESSAGE_AMBER };

  var api = { VERSION: VERSION, RULES: RULES, MESSAGE: MESSAGE, MESSAGE_AMBER: MESSAGE_AMBER, MESSAGES: MESSAGES, COMBOS: COMBOS, check: check, normalize: normalize };
  root.HeardRedFlags = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
