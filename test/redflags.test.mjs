// Run with: node --test
// These are the phrases the red-flag list must catch and must leave alone.
// Add a line here whenever the list changes.
//
// Each must-flag line is [words, rule id, tier]. The tier is the message the
// whole entry gets: "red" (call button, 911) or "amber" (tell your nurse, call
// the surgeon's office). Red wins when an entry matches both.
import { test } from "node:test";
import assert from "node:assert/strict";
await import("../redflags.js");
const RF = globalThis.HeardRedFlags;
const R = "red", A = "amber";

const MUST_FLAG = [
  // ---- chest (red) ----
  ["I have chest pain", "chest", R],
  ["there is a pressure in my chest", "chest", R],
  ["my chest feels really tight", "chest", R],
  ["CHEST PAIN", "chest", R],
  ["no chest pain today", "chest", R], // negation is deliberately not understood
  ["tightness around my chest", "chest", R],
  ["my chest is sore", "chest", R],
  ["chest discomfort", "chest", R],
  ["it hurts in my chest", "chest", R],
  ["a burning in my chest", "chest", R],
  ["it hurts when I breathe", "chest", R],
  ["it hurts to breathe", "chest", R],
  ["sharp pain when I take a deep breath", "chest", R],
  ["pain when I cough", "chest", R],
  ["I think I'm having a heart attack", "chest", R],

  // ---- breathing (red) ----
  ["I can't breathe", "breathing", R],
  ["I can’t catch my breath", "breathing", R],
  ["I am short of breath when I walk", "breathing", R],
  ["having trouble breathing", "breathing", R],
  ["I can't take a deep breath", "breathing", R],
  ["my breathing is hard", "breathing", R],
  ["breathing is difficult", "breathing", R],
  ["her breathing is getting worse", "breathing", R],
  ["I am wheezing", "breathing", R],
  ["I am winded", "breathing", R],
  ["I feel like I am suffocating", "breathing", R],
  ["his lips are blue", "breathing", R],
  ["her face is gray", "breathing", R],
  ["he is turning blue", "breathing", R],
  ["I can't breathe through my nose", "breathing", R],           // accepted false alarm
  ["having trouble with the breathing machine", "breathing", R], // accepted false alarm

  // ---- bleeding (red): heavy or internal ----
  ["it won't stop bleeding", "bleeding", R],
  ["I am bleeding a lot", "bleeding", R],
  ["there is a lot of bleeding", "bleeding", R],
  ["blood is pouring out", "bleeding", R],
  ["blood everywhere", "bleeding", R],
  ["blood all over the sheets", "bleeding", R],
  ["I am coughing up blood", "bleeding", R],
  ["I am vomiting a lot of blood", "bleeding", R],
  ["there is a lot of blood in my urine", "bleeding", R],

  // ---- vomit_blood (red, shows the GI bleeding list) ----
  ["I am vomiting blood", "vomit_blood", R],
  ["I threw up blood", "vomit_blood", R],
  ["vomit looks like coffee grounds", "vomit_blood", R],

  // ---- blood_urine (amber) ----
  ["my urine has blood in it", "blood_urine", A],
  ["blood in my urine", "blood_urine", A],

  // ---- bleeding_other (amber): other bleeding, soaked or leaking dressing, nosebleed, black stool ----
  ["the dressing is soaked and it is bleeding", "bleeding_other", A],
  ["my incision is bleeding", "bleeding_other", A],
  ["my gums bled when I brushed", "bleeding_other", A],
  ["there is blood on my bandage", "bleeding_other", A],
  ["blood is coming through the dressing", "bleeding_other", A],
  ["it soaked through the bandage", "bleeding_other", A],
  ["my bandage is soaked", "bleeding_other", A],
  ["the bandage is leaking", "bleeding_other", A],
  ["fluid is coming through the dressing", "bleeding_other", A],
  ["the dressing is not holding", "bleeding_other", A],
  ["I have a nosebleed", "bleeding_other", A],

  // ---- gi_bleed (amber, shows the GI bleeding list), red with dizzy or lightheaded ----
  ["my stool is black", "gi_bleed", A],
  ["black tarry stools", "gi_bleed", A],
  ["there was blood in my stool", "gi_bleed", A],
  ["bloody stool", "gi_bleed", A],
  ["my stool is black and I am lightheaded", "gi_bleed_with_dizzy", R],
  ["I feel dizzy and my poop is black", "gi_bleed_with_dizzy", R],

  // ---- clot (amber, shows the blood clot list): leg signs ----
  ["my calf hurts and it is swollen", "clot", A],
  ["there is a cramp in my calf", "clot", A],
  ["I think it's a blood clot", "clot", A],
  ["I have a swollen calf", "clot", A],
  ["sore calf", "clot", A],
  ["my calf is tight", "clot", A],
  ["the back of my lower leg hurts", "clot", A],
  ["pain in the back of my leg", "clot", A],
  ["my whole leg is swollen and red", "clot", A],
  ["my leg is more swollen today", "clot", A],
  ["both legs are swollen", "clot", A],
  ["the swelling in my foot is getting worse", "clot", A],
  ["my ankle and foot are swelling and getting worse", "clot", A],
  ["do I have a clot", "clot", A],
  ["is this a clot", "clot", A],
  ["my chest hurts and my calf is swollen", "clot", R], // red wins

  // ---- heart (amber) ----
  ["my heart is racing", "heart", A],
  ["my heart is pounding", "heart", A],
  ["I am having palpitations", "heart", A],
  ["my heart is racing and my chest hurts", "heart", R], // red wins

  // ---- stroke_signs (red, shows the stroke list) ----
  ["my speech is slurred", "stroke_signs", R],
  ["she has trouble speaking", "stroke_signs", R],
  ["I can't talk", "stroke_signs", R],
  ["her face is drooping", "stroke_signs", R],
  ["my arm is weak", "stroke_signs", R],
  ["double vision", "stroke_signs", R],
  ["worst headache of my life", "stroke_signs", R],
  ["I think I am having a stroke", "stroke_signs", R],
  ["is this a stroke", "stroke_signs", R],

  // ---- numb_stroke (red, stroke list): numb face, arm, hand or one side ----
  ["my arm is numb", "numb_stroke", R],
  ["the left side of her face is numb", "numb_stroke", R],

  // ---- seizure (red) ----
  ["he had a seizure", "seizure", R],

  // ---- confusion (amber) ----
  ["he is confused and not making sense", "confusion", A],
  ["she is confused about where she is", "confusion", A],
  ["he is confused when he wakes up", "confusion", A],
  ["she is hallucinating", "confusion", A],
  ["he doesn't know where he is", "confusion", A],

  // ---- numb (amber) ----
  ["my foot is numb", "numb", A],
  ["tingling in my foot", "numb", A],

  // ---- weak (amber) ----
  ["I can't feel my toes", "weak", A],
  ["I can't lift my foot", "weak", A],
  ["I feel weak", "weak", A],

  // ---- faint (red) ----
  ["I passed out in the bathroom", "faint", R],
  ["she fainted", "faint", R],
  ["mom won't wake up", "faint", R],
  ["I feel like I am going to pass out", "faint", R],
  ["he is not responding", "faint", R],
  ["she won't respond", "faint", R],
  ["John is not responding to me", "faint", R],
  ["he is hard to wake", "faint", R],

  // ---- dizzy (amber) ----
  ["I am lightheaded", "dizzy", A],
  ["I feel dizzy when I stand", "dizzy", A],
  ["I am dizzy and I passed out", "dizzy", R], // red wins

  // ---- fall (red) ----
  ["I fell getting out of bed", "fall", R],
  ["I have fallen", "fall", R],
  ["I had a fall last night", "fall", R],
  ["I took a bad fall", "fall", R],
  ["I keep falling", "fall", R],
  ["I slipped in the shower", "fall", R],
  ["I tripped on the rug", "fall", R],
  ["dad has fallen and can't get up", "fall", R],

  // ---- bp_drop (amber) ----
  ["my blood pressure fell", "bp_drop", A],
  ["my blood pressure dropped", "bp_drop", A],

  // ---- near_fall (amber) ----
  ["I almost fell", "near_fall", A],
  ["I nearly slipped", "near_fall", A],
  ["I almost fell and then I fell", "fall", R], // red wins

  // ---- wound (amber, adds the wound line) ----
  ["my incision opened up", "wound", A],
  ["there is pus coming out", "wound", A],
  ["it is oozing", "wound", A],
  ["there is drainage from my incision", "wound", A],
  ["my wound is leaking", "wound", A],
  ["the surgical site is draining", "wound", A],
  ["yellow discharge from the incision", "wound", A],
  ["I think my incision is infected", "wound", A],
  ["I think it's an infection", "wound", A],
  ["my incision is red and hot", "wound", A],
  ["the wound is red and swollen", "wound", A],
  ["red streaks from the incision", "wound", A],
  ["the incision smells bad", "wound", A],
  ["a staple came out", "wound", A],
  ["a staple fell out", "wound", A],
  ["a stitch popped out", "wound", A],

  // ---- dislocation (amber) ----
  ["I think my hip dislocated", "dislocation", A],
  ["it feels like my hip popped out", "dislocation", A],

  // ---- fever (amber) ----
  ["I have a fever", "fever", A],
  ["I have chills", "fever", A],
  ["my temp is 101.4", "fever", A],

  // ---- allergic (red) ----
  ["my throat is closing", "allergic", R],
  ["my lips are swelling", "allergic", R],
  ["I have a swollen tongue", "allergic", R],
  ["swelling in my throat", "allergic", R],
  ["I can't swallow", "allergic", R],

  // ---- allergic_other (amber) ----
  ["I broke out in hives", "allergic_other", A],
  ["I have a rash all over", "allergic_other", A],
  ["itching all over", "allergic_other", A],
  ["I am having a reaction to the medication", "allergic_other", A],

  // ---- overdose (red) ----
  ["I took too many pain pills", "overdose", R],
  ["he took too much oxycodone", "overdose", R],
  ["I think I overdosed", "overdose", R],
  ["he overdosed", "overdose", R],
  ["could this be an overdose", "overdose_word", R],

  // ---- overdose_other (amber) ----
  ["I took a double dose", "overdose_other", A],
  ["I took my pills twice", "overdose_other", A],
  ["I took extra pills", "overdose_other", A],
  ["I accidentally took two", "overdose_other", A],

  // ---- severe_pain (amber) ----
  ["the pain is unbearable", "severe_pain", A],
  ["my pain is ten out of ten", "severe_pain", A],
  ["my pain is a 10", "severe_pain", A],
  ["10/10 pain", "severe_pain", A],
  ["severe pain", "severe_pain", A],
  ["I am in agony", "severe_pain", A],
  ["my pain is out of control", "severe_pain", A],
  ["the pain medicine is not working", "severe_pain", A],
  ["the food here is unbearable", "severe_pain", A], // accepted false alarm

  // ---- self_harm (red, adds the 988 line) ----
  ["I want to kill myself", "self_harm", R],
  ["I don't want to live anymore", "self_harm", R],
  ["he says he wants to kill himself", "self_harm", R],
  ["she wants to die", "self_harm", R],
  ["I wish I was dead", "self_harm", R],
  ["I want to end it all", "self_harm", R],
  ["no reason to live", "self_harm", R],
  ["I don't want to go on", "self_harm", R],
  ["I want to hurt myself", "self_harm", R],
  ["thoughts of harming myself", "self_harm", R]
];

