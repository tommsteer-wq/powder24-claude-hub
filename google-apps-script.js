/* ============================================================
   POWDER24 × CLAUDE HUB — Google Apps Script

   SETUP INSTRUCTIONS:
   1. Open your Google Sheet
   2. Click Extensions → Apps Script
   3. Delete any existing code and paste ALL of this file in
   4. Click Save (floppy disk icon)
   5. Click Deploy → New deployment  (or Manage deployments → create new version)
   6. Type: Web app
   7. Execute as: Me
   8. Who has access: Anyone
   9. Click Deploy → Copy the Web App URL
   10. Paste that URL into data.js where it says PASTE_YOUR_SCRIPT_URL_HERE
   ============================================================ */

const SPREADSHEET_ID = '1wf7z-RTS74v3oYedc-Xm3saqMwKYsjwjqAYyeiQWbTQ';

const SHEETS = {
  LOGINS:      'Logins',
  AGREEMENTS:  'Agreements',
  CONNECTORS:  'Connectors',
  UPDATES:     'Updates',
  CHECKLIST:   'Checklist',
  TEAM:        'Team',
};

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const configs = [
    { name: SHEETS.LOGINS,     headers: ['Name', 'Login Count', 'Last Seen'] },
    { name: SHEETS.AGREEMENTS, headers: ['Name', 'Signed At'] },
    { name: SHEETS.CONNECTORS, headers: ['Name', 'Connector', 'Value', 'Updated At'] },
    { name: SHEETS.UPDATES,    headers: ['ID', 'Title', 'Body', 'Tag', 'Date', 'Author', 'Timestamp'] },
    { name: SHEETS.CHECKLIST,  headers: ['Name', 'Signed At'] },
    { name: SHEETS.TEAM,       headers: ['Name', 'PIN', 'Added At'] },
  ];
  configs.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
      sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
      sheet.getRange(1, 1, 1, cfg.headers.length)
        .setBackground('#1a1a1a')
        .setFontColor('#00c8c8')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) { setupSheets(); sheet = ss.getSheetByName(name); }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ============================================================
// ALL requests come through doGet — avoids CORS issues
// Action param tells us what to do
// Write actions pass data as URL params too
// ============================================================
function doGet(e) {
  setupSheets();
  const action = e.parameter.action;
  let result;

  try {
    // READ actions
    if      (action === 'getLogins')       result = handleGetLogins();
    else if (action === 'getAgreements')   result = handleGetAgreements();
    else if (action === 'getConnectors')   result = handleGetConnectors();
    else if (action === 'getUpdates')      result = handleGetUpdates();
    // WRITE actions (passed as GET params to avoid CORS)
    else if (action === 'recordLogin')     result = handleRecordLogin(e.parameter);
    else if (action === 'signAgreement')   result = handleSignAgreement(e.parameter);
    else if (action === 'toggleConnector') result = handleToggleConnector(e.parameter);
    else if (action === 'addUpdate')       result = handleAddUpdate(e.parameter);
    else if (action === 'signChecklist')   result = handleSignChecklist(e.parameter);
    else if (action === 'getChecklist')    result = handleGetChecklist();
    else if (action === 'clearLogins')     result = handleClearLogins();
    else if (action === 'getTeam')         result = handleGetTeam();
    else if (action === 'addTeamMember')   result = handleAddTeamMember(e.parameter);
    else if (action === 'removeTeamMember') result = handleRemoveTeamMember(e.parameter);
    else result = { ok: false, error: 'Unknown action: ' + action };
  } catch (err) {
    result = { ok: false, error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// ACTION HANDLERS
// ============================================================

function handleGetLogins() {
  const sheet = getSheet(SHEETS.LOGINS);
  const rows  = sheetToObjects(sheet);
  const data  = {};
  rows.forEach(r => { data[r['Name']] = Number(r['Login Count']) || 0; });
  return { ok: true, data };
}

function handleRecordLogin(params) {
  const name      = params.name;
  const timestamp = params.timestamp || new Date().toISOString();
  const sheet     = getSheet(SHEETS.LOGINS);
  const data      = sheet.getDataRange().getValues();
  const headers   = data[0];
  const nameCol   = headers.indexOf('Name');
  const countCol  = headers.indexOf('Login Count');
  const seenCol   = headers.indexOf('Last Seen');

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][nameCol] === name) {
      sheet.getRange(i + 1, countCol + 1).setValue((Number(data[i][countCol]) || 0) + 1);
      sheet.getRange(i + 1, seenCol + 1).setValue(timestamp);
      found = true; break;
    }
  }
  if (!found) { sheet.appendRow([name, 1, timestamp]); }
  return { ok: true };
}

