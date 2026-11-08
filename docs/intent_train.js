// Hand-written labelled phrases for the role classifier (about 20 per role).
// Written for the demo, not collected from users.
(function (root) {
  var TRAIN = {
    analyst: [
      "explain this sql query", "help me write a sql join", "build a dashboard for weekly kpis",
      "which chart should i use for this data", "clean up a messy spreadsheet", "pivot table in excel",
      "summarize these metrics for my manager", "why did conversion drop last week", "write a query to count users by region",
      "make a tableau report", "analyze churn by cohort", "compute a moving average", "find outliers in sales data",
      "explain a regression output", "how do i dedupe rows in sql", "visualize revenue trends", "power bi measure for yoy growth",
      "i work with data and reports", "write a python pandas groupby", "set up an a/b test readout"
    ],
    pm: [
      "write a prd for a new feature", "prioritize my product backlog", "turn meeting notes into a roadmap",
      "draft user stories for checkout", "score features with rice", "write interview questions for customers",
      "plan the next sprint", "define success metrics for a launch", "write a product spec", "compare competitors features",
      "i manage a product team", "draft release notes", "write acceptance criteria", "decide what to build next quarter",
      "summarize user feedback themes", "create a go to market plan for a feature", "stakeholder update on the roadmap",
      "write a one pager for leadership", "map the user journey", "frame the problem statement for a feature"
    ],
    marketer: [
      "write email subject lines", "draft a linkedin post", "brainstorm campaign ideas", "write ad copy for facebook",
      "plan a content calendar", "improve our landing page headline", "seo keywords for a blog post", "write a newsletter",
      "social media captions for a launch", "i run marketing at a startup", "write a tagline for our brand",
      "plan an instagram campaign", "rewrite this for twitter", "write a press release", "increase email open rates",
      "draft a webinar invite", "write product launch copy", "segment our audience for a campaign", "write a blog intro",
      "ideas for a brand awareness campaign"
    ],
    student: [
      "explain this concept simply", "help me study for my exam", "make a study plan", "quiz me on biology",
      "summarize this chapter", "help with my homework", "explain photosynthesis", "write an essay outline",
      "i am a college student", "practice questions for calculus", "explain the french revolution", "make flashcards",
      "proofread my essay", "how do i cite sources in apa", "explain derivatives like i am new", "help me understand statistics class",
      "prepare for my midterm", "explain this physics problem", "tips for my thesis", "study schedule for finals week"
    ],
    engineer: [
      "explain this error message", "write a unit test", "debug my react component", "review my pull request",
      "fix a null pointer exception", "write a python function", "refactor this javascript", "explain this stack trace",
      "set up a docker container", "write an api endpoint", "i am a software developer", "optimize this slow code",
      "write a bash script", "explain git rebase", "fix my typescript type error", "design a database schema for an app",
      "write a regex for emails", "deploy to kubernetes", "why does my build fail", "code review for my function"
    ],
    recruiter: [
      "write a job description", "draft an outreach message to a candidate", "screen resumes for a role",
      "write interview questions for a candidate", "i hire engineers", "write a job post intro", "source candidates on linkedin",
      "write a rejection email to a candidate", "boolean search for sourcing", "draft an offer letter", "schedule interviews with candidates",
      "i work in talent acquisition", "write a recruiting email", "evaluate a candidate scorecard", "attract more applicants",
      "write a referral request", "summarize a candidate profile", "hiring plan for next quarter", "write a careers page blurb",
      "follow up with a candidate after interview"
    ]
  };
  // Domain keywords per role, written by hand. Added to the training counts as
  // pseudo-documents so words never seen in a phrase still carry signal.
  var LEXICON = {
    analyst: "sql query dashboard chart spreadsheet excel pivot metric kpi tableau looker bi power cohort churn regression pandas dataset analysis analytics report trend outlier average ab test conversion data",
    pm: "prd roadmap backlog sprint spec story stories feature prioritize rice okr launch stakeholder requirement acceptance criteria release product discovery user journey persona jira",
    marketer: "email subject campaign ad copy seo content calendar newsletter social instagram twitter tiktok linkedin post brand tagline headline landing page press webinar audience open rate blog caption",
    student: "exam study homework essay quiz chapter class course midterm final thesis flashcard tutor lecture assignment cite apa professor school college university learn grade",
    engineer: "error bug debug code test unit function api endpoint react javascript typescript python bash script docker kubernetes git pull request refactor stack trace regex build deploy compile schema exception",
    recruiter: "job description candidate resume cv hire hiring recruit recruiting sourcing source offer interview applicant talent acquisition referral careers outreach screen rejection role opening"
  };
  if (typeof module !== "undefined" && module.exports) module.exports = { TRAIN: TRAIN, LEXICON: LEXICON };
  else { root.INTENT_TRAIN = TRAIN; root.INTENT_LEXICON = LEXICON; }
})(this);