const MUST_NOT_FLAG = [
  "when can I drive",
  "my pain pill wore off early",
  "can I take a shower with the dressing on",
  "when do I start physical therapy",
  "how much weight can I put on my leg",
  "what time is the doctor coming",
  "I am confused about my medication schedule",
  "I fell asleep before the nurse came",
  "can I have another blanket",
  "when can I go home",
  "how long do I take the blood thinner",
  "is it normal for my knee to be stiff",
  "I need help getting to the bathroom",
  // ---- 21 Nov 2026 review ----
  "my leg is swollen",                       // swelling alone, no qualifier
  "my ankle and foot are swelling",          // swelling alone, no qualifier
  "can I soak in a bath with the bandage on",
  "can I get my dressing wet",
  "what is a blood clot",
  "worried about blood clots",               // a worry, not a stated symptom
  "how do I prevent a blood clot",
  "do I need a urine test and a blood test",
  "my leg is swollen, can I have more ice",  // "more" is not about the swelling
  "my leg is swollen and it is hard to sleep",
  "when can I take the pain pill with my cough medicine",
  "the nurse is not responding to my call button",
  "I am afraid I will fall",                 // a worry, not a fall
  "I have a fall risk bracelet",
  "the dressing slipped off",
  "I'm not responding to the pain medicine",
  "my husband tripped the alarm",
  "my pillow fell on the floor",             // an object fell, not a person
  "my phone fell under the bed",
  "what are my dislocation precautions",
  "can I leave my incision open to air",
  "when do the staples come out",
  "when does the drain come out of my incision",
  "will my staples be out before discharge",
  "how do I prevent infection",
  "my incision is a little red",
  "my temperature is 98.6",
  // nerve block numbness
  "my arm is numb from the block",
  "my leg is still numb from the nerve block",
  "when does the numbness from the block wear off",
  "numbing cream",
  // groups 5 and 9 to 12
  "I can't talk to the doctor until Monday",
  "I'm confused why I need this pill",
  "I can't swallow these big pills",
  "bring my face wash and close the door",
  "I am allergic to penicillin",
  "therapy took too much out of me",
  "I take it twice a day",
  "my pain pill is due at 10",
  "I don't want to go on the blood thinner",
  "I don't want to go on a walker",
  "I am afraid I will hurt myself doing therapy",
  "I don't want to hurt myself getting out of bed",
  // decided 21 Nov 2026: history, hypothetical questions, and "don't want to be here"
  "my dad had a heart attack last year",
  "my dad had a stroke, is surgery safe",
  "can I overdose on tylenol",
  "what if I overdose",
  "I don't want to be here anymore, when can I go home",
  "",
  "   "
];

