import { invokeLLM } from "./_core/llm";
import type { LinkedInProfile } from "./linkedinService";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface SkillGap {
  skill: string;
  importance: "high" | "medium" | "low";
  placement?: string;
}

export interface ATSBreakdown {
  keywordMatch: number;
  skillsCoverage: number;
  formatSignals: number;
}

export interface SuggestionItem {
  section: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  impact: "high" | "medium" | "low";
  sortOrder: number;
}

export interface ProjectIdea {
  title: string;
  description: string;
  skillsGained: string[];
  estimatedTime: string;
  type: "work" | "side";
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface BenchmarkSkill {
  skill: string;
  frequency: number;
  present: boolean;
}

export interface JobRecommendation {
  title: string;
  whyItFits: string;
  skillsOverlap: string[];
  skillsToGain: string[];
  seniorityLevel: "junior" | "mid" | "senior" | "lead" | "director";
  type: "stretch" | "lateral" | "pivot";
  linkedinSearchUrl: string;
  indeedSearchUrl: string;
}

export interface AnalysisResult {
  atsScore: number;
  atsBreakdown: ATSBreakdown;
  atsDisclaimer: string;
  atsStrengths: string[];
  atsWeaknesses: string[];
  missingKeywords: string[];
  matchedKeywords: string[];
  skillGaps: SkillGap[];
  originalSummary: string;
  rewrittenSummary: string;
  suggestions: SuggestionItem[];
  jobTitle: string;
  companyName: string;
}

// ─── Job Description Scraper ───────────────────────────────────────────────
export async function scrapeJobDescription(url: string): Promise<{
  jobTitle: string;
  companyName: string;
  description: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    const extraction = await invokeLLM({
      messages: [
        { role: "system", content: "You are a job description parser. Return only valid JSON." },
        {
          role: "user",
          content: `Extract the job title, company name, and full job description from this webpage text. Return JSON with keys: jobTitle, companyName, description.\n\n${text}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "job_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              jobTitle: { type: "string" },
              companyName: { type: "string" },
              description: { type: "string" },
            },
            required: ["jobTitle", "companyName", "description"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = extraction.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (content) return JSON.parse(content);
  } catch (err) {
    console.error("[scrapeJobDescription] Error:", err);
  }
  return { jobTitle: "Position", companyName: "Company", description: "" };
}

// ─── Resume Text Extractor ─────────────────────────────────────────────────
export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    try {
      // Use pdfjs-dist for PDF parsing
      // @ts-ignore
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdfData = new Uint8Array(buffer);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
      return text.trim();
    } catch (err) {
      console.error("[extractTextFromBuffer] PDF parsing error:", err);
      return "";
    }
  } else if (
    mimeType.includes("word") ||
    mimeType.includes("docx") ||
    mimeType.includes("openxmlformats")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return buffer.toString("utf-8");
}

// ─── LLM-Powered Semantic Score ───────────────────────────────────────────
// Uses the LLM to evaluate fit beyond simple keyword matching — considers
// synonyms, implied skills, experience relevance, and context.
export async function computeSemanticATSScore(
  resumeText: string,
  jobDescription: string,
  matchedKeywords: string[],
  missingKeywords: string[],
  breakdown: ATSBreakdown
): Promise<{ score: number; label: string; disclaimer: string; strengths: string[]; weaknesses: string[] }> {
  // Ask the LLM to evaluate semantic fit, not just keyword presence
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert recruiter and resume evaluator. Score resume-to-job fit using semantic understanding — consider synonyms, implied skills, transferable experience, and context. Do not just count keywords. Be honest and specific. Return only valid JSON.",
      },
      {
        role: "user",
        content: `Evaluate how well this resume matches the job description.

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 3000)}

Already identified:
- Matched keywords: ${matchedKeywords.slice(0, 15).join(", ")}
- Missing keywords: ${missingKeywords.slice(0, 15).join(", ")}

Provide:
1. A semantic fit score (0-100) that goes beyond keyword matching — consider whether the candidate's actual experience and skills genuinely match the role requirements, even if different words are used.
2. 2-3 specific strengths (what makes this resume a good fit)
3. 2-3 specific weaknesses (what's genuinely missing or misaligned)

Cap the score at 88 — never give 90+ unless it's an exceptional match.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "semantic_score",
        strict: true,
        schema: {
          type: "object",
          properties: {
            score: { type: "number", description: "Semantic fit score 0-88" },
            strengths: { type: "array", items: { type: "string" }, description: "2-3 specific strengths" },
            weaknesses: { type: "array", items: { type: "string" }, description: "2-3 specific weaknesses" },
          },
          required: ["score", "strengths", "weaknesses"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = result.choices[0]?.message?.content;
  const content = typeof raw === "string" ? raw : null;

  let semanticScore = 0;
  let strengths: string[] = [];
  let weaknesses: string[] = [];

  if (content) {
    try {
      const parsed = JSON.parse(content);
      semanticScore = Math.min(Math.round(parsed.score ?? 0), 88);
      strengths = parsed.strengths ?? [];
      weaknesses = parsed.weaknesses ?? [];
    } catch {
      // Fallback to keyword-based if parsing fails
      const total = matchedKeywords.length + missingKeywords.length;
      const ratio = total > 0 ? matchedKeywords.length / total : 0;
      semanticScore = Math.min(Math.round(ratio * 50 + (breakdown.skillsCoverage / 100) * 30 + (breakdown.formatSignals / 100) * 20), 88);
    }
  }

  const label =
    semanticScore >= 70 ? "Strong Match" :
    semanticScore >= 50 ? "Moderate Match" :
    semanticScore >= 30 ? "Partial Match" :
    "Low Match";

  const disclaimer =
    "This score uses AI to evaluate semantic fit — it considers synonyms, implied skills, and experience relevance, not just keyword counts. " +
    "It is not a score from any real ATS system. Use it as a guide, not a guarantee.";

  return { score: semanticScore, label, disclaimer, strengths, weaknesses };
}

// Keep the synchronous version as a fallback for tests
export function computeHonestATSScore(
  matchedKeywords: string[],
  missingKeywords: string[],
  breakdown: ATSBreakdown
): { score: number; label: string; disclaimer: string } {
  const total = matchedKeywords.length + missingKeywords.length;
  const keywordRatio = total > 0 ? matchedKeywords.length / total : 0;
  const rawScore = keywordRatio * 50 + (breakdown.skillsCoverage / 100) * 30 + (breakdown.formatSignals / 100) * 20;
  const score = Math.min(Math.round(rawScore), 88);
  const label = score >= 70 ? "Strong Match" : score >= 50 ? "Moderate Match" : score >= 30 ? "Partial Match" : "Low Match";
  const disclaimer = "Keyword-match estimate. Not a real ATS score.";
  return { score, label, disclaimer };
}

// ─── Main AI Analysis (with optional LinkedIn enrichment) ──────────────────
export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  companyName: string,
  linkedinProfile?: LinkedInProfile | null,
  userNotes?: string
): Promise<AnalysisResult> {
  const notesContext = userNotes
    ? `\n\nUSER'S NOTES AND CONCERNS (address these specifically in your analysis):\n${userNotes}`
    : "";

  const linkedinContext = linkedinProfile
    ? `\n\nLINKEDIN PROFILE (additional context for deeper analysis):
Name: ${linkedinProfile.name}
Current Role: ${linkedinProfile.currentTitle} at ${linkedinProfile.currentCompany}
Total Experience: ~${linkedinProfile.totalYearsExperience} years
Summary: ${linkedinProfile.summary?.slice(0, 500) || "N/A"}
Experience: ${linkedinProfile.experience.slice(0, 5).map(e => `${e.title} at ${e.company} (${e.duration})`).join("; ")}
LinkedIn Skills: ${linkedinProfile.skills.slice(0, 20).map(s => s.name).join(", ")}
Education: ${linkedinProfile.education.map(e => `${e.degree || ""} ${e.fieldOfStudy || ""} at ${e.school}`).join("; ")}`
    : "";

  const prompt = `You are an expert resume coach. Analyze the following resume against the job description and provide honest, actionable feedback.
${linkedinContext ? "You also have access to the candidate's LinkedIn profile for deeper context — use it to identify gaps between what's on their resume and what's on their LinkedIn profile." : ""}

IMPORTANT: Be honest. Do NOT inflate scores. Focus on specific, concrete improvements.

JOB TITLE: ${jobTitle}
COMPANY: ${companyName}

JOB DESCRIPTION:
${jobDescription.slice(0, 3500)}

RESUME:
${resumeText.slice(0, 3500)}
${linkedinContext}${notesContext}`;

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an honest resume coach. Never inflate scores. Be specific, direct, and constructive. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "resume_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            atsBreakdown: {
              type: "object",
              properties: {
                keywordMatch: { type: "number" },
                skillsCoverage: { type: "number" },
                formatSignals: { type: "number" },
              },
              required: ["keywordMatch", "skillsCoverage", "formatSignals"],
              additionalProperties: false,
            },
            missingKeywords: { type: "array", items: { type: "string" } },
            matchedKeywords: { type: "array", items: { type: "string" } },
            skillGaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill: { type: "string" },
                  importance: { type: "string", enum: ["high", "medium", "low"] },
                  placement: { type: "string" },
                },
                required: ["skill", "importance", "placement"],
                additionalProperties: false,
              },
            },
            originalSummary: { type: "string" },
            rewrittenSummary: { type: "string" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  originalText: { type: "string" },
                  suggestedText: { type: "string" },
                  reason: { type: "string" },
                  impact: { type: "string", enum: ["high", "medium", "low"] },
                  sortOrder: { type: "number" },
                },
                required: ["section", "originalText", "suggestedText", "reason", "impact", "sortOrder"],
                additionalProperties: false,
              },
            },
            jobTitle: { type: "string" },
            companyName: { type: "string" },
          },
          required: [
            "atsBreakdown", "missingKeywords", "matchedKeywords", "skillGaps",
            "originalSummary", "rewrittenSummary", "suggestions", "jobTitle", "companyName",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawResult = result.choices[0]?.message?.content;
  const content = typeof rawResult === "string" ? rawResult : null;
  if (!content) throw new Error("No analysis result from AI");

  const parsed = JSON.parse(content);
  if (!parsed.jobTitle) parsed.jobTitle = jobTitle;
  if (!parsed.companyName) parsed.companyName = companyName;

  // Filter out any suggestions targeting summary/objective sections
  const SUMMARY_SECTIONS = ["summary", "objective", "professional summary", "career objective", "profile"];
  parsed.suggestions = (parsed.suggestions ?? []).filter(
    (s: SuggestionItem) => !SUMMARY_SECTIONS.some((sec) => s.section.toLowerCase().includes(sec))
  );

  // Use LLM semantic scoring with fallback to keyword-based scoring
  let score: number, label: string, disclaimer: string, strengths: string[], weaknesses: string[];
  try {
    const semantic = await computeSemanticATSScore(
      resumeText,
      jobDescription,
      parsed.matchedKeywords,
      parsed.missingKeywords,
      parsed.atsBreakdown
    );
    score = semantic.score;
    label = semantic.label;
    disclaimer = semantic.disclaimer;
    strengths = semantic.strengths;
    weaknesses = semantic.weaknesses;
  } catch (semanticErr) {
    console.warn("[analyzeResume] Semantic scoring failed, falling back to keyword scoring:", semanticErr);
    const fallback = computeHonestATSScore(parsed.matchedKeywords, parsed.missingKeywords, parsed.atsBreakdown);
    score = fallback.score;
    label = fallback.label;
    disclaimer = fallback.disclaimer;
    strengths = [];
    weaknesses = [];
  }

  return {
    ...parsed,
    atsScore: score,
    atsDisclaimer: disclaimer,
    atsStrengths: strengths,
    atsWeaknesses: weaknesses,
  } as AnalysisResult;
}

