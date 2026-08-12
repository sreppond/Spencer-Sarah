/* ============================================================
   Sarah & Spencer — Save the Date
   Guest-form backend: appends every submission as a row in a
   Google Sheet.

   This file is deployed inside Google Apps Script, not run here.
   See README.md in this folder for the one-time setup steps.

   It expects exactly the fields save-the-date.js already sends
   (assets/js/save-the-date.js, ~line 1225) via a multipart
   FormData POST — see assets/js/config.js `form.encoding`.
   ============================================================ */

var SHEET_NAME = 'Guests';

var COLUMNS = [
  'Timestamp',
  'Name',
  'Email',
  'Phone',
  'Address',
  'Address status',
  'Source'
];

function doPost(e) {
  var sheet = getSheet_();
  var p = (e && e.parameter) || {};

  ensureHeader_(sheet);

  sheet.appendRow([
    p.submittedAt ? new Date(p.submittedAt) : new Date(),
    p.name || '',
    p.email || '',
    p.phone || '',
    p.address || '',
    p.addressStatus || '',
    p.source || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Lets you open the deployment URL in a browser to sanity-check it's
// live, without needing a real form submission.
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, note: 'Save the date form endpoint is live.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(COLUMNS);
  sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}
