const SHEET_NAME = 'Applications';
const HEADERS = ['Company', 'Country', 'Position', 'AppliedDate', 'Status'];

function doGet() {
  try {
    return jsonResponse({ success: true, data: getApplications() });
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'checkDuplicate') {
      const application = findApplication(body.company, body.country, body.position);
      return jsonResponse({ success: true, duplicate: Boolean(application), application: application || null });
    }
    if (body.action === 'createApplication') {
      if (findApplication(body.company, body.country, body.position)) throw new Error('Duplicate application');
      const application = { company: body.company, country: body.country, position: body.position, appliedDate: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'), status: 'Waiting' };
      getSheet().appendRow([application.company, application.country, application.position, application.appliedDate, application.status]);
      return jsonResponse({ success: true, application: application });
    }
    if (body.action === 'updateStatus') {
      const row = findRow(body.company, body.country, body.position);
      if (row < 2) throw new Error('Application not found');
      getSheet().getRange(row, 5).setValue(body.status);
      return jsonResponse({ success: true, application: Object.assign({}, body, { status: body.status }) });
    }
    if (body.action === 'deleteApplication') {
      const row = findRow(body.company, body.country, body.position);
      if (row < 2) throw new Error('Application not found');
      getSheet().deleteRow(row);
      return jsonResponse({ success: true });
    }
    throw new Error('Unsupported action');
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) });
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getApplications() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues().map(function(row) {
    return { company: row[0], country: row[1], position: row[2], appliedDate: formatDate(row[3]), status: row[4] };
  });
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\b(m\/f\/d|m\/w\/d|all genders welcome|all genders|male\/female\/diverse)\b/g, ' ').replace(/[()[\]{}.,:;|–—/\\_+\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function applicationKey(company, country, position) {
  return [company, country, position].map(normalizeText).join('::');
}

function findRow(company, country, position) {
  const target = applicationKey(company, country, position);
  const applications = getApplications();
  for (let index = 0; index < applications.length; index++) {
    const item = applications[index];
    if (applicationKey(item.company, item.country, item.position) === target) return index + 2;
  }
  return -1;
}

function findApplication(company, country, position) {
  const row = findRow(company, country, position);
  if (row < 2) return null;
  const values = getSheet().getRange(row, 1, 1, 5).getValues()[0];
  return { company: values[0], country: values[1], position: values[2], appliedDate: formatDate(values[3]), status: values[4] };
}

function formatDate(value) {
  return value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(value);
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
