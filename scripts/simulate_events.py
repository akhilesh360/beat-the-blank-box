"""SIMULATED event data for testing the analysis pipeline. NOT real users.

Writes an events CSV in the schema from docs/experiment.md, with one row per event:
user_id, session_id, timestamp, variant, platform, event, properties (JSON).

Every rate below is an assumption chosen for the simulation:
  day-7 retention   A (old) 20%, B (new) 22%
  onboarding drop   B only, 6% (drop-offs never return, so observed B retention lands below 22%)
  typed messages    days 0-7, Poisson-ish mean 3.0 in both arms
  thumbs-down rate  first answer, 12% in both arms

Usage: python3 scripts/simulate_events.py --users 13020 --seed 7 --out data/simulated_events.csv
"""
import argparse
import csv
import json
import os
import random
from datetime import datetime, timedelta

RATES = {
    "old": {"d7": 0.20, "drop": 0.0, "typed_mean": 3.0, "thumbs_down": 0.12},
    "new": {"d7": 0.22, "drop": 0.06, "typed_mean": 3.0, "thumbs_down": 0.12},
}
ROLES = ["analyst", "pm", "marketer", "student", "engineer", "recruiter"]


def poisson(rng, lam):
    # Knuth; fine for small lambda.
    l, k, p = pow(2.718281828459045, -lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= l:
            return k
        k += 1


def simulate(n_users, seed):
    rng = random.Random(seed)
    start = datetime(2026, 1, 5, 9, 0, 0)
    rows = []

    def add(uid, sess, ts, variant, platform, event, props=None):
        rows.append([uid, sess, ts.isoformat(), variant, platform, event, json.dumps(props or {})])

    for i in range(n_users):
        uid = f"u{i:06d}"
        variant = "new" if rng.random() < 0.5 else "old"
        r = RATES[variant]
        platform = rng.choice(["web", "ios", "android"])
        t0 = start + timedelta(minutes=rng.randrange(0, 3 * 24 * 60))
        sess = f"{uid}-s0"
        add(uid, sess, t0, variant, platform, "onboarding_viewed")

        source = "typed"
        if variant == "new":
            if rng.random() < r["drop"]:
                add(uid, sess, t0 + timedelta(seconds=20), variant, platform, "onboarding_abandoned", {"last_step": "role"})
                continue
            role = rng.choice(ROLES)
            add(uid, sess, t0 + timedelta(seconds=5), variant, platform, "onboarding_role_selected", {"role": role})
            add(uid, sess, t0 + timedelta(seconds=6), variant, platform, "starter_tasks_shown", {"role": role, "task_count": 3})
            if rng.random() < 0.7:
                source = "starter_task"
                add(uid, sess, t0 + timedelta(seconds=15), variant, platform, "starter_task_clicked", {"role": role, "task_index": rng.randrange(3)})

        t1 = t0 + timedelta(seconds=30)
        add(uid, sess, t1, variant, platform, "first_message_sent", {"source": source, "ms_since_start": 30000})
        add(uid, sess, t1 + timedelta(seconds=5), variant, platform, "answer_feedback",
            {"rating": "down" if rng.random() < r["thumbs_down"] else "up", "from_starter_task": source == "starter_task"})

        # Typed messages on day 0.
        for k in range(poisson(rng, r["typed_mean"] * 0.6)):
            add(uid, sess, t1 + timedelta(minutes=1 + k), variant, platform, "message_sent", {"source": "typed", "length": rng.randint(10, 200)})
        # Return visit on days 1-7 decides day-7 retention.
        if rng.random() < r["d7"]:
            day = rng.randint(1, 7)
            ts = t0 + timedelta(days=day, minutes=rng.randrange(0, 600))
            for k in range(max(1, poisson(rng, r["typed_mean"] * 0.4 / r["d7"]))):
                add(uid, f"{uid}-s{day}", ts + timedelta(minutes=k), variant, platform, "message_sent", {"source": "typed", "length": rng.randint(10, 200)})
    rows.sort(key=lambda x: x[2])
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--users", type=int, default=13020)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="data/simulated_events.csv")
    a = ap.parse_args()
    rows = simulate(a.users, a.seed)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["user_id", "session_id", "timestamp", "variant", "platform", "event", "properties"])
        w.writerows(rows)
    print(f"SIMULATED data: {a.users:,} users, {len(rows):,} events -> {a.out}")


if __name__ == "__main__":
    main()
