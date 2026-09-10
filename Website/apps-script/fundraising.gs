/**
 * HackDiabetes 26 — fundraising total endpoint
 *
 * Returns ONLY the running fundraising total and the goal:
 *   {"raised": 28979.7, "goal": 75000}
 *
 * The finance spreadsheet stays private. This Web App is deployed to run as
 * its owner, so the browser never touches the sheet and no other cell, tab,
 * or attendee record is reachable through this URL.
 *
 * Deploy: see README.md in this folder.
 */

// "2026 Hackathon In-Person Finances"
var SHEET_ID = '1C2G5-bmZKj9vqU7Po6FsP1OUGii7BSCzPcO0PDQWOOA';
var TAB_NAME = 'Fundraising';
var TOTAL_CELL = 'H22';
var GOAL = 75000;

function doGet() {
  var payload;
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
    if (!sheet) throw new Error('tab not found');
    var raised = Number(sheet.getRange(TOTAL_CELL).getValue());
    if (!isFinite(raised)) throw new Error('non-numeric total');
    payload = { raised: Math.round(raised * 100) / 100, goal: GOAL };
  } catch (err) {
    // Never leak sheet internals to the browser; the page falls back to
    // FUNDRAISING_RAISED in config.js when "raised" is absent.
    payload = { error: 'unavailable', goal: GOAL };
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
