// The Google Apps Script the user pastes into script.google.com. It runs in
// their own Google account (no Google Cloud project, nothing to renew), finds
// job-related emails, and posts them to /api/inbox. Generated with the user's
// endpoint and secret filled in.
//
// The script fetches its search terms from GET /api/inbox on every run, so
// improving the rules here never needs a re-paste. Bump INBOX_RESCAN when a
// rules change should re-read older emails: the next run re-sends the
// lookback window and the server re-queues anything it now reads differently.

// Gmail search terms for job-related mail. Kept specific so newsletters and
// unrelated email never leave the mailbox.
const SEARCH_TERMS = [
  '"thank you for applying"',
  '"thanks for applying"',
  '"thank you for your application"',
  '"your application"',
  '"application received"',
  '"application was sent"',
  '"successfully submitted"',
  '"viewed your application"',
  '"was viewed by"',
  '"getting noticed"',
  '"sent you a message"',
  "subject:interview",
  '"interview invitation"',
  '"schedule an interview"',
  '"phone screen"',
  "(assessment (application OR candidate OR position))",
  "(unfortunately (application OR candidacy OR position OR role))",
  "(unsuccessful (application OR candidacy))",
  '"been filled"',
  '"offer letter"',
  '"pleased to offer"',
  '"job offer"',
];

export const INBOX_SEARCH = SEARCH_TERMS.join(" OR ");
export const INBOX_LOOKBACK_DAYS = 90;
// 2: JobStreet submitted/viewed/message emails and "position filled".
export const INBOX_RESCAN = 2;

export function buildAppsScript({
  endpoint,
  token,
}: {
  endpoint: string;
  token: string;
}): string {
  return `// Huntfolio Gmail connector
// Runs in your own Google account. Every hour it looks for job-related emails
// (confirmations, "viewed your application", employer messages, interview
// invites, rejections, offers) and sends their sender, subject, date and a
// short excerpt to your Huntfolio. Nothing else in your mailbox is read or
// sent anywhere.
//
// Setup: paste this into a project at script.google.com, save, choose the
// "setup" function in the toolbar and click Run, then allow access.
// To stop it, delete this project (or its trigger under "Triggers").

const HUNTFOLIO_URL = ${JSON.stringify(endpoint)};
const HUNTFOLIO_KEY = ${JSON.stringify(token)};
// Used only if Huntfolio can't be reached; normally the latest search terms
// come from Huntfolio itself, so rule improvements never need a re-paste.
const DEFAULT_SEARCH = ${JSON.stringify(INBOX_SEARCH)};
const DEFAULT_LOOKBACK_DAYS = ${INBOX_LOOKBACK_DAYS};
const MAX_THREADS = 500;

// Run once: checks now, then every hour.
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncJobEmails") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncJobEmails").timeBased().everyHours(1).create();
  syncJobEmails();
}

function loadConfig() {
  try {
    const res = UrlFetchApp.fetch(HUNTFOLIO_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
  } catch (e) {
    console.log("Couldn't load Huntfolio's settings, using defaults: " + e);
  }
  return {};
}

function syncJobEmails() {
  const cfg = loadConfig();
  const search = cfg.search || DEFAULT_SEARCH;
  const lookbackDays = cfg.lookbackDays || DEFAULT_LOOKBACK_DAYS;
  const props = PropertiesService.getScriptProperties();

  // When Huntfolio's rules improve it bumps "rescan", and this run re-sends
  // the whole lookback window so older emails are read again.
  const rescan = String(cfg.rescan || 0);
  const isRescan = props.getProperty("rescan") !== rescan;
  const lastRun = isRescan ? 0 : Number(props.getProperty("lastRun") || 0);
  // Otherwise re-check the last hour too; Huntfolio ignores repeats.
  const since = lastRun
    ? Math.floor(lastRun / 1000) - 3600
    : Math.floor((Date.now() - lookbackDays * 86400000) / 1000);
  const me = Session.getActiveUser().getEmail().toLowerCase();

  const query = "after:" + since + " -in:sent -in:drafts -in:spam -in:trash -in:chats (" + search + ")";
  const messages = [];
  for (let start = 0; start < MAX_THREADS; start += 100) {
    const threads = GmailApp.search(query, start, 100);
    threads.forEach(function (thread) {
      thread.getMessages().forEach(function (m) {
        if (m.getDate().getTime() / 1000 < since) return;
        if (me && m.getFrom().toLowerCase().indexOf(me) !== -1) return; // your own replies
        messages.push({
          message_id: m.getId(),
          received_at: m.getDate().toISOString(),
          from: m.getFrom(),
          subject: m.getSubject(),
          body: m.getPlainBody().slice(0, 3000),
        });
      });
    });
    if (threads.length < 100) break;
  }

  for (let i = 0; i < messages.length; i += 25) {
    send(messages.slice(i, i + 25));
  }
  props.setProperty("lastRun", String(Date.now()));
  props.setProperty("rescan", rescan);
  console.log("Sent " + messages.length + " job-related email(s) to Huntfolio" + (isRescan ? " (full re-check)." : "."));
}

function send(batch) {
  const res = UrlFetchApp.fetch(HUNTFOLIO_URL, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + HUNTFOLIO_KEY },
    payload: JSON.stringify({ messages: batch }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    // Leaves lastRun unchanged, so the next hourly run retries these.
    throw new Error("Huntfolio didn't accept the emails (" + res.getResponseCode() + "): " + res.getContentText());
  }
}
`;
}
