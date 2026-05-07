import { invokeLLM } from "./_core/llm";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface SkillGap {
  skill: string;
  importance: "high" | "medium" | "low";
  placement?: string;
}

export interface ATSBreakdown {
  keywordMatch: number;    // % of job keywords found in resume
  skillsCoverage: number;  // % of required skills present
  formatSignals: number;   // basic format/structure signals (0–100)
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
  frequency: number;  // 0–100, how often this appears in similar job postings
  present: boolean;   // whether it's in the user's resume
}

export interface AnalysisResult {
  atsScore: number;
  atsBreakdown: ATSBreakdown;
  atsDisclaimer: string;
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
        {
          role: "system",
          content: "You are a job description parser. Extract structured information. Return only valid JSON.",
        },
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
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
    const data = await pdfParse(buffer);
    return data.text;
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

// ─── Honest ATS Score Calculator ──────────────────────────────────────────
// This computes a transparent keyword-match estimate — NOT a real ATS system score.
// Real ATS systems vary wildly; this is an approximation to guide improvement.
export function computeHonestATSScore(
  matchedKeywords: string[],
  missingKeywords: string[],
  breakdown: ATSBreakdown
): { score: number; label: string; disclaimer: string } {
  const total = matchedKeywords.length + missingKeywords.length;
  const keywordRatio = total > 0 ? matchedKeywords.length / total : 0;

  // Weighted average: keyword match 50%, skills coverage 30%, format 20%
  const rawScore =
    keywordRatio * 50 +
    (breakdown.skillsCoverage / 100) * 30 +
    (breakdown.formatSignals / 100) * 20;

  // Cap at 88 — we never claim a perfect score because real ATS systems are unknowable
  const score = Math.min(Math.round(rawScore), 88);

  const label =
    score >= 70 ? "Strong Match" :
    score >= 50 ? "Moderate Match" :
    score >= 30 ? "Partial Match" :
    "Low Match";

  const disclaimer =
    "This is a keyword-match estimate based on comparing your resume text to the job description. " +
    "It is not a score from any real ATS system. Actual ATS results vary by platform, company, and recruiter settings. " +
    "Use this as a guide to improve keyword coverage, not as a guarantee of ATS performance.";

  return { score, label, disclaimer };
}

// ─── Main AI Analysis ──────────────────────────────────────────────────────
export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  companyName: string
): Promise<AnalysisResult> {
  const prompt = `You are an expert resume coach. Analyze the following resume against the job description and provide honest, actionable feedback.

IMPORTANT: Be honest about skill gaps. Do NOT inflate scores or claim the resume is better than it is. Focus on specific, concrete improvements.

JOB TITLE: ${jobTitle}
COMPANY: ${companyName}

JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}

RESUME:
${resumeText.slice(0, 4000)}

Provide a thorough, honest analysis. For suggestions, provide the EXACT original text from the resume and a specific improved version.`;

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an honest resume coach. Never inflate scores or give false encouragement. Be specific, direct, and constructive. Return only valid JSON.",
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
                keywordMatch: { type: "number", description: "% of job keywords found in resume, 0-100" },
                skillsCoverage: { type: "number", description: "% of required skills present, 0-100" },
                formatSignals: { type: "number", description: "Basic format/readability score, 0-100" },
              },
              required: ["keywordMatch", "skillsCoverage", "formatSignals"],
              additionalProperties: false,
            },
            missingKeywords: {
              type: "array",
              items: { type: "string" },
              description: "Keywords from job description missing in resume",
            },
            matchedKeywords: {
              type: "array",
              items: { type: "string" },
              description: "Keywords found in both resume and job description",
            },
            skillGaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill: { type: "string" },
                  importance: { type: "string", enum: ["high", "medium", "low"] },
                  placement: { type: "string", description: "Where to add this skill in the resume" },
                },
                required: ["skill", "importance", "placement"],
                additionalProperties: false,
              },
            },
            originalSummary: {
              type: "string",
              description: "The professional summary section extracted from the resume, or empty string if none",
            },
            rewrittenSummary: {
              type: "string",
              description: "AI-rewritten professional summary tailored to the job",
            },
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

  // Compute honest score
  const { score, disclaimer } = computeHonestATSScore(
    parsed.matchedKeywords,
    parsed.missingKeywords,
    parsed.atsBreakdown
  );

  return {
    ...parsed,
    atsScore: score,
    atsDisclaimer: disclaimer,
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
        content:
          "You are a labor market analyst with deep knowledge of job market trends. Return only valid JSON.",
      },
      {
        role: "user",
        content: `Based on your knowledge of the job market, what are the top skills commonly required for a "${jobTitle}" role${companyName !== "Company" ? ` at companies similar to ${companyName}` : ""}?

For each skill, estimate how frequently it appears in job postings for this role (0-100%).
Also check whether each skill appears in this resume text:

RESUME:
${resumeText.slice(0, 3000)}

Return 10-15 skills that are most commonly required for this role based on comparable job postings and professionals in this field.`,
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
                  frequency: { type: "number", description: "0-100, how often this appears in similar job postings" },
                  present: { type: "boolean", description: "Whether this skill is in the resume" },
                },
                required: ["skill", "frequency", "present"],
                additionalProperties: false,
              },
            },
            comparableJobCount: {
              type: "number",
              description: "Estimated number of comparable job postings this is based on",
            },
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
          "You are a career coach and project mentor. Suggest practical, achievable projects to help job seekers close skill gaps. Be specific and realistic. Return only valid JSON.",
      },
      {
        role: "user",
        content: `A candidate is applying for a ${jobTitle} role. They have the following skill gaps and missing keywords:

GAPS TO CLOSE: ${gapList}

THEIR CURRENT BACKGROUND (from resume):
${resumeText.slice(0, 2000)}

Suggest 6-8 specific, practical projects they can do to gain these skills. Mix "at work" projects (things they can propose or do in their current job) and "side projects" (personal/freelance/open-source work).

Each project should be concrete, achievable, and directly address the skill gaps.`,
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
                  description: { type: "string", description: "2-3 sentence description of what to build/do" },
                  skillsGained: { type: "array", items: { type: "string" } },
                  estimatedTime: { type: "string", description: "e.g. '2 weeks', '1 month', 'Ongoing'" },
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
        content: `You are an expert cover letter writer. Write compelling, personalized cover letters. Tone: ${toneGuide}.`,
      },
      {
        role: "user",
        content: `Write a tailored cover letter for the following position.

JOB TITLE: ${jobTitle}
COMPANY: ${companyName}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 3000)}

Write a complete, ready-to-send cover letter. Include a proper greeting, 3-4 compelling paragraphs, and a professional closing. Do not include placeholder text.`,
      },
    ],
  });

  const raw = result.choices[0]?.message?.content;
  return typeof raw === "string" ? raw : "";
}
