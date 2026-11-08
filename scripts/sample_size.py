"""Sample size per arm for a two-sided test of two proportions.

Usage:
    python3 scripts/sample_size.py --baseline 0.20 --mde 0.02
    python3 scripts/sample_size.py --baseline 0.20 --mde 0.10 --relative

Only the Python standard library is used.
"""
import argparse
import math
from statistics import NormalDist


def n_per_arm(p1: float, p2: float, alpha: float = 0.05, power: float = 0.8) -> int:
    z_a = NormalDist().inv_cdf(1 - alpha / 2)
    z_b = NormalDist().inv_cdf(power)
    p_bar = (p1 + p2) / 2
    num = (z_a * math.sqrt(2 * p_bar * (1 - p_bar))
           + z_b * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    return math.ceil(num / (p2 - p1) ** 2)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--baseline", type=float, required=True, help="control rate, e.g. 0.20")
    ap.add_argument("--mde", type=float, required=True, help="minimum detectable effect")
    ap.add_argument("--relative", action="store_true", help="treat --mde as relative lift")
    ap.add_argument("--alpha", type=float, default=0.05)
    ap.add_argument("--power", type=float, default=0.8)
    ap.add_argument("--daily-users", type=int, default=0, help="new users/day entering the test")
    a = ap.parse_args()

    p2 = a.baseline * (1 + a.mde) if a.relative else a.baseline + a.mde
    if not 0 < a.baseline < 1 or not 0 < p2 < 1:
        ap.error("rates must be between 0 and 1")
    n = n_per_arm(a.baseline, p2, a.alpha, a.power)
    print(f"baseline {a.baseline:.2%} -> target {p2:.2%} (alpha {a.alpha}, power {a.power})")
    print(f"users per arm: {n:,}   total: {2 * n:,}")
    if a.daily_users:
        days = math.ceil(2 * n / a.daily_users)
        print(f"enrollment days at {a.daily_users:,}/day: {days} (+7 days to read day-7 retention)")


if __name__ == "__main__":
    main()