// ─── Skill Benchmarking ────────────────────────────────────────────────────
export async function benchmarkSkillsForRole(
  jobTitle: string,
  companyName: string,
  resumeText: string
): Promise<{ skills: BenchmarkSkill[]; source: string }> {
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a labor market analyst. Return only valid JSON.",
      },
      {
        role: "user",
        content: `Based on your knowledge of the job market, what are the top skills commonly required for a "${jobTitle}" role${companyName !== "Company" ? ` at companies similar to ${companyName}` : ""}?

For each skill, estimate how frequently it appears in job postings (0-100%).
Also check whether each skill appears in this resume:

RESUME:
${resumeText.slice(0, 3000)}

Return 10-15 skills most commonly required for this role.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "skill_benchmark",
        strict: true,
        schema: {
          type: "object",
          properties: {
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill: { type: "string" },
                  frequency: { type: "number" },
                  present: { type: "boolean" },
                },
                required: ["skill", "frequency", "present"],
                additionalProperties: false,
              },
            },
            comparableJobCount: { type: "number" },
          },
          required: ["skills", "comparableJobCount"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = result.choices[0]?.message?.content;
  const content = typeof raw === "string" ? raw : null;
  if (!content) return { skills: [], source: "" };

  const parsed = JSON.parse(content);
  const source = `Based on analysis of ~${parsed.comparableJobCount ?? 50}+ comparable ${jobTitle} job postings`;
  return { skills: parsed.skills as BenchmarkSkill[], source };
}

// ─── Project Brainstorming ─────────────────────────────────────────────────
export async function brainstormProjects(
  resumeText: string,
  jobTitle: string,
  skillGaps: SkillGap[],
  missingKeywords: string[]
): Promise<ProjectIdea[]> {
  const gapList = [
    ...skillGaps.map((g) => g.skill),
    ...missingKeywords.slice(0, 10),
  ]
    .filter(Boolean)
    .slice(0, 15)
    .join(", ");

  if (!gapList) return [];

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a career coach. Suggest practical projects to close skill gaps. Be specific and realistic. Return only valid JSON.",
      },
      {
        role: "user",
        content: `A candidate is applying for a ${jobTitle} role. Skill gaps: ${gapList}

Their background:
${resumeText.slice(0, 2000)}

Suggest 6-8 specific projects (mix of at-work and side projects) to gain these skills.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "project_ideas",
        strict: true,
        schema: {
          type: "object",
          properties: {
            projects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  skillsGained: { type: "array", items: { type: "string" } },
                  estimatedTime: { type: "string" },
                  type: { type: "string", enum: ["work", "side"] },
                  difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                },
                required: ["title", "description", "skillsGained", "estimatedTime", "type", "difficulty"],
                additionalProperties: false,
              },
            },
          },
          required: ["projects"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = result.choices[0]?.message?.content;
  const content = typeof raw === "string" ? raw : null;
  if (!content) return [];

  const parsed = JSON.parse(content);
  return parsed.projects as ProjectIdea[];
}

