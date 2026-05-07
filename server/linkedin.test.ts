import { describe, expect, it, vi } from "vitest";
import { extractLinkedInUsername } from "./linkedinService";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock modules ──────────────────────────────────────────────────────────
const TEST_SESSION = "test-session-linkedin-abc";

vi.mock("./db", () => ({
  createAnalysis: vi.fn().mockResolvedValue(99),
  updateAnalysis: vi.fn().mockResolvedValue(undefined),
  getAnalysisById: vi.fn().mockResolvedValue({
    id: 99,
    sessionToken: "test-session-linkedin-abc",
    status: "completed",
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
    atsScore: 65,
    atsBreakdown: { keywordMatch: 68, skillsCoverage: 62, formatSignals: 75 },
    atsDisclaimer: "Keyword-match estimate.",
    missingKeywords: ["TypeScript", "Docker"],
    matchedKeywords: ["React", "Node.js"],
    skillGaps: [{ skill: "Kubernetes", importance: "medium", placement: "Skills" }],
    benchmarkSkills: [{ skill: "React", frequency: 95, present: true }],
    benchmarkSource: "Based on ~50 comparable postings",
    projectIdeas: [],
    linkedinData: {
      name: "Jane Doe",
      headline: "Senior Engineer",
      currentTitle: "Senior Software Engineer",
      currentCompany: "TechCorp",
      totalYearsExperience: 7,
      location: "San Francisco, CA",
      summary: "Experienced engineer...",
      experience: [{ title: "Senior SWE", company: "TechCorp", duration: "3 years", description: "", isCurrent: true }],
      education: [{ school: "MIT", degree: "BS", fieldOfStudy: "CS", years: "2014-2018" }],
      skills: [{ name: "React", endorsements: 45 }, { name: "Node.js", endorsements: 32 }],
      scrapedAt: new Date().toISOString(),
    },
    linkedinEnriched: 1,
    jobRecommendations: [
      {
        title: "Staff Software Engineer",
        whyItFits: "Strong React and Node.js background aligns well.",
        skillsOverlap: ["React", "Node.js"],
        skillsToGain: ["System Design", "Technical Leadership"],
        seniorityLevel: "senior",
        type: "stretch",
        linkedinSearchUrl: "https://www.linkedin.com/jobs/search/?keywords=Staff+Software+Engineer",
        indeedSearchUrl: "https://www.indeed.com/jobs?q=Staff+Software+Engineer",
      },
    ],
    originalSummary: "Experienced developer.",
    rewrittenSummary: "Senior engineer with 7+ years...",
    resumeText: "Sample resume",
    jobDescription: "We are looking for...",
    resumeFileName: "resume.pdf",
    resumeFileKey: "resumes/test/resume.pdf",
    linkedinUrl: "https://linkedin.com/in/janedoe",
    jobUrl: "https://example.com/job",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getSessionAnalyses: vi.fn().mockResolvedValue([]),
  createSuggestions: vi.fn().mockResolvedValue(undefined),
  getSuggestionsByAnalysisId: vi.fn().mockResolvedValue([]),
  updateSuggestionStatus: vi.fn().mockResolvedValue(undefined),
  createCoverLetter: vi.fn().mockResolvedValue(1),
  getCoverLetterByAnalysisId: vi.fn().mockResolvedValue({
    id: 1, analysisId: 99, content: "Dear Hiring Manager...", tone: "professional",
    createdAt: new Date(), updatedAt: new Date(),
  }),
  updateCoverLetter: vi.fn().mockResolvedValue(undefined),
  deleteAnalysis: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./analysisService", () => ({
  scrapeJobDescription: vi.fn().mockResolvedValue({ jobTitle: "Software Engineer", companyName: "Acme Corp", description: "..." }),
  extractTextFromBuffer: vi.fn().mockResolvedValue("Sample resume text"),
  analyzeResume: vi.fn().mockResolvedValue({
    atsScore: 65,
    atsBreakdown: { keywordMatch: 68, skillsCoverage: 62, formatSignals: 75 },
    atsDisclaimer: "Keyword-match estimate.",
    missingKeywords: ["TypeScript"],
    matchedKeywords: ["React"],
    skillGaps: [],
    originalSummary: "Experienced developer.",
    rewrittenSummary: "Senior engineer...",
    suggestions: [],
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
  }),
  benchmarkSkillsForRole: vi.fn().mockResolvedValue({ skills: [], source: "" }),
  brainstormProjects: vi.fn().mockResolvedValue([]),
  generateJobRecommendations: vi.fn().mockResolvedValue([
    {
      title: "Staff Software Engineer",
      whyItFits: "Strong background.",
      skillsOverlap: ["React"],
      skillsToGain: ["System Design"],
      seniorityLevel: "senior",
      type: "stretch",
      linkedinSearchUrl: "https://www.linkedin.com/jobs/search/?keywords=Staff+Software+Engineer",
      indeedSearchUrl: "https://www.indeed.com/jobs?q=Staff+Software+Engineer",
    },
  ]),
  generateCoverLetter: vi.fn().mockResolvedValue("Dear Hiring Manager..."),
  computeHonestATSScore: vi.fn(),
}));

vi.mock("./linkedinService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./linkedinService")>();
  return {
    ...actual, // keep extractLinkedInUsername real
    scrapeLinkedInProfile: vi.fn().mockResolvedValue({
      name: "Jane Doe",
      headline: "Senior Engineer",
      currentTitle: "Senior Software Engineer",
      currentCompany: "TechCorp",
      totalYearsExperience: 7,
      location: "San Francisco, CA",
      summary: "Experienced engineer...",
      experience: [],
      education: [],
      skills: [{ name: "React", endorsements: 45 }],
      scrapedAt: new Date().toISOString(),
    }),
    buildLinkedInContext: actual.buildLinkedInContext,
  };
});

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test.pdf", url: "/manus-storage/test.pdf" }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── LinkedIn URL Parsing Tests ────────────────────────────────────────────
describe("extractLinkedInUsername", () => {
  it("extracts username from standard URL", () => {
    expect(extractLinkedInUsername("https://www.linkedin.com/in/janedoe")).toBe("janedoe");
  });

  it("extracts username from URL with trailing slash", () => {
    expect(extractLinkedInUsername("https://linkedin.com/in/jane-doe-123/")).toBe("jane-doe-123");
  });

  it("extracts username from URL without https", () => {
    expect(extractLinkedInUsername("linkedin.com/in/johndoe")).toBe("johndoe");
  });

  it("handles URL with query params", () => {
    expect(extractLinkedInUsername("https://www.linkedin.com/in/janedoe?trk=public_profile")).toBe("janedoe");
  });

  it("returns null for non-LinkedIn URL", () => {
    expect(extractLinkedInUsername("https://github.com/janedoe")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractLinkedInUsername("")).toBeNull();
  });

  it("returns null for LinkedIn company URL", () => {
    expect(extractLinkedInUsername("https://linkedin.com/company/google")).toBeNull();
  });
});

