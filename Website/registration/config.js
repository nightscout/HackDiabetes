// ── HackDiabetes 26 — Site configuration ──────────────────────────────────
// Set to true to open the interest form, false to show a "not open yet" message.
// Append ?preview=1 to any URL to bypass this flag for testing.
var INTEREST_OPEN = true;

// ── Fundraising thermometer ───────────────────────────────────────────────
// Goal shown on the home-page progress bar.
var FUNDRAISING_GOAL = 75000;

// Fallback total, used for the first paint and if the daily fetch fails.
// Source: "2026 Hackathon In-Person Finances" → Fundraising tab → H22.
// Keep roughly in sync; the spreadsheet is the source of truth.
// Last synced 2026-09-10.
var FUNDRAISING_RAISED = 30230;

// Where the browser reads the total from. This is a static file baked into
// the site by the deploy workflow, which calls the Apps Script endpoint once
// a day -- so visitors never hit the script and it costs no quota per view.
// Generated at deploy time and not committed; missing or stale file simply
// falls back to FUNDRAISING_RAISED above.
// The endpoint itself lives in .github/workflows/deploy-registration.yml.
// See Website/apps-script/README.md.
var FUNDRAISING_URL = "fundraising.json";
