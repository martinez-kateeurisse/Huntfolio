// The Google Apps Script the user pastes into script.google.com. It runs in
// their own Google account (no Google Cloud project, nothing to renew), finds
// job-related emails, and posts them to /api/inbox. Generated with the user's
// endpoint and secret filled in.

// Gmail search terms for job-related mail. Kept specific so newsletters and
// unrelated email never leave the mailbox.
const SEARCH_TERMS = [
  '"thank you for applying"',
  '"thanks for applying"',
  '"thank you for your application"',
  '"your application"',
  '"application received"',
  '"application was sent"',
  "subject:interview",
  '"interview invitation"',
  '"schedule an interview"',
  '"phone screen"',
  "(assessment (application OR candidate OR position))",
  "(unfortunately (application OR candidacy OR position OR role))",
  '"offer letter"',
  '"pleased to offer"',
  '"job offer"',
];

export function buildAppsScript({
  endpoint,
  token,
}: {
  endpoint: string;
  token: string;
}): string {
  return `// Huntfolio Gmail connector
// Runs in your own Google account. Every hour it looks for job-related emails
// (application confirmations, interview invites, rejections, offers) and sends
// their sender, subject, date and a short excerpt to your Huntfolio. Nothing
// else in your mailbox is read or sent anywhere.
//
// Setup: paste this into a new project at script.google.com, save, choose the
// "setup" function in the toolbar and click Run, then allow access.
// To stop it, delete this project (or its trigger under "Triggers").

const HUNTFOLIO_URL = ${JSON.stringify(endpoint)};
const HUNTFOLIO_KEY = ${JSON.stringify(token)};
const FIRST_RUN_DAYS = 30; // how far back the very first check looks
const SEARCH = ${JSON.stringify(SEARCH_TERMS.join(" OR "))};

// Run once: checks now, then every hour.
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncJobEmails") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncJobEmails").timeBased().everyHours(1).create();
  syncJobEmails();
}

function syncJobEmails() {
  const props = PropertiesService.getScriptProperties();
  const lastRun = Number(props.getProperty("lastRun") || 0);
  // Re-check the last hour too; Huntfolio ignores emails it has already seen.
  const since = lastRun
    ? Math.floor(lastRun / 1000) - 3600
    : Math.floor((Date.now() - FIRST_RUN_DAYS * 86400000) / 1000);
  const me = Session.getActiveUser().getEmail().toLowerCase();

  const query = "after:" + since + " -in:sent -in:drafts -in:spam -in:trash -in:chats (" + SEARCH + ")";
  const messages = [];
  GmailApp.search(query, 0, 200).forEach(function (thread) {
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

  for (let i = 0; i < messages.length; i += 25) {
    send(messages.slice(i, i + 25));
  }
  props.setProperty("lastRun", String(Date.now()));
  console.log("Sent " + messages.length + " job-related email(s) to Huntfolio.");
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
