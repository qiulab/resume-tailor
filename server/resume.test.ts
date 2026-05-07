import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB and service modules ───────────────────────────────────────────
vi.mock("./db", () => ({
  createAnalysis: vi.fn().mockResolvedValue(42),
  updateAnalysis: vi.fn().mockResolvedValue(undefined),
  getAnalysisById: vi.fn().mockResolvedValue({
    id: 42,
    userId: 1,
    status: "completed",
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
    atsScore: 78,
    atsBreakdown: { keywords: 80, format: 75, skills: 78, experience: 79 },
    missingKeywords: ["TypeScript", "Docker"],
    matchedKeywords: ["React", "Node.js"],
    skillGaps: [{ skill: "Kubernetes", importance: "medium", placement: "Skills section" }],
    originalSummary: "Experienced developer.",
    rewrittenSummary: "Senior engineer with 5+ years...",
    resumeText: "Sample resume text",
    jobDescription: "We are looking for a software engineer...",
    resumeFileName: "resume.pdf",
    resumeFileKey: "resumes/1/resume.pdf",
    linkedinUrl: null,
    jobUrl: "https://example.com/job",
    sessionId: "user-open-id",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getUserAnalyses: vi.fn().mockResolvedValue([
    {
      id: 42,
      userId: 1,
      jobTitle: "Software Engineer",
      companyName: "Acme Corp",
      atsScore: 78,
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
}));

vi.mock("./analysisService", () => ({
  scrapeJobDescription: vi.fn().mockResolvedValue({
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
    description: "We are looking for a software engineer...",
  }),
  extractTextFromBuffer: vi.fn().mockResolvedValue("Sample resume text"),
  analyzeResume: vi.fn().mockResolvedValue({
    atsScore: 78,
    atsBreakdown: { keywords: 80, format: 75, skills: 78, experience: 79 },
    missingKeywords: ["TypeScript", "Docker"],
    matchedKeywords: ["React", "Node.js"],
    skillGaps: [{ skill: "Kubernetes", importance: "medium", placement: "Skills section" }],
    originalSummary: "Experienced developer.",
    rewrittenSummary: "Senior engineer with 5+ years...",
    suggestions: [
      {
        section: "Experience",
        originalText: "Worked on projects",
        suggestedText: "Led cross-functional team to deliver 3 projects",
        reason: "More specific and impactful",
        impact: "high",
        sortOrder: 0,
      },
    ],
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
  }),
  generateCoverLetter: vi.fn().mockResolvedValue("Dear Hiring Manager, I am excited to apply..."),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "resumes/1/resume.pdf", url: "/manus-storage/resumes/1/resume.pdf" }),
}));

// ─── Test context factory ──────────────────────────────────────────────────
function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "user-open-id",
      email: "user@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe("resume.startAnalysis", () => {
  it("creates an analysis and returns analysisId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resume.startAnalysis({
      jobUrl: "https://example.com/job/123",
      resumeBase64: Buffer.from("fake pdf content").toString("base64"),
      resumeFileName: "resume.pdf",
      resumeMimeType: "application/pdf",
    });

    expect(result).toHaveProperty("analysisId");
    expect(typeof result.analysisId).toBe("number");
  });
});

describe("resume.getStatus", () => {
  it("returns status and job info for a valid analysis", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resume.getStatus({ analysisId: 42 });

    expect(result.status).toBe("completed");
    expect(result.jobTitle).toBe("Software Engineer");
    expect(result.companyName).toBe("Acme Corp");
    expect(result.atsScore).toBe(78);
  });
});

describe("resume.getAnalysis", () => {
  it("returns full analysis with suggestions and cover letter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resume.getAnalysis({ analysisId: 42 });

    expect(result.analysis.atsScore).toBe(78);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]?.section).toBe("Experience");
    expect(result.coverLetter?.content).toContain("Dear Hiring Manager");
  });
});

describe("resume.getHistory", () => {
  it("returns list of completed analyses for the user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resume.getHistory();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.jobTitle).toBe("Software Engineer");
  });
});

describe("resume.updateSuggestion", () => {
  it("accepts a suggestion successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resume.updateSuggestion({
      suggestionId: 1,
      status: "accepted",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a suggestion successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resume.updateSuggestion({
      suggestionId: 1,
      status: "rejected",
    });

    expect(result.success).toBe(true);
  });
});

describe("resume.regenerateCoverLetter", () => {
  it("regenerates cover letter with professional tone", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resume.regenerateCoverLetter({
      analysisId: 42,
      tone: "professional",
    });

    expect(result.content).toBeTruthy();
    expect(typeof result.content).toBe("string");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
  });
});
