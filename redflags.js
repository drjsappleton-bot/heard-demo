/* Heard red-flag safety check.

   What this is: a fixed list of phrases, each in one of two tiers. When something a
   patient or caregiver captures matches the list, the page shows one of two fixed
   messages.
   - red:   in the hospital, contact your nurse immediately; at home, call 911.
   - amber: in the hospital, tell your nurse now; at home, call your surgeon's
            office now. It always carries a line on what to do if it is severe or
            getting worse.
   If an entry matches both tiers, the red message is shown.

   Some rules also carry condition lists (stroke, heart attack, blood clot, GI
   bleeding). When one matches, the message says the concern represents a possible
   condition, shows the public list of its signs from CDC or NIH with the source,
   and gives the usual instruction for its tier. There is one button, to
   acknowledge. The patient is not asked to answer anything. The page can switch
   the lists off (RF_CONDITION_LISTS in index.html). Decided 21 November 2026.

   How a tier is chosen, decided 21 November 2026: follow the source. Where the
   source says to see a doctor as soon as possible, the phrase is amber. Where it
   says to get help immediately or call 911, the phrase is red. Black stool and
   blood in the stool are the physician's exception: amber by default, red with
   dizziness or fainting. Vomiting blood is red.

   What this is not: triage of the patient. It does not score anything, ask the
   patient questions, or notify anyone. Which message appears depends only on which
   listed phrase was matched. The two-message design was a
   deliberate decision by the product's physician on 21 November 2026; it replaced
   the single message. The tier of a phrase, the wording of either message, and any
   move toward naming a condition or notifying someone are regulatory questions, not
   code changes. Naming a possible condition was added on 21 November 2026 and is on
   the list for counsel with the rest.

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

  var VERSION = "2026-11-21.9";

  /* Review status at this version (21 November 2026 review): every group has been
     revised. Open points are listed in the project's START-HERE. */

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

  /* An entry that mentions a nerve block is expected to mention numbness. The numb
     rules do not fire when one of these words is in the entry. */
  var BLOCK_WORDS = /\b(block|blocks|spinal|epidural|numbing)\b/;

  /* Each rule: an id for the audit trail, a tier ("red" or "amber"), and one pattern
     (see any() above). Optional: "unless", a pattern that cancels the rule when it
     is found anywhere in the entry; "lists", the condition lists the rule shows. Text is lower-cased and curly apostrophes are straightened
     before matching. */
  var RULES = [
    /* ---- chest: reviewed 21 Nov 2026 ---- */
    { id: "chest", tier: "red", lists: ["heart_attack"], rx: any([
      /* "chest", then a symptom word */
      /\bchest\b.{0,30}\b(pain|pains|painful|hurt|hurts|hurting|pressure|tight|tightness|heavy|heaviness|sore|soreness|ache|aches|aching|discomfort|burning|sharp|stabbing|squeez\w*|crush\w*)\b/,
      /* a symptom word, then "chest", with any words between */
      /\b(pain|pains|painful|hurt|hurts|hurting|pressure|tight|tightness|heavy|heaviness|sore|soreness|ache|aches|aching|discomfort|burning|sharp|stabbing|squeez\w*|crush\w*)\b.{0,25}\bchest\b/,
      /* pain with breathing or coughing: "it hurts when I breathe", "pain when I take
         a deep breath"; "pain pill" and "pain medicine" do not count as pain here */
      /\b(hurt|hurts|hurting|pain|pains|painful)\b(?! (pill|pills|med|meds|medicine|medication|medications|killer|killers|reliever))\b.{0,12}\b(when|whenever|to|if|as|while|with|on|every time|each time)\b.{0,20}\b(breath\w*|cough\w*)/,
      /* "heart attack" only when it is about now; "my dad had a heart attack" passes */
      /\bhaving a heart attack\b/,
      /\b(is|was) (this|that|it) a heart attack\b/,
      /\b(think|thinks|thought|might be|could be|may be|looks like|feels like)\b.{0,25}\bheart attack\b/
    ]) },

    /* ---- breathing: reviewed 21 Nov 2026 ---- */
    { id: "breathing", tier: "red", lists: ["heart_attack", "pe"], rx: any([
      /\b(can't|cant|cannot|can not|couldn't|hard to|trouble|difficulty|difficult to|struggling to|unable to)\b.{0,25}\bbreath\w*/,
      /\bbreathing\b.{0,20}\b(hard|harder|heavy|heavily|heavier|difficult|labored|laboured|fast|faster|worse)\b/,
      /* the same words before "breathing": "heavy breathing", "labored breathing".
         Breathing heavily is trouble breathing (physician, 21 Nov 2026) */
      /\b(heavy|heavier|labored|laboured|fast|faster)\b.{0,6}\bbreathing\b/,
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
      /* coughing or spitting blood */
      /\b(cough\w*|spit\w*)\b.{0,15}\bblood\b/
    ]) },

    /* ---- vomit_blood (red, shows the GI bleeding list): vomiting blood, or vomit
       that looks like coffee grounds. Reviewed 21 Nov 2026 ---- */
    { id: "vomit_blood", tier: "red", lists: ["gi_bleed"], rx: any([
      /\b(vomit\w*|throw\w* up|threw up)\b.{0,15}\bblood\b/,
      /\bblood\b.{0,20}\bvomit\b/,
      /\bbloody vomit\b/,
      /\bcoffee grounds?\b/
    ]) },

    /* ---- blood_urine (amber): blood in the urine, either order; not "blood test"
       and the like. Reviewed 21 Nov 2026 ---- */
    { id: "blood_urine", tier: "amber", rx: any([
      /\bblood\b.{0,20}\b(urine|pee)\b/,
      /\b(urine|pee)\b.{0,20}\bblood\b(?! (test|tests|work|draw|pressure|sugar|thinner|thinners|count|clot|clots))/,
      /\bbloody (urine|pee)\b/
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

    /* ---- gi_bleed (amber, shows the GI bleeding list): black or tarry stool, blood
       in the stool. With dizzy or lightheaded in the same entry it becomes red (see
       COMBOS). Vomiting blood is its own red rule. Reviewed 21 Nov 2026 ---- */
    { id: "gi_bleed", tier: "amber", lists: ["gi_bleed"], rx: any([
      /\b(black|tarry)\b.{0,15}\b(stool|stools|poop|bowel movement|bowel movements)\b/,
      /\b(stool|stools|poop|bowel movement|bowel movements)\b.{0,20}\b(black|tarry)\b/,
      /* blood in the stool, either order; not "blood test" and the like */
      /\bblood\b.{0,20}\b(stool|stools|poop|bowel movement|toilet)\b/,
      /\b(stool|stools|poop|bowel movement)\b.{0,20}\bblood\b(?! (test|tests|work|draw|pressure|sugar|thinner|thinners|count|clot|clots))/,
      /\bbloody (stool|stools|poop|diarrhea)\b/
    ]) },

    /* ---- clot (amber, shows the blood clot list): leg signs. The source says to see
       a doctor as soon as possible. Chest and breathing signs are their own red
       rules. Reviewed 21 Nov 2026 ---- */
    { id: "clot", tier: "amber", lists: ["clot"], rx: any([
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

    /* ---- stroke_signs (red, shows the stroke list). Reviewed 21 Nov 2026 ---- */
    { id: "stroke_signs", tier: "red", lists: ["stroke"], rx: any([
      /\bslurr\w*/,
      /* trouble speaking; "can't talk to the doctor" passes */
      /\b(trouble|difficulty|hard time|problem|problems)\b.{0,10}\b(speaking|talking|getting (the |my |his |her )?words)\b/,
      /\b(can't|cant|cannot|couldn't|unable to)\b.{0,6}\b(speak|talk)\b(?! (to|with|about)\b)/,
      /* face drooping, either order */
      /\bface\b.{0,15}\bdroop\w*/,
      /\bdroop\w*\b.{0,15}\b(face|mouth|smile)\b/,
      /* weak, or cannot move or feel: arm, hand, face or one side, either order */
      /\b(arm|arms|hand|hands|face|one side|left side|right side)\b.{0,20}\b(weak|weakness|limp|won't move|wont move|not moving)\b/,
      /\b(weak|weakness)\b.{0,20}\b(arm|arms|hand|hands|face|one side|left side|right side)\b/,
      /\b(can't|cant|cannot|couldn't) (feel|move|lift|raise)\b.{0,20}\b(arm|arms|hand|hands|fingers|face|side)\b/,
      /* vision */
      /\b(lost|losing|loss of)\b.{0,10}\b(vision|sight)\b/,
      /\bdouble vision\b/,
      /\bseeing double\b/,
      /* headache */
      /\b(worst|sudden)\b.{0,12}\bheadache\b/,
      /\bparaly\w*/,
      /* "stroke" only when it is about now; "my dad had a stroke" passes */
      /\bhaving a stroke\b/,
      /\b(is|was) (this|that|it) a stroke\b/,
      /\b(think|thinks|thought|might be|could be|may be|looks like|feels like)\b.{0,25}\bstroke\b/
    ]) },

    /* ---- numb_stroke (red, shows the stroke list): numb face, arm, hand or one
       side, unless a nerve block is mentioned. Reviewed 21 Nov 2026 ---- */
    { id: "numb_stroke", tier: "red", lists: ["stroke"], unless: BLOCK_WORDS, rx: any([
      /\b(arm|arms|hand|hands|face|one side|left side|right side)\b.{0,20}\bnumb\w*/,
      /\bnumb\w*\b.{0,20}\b(arm|arms|hand|hands|face|one side|left side|right side)\b/
    ]) },

    /* ---- seizure (red). First-draft phrases, kept ---- */
    { id: "seizure", tier: "red", rx: any([
      /\bseizure\w*/,
      /\bconvuls\w*/
    ]) },

    /* ---- confusion (amber). "Confused about my medication" passes; "confused about
       where she is" does not. Reviewed 21 Nov 2026 ---- */
    { id: "confusion", tier: "amber", rx: any([
      /\bconfus(ed|ion)\b(?! (about|by|with|as to|on|over|why|what|how|which|whether|if) (?!where|who|what day|what year|what time)\S)/,
      /\bconfus(ed|ion) (about )?(where|who|what day|what year|what time)\b/,
      /\bdisoriented\b/,
      /\bdelirious\b/,
      /\bhallucinat\w*/,
      /\bseeing things\b/,
      /\bnot making sense\b/,
      /\btalking (nonsense|gibberish)\b/,
      /\b(doesn't|doesnt|does not|don't|dont|do not) know (where|who|what day|what year)\b/
    ]) },

    /* ---- numb (amber): any other numbness or tingling, unless a nerve block is
       mentioned. Reviewed 21 Nov 2026 ---- */
    { id: "numb", tier: "amber", unless: BLOCK_WORDS, rx: any([
      /\bnumb\w*/,
      /\btingl\w*/,
      /\bpins and needles\b/
    ]) },

    /* ---- weak (amber): cannot feel or move a leg, foot or toes; foot drop; any
       other "weak". Reviewed 21 Nov 2026 ---- */
    { id: "weak", tier: "amber", rx: any([
      /\b(can't|cant|cannot|couldn't|unable to)\b.{0,6}\b(feel|move|lift|raise|wiggle|bend)\b.{0,20}\b(leg|legs|foot|feet|toe|toes|ankle)\b/,
      /\bfoot drop\b/,
      /\bdrop foot\b/,
      /\bweak(ness|er)?\b/
    ]) },

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

    /* ---- allergic (red): swelling of the throat, tongue, lips or face; throat
       closing; cannot swallow. Reviewed 21 Nov 2026 ---- */
    { id: "allergic", tier: "red", rx: any([
      /\b(throat|tongue|lip|lips|face)\b.{0,20}\b(swell\w*|swollen)\b/,
      /\b(swell\w*|swollen)\b.{0,20}\b(throat|tongue|lip|lips|face)\b/,
      /\bthroat\b.{0,20}\b(clos\w*|tight\w*)\b/,
      /* cannot swallow; "can't swallow these big pills" passes */
      /\b(can't|cant|cannot|couldn't|trouble|difficulty|hard to)\b.{0,6}\bswallow\w*\b(?!.{0,15}\b(pill|pills|tablet|tablets|capsule|capsules)\b)/,
      /\ballergic reaction\b/,
      /\banaphyla\w*/
    ]) },

    /* ---- allergic_other (amber): hives, rash, itching all over, a reaction to a
       medicine. Reviewed 21 Nov 2026 ---- */
    { id: "allergic_other", tier: "amber", rx: any([
      /\bhives\b/,
      /\brash\b/,
      /\bitch\w*\b.{0,12}\b(all over|everywhere)\b/,
      /\breaction to\b.{0,15}\b(medication|medications|medicine|meds|pill|pills|antibiotic|antibiotics|drug|shot|iv)\b/
    ]) },

    /* ---- overdose (red). Reviewed 21 Nov 2026 ---- */
    { id: "overdose", tier: "red", rx: any([
      /\boverdosed\b/,
      /\boverdosing\b/,
      /\b(think|thinks|thought|took|taken|had|having|is this|is it|was it)\b.{0,20}\boverdose\b/,
      /* "took too much out of me" passes */
      /\btook too (many|much)\b(?! out of)/,
      /\btoo many pills\b/
    ]) },

    /* ---- overdose_word (red): the word "overdose" in any other statement. A
       hypothetical question ("can I overdose on Tylenol", "what if I overdose")
       shows nothing. Reviewed 21 Nov 2026 ---- */
    { id: "overdose_word", tier: "red",
      unless: /\b(can|could|would|will|might|may|should) (i|you|he|she|we|they|someone|anyone|a person|one)\b.{0,25}\boverdos\w*|\b(is it possible|what if|what happens if|how much|how many)\b.{0,30}\boverdos\w*/,
      rx: /\boverdos\w*/ },

    /* ---- overdose_other (amber): double dose, took it twice, took extra, took the
       wrong pill, took something by mistake. Reviewed 21 Nov 2026 ---- */
    { id: "overdose_other", tier: "amber", rx: any([
      /\bdouble dose\b/,
      /\b(took|taken|gave|given)\b.{0,15}\b(double|extra|wrong)\b/,
      /\b(took|taken|gave|given)\b.{0,25}\btwice\b/,
      /\b(accidentally|by mistake|by accident)\b.{0,15}\b(took|taken|gave|given)\b/,
      /\b(took|taken|gave|given)\b.{0,25}\b(accidentally|by mistake|by accident)\b/
    ]) },

    /* ---- severe_pain (amber). Reviewed 21 Nov 2026 ---- */
    { id: "severe_pain", tier: "amber", rx: any([
      /\bunbearable\b/,
      /\bexcruciating\b/,
      /\bagony\b/,
      /\bworst pain\b/,
      /\bsevere\b.{0,10}\bpain\b/,
      /\bpain\b.{0,15}\bsevere\b/,
      /* a pain score of ten; "my pain pill is due at 10" passes */
      /\bpain\b(?! (pill|pills|med|meds|medicine|medication))\b.{0,15}\b(10|ten)\b/,
      /\b(10|ten) out of (10|ten)\b.{0,15}\bpain\b/,
      /\b10\/10\b.{0,15}\bpain\b/,
      /\bpain\b.{0,15}\b10\/10\b/,
      /\b(can't|cant|cannot) (stand|take) (the|this) pain\b/,
      /\bpain\b.{0,15}\b(out of control|not controlled|uncontrolled|not under control)\b/,
      /\bpain (pill|pills|med|meds|medicine|medication|medications)\b.{0,20}\b(not|isn't|isnt|aren't|arent|doesn't|doesnt|don't|dont|stopped)\b.{0,10}\b(working|work|help|helping)\b/
    ]) },

    /* ---- self_harm (red, adds the 988 line). Reviewed 21 Nov 2026, except
       "don't want to be here", dropped on the physician's decision ---- */
    { id: "self_harm", tier: "red", rx: any([
      /\bsuicid\w*/,
      /\bkill (myself|himself|herself|themselves|themself)\b/,
      /\bend (my|his|her|their) (own )?life\b/,
      /\btake (my|his|her|their) own life\b/,
      /\bwants? to die\b/,
      /\bbetter off dead\b/,
      /\bwish (i|he|she) (was|were) dead\b/,
      /\bend it all\b/,
      /\bno reason to live\b/,
      /\b(don't|dont|do not|doesn't|doesnt|does not) want to live\b/,
      /* "don't want to go on", but not "go on the blood thinner" or "go on a walker" */
      /\b(don't|dont|do not|doesn't|doesnt|does not) want to go on\b(?! (the|a|an|my|any|this|that|blood|oxygen|more|with the|to)\b)/,
      /* hurting oneself, only with intent; "afraid I will hurt myself in therapy" passes */
      /(?:^|(?:^|\s)(?!don't\s|dont\s|not\s|never\s|didn't\s|didnt\s)\S+\s)(want|wants|wanted) to (hurt|harm) (myself|himself|herself|themselves)\b/,
      /\b(going to|thinking about|thinking of|thought about|thoughts of|might|plan to|planning to|tried to|trying to|feel like)\b.{0,6}\b(hurt|harm|hurting|harming) (myself|himself|herself|themselves)\b/
    ]) }
  ];

  /* Two amber rules that together are red. Each combo has its own id for the audit
     trail. Decided 21 Nov 2026: a GI bleeding sign with dizzy or lightheaded. */
  var COMBOS = [
    { id: "gi_bleed_with_dizzy", all: ["gi_bleed", "dizzy"], tier: "red" }
  ];

  function normalize(text) {
    return String(text == null ? "" : text)
      .toLowerCase()
      .replace(/[‘’ʼ]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Returns { hit, ids, tier, lists, version }. lists names the condition lists to
     show with the message, in the order the rules matched. ids lists every rule that matched, for the
     audit trail. It is never shown to the patient. tier is "red" if any red rule
     or red combo matched, otherwise "amber" if any amber rule matched, otherwise null. */
  function check(text) {
    var t = normalize(text);
    var ids = [];
    var lists = [];
    var tier = null;
    if (t) {
      for (var i = 0; i < RULES.length; i++) {
        if (RULES[i].rx.test(t) && !(RULES[i].unless && RULES[i].unless.test(t))) {
          ids.push(RULES[i].id);
          var rl = RULES[i].lists || [];
          for (var j = 0; j < rl.length; j++) { if (lists.indexOf(rl[j]) === -1) lists.push(rl[j]); }
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
    return { hit: ids.length > 0, ids: ids, tier: tier, lists: lists, version: VERSION };
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

  /* Condition lists. The items are the public signs pages of CDC and NIDDK (NIH),
     word for word, in the order the page gives them. CDC's reuse terms
     (https://www.cdc.gov/other/agencymaterials.html, read 21 November 2026) require
     four things: the source credit, a prominent no-endorsement note, unchanged
     substance, and a statement that the material is available on the agency website
     at no charge. So do not reword an item. The no-charge statement is not shown
     on the message itself (physician's decision, 21 November 2026). It is kept in
     LIST_TEXT.sourceFree and belongs on a sources page, which must exist before
     the condition lists are switched on. NIDDK's terms (https://www.niddk.nih.gov/copyright, read 21 November
     2026) ask for NIDDK to be named as the source of unchanged content, and say its
     content must not be used to imply endorsement or "to recommend specific medical
     advice, treatments, or referrals". That last clause is a question for counsel.
     Check each list against its page before every release and update "reviewed".
     Read the page itself in a browser: on 21 November 2026 a page-summarizing tool
     returned a stroke line ("in one or both eyes") that is not on the CDC page.
     The test file pins every item, so a change here must be made there too.
     NIDDK is the National Institute of Diabetes and Digestive and Kidney Diseases,
     one of the institutes of NIH. The source line gives the institute's full name,
     not "National Institutes of Health" (physician's decision, 21 November 2026).
     The heart attack list uses the opening sentence of each CDC bullet. A list's
     heading, a group's "label" and a group's "note" are Heard's wording, not the
     source's. */
  var CALL_NOW = "With any of these: in the hospital, press your call button. At home, call 911.";
  var CLOT_LUNG = [
    "Difficulty breathing",
    "Faster than normal or irregular heartbeat",
    "Chest pain or discomfort, which usually worsens with a deep breath or coughing",
    "Cough or coughing up blood",
    "Very low blood pressure, lightheadedness, or fainting"
  ];
  var LISTS = {
    stroke: {
      name: "stroke", article: "a ",
      heading: "Signs of stroke",
      groups: [ { label: "", items: [
        "Sudden trouble walking, dizziness, loss of balance, or lack of coordination.",
        "Sudden trouble seeing.",
        "Sudden numbness or weakness in the face, arm, or leg, especially on one side of the body.",
        "Sudden confusion, trouble speaking, or difficulty understanding speech.",
        "Sudden severe headache with no known cause."
      ] } ],
      source: "CDC",
      url: "https://www.cdc.gov/stroke/signs-symptoms/",
      reviewed: "CDC page dated 19 May 2026, checked word for word 21 November 2026"
    },
    heart_attack: {
      name: "heart attack", article: "a ",
      heading: "Major symptoms of a heart attack",
      groups: [ { label: "", items: [
        "Chest pain or discomfort.",
        "Feeling weak, light-headed, or faint.",
        "Pain or discomfort in the jaw, neck, or back.",
        "Pain or discomfort in one or both arms or shoulders.",
        "Shortness of breath."
      ] } ],
      source: "CDC",
      url: "https://www.cdc.gov/heart-disease/about/heart-attack.html",
      reviewed: "CDC page dated 24 October 2024, checked word for word 21 November 2026"
    },
    pe: {
      name: "blood clot in the lung", article: "a ",
      heading: "Signs of a blood clot in the lung",
      groups: [ { label: "", items: CLOT_LUNG } ],
      source: "CDC",
      url: "https://www.cdc.gov/blood-clots/about/",
      reviewed: "CDC page dated 5 March 2025, checked word for word 21 November 2026"
    },
    clot: {
      name: "blood clot", article: "a ",
      heading: "Signs of a blood clot",
      groups: [
        { label: "In the leg or arm", items: [
          "Swelling",
          "Pain or tenderness",
          "Warmth",
          "Redness or discoloration"
        ] },
        { label: "In the lung", items: CLOT_LUNG, note: CALL_NOW }
      ],
      source: "CDC",
      url: "https://www.cdc.gov/blood-clots/about/",
      reviewed: "CDC page dated 5 March 2025, checked word for word 21 November 2026"
    },
    gi_bleed: {
      name: "bleeding in the stomach or bowel", article: "",
      heading: "Signs of bleeding in the stomach or bowel",
      groups: [
        { label: "", items: [
          "black or tarry stool",
          "dark or bright red blood mixed with stool",
          "bright red blood in vomit",
          "vomit that looks like coffee grounds"
        ] },
        { label: "Other symptoms", items: [
          "having cramps or pain in your abdomen",
          "fainting or feeling lightheaded or dizzy",
          "feeling tired",
          "having shortness of breath"
        ] },
        { label: "Signs of shock", items: [
          "confusion or unconsciousness",
          "fast heart rate",
          "pale skin",
          "cold hands and feet",
          "sweating"
        ], note: CALL_NOW }
      ],
      source: "National Institute of Diabetes and Digestive and Kidney Diseases",
      url: "https://www.niddk.nih.gov/health-information/digestive-diseases/gastrointestinal-bleeding/symptoms-causes",
      reviewed: "NIDDK page reviewed July 2024, checked word for word 21 November 2026"
    }
  };

  /* Wording for a message that shows a condition list. */
  var LIST_TEXT = {
    headlineStart: "Your concerns represent ",
    possible: "possible ",
    recommends: "Heard recommends:",
    homeNote: "Do not wait for a reply here.",
    sourceStart: "Source: ",
    sourceEnd: ". This does not imply endorsement of Heard by the source or the United States Government.",
    /* Not shown on the message. For the sources page. */
    sourceFree: "This material is available on the source's website at no charge."
  };

  var api = { VERSION: VERSION, RULES: RULES, MESSAGE: MESSAGE, MESSAGE_AMBER: MESSAGE_AMBER, MESSAGES: MESSAGES, LISTS: LISTS, LIST_TEXT: LIST_TEXT, COMBOS: COMBOS, check: check, normalize: normalize };
  root.HeardRedFlags = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
