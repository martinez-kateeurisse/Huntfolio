// Pure keyword rules that turn a job-related email into something Huntfolio
// can act on: what kind of email it is, which company and role it's about, and
// (for invites) when the interview is. No I/O and no AI — email text never
// leaves the app. Rules err on the side of "not sure" (null) because the
// results update the tracker automatically.

import type { InterviewType } from "@/lib/constants";

export type EmailKind =
  | "applied"
  | "viewed" // the employer opened your application (JobStreet, LinkedIn)
  | "message" // the employer wrote to you, without a clear outcome
  | "screening"
  | "interview"
  | "offer"
  | "rejection";

export type RawEmail = {
  from: string; // "Name <email>" as Gmail reports it
  subject: string;
  body: string; // plain-text excerpt
  receivedAt: string; // ISO
};

export type ClassifiedEmail = {
  kind: EmailKind | null; // null = nothing to track
  company: string | null;
  roleTitle: string | null;
  interviewAt: string | null; // ISO, only when both a date and time were found
  interviewType: InterviewType | null;
  fromName: string | null;
  fromEmail: string | null;
  snippet: string;
};

// ---- what kind of email is it? -------------------------------------------

// Job alerts and newsletters mention applying/interviews but aren't about an
// application of yours. Checked against the subject only: real confirmation
// emails often carry "more jobs for you" footers.
const NOISE_SUBJECT =
  /job alert|jobs? (for|matching|similar to)|recommended (jobs|for you)|new jobs|is hiring|jobs you may|top job picks|people also viewed|newsletter|webinar|weekly digest/i;

const REJECTION =
  /not (to )?(be )?mov(e|ing) forward|decided (not )?to (move|proceed) forward with (other|another)|(move|moving|proceed) forward with other candidates|other candidates (whose|who)|(have|has) not been selected|were not selected|will not be (progressing|proceeding|moving forward)|regret to inform|(position|role|vacancy) (has|have) (already |now )?been filled|already been filled|(application|candidacy) (was|has been|is) unsuccessful|not been successful|no longer (being )?considered|pursue other candidates|not (be )?a (fit|match) at this time/i;
// A bare "unfortunately" only counts when it's clearly about the application
// (and not, say, an interviewer rescheduling).
const SOFT_REJECTION = /\bunfortunately\b[^.]{0,160}\b(application|candidacy|applying|position|role|profile)\b/i;
const RESCHEDULE = /reschedul|postpone|move (our|the) (call|interview)/i;

