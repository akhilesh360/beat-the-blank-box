// Real-world check of the role classifier on hand-labelled WildChat first messages.
// Needs data/wildchat_labels.csv (committed) and data/raw/label_sample.jsonl (full text,
// rebuilt by `scripts/wildchat_analysis.py extract`). Usage: node scripts/eval_intent_wildchat.js [--json]
const fs = require("fs");
const Intent = require("../docs/intent.js");
const { TRAIN, LEXICON } = require("../docs/intent_train.js");
const model = Intent.train(TRAIN, LEXICON);
const THRESH = 0.4; // the UI asks the user to pick below this

const text = {};
fs.readFileSync("data/raw/label_sample.jsonl", "utf8").trim().split("\n").forEach((l) => { const d = JSON.parse(l); text[d.id] = d.text; });
const rows = fs.readFileSync("data/wildchat_labels.csv", "utf8").trim().split("\n").slice(1)
  .map((l) => { const [id, role] = l.split(","); return { id, role }; });

let inScope = 0, commit = 0, correct = 0, noneN = 0, noneCommit = 0, overall = 0;
const perRole = {};
for (const r of rows) {
  const p = Intent.classify(model, text[r.id]);
  const commits = p.known > 0 && p.confidence >= THRESH;
  if (r.role === "none") { noneN++; if (commits) noneCommit++; else overall++; continue; }
  inScope++; perRole[r.role] = perRole[r.role] || [0, 0]; perRole[r.role][1]++;
  if (commits) { commit++; if (p.label === r.role) { correct++; overall++; perRole[r.role][0]++; } }
}
const pct = (a, b) => +(100 * a / b).toFixed(1);
const res = {
  labelled: rows.length, in_scope: inScope, none_or_other: noneN,
  in_scope_coverage_pct: pct(commit, inScope),
  in_scope_accuracy_when_committing_pct: pct(correct, commit),
  in_scope_end_to_end_accuracy_pct: pct(correct, inScope),
  none_false_commit_pct: pct(noneCommit, noneN),
  overall_correct_pct: pct(overall, rows.length),
  per_role_correct: perRole,
};
if (process.argv.includes("--json")) console.log(JSON.stringify(res));
else console.log(JSON.stringify(res, null, 2));
