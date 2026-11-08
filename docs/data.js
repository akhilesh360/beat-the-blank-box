// Role -> 3 starter tasks. Answers are canned examples written for the demo.
window.ROLES = [
  { id: "analyst", icon: "📊", label: "Data analyst", tasks: [
    { title: "Explain a SQL query", hint: "Paste a query, get it in plain English",
      prompt: "Explain what this SQL does, step by step:\nSELECT region, COUNT(DISTINCT user_id) FROM orders WHERE created_at >= '2026-01-01' GROUP BY region;",
      answer: "This query counts unique customers per region since Jan 1, 2026.\n\n1. FROM orders: reads the orders table.\n2. WHERE created_at >= '2026-01-01': keeps only orders from this year.\n3. GROUP BY region: makes one bucket per region.\n4. COUNT(DISTINCT user_id): counts each customer once per region, even if they ordered many times.\n\nTip: add ORDER BY 2 DESC to see the biggest regions first." },
    { title: "Draft a weekly metrics summary", hint: "Turn numbers into a short update",
      prompt: "Write a 4-line weekly update for my manager: signups 1,240 (+8%), activation 41% (-2 pts), churn 3.1% (flat).",
      answer: "Weekly update\n- Signups grew 8% to 1,240.\n- Activation slipped 2 points to 41%. I'm checking whether the new signup form is the cause.\n- Churn held at 3.1%.\n- Next: activation deep-dive by channel, results Thursday." },
    { title: "Pick the right chart", hint: "Describe your data, get a recommendation",
      prompt: "I have monthly revenue for 5 product lines over 2 years. What chart should I use and why?",
      answer: "Use a line chart with one line per product line.\n\nWhy: time on the x-axis, 24 points per series, and 5 series is few enough to read. If one line dwarfs the others, use small multiples (5 mini line charts sharing an axis) instead. Avoid stacked areas unless the total matters more than each line." }
  ]},
  { id: "pm", icon: "🧭", label: "Product manager", tasks: [
    { title: "Turn notes into a PRD outline", hint: "Messy notes in, structure out",
      prompt: "Turn these notes into a one-page PRD outline: users forget saved carts, want reminders, worried about spam, mobile first.",
      answer: "PRD: Saved-cart reminders\n- Problem: users forget items they saved.\n- Users: mobile shoppers with a saved cart.\n- Goal: more saved carts become orders.\n- Proposal: one push reminder 24h after saving; opt-out in one tap.\n- Not doing: email blasts, discounts.\n- Metric: saved-cart conversion. Guardrail: notification opt-out rate.\n- Open question: what is the right delay?" },
    { title: "Write user interview questions", hint: "Get a non-leading question list",
      prompt: "Give me 5 non-leading interview questions about how people plan grocery shopping.",
      answer: "1. Walk me through the last time you bought groceries.\n2. How did you decide what to buy?\n3. What happened the last time you forgot something?\n4. What tools, if any, did you use to plan?\n5. What would you change about how that trip went?" },
    { title: "Prioritize a backlog", hint: "Score features with RICE",
      prompt: "Score these with RICE and rank them: dark mode, CSV export, SSO login.",
      answer: "Example scores (replace with your real numbers):\n- SSO login: reach 300, impact 3, confidence 80%, effort 3 -> 240\n- CSV export: reach 800, impact 1, confidence 90%, effort 1 -> 720\n- Dark mode: reach 2,000, impact 0.5, confidence 70%, effort 2 -> 350\n\nRank: CSV export, dark mode, SSO. SSO may still win if it blocks enterprise deals; that is a strategy call, not a formula." }
  ]},
  { id: "marketer", icon: "📣", label: "Marketer", tasks: [
    { title: "Write 3 subject lines", hint: "For an email you're sending this week",
      prompt: "Write 3 email subject lines for a webinar on budgeting for freelancers. Keep them under 50 characters.",
      answer: "1. Freelancers: build a budget that bends\n2. Irregular income? Here's your plan\n3. 45 minutes to calmer money months" },
    { title: "Rewrite for a different channel", hint: "Same message, new format",
      prompt: "Rewrite this as a LinkedIn post: 'Our new invoicing feature sends reminders automatically.'",
      answer: "Chasing late invoices is nobody's favorite job.\n\nStarting today, our invoicing tool sends polite reminders for you, on a schedule you set. You get paid; you skip the awkward emails.\n\nTry it on your next invoice." },
    { title: "Brainstorm campaign angles", hint: "Fresh ideas for a launch",
      prompt: "Give me 4 campaign angles for launching a reusable water bottle to college students.",
      answer: "1. Cost: 'Pays for itself by midterms.'\n2. Campus life: fits every cup holder from library to gym.\n3. Personal: custom stickers contest per dorm.\n4. Impact: dorm-vs-dorm plastic-saved leaderboard." }
  ]},
  { id: "student", icon: "🎓", label: "Student", tasks: [
    { title: "Explain a concept simply", hint: "Like a patient tutor",
      prompt: "Explain opportunity cost like I'm new to economics, with one everyday example.",
      answer: "Opportunity cost is what you give up when you choose one thing over another.\n\nExample: you spend Saturday at a part-time job earning $80 instead of going to a concert. The opportunity cost of working is the concert; the opportunity cost of the concert is the $80." },
    { title: "Make a study plan", hint: "From exam date to daily plan",
      prompt: "My statistics exam is in 5 days. Make a simple daily study plan, 2 hours a day.",
      answer: "Day 1: review notes, list weak topics.\nDay 2: probability and distributions, 10 practice problems.\nDay 3: hypothesis tests, 10 problems.\nDay 4: regression, plus one timed past paper.\nDay 5: redo every problem you missed. Sleep early." },
    { title: "Quiz me", hint: "Practice questions with answers",
      prompt: "Quiz me with 3 multiple-choice questions on the water cycle. Hide the answers at the end.",
      answer: "1. Water turning into vapor is called: a) condensation b) evaporation c) precipitation\n2. Clouds form through: a) condensation b) runoff c) infiltration\n3. Rain, snow and hail are all: a) transpiration b) precipitation c) collection\n\nAnswers: 1b, 2a, 3b" }
  ]},
  { id: "engineer", icon: "🛠️", label: "Software engineer", tasks: [
    { title: "Explain an error message", hint: "Paste the error, get likely causes",
      prompt: "What usually causes 'TypeError: Cannot read properties of undefined (reading \"map\")' in React?",
      answer: "You called .map on something that is undefined, usually data that hasn't loaded yet.\n\nCommon fixes:\n1. Default the state: useState([]) instead of useState().\n2. Guard the render: {items?.map(...)}\n3. Check the API shape; maybe the list lives at data.items, not data." },
    { title: "Write a unit test", hint: "Give a function, get tests",
      prompt: "Write Jest tests for: function slugify(s) { return s.toLowerCase().trim().replace(/\\s+/g, '-'); }",
      answer: "test('lowercases', () => expect(slugify('Hello')).toBe('hello'));\ntest('trims', () => expect(slugify('  hi  ')).toBe('hi'));\ntest('joins spaces', () => expect(slugify('a  b c')).toBe('a-b-c'));\ntest('empty string', () => expect(slugify('')).toBe(''));" },
    { title: "Review a pull request description", hint: "Make it clearer for reviewers",
      prompt: "Improve this PR description: 'fixed stuff with login, also some refactor'.",
      answer: "Title: Fix login redirect loop; extract auth helpers\n\nWhat: users with expired sessions were redirected back to /login forever. Now the expired token is cleared before redirect.\nAlso: moved token helpers into auth/utils.ts (no behavior change).\nTesting: added a test for the expired-token path." }
  ]},
  { id: "recruiter", icon: "🤝", label: "Recruiter", tasks: [
    { title: "Write a job post intro", hint: "A clear, human opening",
      prompt: "Write a 3-sentence intro for a Junior Data Analyst job post at a healthcare startup.",
      answer: "We help clinics spend less time on paperwork and more time with patients. As our Junior Data Analyst, you'll turn appointment and billing data into answers our team uses every week. You'll learn fast, work with SQL and dashboards daily, and see your work change real decisions." },
    { title: "Draft an outreach message", hint: "Short, specific, not spammy",
      prompt: "Write a short LinkedIn message to a backend engineer about a remote role. Under 70 words.",
      answer: "Hi Sam, I saw your work on payment APIs and thought of a remote backend role we're hiring for: Go, Postgres, a small team that ships weekly. Pay range is listed upfront. If you're open to a 15-minute chat, I'd love to share more. If not, no worries at all." },
    { title: "Build interview questions", hint: "Structured, tied to the role",
      prompt: "Give me 4 structured interview questions for a customer support lead, with what a good answer shows.",
      answer: "1. Tell me about a time you handled an angry customer. Good: stays calm, owns next steps.\n2. How did you cut response time on a past team? Good: uses data, names the change.\n3. How do you coach a struggling agent? Good: specific, kind, follows up.\n4. What would you track in your first 30 days? Good: picks a few metrics and says why." }
  ]}
];

window.BLANK_ANSWER = "I can help with that. Could you tell me more about what you're working on?";
