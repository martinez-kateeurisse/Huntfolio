// The resume-tailoring prompt, isolated here so it's easy to tune without
// touching the server-action plumbing. The model is asked to return structured
// JSON (enforced via a schema in the server action) grounded strictly in the
// candidate's real resume — it must not invent experience.

export const TAILOR_SYSTEM_PROMPT = `You are an expert technical recruiter and resume coach helping a candidate tailor their existing resume to a specific job description.

Rules you must follow:
- Ground every suggestion in the candidate's ACTUAL resume content. Never invent experience, skills, employers, dates, or metrics that aren't present in the resume.
- When you suggest emphasizing something, it must already exist in the resume.
- Keyword gaps should name concrete terms/skills the job description asks for that are weak or absent in the resume — do not tell the candidate to lie about having them.
- Bullet rewrites must be honest reframings of real resume bullets to better match the job's language, not fabrications.
- Keep the tailored summary to 2-3 sentences, professional and specific to this role.
- Be concrete and concise. These are drafts for the candidate to review and adapt, not final copy.`;

export function buildTailorUserMessage(
  jobDescription: string,
  resumeText: string,
): string {
  return `Here is the JOB DESCRIPTION I'm applying to:

<job_description>
${jobDescription.trim()}
</job_description>

Here is MY CURRENT RESUME:

<resume>
${resumeText.trim()}
</resume>

Analyze the fit and produce tailoring guidance with these parts:
1. match_summary: an at-a-glance read of how well I fit this role and my key strengths for it.
2. key_strengths: 3-5 of my strongest, most relevant qualifications for THIS role (from my resume).
3. keyword_gaps: important terms or skills the job asks for that are weak or missing in my resume.
4. emphasis_suggestions: which of my existing experiences/projects to foreground for this role.
5. tailored_summary: a rewritten 2-3 sentence professional summary aimed at this job.
6. bullet_rewrites: 3-5 rewrites of real resume bullets, each with the original and an improved version that better matches the job — grounded in my real experience, no fabrication.`;
}
