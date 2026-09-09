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

## Deploy (one time, ~3 minutes)

1. Open <https://script.google.com> → **New project**. Name it
   `HackDiabetes 26 — Fundraising total`.
2. Replace the contents of `Code.gs` with [`fundraising.gs`](fundraising.gs).
3. **Deploy → New deployment → Web app**:
   - **Execute as:** *Me* — this is what keeps the sheet private.
   - **Who has access:** *Anyone* — required for the public site to read it.
     "Anyone" can reach the URL, not the spreadsheet.
4. Authorize when prompted, then copy the `/exec` URL.
5. Paste it into `FUNDRAISING_URL` in
   [`../registration/config.js`](../registration/config.js) and push to `main`. GitHub Pages redeploys
   automatically.

## Updating the total

Nothing to do — edit the spreadsheet as usual and the site follows on the next
page load. Apps Script caches responses briefly, so allow a few minutes.

Keep `FUNDRAISING_RAISED` in `registration/config.js` loosely in sync anyway: it is what
renders on first paint and if the fetch ever fails.

## Changing the goal

`GOAL` in `fundraising.gs` (redeploy the script) and `FUNDRAISING_GOAL` in
`registration/config.js`. The endpoint value wins when both are present.
