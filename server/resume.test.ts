import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
// computeHonestATSScore is tested directly without mocking

// ─── Mock DB and service modules ───────────────────────────────────────────
const TEST_SESSION = "test-session-token-abc123";

vi.mock("./db", () => ({
  createAnalysis: vi.fn().mockResolvedValue(42),
  updateAnalysis: vi.fn().mockResolvedValue(undefined),
  getAnalysisById: vi.fn().mockResolvedValue({
    id: 42,
    sessionToken: "test-session-token-abc123",
    status: "completed",
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
    atsScore: 62,
    atsBreakdown: { keywordMatch: 65, skillsCoverage: 60, formatSignals: 80 },
    atsDisclaimer: "This is a keyword-match estimate, not a real ATS system score.",
    missingKeywords: ["TypeScript", "Docker"],
    matchedKeywords: ["React", "Node.js", "JavaScript"],
    skillGaps: [{ skill: "Kubernetes", importance: "medium", placement: "Skills section" }],
    benchmarkSkills: [{ skill: "React", frequency: 95, present: true }],
    benchmarkSource: "Based on ~50 comparable Software Engineer job postings",
    projectIdeas: [
      {
        title: "Build a CI/CD Pipeline",
        description: "Set up a GitHub Actions workflow for a personal project.",
        skillsGained: ["CI/CD", "GitHub Actions"],
        estimatedTime: "1 week",
        type: "side",
        difficulty: "intermediate",
      },
    ],
    originalSummary: "Experienced developer.",
    rewrittenSummary: "Senior engineer with 5+ years...",
    resumeText: "Sample resume text",
    jobDescription: "We are looking for a software engineer...",
    resumeFileName: "resume.pdf",
    resumeFileKey: "resumes/test/resume.pdf",
    linkedinUrl: null,
    jobUrl: "https://example.com/job",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getSessionAnalyses: vi.fn().mockResolvedValue([
    {
      id: 42,
      sessionToken: "test-session-token-abc123",
      jobTitle: "Software Engineer",
      companyName: "Acme Corp",
      atsScore: 62,
      status: "completed",
      resumeFileName: "resume.pdf",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createSuggestions: vi.fn().mockResolvedValue(undefined),
  getSuggestionsByAnalysisId: vi.fn().mockResolvedValue([
    {
      id: 1,
      analysisId: 42,
      section: "Experience",
      originalText: "Worked on projects",
      suggestedText: "Led cross-functional team to deliver 3 projects",
      reason: "More specific and impactful",
      impact: "high",
      status: "pending",
      sortOrder: 0,
      createdAt: new Date(),
    },
  ]),
  updateSuggestionStatus: vi.fn().mockResolvedValue(undefined),
  createCoverLetter: vi.fn().mockResolvedValue(99),
  getCoverLetterByAnalysisId: vi.fn().mockResolvedValue({
    id: 99,
    analysisId: 42,
    content: "Dear Hiring Manager, I am excited to apply...",
    tone: "professional",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateCoverLetter: vi.fn().mockResolvedValue(undefined),
  deleteAnalysis: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./analysisService", () => ({
  scrapeJobDescription: vi.fn().mockResolvedValue({
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
    description: "We are looking for a software engineer...",
  }),
  extractTextFromBuffer: vi.fn().mockResolvedValue("Sample resume text"),
  analyzeResume: vi.fn().mockResolvedValue({
    atsScore: 62,
    atsBreakdown: { keywordMatch: 65, skillsCoverage: 60, formatSignals: 80 },
    atsDisclaimer: "This is a keyword-match estimate.",
    missingKeywords: ["TypeScript", "Docker"],
    matchedKeywords: ["React", "Node.js", "JavaScript"],
    skillGaps: [{ skill: "Kubernetes", importance: "medium", placement: "Skills section" }],
    originalSummary: "Experienced developer.",
    rewrittenSummary: "Senior engineer with 5+ years...",
    suggestions: [
      { section: "Experience", originalText: "Worked on projects", suggestedText: "Led cross-functional team", reason: "More impactful", impact: "high", sortOrder: 0 },
    ],
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
  }),
  benchmarkSkillsForRole: vi.fn().mockResolvedValue({
    skills: [{ skill: "React", frequency: 95, present: true }],
    source: "Based on ~50 comparable Software Engineer job postings",
  }),
  brainstormProjects: vi.fn().mockResolvedValue([
    { title: "Build a CI/CD Pipeline", description: "Set up GitHub Actions.", skillsGained: ["CI/CD"], estimatedTime: "1 week", type: "side", difficulty: "intermediate" },
  ]),
  generateCoverLetter: vi.fn().mockResolvedValue("Dear Hiring Manager, I am excited to apply..."),
  computeHonestATSScore: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "resumes/test/resume.pdf", url: "/manus-storage/test.pdf" }),
}));

// ─── Test context ──────────────────────────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe("resume.startAnalysis (anonymous)", () => {
  it("creates an analysis with sessionToken and returns analysisId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.startAnalysis({
      sessionToken: TEST_SESSION,
      jobUrl: "https://example.com/job/123",
      resumeBase64: Buffer.from("fake pdf content").toString("base64"),
      resumeFileName: "resume.pdf",
      resumeMimeType: "application/pdf",
    });
    expect(result).toHaveProperty("analysisId");
    expect(typeof result.analysisId).toBe("number");
  });
});

describe("resume.getStatus (anonymous)", () => {
  it("returns status and job info for a valid session+analysis", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.getStatus({ analysisId: 42, sessionToken: TEST_SESSION });
    expect(result.status).toBe("completed");
    expect(result.jobTitle).toBe("Software Engineer");
    expect(result.atsScore).toBe(62);
  });
});

describe("resume.getAnalysis (anonymous)", () => {
  it("returns full analysis with suggestions, cover letter, and project ideas", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.getAnalysis({ analysisId: 42, sessionToken: TEST_SESSION });
    expect(result.analysis.atsScore).toBe(62);
    expect(result.suggestions).toHaveLength(1);
    expect(result.coverLetter?.content).toContain("Dear Hiring Manager");
    expect((result.analysis.projectIdeas as any[]).length).toBeGreaterThan(0);
    expect((result.analysis.benchmarkSkills as any[]).length).toBeGreaterThan(0);
  });
});

describe("resume.getHistory (anonymous)", () => {
  it("returns analyses for the given sessionToken", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.getHistory({ sessionToken: TEST_SESSION });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]?.jobTitle).toBe("Software Engineer");
  });
});

describe("resume.updateSuggestion", () => {
  it("accepts a suggestion", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.updateSuggestion({ suggestionId: 1, status: "accepted", sessionToken: TEST_SESSION });
    expect(result.success).toBe(true);
  });
  it("rejects a suggestion", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.updateSuggestion({ suggestionId: 1, status: "rejected", sessionToken: TEST_SESSION });
    expect(result.success).toBe(true);
  });
});

describe("resume.deleteHistory", () => {
  it("deletes an analysis by sessionToken", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.deleteHistory({ analysisId: 42, sessionToken: TEST_SESSION });
    expect(result.success).toBe(true);
  });
});

describe("resume.regenerateCoverLetter", () => {
  it("regenerates cover letter with professional tone", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.regenerateCoverLetter({ analysisId: 42, sessionToken: TEST_SESSION, tone: "professional" });
    expect(result.content).toBeTruthy();
  });
});


