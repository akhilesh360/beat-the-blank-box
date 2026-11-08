# Experiment plan: role-based onboarding vs blank box

Status: **plan only.** All numbers below are illustrative inputs, not measured results.

## Hypothesis
If new users pick their role and see 3 ready-to-run tasks for it, more of them will get a useful first answer and come back, raising day-7 retention versus the blank box.

## Design
- **Unit:** new user account, randomised 50/50 at first app open. Existing users excluded.
- **Control (A):** current blank chat box.
- **Treatment (B):** role picker → 3 starter tasks → chat (the prototype in `docs/`).
- **Duration:** enrol until the sample size is reached and at least one full week (weekday mix), then wait 7 more days to read day-7 retention.
- **Analysis:** two-proportion z-test on day-7 retention, alpha 0.05 two-sided, power 0.8. Segment cuts (role, platform) are exploratory only.

## Metrics
| Type | Metric | Definition |
|---|---|---|
| Primary | Day-7 retention | % of new users who send ≥1 message on any of days 1–7 after signup |
| Secondary | First-session tasks completed | `task_completed` events in session 1, per user |
| Secondary | Time to first message | seconds from `onboarding_viewed` to `first_message_sent` (median) |
| Guardrail | Onboarding drop-off | % of B users who view onboarding but never reach chat |
| Guardrail | Typed messages per user (day 0–7) | should not drop: starter tasks shouldn't replace exploring |
| Guardrail | Thumbs-down rate on first answer | quality of the starter answers |
| Guardrail | Latency / error rate of first response | no performance regression |

**Decision rule:** ship if day-7 retention is significantly higher and no guardrail worsens by more than an agreed bound (proposed: drop-off < 10%, typed messages not down > 5%).

## Sample size
`scripts/sample_size.py` computes users per arm for a two-proportion test.

```
$ python3 scripts/sample_size.py --baseline 0.20 --mde 0.02 --daily-users 5000
baseline 20.00% -> target 22.00% (alpha 0.05, power 0.8)
users per arm: 6,510   total: 13,020
enrollment days at 5,000/day: 3 (+7 days to read day-7 retention)
```

The 20% baseline and 5,000 sign-ups/day are **assumptions** for illustration; replace them with real numbers. Halving the MDE to 1 point raises the need to 25,583 per arm.

## Event-tracking spec
All events carry: `user_id`, `session_id`, `timestamp`, `variant` (`old` | `new`), `platform`.

| Event | When | Extra properties |
|---|---|---|
| `onboarding_viewed` | first screen shown | — |
| `onboarding_role_selected` | role tapped (B only) | `role` |
| `starter_tasks_shown` | tasks rendered (B only) | `role`, `task_count`, `task_ids` |
| `starter_task_clicked` | task or chip tapped | `role`, `task_index`, `task_id` |
| `first_message_sent` | first message of the account | `source` (`starter_task` \| `typed`), `ms_since_start` |
| `message_sent` | any typed message | `source`, `length` |
| `task_completed` | answer to a starter task fully shown | `role`, `task_index`, `task_id` |
| `answer_feedback` | thumbs up/down | `rating`, `message_id`, `from_starter_task` |
| `onboarding_abandoned` | session ends before chat (B only) | `last_step` |

Day-7 retention is computed from `message_sent` / `first_message_sent` events, not from app opens.

The prototype fires the first seven events locally in its "Tracked events" panel.

## Risks to validity
- Novelty effect: watch retention on days 8–14 too.
- Sample ratio mismatch: check the 50/50 split daily.
- Role picker answers may be noisy; don't use them to define the primary metric.