const OFFER =
  /pleased to (extend|offer)|offer (letter|of employment)|job offer|employment offer|(would|we'?d) like to offer you|extend (you )?an offer|congratulations[^.]{0,80}\boffer\b/i;

const INTERVIEW =
  /invit(e|ing) you (to|for) (an? )?(interview|call|meeting|chat|conversation)|schedul(e|ing) (an?|your|the) (interview|call)|interview (invitation|invite|schedule|confirmation|details)|would like to (interview|speak with|meet) you|(book|pick|choose|select) a (time|slot)|calendly\.com|availability for (an? )?(interview|call)|next round|panel interview/i;

const SCREENING =
  /(online|technical|coding|skills?|aptitude) (assessment|test|exam|challenge)|take[- ]home|hackerrank|codility|testgorilla|coderbyte|phone screen|screening (call|interview)|initial (call|screening)/i;

// "Maxicare viewed your application", "Your application was viewed by Acme".
// Profile views aren't about a specific application, so they don't count.
const VIEWED =
  /\bviewed your (application|resume|cv)\b|your (application|resume|cv) was viewed|you[’']?re getting noticed/i;

// An employer wrote to you (JobStreet/LinkedIn messages, "replied to your
// application"). Only used when nothing more specific matched.
const MESSAGE =
  /has sent you a (new )?message|sent you a (new )?message|you have a new message from|replied to your application|responded to your application/i;

const APPLIED =
  /thank(s| you) for (applying|your application|your interest in)|application (has been |was )?(received|submitted|sent)|(we[’']?ve|we have|have) received your application|your application (to|for|was sent|has been)|successfully (applied|submitted)|application confirmation/i;

// Most decisive first: an outcome beats a view, a view beats a plain
// confirmation (view emails also say "your application").
function kindOf(subject: string, text: string): EmailKind | null {
  if (NOISE_SUBJECT.test(subject)) return null;
  if (REJECTION.test(text) || (SOFT_REJECTION.test(text) && !RESCHEDULE.test(text))) {
    return "rejection";
  }
  if (OFFER.test(text)) return "offer";
  if (/\binterview\b/i.test(subject) || INTERVIEW.test(text)) return "interview";
  if (SCREENING.test(text)) return "screening";
  if (VIEWED.test(text)) return "viewed";
  if (MESSAGE.test(text)) return "message";
  if (APPLIED.test(text)) return "applied";
  return null;
}

// ---- who is it from? -----------------------------------------------------

export function parseFrom(from: string): { name: string | null; email: string | null } {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  if (match) {
    return { name: match[1].trim() || null, email: match[2].trim().toLowerCase() };
  }
  const bare = from.trim();
  return bare.includes("@")
    ? { name: null, email: bare.toLowerCase() }
    : { name: bare || null, email: null };
}

// Senders that are job boards, applicant-tracking, testing or scheduling
// tools — not the employer.
const PLATFORM_DOMAINS =
  /(greenhouse|lever|workday|myworkday|smartrecruiters|ashbyhq|bamboohr|icims|jobvite|teamtailor|workable|breezy|recruitee|jazzhr|linkedin|jobstreet|indeed|kalibrr|glassdoor|ziprecruiter|seek|monster|hirebridge|successfactors|taleo|oraclecloud|rippling|personio|hrmos|hackerrank|codility|testgorilla|coderbyte|codesignal|calendly|zoom)\./i;
const PERSONAL_DOMAINS =
  /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|icloud|me|proton|protonmail|aol)\./i;
const SENDER_NOISE =
  /\s*[-|,·]?\s*\b(careers?|recruiting|recruitment|talent( acquisition)?|hiring( team)?|human resources|hr|jobs|people( team)?|team|via linkedin|no-?reply|notifications?)\b.*$/i;
// Names that show up where a company would, but never are one.
const PLATFORM_NAMES =
  /^(linkedin|jobstreet|indeed|workday|greenhouse|lever|kalibrr|glassdoor|smartrecruiters|no-?reply|google( calendar| meet)?|calendar|zoom|microsoft teams|teams|calendly|outlook)\b/i;

function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function companyFromDomain(email: string | null): string | null {
  if (!email) return null;
  const domain = email.split("@")[1];
  if (!domain || PLATFORM_DOMAINS.test(domain) || PERSONAL_DOMAINS.test(domain)) {
    return null;
  }
  // careers.acme.com.ph -> acme
  const parts = domain
    .split(".")
    .filter((p) => !/^(mail|email|e|careers?|jobs|hr|talent|recruiting|notify|no-?reply|info|com|co|net|org|io|ai|ph|uk|sg|au|us|dev|app|tech)$/i.test(p));
  const core = parts[parts.length - 1];
  return core && core.length > 1 ? titleCase(core) : null;
}

// ---- which company / role? -----------------------------------------------

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
// Whole words only, so "Acme", "Theorem" or "Mayer" aren't rejected for
// their first letters.
const NOT_A_COMPANY =
  /^(the|this|our|your|a|an|least|once|times?|jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?|mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(rs(day)?)?|fri(day)?|sat(urday)?|sun(day)?)\b/i;
// Starts with a capital letter, so "at 10am" or "at least" never qualify.
const NAME = "([A-Z][A-Za-z0-9&.'’\\- ]{1,50}?)";
const END = "(?=\\s*(?:[.!,:;|()\\n]|$|\\s-\\s|\\s–\\s|\\s(?:has|was|is|for|and|on|team)\\b))";

// Phrasings that almost always name the employer.
const STRONG_PATTERNS = [
  // "…was successfully submitted to RIA Advisory LLC." / "…was sent to Acme"
  new RegExp(`(?:submitted|sent)\\s+to\\s+${NAME}${END}`),
  new RegExp(`(?:applying|application|applied|interest)\\s+(?:to|with|at)\\s+${NAME}${END}`),
  // "Maxicare Healthcare Corporation has viewed your application"
  new RegExp(`${NAME}\\s+(?:has\\s+)?viewed your (?:application|resume|cv)`),
  // "Your application was viewed by Acme"
  new RegExp(`was viewed by\\s+${NAME}${END}`),
  // "Julie . from Maxicare Healthcare Corporation has sent you a message"
  new RegExp(`\\b(?:from|at)\\s+${NAME}\\s+has sent you`),
];
// Job-board relay senders: "Julie Ann . at Maxicare Healthcare Corporation via Jobstreet".
const VIA_SENDER = new RegExp(`\\b(?:at|from)\\s+${NAME}\\s+via\\s+[A-Za-z]+\\s*$`);
// Looser ones ("Role at X", "from X", "interview with X") can also catch a
// person or a tool, so they rank below the sender's own domain.
const WEAK_PATTERNS = [
  new RegExp(`\\bat\\s+${NAME}${END}`),
  new RegExp(`\\b(?:from|with)\\s+${NAME}${END}`),
  new RegExp(`\\b(?:join|joining)\\s+${NAME}${END}`),
];

function cleanCompany(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();
  if (name.length < 2 || NOT_A_COMPANY.test(name) || PLATFORM_NAMES.test(name)) {
    return null;
  }
  return name;
}

function companyFromText(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const name = match && cleanCompany(match[1]);
    if (name) return name;
  }
  return null;
}

const ROLE = "([A-Z][A-Za-z0-9/&+#.()’'\\- ]{2,80}?)";
const ROLE_END = "(?=\\s*(?:[.!,;\\n]|$))";
const ROLE_PATTERNS = [
  new RegExp(`(?:for|as|in)\\s+(?:(?:the|a|an|our)\\s+)?${ROLE}\\s+(?:position|role|opening|vacancy|job)\\b`),
  new RegExp(`(?:application|applying|applied)\\s+(?:for|to)\\s+(?:the\\s+)?${ROLE}\\s+(?:at|with|position|role)\\b`),
  // JobStreet: "Your application for Data Analyst was successfully submitted"
  new RegExp(`application for\\s+(?:the\\s+)?${ROLE}\\s+(?:was|has been|is)\\b`),
  // "…viewed your application for Data Analyst."
  new RegExp(`viewed your application for\\s+(?:the\\s+)?${ROLE}${ROLE_END}`),
];
// "Frontend Engineer at Acme" — only trusted in a subject line; in a body it
// matches whole sentences.
const SUBJECT_ROLE = new RegExp(`^${ROLE}\\s+at\\s+`);
// A captured "role" that reads like a sentence isn't one.
const NOT_A_ROLE = /\b(you|your|we|our|us|thank|thanks|interest|application|applying)\b/i;

function roleFromText(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const role = match[1].replace(/\s+/g, " ").trim();
      if (role.length >= 3 && !NOT_A_ROLE.test(role)) return role;
    }
  }
  return null;
}