// ─── LinkedIn-enriched Analysis Tests ─────────────────────────────────────
describe("resume.startAnalysis with LinkedIn URL", () => {
  it("starts analysis with LinkedIn URL and returns analysisId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.startAnalysis({
      sessionToken: TEST_SESSION,
      linkedinUrl: "https://linkedin.com/in/janedoe",
      jobUrl: "https://example.com/job/123",
      resumeBase64: Buffer.from("fake pdf").toString("base64"),
      resumeFileName: "resume.pdf",
      resumeMimeType: "application/pdf",
    });
    expect(result).toHaveProperty("analysisId");
    expect(typeof result.analysisId).toBe("number");
  });
});

describe("resume.getAnalysis with LinkedIn enrichment", () => {
  it("returns analysis with LinkedIn data and job recommendations", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.getAnalysis({ analysisId: 99, sessionToken: TEST_SESSION });

    expect(result.analysis.linkedinEnriched).toBe(1);
    expect(result.analysis.linkedinData).toBeTruthy();

    const linkedinData = result.analysis.linkedinData as any;
    expect(linkedinData.name).toBe("Jane Doe");
    expect(linkedinData.currentTitle).toBe("Senior Software Engineer");

    const jobRecs = result.analysis.jobRecommendations as any[];
    expect(jobRecs.length).toBeGreaterThan(0);
    expect(jobRecs[0].type).toBe("stretch");
    expect(jobRecs[0].linkedinSearchUrl).toContain("linkedin.com/jobs");
    expect(jobRecs[0].indeedSearchUrl).toContain("indeed.com/jobs");
  });
});

// ─── Job Recommendations Tests ─────────────────────────────────────────────
describe("job recommendations structure", () => {
  it("each recommendation has required fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.resume.getAnalysis({ analysisId: 99, sessionToken: TEST_SESSION });

    const recs = result.analysis.jobRecommendations as any[];
    for (const rec of recs) {
      expect(rec).toHaveProperty("title");
      expect(rec).toHaveProperty("whyItFits");
      expect(rec).toHaveProperty("skillsOverlap");
      expect(rec).toHaveProperty("skillsToGain");
      expect(rec).toHaveProperty("seniorityLevel");
      expect(rec).toHaveProperty("type");
      expect(rec).toHaveProperty("linkedinSearchUrl");
      expect(rec).toHaveProperty("indeedSearchUrl");
      expect(["stretch", "lateral", "pivot"]).toContain(rec.type);
      expect(["junior", "mid", "senior", "lead", "director"]).toContain(rec.seniorityLevel);
    }
  });
});