function handleClearLogins() {
  const sheet   = getSheet(SHEETS.LOGINS);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  return { ok: true };
}

function handleGetTeam() {
  const sheet = getSheet(SHEETS.TEAM);
  const rows  = sheetToObjects(sheet);
  const data  = rows.map(r => ({ name: r['Name'], pin: String(r['PIN'] || '23456') }));
  return { ok: true, data };
}

function handleAddTeamMember(params) {
  const name      = params.name;
  const pin       = params.pin || '23456';
  const timestamp = new Date().toISOString();
  const sheet     = getSheet(SHEETS.TEAM);
  const data      = sheet.getDataRange().getValues();
  // Prevent duplicates
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) return { ok: false, error: 'Name already exists' };
  }
  sheet.appendRow([name, pin, timestamp]);
  return { ok: true };
}

function handleRemoveTeamMember(params) {
  const name  = params.name;
  const sheet = getSheet(SHEETS.TEAM);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'Not found' };
}

function handleGetAgreements() {
  const sheet = getSheet(SHEETS.AGREEMENTS);
  const rows  = sheetToObjects(sheet);
  const data  = {};
  rows.forEach(r => { data[r['Name']] = r['Signed At']; });
  return { ok: true, data };
}

function handleSignAgreement(params) {
  const name      = params.name;
  const timestamp = params.timestamp || new Date().toISOString();
  const sheet     = getSheet(SHEETS.AGREEMENTS);
  const data      = sheet.getDataRange().getValues();
  const headers   = data[0];
  const nameCol   = headers.indexOf('Name');
  for (let i = 1; i < data.length; i++) {
    if (data[i][nameCol] === name) return { ok: true, already: true };
  }
  sheet.appendRow([name, timestamp]);
  return { ok: true };
}

function handleGetConnectors() {
  const sheet = getSheet(SHEETS.CONNECTORS);
  const rows  = sheetToObjects(sheet);
  const data  = {};
  rows.forEach(r => {
    if (!data[r['Name']]) data[r['Name']] = {};
    data[r['Name']][r['Connector']] = r['Value'] === true || r['Value'] === 'true' || r['Value'] === 'TRUE';
  });
  return { ok: true, data };
}

function handleToggleConnector(params) {
  const name      = params.name;
  const connector = params.connector;
  const value     = params.value === 'true' || params.value === true;
  const sheet     = getSheet(SHEETS.CONNECTORS);
  const data      = sheet.getDataRange().getValues();
  const headers   = data[0];
  const nameCol   = headers.indexOf('Name');
  const connCol   = headers.indexOf('Connector');
  const valCol    = headers.indexOf('Value');
  const updCol    = headers.indexOf('Updated At');
  const ts        = new Date().toISOString();

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][nameCol] === name && data[i][connCol] === connector) {
      sheet.getRange(i + 1, valCol + 1).setValue(value);
      sheet.getRange(i + 1, updCol + 1).setValue(ts);
      found = true; break;
    }
  }
  if (!found) { sheet.appendRow([name, connector, value, ts]); }
  return { ok: true };
}

function handleGetUpdates() {
  const sheet = getSheet(SHEETS.UPDATES);
  const rows  = sheetToObjects(sheet);
  return { ok: true, data: rows.map(r => ({
    id: r['ID'], title: r['Title'], body: r['Body'],
    tag: r['Tag'], date: r['Date'], author: r['Author'], timestamp: r['Timestamp'],
  }))};
}

function handleAddUpdate(params) {
  const sheet = getSheet(SHEETS.UPDATES);
  sheet.appendRow([
    params.id, params.title, params.body,
    params.tag, params.date, params.author, params.timestamp
  ]);
  return { ok: true };
}

function handleGetChecklist() {
  const rows = sheetToObjects(getSheet(SHEETS.CHECKLIST));
  const data = {};
  rows.forEach(r => { data[r['Name']] = r['Signed At']; });
  return { ok: true, data };
}

function handleSignChecklist(params) {
  const name = params.name;
  const timestamp = params.timestamp || new Date().toISOString();
  const sheet = getSheet(SHEETS.CHECKLIST);
  const data = sheet.getDataRange().getValues();
  const nameCol = data[0].indexOf('Name');
  for (let i = 1; i < data.length; i++) {
    if (data[i][nameCol] === name) return { ok: true, already: true };
  }
  sheet.appendRow([name, timestamp]);
  return { ok: true };
}