test("every must-flag phrase matches its rule and gets the right message", () => {
  for (const [text, id, tier] of MUST_FLAG) {
    const r = RF.check(text);
    assert.equal(r.hit, true, "should flag: " + text);
    assert.ok(r.ids.includes(id), "'" + text + "' should match rule " + id + ", got " + r.ids.join(","));
    assert.equal(r.tier, tier, "'" + text + "' should get the " + tier + " message, got " + r.tier + " (" + r.ids.join(",") + ")");
  }
});

test("ordinary questions do not show a message", () => {
  for (const text of MUST_NOT_FLAG) {
    const r = RF.check(text);
    assert.equal(r.hit, false, "should not flag: '" + text + "' (matched " + r.ids.join(",") + ")");
    assert.equal(r.tier, null);
  }
});

test("every rule has a tier, and red wins over amber", () => {
  for (const rule of RF.RULES) {
    assert.ok(rule.tier === "red" || rule.tier === "amber", "rule " + rule.id + " needs a tier");
  }
  const r = RF.check("I feel dizzy and I have chest pain");
  assert.deepEqual(r.ids.sort(), ["chest", "dizzy"]);
  assert.equal(r.tier, "red");
  for (const combo of RF.COMBOS) {
    for (const id of combo.all) assert.ok(RF.RULES.some(x => x.id === id), "combo " + combo.id + " names an unknown rule: " + id);
  }
});

