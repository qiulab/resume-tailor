import { invokeLLM } from "./_core/llm";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface SkillGap {
  skill: string;
  importance: "high" | "medium" | "low";
  placement?: string;
}

export interface ATSBreakdown {
  keywords: number;
  format: number;
  skills: number;
  experience: number;
}

export interface SuggestionItem {
  section: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  impact: "high" | "medium" | "low";
  sortOrder: number;
}

export interface AnalysisResult {
  atsScore: number;
  atsBreakdown: ATSBreakdown;
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

    // Strip HTML tags and clean up
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    // Use LLM to extract structured job info
    const extraction = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a job description parser. Extract structured information from the provided text. Return only valid JSON.",
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
    const content = typeof rawContent === 'string' ? rawContent : null;
    if (content) {
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("[scrapeJobDescription] Error:", err);
  }
  return { jobTitle: "Position", companyName: "Company", description: "" };
}

// ─── Resume Text Extractor ─────────────────────────────────────────────────
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
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

// ─── Main AI Analysis ──────────────────────────────────────────────────────
export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  companyName: string
): Promise<AnalysisResult> {
  const prompt = `You are an expert ATS (Applicant Tracking System) and resume coach. Analyze the following resume against the job description and provide comprehensive, actionable feedback.

JOB TITLE: ${jobTitle}
COMPANY: ${companyName}

JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}

RESUME:
${resumeText.slice(0, 4000)}

Provide a thorough analysis. Be specific and actionable. For suggestions, provide the EXACT original text from the resume and the improved version.`;

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert resume coach and ATS optimization specialist. Analyze resumes with precision and provide highly specific, actionable suggestions. Return only valid JSON.",
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
            atsScore: {
              type: "number",
              description: "ATS compatibility score 0-100",
            },
            atsBreakdown: {
              type: "object",
              properties: {
                keywords: { type: "number", description: "Keyword match score 0-100" },
                format: { type: "number", description: "Format/structure score 0-100" },
                skills: { type: "number", description: "Skills match score 0-100" },
                experience: { type: "number", description: "Experience relevance score 0-100" },
              },
              required: ["keywords", "format", "skills", "experience"],
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
              description: "The professional summary section extracted from the resume",
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
                  section: { type: "string", description: "e.g. Experience, Skills, Summary, Education" },
                  originalText: { type: "string", description: "Exact text from the resume to be replaced" },
                  suggestedText: { type: "string", description: "The improved replacement text" },
                  reason: { type: "string", description: "Why this change improves ATS score or impact" },
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
            "atsScore",
            "atsBreakdown",
            "missingKeywords",
            "matchedKeywords",
            "skillGaps",
            "originalSummary",
            "rewrittenSummary",
            "suggestions",
            "jobTitle",
            "companyName",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawResult = result.choices[0]?.message?.content;
  const content = typeof rawResult === 'string' ? rawResult : null;
  if (!content) throw new Error("No analysis result from AI");

  const parsed = JSON.parse(content) as AnalysisResult;
  // Ensure jobTitle/companyName fallback
  if (!parsed.jobTitle) parsed.jobTitle = jobTitle;
  if (!parsed.companyName) parsed.companyName = companyName;
  return parsed;
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
        content: `You are an expert cover letter writer. Write compelling, personalized cover letters that get interviews. Tone: ${toneGuide}.`,
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

Write a complete, ready-to-send cover letter. Include a proper greeting, 3-4 compelling paragraphs, and a professional closing. Do not include placeholder text like [Your Name] — use natural language.`,
      },
    ],
  });

  const raw = result.choices[0]?.message?.content;
  return typeof raw === 'string' ? raw : "";
}
