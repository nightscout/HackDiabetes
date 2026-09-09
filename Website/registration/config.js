// ── HackDiabetes 26 — Site configuration ──────────────────────────────────
// Set to true to open the interest form, false to show a "not open yet" message.
// Append ?preview=1 to any URL to bypass this flag for testing.
var INTEREST_OPEN = true;

// ── Fundraising thermometer ───────────────────────────────────────────────
// Goal shown on the home-page progress bar.
var FUNDRAISING_GOAL = 75000;

// Fallback total, used for the first paint and if the live fetch fails.
// Source: "2026 Hackathon In-Person Finances" → Fundraising tab → H22.
// Keep roughly in sync; the live endpoint below is the source of truth.
var FUNDRAISING_RAISED = 28980;

// Apps Script Web App that returns {"raised":<number>,"goal":<number>}.
// Leave "" to run on FUNDRAISING_RAISED alone. Deploy instructions:
// Website/apps-script/README.md
var FUNDRAISING_URL = "";
