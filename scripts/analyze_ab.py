"""Analyse an A/B events CSV (schema in docs/experiment.md): day-7 retention per arm.

Primary metric, two ways:
  Bayesian   Beta(1,1) prior + Binomial -> Beta posterior per arm; Monte Carlo for
             P(B > A), expected relative lift and its 95% credible interval.
  Frequentist two-proportion z-test (pooled), alpha 0.05 two-sided, for comparison.

Guardrails (thresholds from the README, proposals):
  onboarding drop-off (B) < 10%; typed messages per user days 0-7 not down > 5%;
  thumbs-down rate on first answer not significantly higher (z-test, one-sided 0.05).

Standard library only. Optional: --plot PATH draws the posteriors (needs matplotlib).
Usage: python3 scripts/analyze_ab.py data/simulated_events.csv [--plot docs/ab_posterior.png]
"""
import argparse
import csv
import json
import math
import random
from collections import defaultdict
from datetime import datetime

ARMS = ("old", "new")  # A = old (control), B = new (treatment)


def norm_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def z_test(x1, n1, x2, n2):
    p1, p2, p = x1 / n1, x2 / n2, (x1 + x2) / (n1 + n2)
    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    z = (p2 - p1) / se if se else 0.0
    return z, 2 * (1 - norm_cdf(abs(z)))


def load(path):
    users = {}
    for r in csv.DictReader(open(path, newline="")):
        u = users.setdefault(r["user_id"], {"variant": r["variant"], "start": None, "events": []})
        ts = datetime.fromisoformat(r["timestamp"])
        if r["event"] == "onboarding_viewed" and (u["start"] is None or ts < u["start"]):
            u["start"] = ts
        u["events"].append((ts, r["event"], json.loads(r["properties"] or "{}")))
    return users


def summarise(users):
    s = {a: defaultdict(int) for a in ARMS}
    for u in users.values():
        a, t0 = u["variant"], u["start"]
        if a not in s or t0 is None:
            continue
        d = s[a]
        d["n"] += 1
        retained = False
        for ts, ev, p in u["events"]:
            day = (ts.date() - t0.date()).days
            if ev in ("message_sent", "first_message_sent") and 1 <= day <= 7:
                retained = True
            if ev == "message_sent" and p.get("source") == "typed" and 0 <= day <= 7:
                d["typed"] += 1
            if ev == "onboarding_abandoned":
                d["abandoned"] += 1
            if ev == "answer_feedback":
                d["fb"] += 1
                d["down"] += p.get("rating") == "down"
        d["retained"] += retained
    return s


def posterior(s, draws, seed):
    rng = random.Random(seed)
    xa, na = s["old"]["retained"], s["old"]["n"]
    xb, nb = s["new"]["retained"], s["new"]["n"]
    pa = [rng.betavariate(1 + xa, 1 + na - xa) for _ in range(draws)]
    pb = [rng.betavariate(1 + xb, 1 + nb - xb) for _ in range(draws)]
    lift = sorted((b - a) / a for a, b in zip(pa, pb))
    return {
        "pa": pa, "pb": pb,
        "p_b_better": sum(b > a for a, b in zip(pa, pb)) / draws,
        "lift_mean": sum(lift) / draws,
        "lift_lo": lift[int(0.025 * draws)], "lift_hi": lift[int(0.975 * draws)],
    }


