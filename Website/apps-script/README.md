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

## The "Update thermometer" button

`admin.html` has an **Update thermometer** button for when the total needs to
be live sooner than the next daily run. It shows what the bar is currently
publishing, and after a rebuild it watches `fundraising.json` and reports the
value that actually went live — so it confirms the result rather than just
saying the request was sent. Expect roughly a minute.

The chain is: button → admin Apps Script → GitHub `workflow_dispatch` →
deploy re-reads the sheet → Pages republishes.

### Why the GitHub token goes in Apps Script

`admin.html` is served publicly from hackdiabetes.io. Its password prompt is a
convenience; the file itself is world-readable, so **no token can ever live in
it**. The real authority is the Apps Script, which validates `adminToken`
server-side. The GitHub token sits in that project's Script Properties, where
the browser can never see it.

### Setup (one time)

1. **Create a fine-grained token.** GitHub → *Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token*.
   - **Resource owner:** `nightscout`
   - **Repository access:** *Only select repositories* → `nightscout/HackDiabetes`
   - **Repository permissions:** *Actions: Read and write*. Nothing else — this
     token must not be able to push code.
   - An org-owned repo may need an org owner to approve the token before it
     works.

2. **Store it in the admin Apps Script.** Open the registration/admin script
   (the one behind `AVAILABILITY_URL`), then *Project Settings → Script
   properties → Add script property*:
   - Property: `GITHUB_DISPATCH_TOKEN`
   - Value: the token

3. **Add the action.** Paste
   [`admin-refresh-fundraising.gs`](admin-refresh-fundraising.gs) into that
   project and wire `refreshFundraising()` into `doGet` behind the same
   adminToken check the other admin actions use. The file has an example.

4. **Redeploy** the script so the new action is live. Existing deployment
   URLs stay valid.

Until step 2 and 3 are done the button is harmless: it reports
*"Not set up yet"* and changes nothing.

### Things to know

- **Token expiry.** Fine-grained tokens expire. When it lapses, the button
  reports a failure with status 401 and the daily cron keeps working normally.
  Worth a calendar reminder at whatever expiry you choose.
- **Who can press it.** Anyone with the admin password can trigger a deploy.
  They can already send invites and delete registrations, so this is not a new
  level of trust — but note that the token's blast radius is Actions on this
  one repo, and it cannot modify code.
- **Throttle.** The script refuses a second dispatch within 120 seconds, and
  the workflow's `concurrency: pages` group cancels an in-flight deploy if
  another starts, so double-clicking cannot pile up deploys.
- **It rebuilds the whole site,** not just the number. That is the same deploy
  that runs on any push, so it is safe — but it does publish whatever is
  currently on `main`.

## Updating the total

Nothing to do — edit the spreadsheet as usual and the site picks it up on the
next daily run. To publish it sooner, press **Update thermometer** in the admin
dashboard, or run the **Deploy registration site to GitHub Pages** workflow
manually from the Actions tab.

Keep `FUNDRAISING_RAISED` in `registration/config.js` loosely in sync anyway: it
is what renders on first paint, before the JSON loads, and whenever the daily
fetch has failed.

## Changing the goal

`GOAL` in `fundraising.gs` (redeploy the script) and `FUNDRAISING_GOAL` in
`registration/config.js`. The value from the endpoint wins once the next daily
fetch lands, so update both or the goal will appear to revert.
