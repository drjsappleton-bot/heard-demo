// Run with: node --test
// These are the phrases the red-flag list must catch and must leave alone.
// Add a line here whenever the list changes.
import { test } from "node:test";
import assert from "node:assert/strict";
await import("../redflags.js");
const RF = globalThis.HeardRedFlags;

const MUST_FLAG = [
  ["I have chest pain", "chest"],
  ["there is a pressure in my chest", "chest"],
  ["my chest feels really tight", "chest"],
  ["I can't breathe", "breathing"],
  ["I can’t catch my breath", "breathing"],
  ["I am short of breath when I walk", "breathing"],
  ["having trouble breathing", "breathing"],
  ["my calf hurts and it is swollen", "clot"],
  ["there is a cramp in my calf", "clot"],
  ["I think it's a blood clot", "clot"],
  ["the dressing is soaked and it is bleeding", "bleeding"],
  ["I am coughing up blood", "bleeding"],
  ["there was blood in my stool", "bleeding"],
  ["my speech is slurred", "neuro"],
  ["I can't feel my toes", "neuro"],
  ["my foot is numb", "neuro"],
  ["he is confused and not making sense", "neuro"],
  ["I passed out in the bathroom", "faint"],
  ["she fainted", "faint"],
  ["mom won't wake up", "faint"],
  ["I fell getting out of bed", "fall"],
  ["I have fallen", "fall"],
  ["my incision opened up", "wound"],
  ["there is pus coming out", "wound"],
  ["I think my hip dislocated", "wound"],
  ["my throat is closing", "allergic"],
  ["my lips are swelling", "allergic"],
  ["I took too many pain pills", "overdose"],
  ["the pain is unbearable", "severe_pain"],
  ["my pain is ten out of ten", "severe_pain"],
  ["I want to kill myself", "self_harm"],
  ["I don't want to live anymore", "self_harm"],
  ["CHEST PAIN", "chest"],
  ["no chest pain today", "chest"] // negation is deliberately not understood
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
  "",
  "   "
];

test("every must-flag phrase shows the safety message", () => {
  for (const [text, id] of MUST_FLAG) {
    const r = RF.check(text);
    assert.equal(r.hit, true, "should flag: " + text);
    assert.ok(r.ids.includes(id), "'" + text + "' should match rule " + id + ", got " + r.ids.join(","));
  }
});

test("ordinary questions do not show the safety message", () => {
  for (const text of MUST_NOT_FLAG) {
    const r = RF.check(text);
    assert.equal(r.hit, false, "should not flag: '" + text + "' (matched " + r.ids.join(",") + ")");
  }
});

test("check never throws on odd input and always reports a version", () => {
  for (const v of [null, undefined, 42, {}, [], "’’’"]) {
    const r = RF.check(v);
    assert.equal(typeof r.hit, "boolean");
    assert.equal(r.version, RF.VERSION);
  }
});

test("the fixed message names no condition", () => {
  const all = Object.values(RF.MESSAGE).join(" ").toLowerCase();
  for (const word of ["clot", "stroke", "heart attack", "infection", "embol", "sepsis", "overdose"]) {
    assert.equal(all.includes(word), false, "message must not name a condition: " + word);
  }
});
