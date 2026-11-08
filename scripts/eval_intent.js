// Leave-one-out accuracy of the role classifier on its hand-written training set.
// Usage: node scripts/eval_intent.js
const Intent = require("../docs/intent.js");
const { TRAIN, LEXICON } = require("../docs/intent_train.js");
const useLex = !process.argv.includes("--no-lexicon");

const labels = Object.keys(TRAIN);
const conf = {};
labels.forEach((a) => { conf[a] = {}; labels.forEach((b) => (conf[a][b] = 0)); });
let right = 0, total = 0, abstain = 0;
const misses = [];

for (const truth of labels) {
  TRAIN[truth].forEach((phrase, i) => {
    const held = {};
    labels.forEach((l) => (held[l] = l === truth ? TRAIN[l].filter((_, j) => j !== i) : TRAIN[l]));
    const pred = Intent.classify(Intent.train(held, useLex ? LEXICON : null), phrase);
    conf[truth][pred.label]++;
    total++;
    if (pred.known === 0) abstain++;
    if (pred.label === truth) right++;
    else misses.push(`  "${phrase}" (${truth}) -> ${pred.label} ${(pred.confidence * 100).toFixed(0)}%`);
  });
}

console.log(`Model: naive Bayes ${useLex ? "+ keyword lexicon" : "(phrases only)"}`);
console.log(`Leave-one-out accuracy: ${right}/${total} = ${((100 * right) / total).toFixed(1)}%`);
console.log(`Held-out phrases with no known word (UI asks the user to pick): ${abstain}`);
console.log("\nConfusion (rows = true, cols = predicted):");
const w = 10;
console.log("".padEnd(w) + labels.map((l) => l.padStart(w)).join(""));
labels.forEach((a) => console.log(a.padEnd(w) + labels.map((b) => String(conf[a][b]).padStart(w)).join("")));
console.log("\nPer-role recall:");
labels.forEach((a) => console.log(`  ${a.padEnd(w)} ${((100 * conf[a][a]) / TRAIN[a].length).toFixed(0)}%`));
if (misses.length) console.log("\nMisclassified:\n" + misses.join("\n"));