// ─── Job Recommendations ───────────────────────────────────────────────────
export async function generateJobRecommendations(
  resumeText: string,
  jobTitle: string,
  companyName: string,
  matchedKeywords: string[],
  skillGaps: SkillGap[],
  linkedinProfile?: LinkedInProfile | null
): Promise<JobRecommendation[]> {
  const profileContext = linkedinProfile
    ? `Current role: ${linkedinProfile.currentTitle} at ${linkedinProfile.currentCompany}. Total experience: ~${linkedinProfile.totalYearsExperience} years.`
    : "";

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a career advisor. Suggest relevant job roles based on a candidate's background and target role. Return only valid JSON.",
      },
      {
        role: "user",
        content: `Based on this candidate's background, suggest 5-6 job roles they should consider — including stretch roles (slightly above current level), lateral moves (same level, adjacent domain), and pivot opportunities.

TARGET ROLE: ${jobTitle} at ${companyName}
${profileContext}

CANDIDATE STRENGTHS (matched keywords): ${matchedKeywords.slice(0, 15).join(", ")}
SKILL GAPS: ${skillGaps.slice(0, 8).map(g => g.skill).join(", ")}

RESUME SUMMARY:
${resumeText.slice(0, 1500)}

For each recommendation, provide a LinkedIn Jobs search URL and Indeed search URL using these templates:
- LinkedIn: https://www.linkedin.com/jobs/search/?keywords=JOB+TITLE
- Indeed: https://www.indeed.com/jobs?q=JOB+TITLE

Make the job titles realistic and specific (e.g., "Senior Product Manager - Platform" not just "Product Manager").`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "job_recommendations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Specific job title to search for" },
                  whyItFits: { type: "string", description: "2-3 sentence explanation of why this role fits the candidate" },
                  skillsOverlap: { type: "array", items: { type: "string" }, description: "Skills from the candidate that directly apply" },
                  skillsToGain: { type: "array", items: { type: "string" }, description: "1-3 new skills this role would help develop" },
                  seniorityLevel: { type: "string", enum: ["junior", "mid", "senior", "lead", "director"] },
                  type: { type: "string", enum: ["stretch", "lateral", "pivot"] },
                  linkedinSearchUrl: { type: "string" },
                  indeedSearchUrl: { type: "string" },
                },
                required: ["title", "whyItFits", "skillsOverlap", "skillsToGain", "seniorityLevel", "type", "linkedinSearchUrl", "indeedSearchUrl"],
                additionalProperties: false,
              },
            },
          },
          required: ["recommendations"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = result.choices[0]?.message?.content;
  const content = typeof raw === "string" ? raw : null;
  if (!content) return [];

  const parsed = JSON.parse(content);
  return parsed.recommendations as JobRecommendation[];
}

