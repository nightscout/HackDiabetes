# Fundraising total endpoint

The home-page thermometer reads the running total from the **Fundraising** tab,
cell **H22**, of *2026 Hackathon In-Person Finances*.

That spreadsheet also holds attendee names, emails, phone numbers, and
scholarship decisions, so it must **never** be published to the web — not even
one tab. Google's "Publish to web" is the wrong tool here. Instead, a small
Apps Script Web App runs as its owner, reads that single cell, and returns
nothing else:

```json
{ "raised": 28979.7, "goal": 75000 }
```

The browser only ever sees those two numbers.

## One call a day, not one per visitor

Visitors do **not** hit this endpoint. The deploy workflow calls it once a day,
validates the response, and writes `Website/registration/fundraising.json` into
the published site; the thermometer reads that static file.

That matters because Apps Script quota is charged to the owner's account and is
shared across all their scripts — including the ones behind registration and the
admin dashboard. Putting a script call on every page view of a public site would
spend that shared quota on traffic, and a busy day could start failing requests
for the tooling that actually needs them.

Practical consequences:

- The total refreshes daily, not instantly. A deploy (any push to
  `Website/registration/**`, or a manual **Run workflow**) also refreshes it, so
  use that when you need the new number up immediately after a big donation.
- `fundraising.json` is generated, gitignored, and never committed. It does not
  exist when you serve the folder locally; the bar just falls back to
  `FUNDRAISING_RAISED` in `config.js`.
- If the fetch fails or returns anything without a numeric `raised`, the step
  logs a warning, writes nothing, and the deploy proceeds on the fallback. A
  broken script can never fail a deploy or blank the bar.

The schedule and the endpoint URL both live in
`.github/workflows/deploy-registration.yml`.

## Deploy (one time, ~3 minutes)

1. Open <https://script.google.com> → **New project**. Name it
   `HackDiabetes 26 — Fundraising total`.
2. Replace the contents of `Code.gs` with [`fundraising.gs`](fundraising.gs).
3. **Deploy → New deployment → Web app**:
   - **Execute as:** *Me* — this is what keeps the sheet private.
   - **Who has access:** *Anyone* — required for the public site to read it.
     "Anyone" can reach the URL, not the spreadsheet.
4. Authorize when prompted, then copy the `/exec` URL.
5. Put it in `FUNDRAISING_SCRIPT_URL` in
   `.github/workflows/deploy-registration.yml` and push to `main`.

   (`FUNDRAISING_URL` in `config.js` is a different thing — it points the
   browser at the generated `fundraising.json`, not at the script.)

## Updating the total

Nothing to do — edit the spreadsheet as usual and the site picks it up on the
next daily run. To publish it sooner, run the **Deploy registration site to
GitHub Pages** workflow manually from the Actions tab.

Keep `FUNDRAISING_RAISED` in `registration/config.js` loosely in sync anyway: it
is what renders on first paint, before the JSON loads, and whenever the daily
fetch has failed.

## Changing the goal

`GOAL` in `fundraising.gs` (redeploy the script) and `FUNDRAISING_GOAL` in
`registration/config.js`. The value from the endpoint wins once the next daily
fetch lands, so update both or the goal will appear to revert.