test("condition lists follow the rule that matched, and every list names its source", () => {
  assert.deepEqual(RF.check("my speech is slurred").lists, ["stroke"]);
  assert.deepEqual(RF.check("I have chest pain").lists, ["heart_attack"]);
  assert.deepEqual(RF.check("I can't catch my breath").lists, ["heart_attack", "pe"]);
  assert.deepEqual(RF.check("my calf hurts and it is swollen").lists, ["clot"]);   // amber, with a list
  assert.deepEqual(RF.check("my stool is black").lists, ["gi_bleed"]);             // amber, with a list
  assert.deepEqual(RF.check("I am vomiting blood").lists, ["gi_bleed"]);           // red, with a list
  assert.deepEqual(RF.check("my chest hurts and my calf is swollen").lists, ["heart_attack", "clot"]);
  assert.deepEqual(RF.check("I fell").lists, []);
  assert.deepEqual(RF.check("I am lightheaded").lists, []);
  for (const rule of RF.RULES) {
    for (const key of rule.lists || []) assert.ok(RF.LISTS[key], "rule " + rule.id + " names an unknown list: " + key);
  }
  for (const [key, L] of Object.entries(RF.LISTS)) {
    assert.ok(L.name && L.heading && L.source && L.reviewed, "list " + key + " needs a name, heading, source and review date");
    assert.ok(/^https:\/\/www\.(cdc|niddk\.nih)\.gov\//.test(L.url), "list " + key + " must link to its CDC or NIDDK page");
    for (const g of L.groups) assert.ok(g.items.length > 0);
  }
  assert.ok(RF.LIST_TEXT.sourceStart.includes("Source"));
  assert.ok(RF.LIST_TEXT.sourceEnd.includes("does not imply endorsement"));
  // CDC's fourth reuse requirement: say the material is free on the agency website.
  // Physician's decision, 21 November 2026: not on the message itself. The sentence is
  // kept for a sources page, which must exist before the condition lists are switched on.
  assert.ok(RF.LIST_TEXT.sourceFree.includes("at no charge"));
  assert.ok(!RF.LIST_TEXT.sourceEnd.includes("at no charge"));
  // The GI bleeding list names the institute in full, not "National Institutes of Health".
  assert.equal(RF.LISTS.gi_bleed.source, "National Institute of Diabetes and Digestive and Kidney Diseases");
});

// The condition lists, item by item, as each source page read in a browser on
// 21 November 2026. A change to a list in redflags.js must be made here too, after
// the live page has been read again. Do not take the text from a tool that
// summarizes pages: one returned "Sudden trouble seeing in one or both eyes",
// which is not on the CDC stroke page.
const CLOT_LUNG_ITEMS = [
  "Difficulty breathing",
  "Faster than normal or irregular heartbeat",
  "Chest pain or discomfort, which usually worsens with a deep breath or coughing",
  "Cough or coughing up blood",
  "Very low blood pressure, lightheadedness, or fainting",
];
const LIST_ITEMS = {
  // https://www.cdc.gov/stroke/signs-symptoms/ (page dated 19 May 2026), in page order
  stroke: [[
    "Sudden trouble walking, dizziness, loss of balance, or lack of coordination.",
    "Sudden trouble seeing.",
    "Sudden numbness or weakness in the face, arm, or leg, especially on one side of the body.",
    "Sudden confusion, trouble speaking, or difficulty understanding speech.",
    "Sudden severe headache with no known cause.",
  ]],
  // https://www.cdc.gov/heart-disease/about/heart-attack.html (page dated 24 October 2024).
  // The opening sentence of each bullet. The page's bullets go on: the first describes
  // the discomfort, the second adds a cold sweat, the fifth adds timing. The page also
  // names other symptoms (tiredness, nausea or vomiting) that this list leaves out.
  heart_attack: [[
    "Chest pain or discomfort.",
    "Feeling weak, light-headed, or faint.",
    "Pain or discomfort in the jaw, neck, or back.",
    "Pain or discomfort in one or both arms or shoulders.",
    "Shortness of breath.",
  ]],
  // https://www.cdc.gov/blood-clots/about/ (page dated 5 March 2025)
  pe: [CLOT_LUNG_ITEMS],
  clot: [
    ["Swelling", "Pain or tenderness", "Warmth", "Redness or discoloration"],
    CLOT_LUNG_ITEMS,
  ],
  // https://www.niddk.nih.gov/health-information/digestive-diseases/gastrointestinal-bleeding/symptoms-causes
  // (last reviewed July 2024)
  gi_bleed: [
    ["black or tarry stool", "dark or bright red blood mixed with stool", "bright red blood in vomit", "vomit that looks like coffee grounds"],
    ["having cramps or pain in your abdomen", "fainting or feeling lightheaded or dizzy", "feeling tired", "having shortness of breath"],
    ["confusion or unconsciousness", "fast heart rate", "pale skin", "cold hands and feet", "sweating"],
  ],
};

test("every condition list item matches its source page word for word, in page order", () => {
  assert.deepEqual(Object.keys(RF.LISTS).sort(), Object.keys(LIST_ITEMS).sort(), "a list was added or removed without its source text here");
  for (const [key, groups] of Object.entries(LIST_ITEMS)) {
    assert.deepEqual(RF.LISTS[key].groups.map(g => g.items), groups, "list " + key + " differs from its source page");
    assert.match(RF.LISTS[key].reviewed, /checked word for word/, "list " + key + " needs the date it was last checked");
  }
  assert.ok(!JSON.stringify(RF.LISTS.stroke).includes("one or both eyes"));
});

test("check never throws on odd input and always reports a version", () => {
  for (const v of [null, undefined, 42, {}, [], "’’’"]) {
    const r = RF.check(v);
    assert.equal(typeof r.hit, "boolean");
    assert.equal(r.version, RF.VERSION);
  }
});

test("neither base message names a condition (only the condition lists do)", () => {
  for (const M of [RF.MESSAGES.red, RF.MESSAGES.amber]) {
    const all = Object.values(M).join(" ").toLowerCase();
    for (const word of ["clot", "stroke", "heart attack", "infection", "embol", "sepsis", "overdose", "bleed"]) {
      assert.equal(all.includes(word), false, "message must not name a condition: " + word);
    }
  }
});

test("the red message sends home users to 911, and the amber message always says how to escalate", () => {
  assert.equal(RF.MESSAGES.red.homeAction, "Call 911.");
  assert.ok(RF.MESSAGES.red.hospitalAction.includes("call button"));
  assert.equal(RF.MESSAGES.amber.homeAction.includes("911"), false);
  assert.ok(RF.MESSAGES.amber.escalate.includes("911"));
  assert.ok(RF.MESSAGES.amber.escalate.includes("call button"));
});
