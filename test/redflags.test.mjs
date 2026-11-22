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
  ["my dad had a heart attack last year", "chest", R], // accepted false alarm

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
  ["there was blood in my stool", "bleeding", R],
  ["my urine has blood in it", "bleeding", R],
  ["bloody stool", "bleeding", R],

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
  ["my stool is black", "bleeding_other", A],
  ["black tarry stools", "bleeding_other", A],

  // ---- clot (red) ----
  ["my calf hurts and it is swollen", "clot", R],
  ["there is a cramp in my calf", "clot", R],
  ["I think it's a blood clot", "clot", R],
  ["I have a swollen calf", "clot", R],
  ["sore calf", "clot", R],
  ["my calf is tight", "clot", R],
  ["the back of my lower leg hurts", "clot", R],
  ["pain in the back of my leg", "clot", R],
  ["my whole leg is swollen and red", "clot", R],
  ["my leg is more swollen today", "clot", R],
  ["both legs are swollen", "clot", R],
  ["the swelling in my foot is getting worse", "clot", R],
  ["my ankle and foot are swelling and getting worse", "clot", R],
  ["do I have a clot", "clot", R],
  ["is this a clot", "clot", R],

  // ---- heart (amber) ----
  ["my heart is racing", "heart", A],
  ["my heart is pounding", "heart", A],
  ["I am having palpitations", "heart", A],
  ["my heart is racing and my chest hurts", "heart", R], // red wins

  // ---- neuro (red, first draft) ----
  ["my speech is slurred", "neuro", R],
  ["I can't feel my toes", "neuro", R],
  ["my foot is numb", "neuro", R],
  ["he is confused and not making sense", "neuro", R],

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
  ["my pillow fell on the floor", "fall", R], // known false alarm

  // ---- near_fall (amber) ----
  ["I almost fell", "near_fall", A],
  ["I nearly slipped", "near_fall", A],
  ["I almost fell and then I fell", "fall", R], // red wins

  // ---- wound (amber, phrases first draft) ----
  ["my incision opened up", "wound", A],
  ["there is pus coming out", "wound", A],

  // ---- dislocation (red, first draft) ----
  ["I think my hip dislocated", "dislocation", R],

  // ---- allergic, overdose, severe_pain, self_harm (red, first draft) ----
  ["my throat is closing", "allergic", R],
  ["my lips are swelling", "allergic", R],
  ["I took too many pain pills", "overdose", R],
  ["the pain is unbearable", "severe_pain", R],
  ["my pain is ten out of ten", "severe_pain", R],
  ["I want to kill myself", "self_harm", R],
  ["I don't want to live anymore", "self_harm", R]
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
});

test("check never throws on odd input and always reports a version", () => {
  for (const v of [null, undefined, 42, {}, [], "’’’"]) {
    const r = RF.check(v);
    assert.equal(typeof r.hit, "boolean");
    assert.equal(r.version, RF.VERSION);
  }
});

test("neither message names a condition", () => {
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
