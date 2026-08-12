# Guest-form database (Google Sheet)

Every submission on the save-the-date form lands as one row in a Google
Sheet — a plain table, opens in a browser tab, no third-party inbox to
check. This is the backend `assets/js/config.js` already points at in
its `FORM_ENDPOINT` comment; `Code.gs` in this folder is the script that
makes it real.

Columns: `Timestamp · Name · Email · Phone · Address · Address status ·
Source`. `Address status` reads `given`, `pending` (guest tapped "send
the rest and we'll follow up"), or `blank`.

## One-time setup (about five minutes)

1. **Create the sheet.** Go to sheets.google.com → Blank spreadsheet.
   Name it something like "Save the Date — Guest List".

2. **Open the script editor.** Extensions → Apps Script. Delete the
   placeholder `Code.gs` contents and paste in the contents of
   `Code.gs` from this folder.

3. **Deploy as a web app.** Deploy → New deployment → gear icon → Web
   app.
   - Execute as: **Me**
   - Who has access: **Anyone**
     (This only lets people *submit* — running the script — not read
     the sheet. The sheet itself stays private to your Google account
     unless you explicitly share it.)
   - Click Deploy, authorize when prompted (it's your own script), and
     copy the Web app URL. It looks like
     `https://script.google.com/macros/s/AKfycb.../exec`.

4. **Wire it into the site.** Paste that URL into `FORM_ENDPOINT` in
   `assets/js/config.js`:

   ```js
   FORM_ENDPOINT: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```

   Leave `form.encoding` as `'formdata'` — this script reads
   `e.parameter`, which Apps Script populates from a multipart POST.

5. **Test it.** Submit a real entry from the live site (or open the
   deployment URL directly in a browser — it should respond
   `{"ok":true,...}`), confirm a row appears in the **Guests** tab of
   the sheet, then delete that test row.

## Re-deploying after an edit

If you change `Code.gs`, Deploy → Manage deployments → edit (pencil) →
New version → Deploy. Editing the script without cutting a new version
does not update the live `/exec` URL.

## Reading the data

Just open the sheet. Sort, filter, export to CSV, or pipe it into
Sheets' own charts — it's a normal spreadsheet, nothing special about
these rows.
