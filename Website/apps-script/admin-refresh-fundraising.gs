/**
 * HackDiabetes 26 — "Update thermometer" admin action
 *
 * ⚠ This goes in the REGISTRATION / ADMIN Apps Script — the one behind
 * AVAILABILITY_URL in admin.html, which already handles adminLogin,
 * getRegistrations and getInterests. It does NOT go in fundraising.gs.
 * That project's source is not in this repo, so paste this in by hand.
 *
 * What it does: dispatches the deploy-registration workflow on GitHub, which
 * re-reads the fundraising total and republishes the site. This is the only
 * way to move the public bar between daily runs, because the bar reads a
 * static file baked in at deploy time.
 *
 * Why the token lives here: admin.html is served publicly from
 * hackdiabetes.io, so anything in that file is readable by anyone. Apps
 * Script properties are server-side and never reach the browser.
 *
 * Setup is in README.md, under "The Update thermometer button".
 */

var GH_OWNER = 'nightscout';
var GH_REPO = 'HackDiabetes';
var GH_WORKFLOW = 'deploy-registration.yml';
var GH_REF = 'main';

// Each dispatch costs an Actions run and a Pages deploy, so throttle it.
var FUNDRAISING_REFRESH_COOLDOWN = 120; // seconds

/**
 * Call this from doGet AFTER the adminToken has been validated, the same way
 * the other admin-only actions are gated. For example:
 *
 *   if (action === 'refreshFundraising') {
 *     if (!isValidAdminToken(e.parameter.adminToken)) {
 *       return jsonOut({ error: 'unauthorized' });
 *     }
 *     return jsonOut(refreshFundraising());
 *   }
 *
 * Substitute whatever this project already uses to validate the token and to
 * return JSON — do not introduce a second auth path.
 */
function refreshFundraising() {
  var cache = CacheService.getScriptCache();
  if (cache.get('fundraisingRefreshLock')) {
    return { error: 'cooldown', retryAfterSeconds: FUNDRAISING_REFRESH_COOLDOWN };
  }

  var token = PropertiesService.getScriptProperties()
    .getProperty('GITHUB_DISPATCH_TOKEN');
  if (!token) return { error: 'not_configured' };

  var url = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO +
            '/actions/workflows/' + GH_WORKFLOW + '/dispatches';

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ ref: GH_REF }),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();

  // GitHub answers a successful dispatch with 204 No Content.
  if (code === 204) {
    cache.put('fundraisingRefreshLock', '1', FUNDRAISING_REFRESH_COOLDOWN);
    return { ok: true };
  }

  // Log the detail for whoever is debugging, but return only a status code --
  // GitHub's error bodies can echo back token and repo details.
  console.error('Fundraising dispatch failed: ' + code + ' ' + res.getContentText());
  return { error: 'dispatch_failed', status: code };
}