def plot(post, s, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.8), dpi=150)
    for key, arm, color, label in (("pa", "old", "#8a94a6", "A: blank box"), ("pb", "new", "#3a5bd9", "B: role-based")):
        ax1.hist([100 * v for v in post[key]], bins=80, density=True, alpha=0.6, color=color,
                 label=f"{label} ({s[arm]['retained']:,}/{s[arm]['n']:,})")
    ax1.set_xlabel("Day-7 retention (%)")
    ax1.set_yticks([])
    ax1.set_title("Posterior per arm")
    ax1.legend(frameon=False, fontsize=8)
    lift = [100 * (b - a) / a for a, b in zip(post["pa"], post["pb"])]
    ax2.hist(lift, bins=80, density=True, color="#3a5bd9", alpha=0.75)
    ax2.axvline(0, color="#333", lw=1)
    for v in (post["lift_lo"], post["lift_hi"]):
        ax2.axvline(100 * v, color="#3a5bd9", lw=1, ls="--")
    ax2.set_xlabel("Relative lift B vs A (%)")
    ax2.set_yticks([])
    ax2.set_title(f"P(B > A) = {post['p_b_better']:.3f}, 95% CrI dashed")
    for ax in (ax1, ax2):
        for sp in ("top", "right", "left"):
            ax.spines[sp].set_visible(False)
    fig.suptitle("SIMULATED data, not real users: Beta-Binomial posteriors for day-7 retention", fontsize=10)
    fig.tight_layout()
    fig.savefig(path)
    print(f"chart -> {path}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("events")
    ap.add_argument("--draws", type=int, default=100000)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--plot")
    a = ap.parse_args()

    s = summarise(load(a.events))
    A, B = s["old"], s["new"]
    ra, rb = A["retained"] / A["n"], B["retained"] / B["n"]
    print(f"Users: A (old) {A['n']:,}, B (new) {B['n']:,}")
    split = A["n"] / (A["n"] + B["n"])
    srm_p = 2 * (1 - norm_cdf(abs(split - 0.5) / math.sqrt(0.25 / (A["n"] + B["n"]))))
    print(f"Sample ratio: {split:.3f} A share, p = {srm_p:.3f}{'  (SRM warning)' if srm_p < 0.001 else ''}")
    print(f"\nDay-7 retention: A {ra:.2%}  B {rb:.2%}  (abs diff {100 * (rb - ra):+.2f} pts)")

    post = posterior(s, a.draws, a.seed)
    print("\nBayesian (Beta(1,1) prior):")
    print(f"  P(B > A)              {post['p_b_better']:.3f}")
    print(f"  expected lift         {post['lift_mean']:+.1%} relative")
    print(f"  95% credible interval [{post['lift_lo']:+.1%}, {post['lift_hi']:+.1%}]")

    z, p = z_test(A["retained"], A["n"], B["retained"], B["n"])
    se = math.sqrt(ra * (1 - ra) / A["n"] + rb * (1 - rb) / B["n"])
    print("\nFrequentist (two-proportion z-test):")
    print(f"  z = {z:.2f}, p = {p:.4f}, 95% CI abs diff [{100 * (rb - ra - 1.96 * se):+.2f}, {100 * (rb - ra + 1.96 * se):+.2f}] pts")

    print("\nGuardrails:")
    drop = B["abandoned"] / B["n"]
    ok_drop = drop < 0.10
    print(f"  onboarding drop-off (B)    {drop:.1%}  (limit < 10%)  {'PASS' if ok_drop else 'FAIL'}")
    ta, tb = A["typed"] / A["n"], B["typed"] / B["n"]
    change = (tb - ta) / ta
    ok_typed = change > -0.05
    print(f"  typed msgs/user days 0-7   A {ta:.2f}  B {tb:.2f}  ({change:+.1%}, limit > -5%)  {'PASS' if ok_typed else 'FAIL'}")
    za, _ = z_test(A["down"], A["fb"], B["down"], B["fb"])
    ok_down = za < 1.645
    print(f"  thumbs-down on 1st answer  A {A['down'] / A['fb']:.1%}  B {B['down'] / B['fb']:.1%}  (z = {za:.2f})  {'PASS' if ok_down else 'FAIL'}")

    ship = p < 0.05 and rb > ra and ok_drop and ok_typed and ok_down
    print(f"\nDecision rule: {'SHIP' if ship else 'DO NOT SHIP YET'} (significant day-7 lift and all guardrails pass)")
    if a.plot:
        plot(post, s, a.plot)


if __name__ == "__main__":
    main()