// ─── Improved Resume Generator ───────────────────────────────────────────────
export async function generateImprovedResume(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  companyName: string,
  acceptedSuggestions: Array<{ originalText: string; suggestedText: string }>,
  rewrittenSummary: string,
  userNotes?: string
): Promise<string> {
  const suggestionsContext =
    acceptedSuggestions.length > 0
      ? `\n\nACCEPTED EDITS TO APPLY:\n${acceptedSuggestions
          .map((s, i) => `${i + 1}. Replace: "${s.originalText.slice(0, 100)}" → "${s.suggestedText.slice(0, 100)}"`)
          .join("\n")}`
      : "";

  const notesContext = userNotes
    ? `\n\nUSER NOTES: ${userNotes}`
    : "";

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert resume writer. Rewrite the provided resume to be tailored, specific, and optimized for the target role. Preserve the candidate's real experience — do not fabricate anything. Output clean, formatted resume text only.",
      },
      {
        role: "user",
        content: `Rewrite this resume for a ${jobTitle} role at ${companyName}.

Original resume:
${resumeText.slice(0, 4000)}

Job description:
${jobDescription.slice(0, 2000)}

Rewritten summary to use:
${rewrittenSummary || "(rewrite the summary to match the role)"}${suggestionsContext}${notesContext}

Output the full rewritten resume as clean plain text. Keep all real experience intact. Apply the accepted edits. Make the language specific and results-oriented throughout. Do not add fake experience or skills.`,
      },
    ],
  });

  const raw = result.choices[0]?.message?.content;
  return typeof raw === "string" ? raw : "";
}

// ─── Cover Letter Generator ────────────────────────────────────────────────
export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  companyName: string,
  tone: "professional" | "enthusiastic" | "concise" = "professional"
): Promise<string> {
  const toneGuide = {
    professional: "formal, polished, and confident",
    enthusiastic: "warm, energetic, and genuinely excited",
    concise: "brief, direct, and impactful — no more than 3 short paragraphs",
  }[tone];

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert cover letter writer. Tone: ${toneGuide}.`,
      },
      {
        role: "user",
        content: `Write a tailored cover letter for ${jobTitle} at ${companyName}.

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 3000)}

Write a complete, ready-to-send cover letter. No placeholder text.`,
      },
    ],
  });

  const raw = result.choices[0]?.message?.content;
  return typeof raw === "string" ? raw : "";
}
