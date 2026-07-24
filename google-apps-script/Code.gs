const SHEET_NAME = '工作表1';
const BASE_HEADERS = ['Company', 'Country', 'Position', 'AppliedDate', 'Status'];
const EMAIL_DATE_COLUMN = 9;
const EMAIL_SUBJECT_COLUMN = 10;
const GMAIL_LOOKBACK_DAYS = 180;
const MAX_GMAIL_THREADS = 100;

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
      const application = {
        company: body.company,
        country: body.country,
        position: body.position,
        appliedDate: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        status: 'Waiting'
      };
      getSheet().appendRow([application.company, application.country, application.position, application.appliedDate, application.status, '', '', '', '', '']);
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
    if (body.action === 'scanGmail') {
      return jsonResponse({ success: true, data: scanGmailAndUpdateApplications() });
    }
    throw new Error('Unsupported action');
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) });
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) sheet.appendRow(BASE_HEADERS);
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), EMAIL_SUBJECT_COLUMN)).getValues()[0];
  BASE_HEADERS.forEach(function(header, index) {
    if (!current[index]) sheet.getRange(1, index + 1).setValue(header);
  });
  if (!current[EMAIL_DATE_COLUMN - 1]) sheet.getRange(1, EMAIL_DATE_COLUMN).setValue('LastEmailAt');
  if (!current[EMAIL_SUBJECT_COLUMN - 1]) sheet.getRange(1, EMAIL_SUBJECT_COLUMN).setValue('LastEmailSubject');
  sheet.setFrozenRows(1);
}

function getApplications() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues().map(function(row) {
    return { company: row[0], country: row[1], position: row[2], appliedDate: formatDate(row[3]), status: row[4] || 'Waiting' };
  });
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(m\/f\/d|m\/w\/d|all genders welcome|all genders|male\/female\/diverse)\b/g, ' ')
    .replace(/[^a-z0-9\u00c0-\u024f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  return { company: values[0], country: values[1], position: values[2], appliedDate: formatDate(values[3]), status: values[4] || 'Waiting' };
}

function scanGmailAndUpdateApplications() {
  const sheet = getSheet();
  const applications = getApplications();
  const query = 'newer_than:' + GMAIL_LOOKBACK_DAYS + 'd -in:sent -category:promotions -category:social';
  const threads = GmailApp.search(query, 0, MAX_GMAIL_THREADS);
  const latestByRow = {};
  let scannedMessages = 0;

  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(message) {
      if (message.isDraft()) return;
      scannedMessages++;
      const subject = message.getSubject() || '';
      const body = (message.getPlainBody() || '').slice(0, 12000);
      const combined = subject + '\n' + body;
      const classification = classifyRecruitingEmail(subject, body);
      if (!classification || classification.confidence < 0.8) return;
      const row = matchApplicationRow(combined, message.getFrom(), applications);
      if (row < 2) return;
      const existing = latestByRow[row];
      if (!existing || message.getDate().getTime() > existing.date.getTime()) {
        latestByRow[row] = { date: message.getDate(), subject: subject.slice(0, 250), status: classification.status };
      }
    });
  });

  const counts = {};
  let updatedApplications = 0;
  Object.keys(latestByRow).forEach(function(rowKey) {
    const row = Number(rowKey);
    const event = latestByRow[row];
    const currentStatus = String(sheet.getRange(row, 5).getValue() || 'Waiting');
    counts[event.status] = (counts[event.status] || 0) + 1;
    if (shouldUpdateStatus(currentStatus, event.status)) {
      sheet.getRange(row, 5).setValue(event.status);
      updatedApplications++;
    }
    sheet.getRange(row, EMAIL_DATE_COLUMN).setValue(
      Utilities.formatDate(event.date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
    );
    sheet.getRange(row, EMAIL_SUBJECT_COLUMN).setValue(event.subject);
  });

  const result = {
    scannedMessages: scannedMessages,
    matchedApplications: Object.keys(latestByRow).length,
    updatedApplications: updatedApplications,
    counts: counts,
    syncedAt: new Date().toISOString()
  };
  PropertiesService.getScriptProperties().setProperty('LAST_GMAIL_SYNC', JSON.stringify(result));
  return result;
}

function classifyRecruitingEmail(subjectValue, bodyValue) {
  const subject = normalizeText(subjectValue);
  const text = normalizeText(subjectValue + '\n' + String(bodyValue || '').slice(0, 6000));
  if (/\b(job alert|jobs you may be interested|recommended jobs|weekly digest|newsletter|new jobs for you)\b/.test(text)) return null;
  if (/\b(we are pleased to offer|offer of employment|job offer|employment offer|offer letter)\b/.test(text)) return { status: 'Offer', confidence: 0.98 };
  const rejection = /\b(unfortunately|regret to inform|not moving forward|will not be moving forward|decided not to proceed|position has been filled|unable to offer you|not selected|move forward with other candidates|pursue other candidates)\b/;
  if (rejection.test(subject) || rejection.test(text)) return { status: 'Rejected', confidence: 0.96 };
  if (/\b(interview|meet with the team|meet the hiring manager|schedule a call|book a call|choose a time|calendar invite|technical interview|screening call)\b/.test(text)) return { status: 'Interview', confidence: 0.93 };
  if (/\b(please reply|reply by|action required|complete the assessment|take home (?:test|assignment|challenge)|coding challenge|provide your availability|send us|additional information|next step)\b/.test(text)) return { status: 'Action Required', confidence: 0.88 };
  if (/\b(application received|thanks for applying|thank you for applying|under review|reviewing your application|received your application|application confirmation)\b/.test(text)) return { status: 'Waiting', confidence: 0.86 };
  return null;
}

function matchApplicationRow(content, from, applications) {
  const text = normalizeText(content + ' ' + from);
  const matches = [];
  const invalidCompanies = /^(career|careers|job|jobs|software engineer|frontend engineer|frontend developer|developer|engineer)$/;
  applications.forEach(function(application, index) {
    const company = normalizeText(application.company);
    if (!company || invalidCompanies.test(company) || !containsNormalizedPhrase(text, company)) return;
    const positionTokens = normalizeText(application.position).split(' ').filter(function(token) {
      return token.length >= 4 && !/^(senior|junior|lead|staff|engineer|developer|manager)$/.test(token);
    });
    const positionScore = positionTokens.filter(function(token) { return text.indexOf(token) !== -1; }).length;
    matches.push({ row: index + 2, positionScore: positionScore });
  });
  if (!matches.length) return -1;
  matches.sort(function(a, b) { return b.positionScore - a.positionScore; });
  if (matches.length > 1 && matches[0].positionScore === matches[1].positionScore) return -1;
  return matches[0].row;
}

function containsNormalizedPhrase(text, phrase) {
  return (' ' + text + ' ').indexOf(' ' + phrase + ' ') !== -1;
}

function shouldUpdateStatus(currentStatus, newStatus) {
  if (currentStatus === newStatus) return false;
  if (newStatus === 'Waiting' && currentStatus !== 'Waiting') return false;
  if ((currentStatus === 'Offer' || currentStatus === 'Rejected') && newStatus !== 'Offer' && newStatus !== 'Rejected') return false;
  return true;
}

function setupGmailSyncTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function(trigger) { return trigger.getHandlerFunction() === 'scanGmailAndUpdateApplications'; })
    .forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('scanGmailAndUpdateApplications').timeBased().everyHours(1).create();
}

function formatDate(value) {
  return value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(value);
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