// ---- when is the interview? ----------------------------------------------

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
const TIME = "(?:,?\\s*(?:at|@|from)?\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?)?";
// "Monday, October 27, 2026 at 2:00 PM" / "Oct 27 at 2pm"
const MONTH_FIRST = new RegExp(
  `(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\\s+)?(${MONTHS})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?${TIME}`,
  "i",
);
// "27 October 2026, 14:00" / "Monday 27 Oct at 10am"
const DAY_FIRST = new RegExp(
  `(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})[a-z]*\\.?(?:,?\\s+(\\d{4}))?${TIME}`,
  "i",
);

function toHour(hour: number, meridiem: string | undefined): number | null {
  if (hour > 23) return null;
  const m = meridiem?.replace(/\./g, "").toLowerCase();
  if (m === "pm") return hour === 12 ? 12 : hour + 12;
  if (m === "am") return hour === 12 ? 0 : hour;
  // No am/pm: 24-hour clock if it says so, otherwise office hours.
  if (hour >= 13) return hour;
  return hour >= 1 && hour <= 7 ? hour + 12 : hour;
}

function interviewDate(text: string, receivedAt: string): string | null {
  // Only look where the interview is being discussed, so "you applied on
  // Oct 3" isn't mistaken for the interview date.
  const relevant = text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((line) => /interview|schedul|call|meet|session|zoom|teams|google meet|slot/i.test(line))
    .join("\n");

  for (const [pattern, dayGroup, monthGroup] of [
    [MONTH_FIRST, 2, 1],
    [DAY_FIRST, 1, 2],
  ] as const) {
    const m = pattern.exec(relevant);
    // Need a real time ("2pm", "14:00") to schedule it; a bare number could
    // be anything.
    if (!m || !m[4] || !(m[5] || m[6])) continue;
    const month = MONTH_INDEX[m[monthGroup].toLowerCase().slice(0, 3)];
    const day = Number(m[dayGroup]);
    const hour = toHour(Number(m[4]), m[6]);
    if (month == null || hour == null || day < 1 || day > 31) continue;

    const received = new Date(receivedAt);
    let year = m[3] ? Number(m[3]) : received.getFullYear();
    let date = new Date(year, month, day, hour, Number(m[5] ?? 0));
    // "Jan 5" in a December email means next year.
    if (!m[3] && date.getTime() < received.getTime() - 30 * 86_400_000) {
      year += 1;
      date = new Date(year, month, day, hour, Number(m[5] ?? 0));
    }
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function interviewTypeOf(text: string): InterviewType {
  if (/technical|coding|live code|pair programming|system design/i.test(text)) return "technical";
  if (/\bfinal\b/i.test(text)) return "final";
  if (/\bhr\b|human resources|culture/i.test(text)) return "hr";
  if (/phone|call/i.test(text)) return "phone";
  return "other";
}

// ---- put it together -----------------------------------------------------

export function classifyEmail(email: RawEmail): ClassifiedEmail {
  const { name: fromName, email: fromEmail } = parseFrom(email.from);
  const subject = email.subject.trim();
  // Drop quoted replies so an old thread doesn't decide the outcome.
  const body = email.body.split(/\n\s*(?:on .{5,80} wrote:|-{2,}\s*original message|from:\s)/i)[0];
  const text = `${subject}\n${body}`;
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 240);

  const kind = kindOf(subject, text);
  if (!kind) {
    return {
      kind: null,
      company: null,
      roleTitle: null,
      interviewAt: null,
      interviewType: null,
      fromName,
      fromEmail,
      snippet,
    };
  }

  // Company, most to least reliable: explicit phrasing, a sender like "Acme
  // Careers", the sender's company domain, then looser phrasing.
  const lead = body.slice(0, 800);
  const senderName = fromName?.replace(SENDER_NOISE, "").trim() || null;
  const senderLooksLikeCompany = Boolean(fromName && SENDER_NOISE.test(fromName));
  const company =
    companyFromText(subject, STRONG_PATTERNS) ??
    companyFromText(lead, STRONG_PATTERNS) ??
    (fromName ? companyFromText(fromName, [VIA_SENDER]) : null) ??
    (senderLooksLikeCompany && senderName ? cleanCompany(senderName) : null) ??
    companyFromDomain(fromEmail) ??
    companyFromText(subject, WEAK_PATTERNS) ??
    companyFromText(lead, WEAK_PATTERNS) ??
    (senderName ? cleanCompany(senderName) : null);

  return {
    kind,
    company,
    roleTitle:
      roleFromText(subject, [...ROLE_PATTERNS, SUBJECT_ROLE]) ??
      roleFromText(lead, ROLE_PATTERNS),
    interviewAt: kind === "interview" ? interviewDate(body, email.receivedAt) : null,
    interviewType: kind === "interview" ? interviewTypeOf(text) : null,
    fromName,
    fromEmail,
    snippet,
  };
}
