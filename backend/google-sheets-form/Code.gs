/* ============================================================
   Sarah & Spencer — Save the Date
   Guest-form backend: appends every submission as a row in a
   Google Sheet.

   This file is deployed inside Google Apps Script, not run here.
   See README.md in this folder for the one-time setup steps.

   It expects exactly the fields save-the-date.js already sends, via a
   multipart FormData POST — see assets/js/config.js `form.encoding`.

   ⚠️ Editing this file changes nothing on its own. Paste it into the
   Apps Script editor and deploy a NEW version, or the live endpoint
   keeps running whatever was deployed last. The page is written to
   survive that: a field this deployment doesn't know is recorded as an
   extra column, never an error.
   ============================================================ */

var SHEET_NAME = 'Guests';

var COLUMNS = [
  'Timestamp',
  'Name',
  'Email',
  'Phone',
  'Address',
  'Address status',
  'Source',
  'Submission ID'
];

var ID_COLUMN = 8;   // 'Submission ID' above, 1-indexed.

function doPost(e) {
  var p = (e && e.parameter) || {};

  // The page sends one submission more than once whenever the response
  // gets lost on the way back: save-the-date.js retries a failed post
  // once, and re-sends anything still queued on its next page load. Both
  // reuse the same submissionId, so a request that already appended a
  // row lands here again with an id this sheet has seen — append that and
  // Spencer gets the same guest twice. The lock keeps two near-
  // simultaneous copies from both passing the check.
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { /* proceed unlocked */ }

  try {
    var sheet = getSheet_();
    ensureHeader_(sheet);

    if (p.submissionId && hasSubmission_(sheet, p.submissionId)) {
      return json_({ ok: true, duplicate: true });
    }

    sheet.appendRow([
      p.submittedAt ? new Date(p.submittedAt) : new Date(),
      p.name || '',
      p.email || '',
      p.phone || '',
      p.address || '',
      p.addressStatus || '',
      p.source || '',
      p.submissionId || ''
    ]);
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }

  return json_({ ok: true });
}

// Only the id column is read, and only from the data rows — a full
// getDataRange() would pull every address back on every submission.
function hasSubmission_(sheet, id) {
  var rows = sheet.getLastRow() - 1;
  if (rows < 1 || sheet.getLastColumn() < ID_COLUMN) return false;
  var ids = sheet.getRange(2, ID_COLUMN, rows, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return true;
  }
  return false;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
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
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }

  // A sheet started before a column was added to COLUMNS keeps its old,
  // shorter header row, so the new field would land under a blank
  // heading. Label the missing ones in place rather than asking Spencer
  // to fix the row by hand; existing headings are never overwritten.
  var width = sheet.getLastColumn();
  if (width >= COLUMNS.length) return;
  var missing = COLUMNS.slice(width);
  sheet.getRange(1, width + 1, 1, missing.length)
    .setValues([missing])
    .setFontWeight('bold');
}
