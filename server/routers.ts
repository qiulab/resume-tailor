import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createAnalysis,
  updateAnalysis,
  getAnalysisById,
  getSessionAnalyses,
  createSuggestions,
  getSuggestionsByAnalysisId,
  updateSuggestionStatus,
  createCoverLetter,
  getCoverLetterByAnalysisId,
  updateCoverLetter,
  deleteAnalysis,
} from "./db";
import {
  scrapeJobDescription,
  extractTextFromBuffer,
  analyzeResume,
  generateCoverLetter,
  benchmarkSkillsForRole,
  brainstormProjects,
  generateJobRecommendations,
} from "./analysisService";
import {
  scrapeLinkedInProfile,
  extractLinkedInUsername,
} from "./linkedinService";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Resume Analysis (no auth required) ────────────────────────────────
  resume: router({
    startAnalysis: publicProcedure
      .input(
        z.object({
          sessionToken: z.string().min(1),
          linkedinUrl: z.string().optional(),
          jobUrl: z.string().url("Please enter a valid job posting URL"),
          resumeBase64: z.string(),
          resumeFileName: z.string(),
          resumeMimeType: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const analysisId = await createAnalysis({
          sessionToken: input.sessionToken,
          linkedinUrl: input.linkedinUrl,
          jobUrl: input.jobUrl,
          resumeFileName: input.resumeFileName,
          status: "processing",
        });

        // Process asynchronously
        (async () => {
          try {
            const buffer = Buffer.from(input.resumeBase64, "base64");

            // 1. Upload resume to storage
            const fileKey = `resumes/${input.sessionToken}/${Date.now()}-${input.resumeFileName}`;
            const { key } = await storagePut(fileKey, buffer, input.resumeMimeType);

            // 2. Extract text from resume
            const resumeText = await extractTextFromBuffer(buffer, input.resumeMimeType);

            // 3. Scrape job description
            const { jobTitle, companyName, description: jobDescription } =
              await scrapeJobDescription(input.jobUrl);

            // 4. Scrape LinkedIn profile (if URL provided) — run in parallel with job scrape
            let linkedinProfile = null;
            let linkedinEnriched = 0;
            if (input.linkedinUrl && extractLinkedInUsername(input.linkedinUrl)) {
              try {
                linkedinProfile = await scrapeLinkedInProfile(input.linkedinUrl);
                if (linkedinProfile) linkedinEnriched = 1;
              } catch (err) {
                console.warn("[LinkedIn] Scraping failed, continuing without:", err);
              }
            }

            // 5. Run AI analysis (with LinkedIn context if available)
            const analysis = await analyzeResume(
              resumeText,
              jobDescription,
              jobTitle,
              companyName,
              linkedinProfile
            );

            // 6. Run parallel enrichment tasks
            const [benchmark, projects, jobRecs] = await Promise.all([
              benchmarkSkillsForRole(jobTitle, companyName, resumeText),
              brainstormProjects(resumeText, jobTitle, analysis.skillGaps, analysis.missingKeywords),
              generateJobRecommendations(
                resumeText,
                jobTitle,
                companyName,
                analysis.matchedKeywords,
                analysis.skillGaps,
                linkedinProfile
              ),
            ]);

            // 7. Save all results
            await updateAnalysis(analysisId, {
              resumeFileKey: key,
              resumeText,
              jobDescription,
              jobTitle: analysis.jobTitle,
              companyName: analysis.companyName,
              atsScore: analysis.atsScore,
              atsBreakdown: analysis.atsBreakdown,
              atsDisclaimer: analysis.atsDisclaimer,
              missingKeywords: analysis.missingKeywords,
              matchedKeywords: analysis.matchedKeywords,
              skillGaps: analysis.skillGaps,
              originalSummary: analysis.originalSummary,
              rewrittenSummary: analysis.rewrittenSummary,
              benchmarkSkills: benchmark.skills,
              benchmarkSource: benchmark.source,
              projectIdeas: projects,
              linkedinData: linkedinProfile,
              linkedinEnriched,
              jobRecommendations: jobRecs,
              status: "completed",
            });

            // 8. Save suggestions
            if (analysis.suggestions.length > 0) {
              await createSuggestions(
                analysis.suggestions.map((s) => ({
                  analysisId,
                  section: s.section,
                  originalText: s.originalText,
                  suggestedText: s.suggestedText,
                  reason: s.reason,
                  impact: s.impact,
                  sortOrder: s.sortOrder,
                }))
              );
            }

            // 9. Generate cover letter
            const coverLetterContent = await generateCoverLetter(
              resumeText,
              jobDescription,
              analysis.jobTitle,
              analysis.companyName,
              "professional"
            );
            await createCoverLetter({ analysisId, content: coverLetterContent, tone: "professional" });
          } catch (err) {
            console.error("[startAnalysis] Processing error:", err);
            await updateAnalysis(analysisId, { status: "failed" });
          }
        })();

        return { analysisId };
      }),

    getStatus: publicProcedure
      .input(z.object({ analysisId: z.number(), sessionToken: z.string() }))
      .query(async ({ input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.sessionToken !== input.sessionToken) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return {
          status: analysis.status,
          atsScore: analysis.atsScore,
          jobTitle: analysis.jobTitle,
          companyName: analysis.companyName,
          linkedinEnriched: analysis.linkedinEnriched,
        };
      }),

    getAnalysis: publicProcedure
      .input(z.object({ analysisId: z.number(), sessionToken: z.string() }))
      .query(async ({ input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.sessionToken !== input.sessionToken) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (analysis.status !== "completed") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Analysis not ready" });
        }
        const [suggestionsList, coverLetter] = await Promise.all([
          getSuggestionsByAnalysisId(input.analysisId),
          getCoverLetterByAnalysisId(input.analysisId),
        ]);
        return { analysis, suggestions: suggestionsList, coverLetter };
      }),

    getHistory: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        return getSessionAnalyses(input.sessionToken);
      }),

    updateSuggestion: publicProcedure
      .input(
        z.object({
          suggestionId: z.number(),
          status: z.enum(["pending", "accepted", "rejected"]),
          sessionToken: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await updateSuggestionStatus(input.suggestionId, input.status);
        return { success: true };
      }),

    regenerateCoverLetter: publicProcedure
      .input(
        z.object({
          analysisId: z.number(),
          sessionToken: z.string(),
          tone: z.enum(["professional", "enthusiastic", "concise"]),
        })
      )
      .mutation(async ({ input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.sessionToken !== input.sessionToken) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const content = await generateCoverLetter(
          analysis.resumeText ?? "",
          analysis.jobDescription ?? "",
          analysis.jobTitle ?? "Position",
          analysis.companyName ?? "Company",
          input.tone
        );
        const existing = await getCoverLetterByAnalysisId(input.analysisId);
        if (existing) {
          await updateCoverLetter(existing.id, content);
        } else {
          await createCoverLetter({ analysisId: input.analysisId, content, tone: input.tone });
        }
        return { content };
      }),

    regenerateSummary: publicProcedure
      .input(z.object({ analysisId: z.number(), sessionToken: z.string() }))
      .mutation(async ({ input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.sessionToken !== input.sessionToken) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const { invokeLLM } = await import("./_core/llm");
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert resume writer. Rewrite professional summaries to be compelling and tailored. Be specific, not generic.",
            },
            {
              role: "user",
              content: `Rewrite this professional summary for a ${analysis.jobTitle} role at ${analysis.companyName}.

Original: ${analysis.originalSummary}

Job context: ${(analysis.jobDescription ?? "").slice(0, 2000)}

Write a 3-4 sentence summary highlighting relevant experience, key skills, and value proposition.`,
            },
          ],
        });
        const raw = result.choices[0]?.message?.content;
        const rewrittenSummary = typeof raw === "string" ? raw : "";
        await updateAnalysis(input.analysisId, { rewrittenSummary });
        return { rewrittenSummary };
      }),

    deleteHistory: publicProcedure
      .input(z.object({ analysisId: z.number(), sessionToken: z.string() }))
      .mutation(async ({ input }) => {
        await deleteAnalysis(input.analysisId, input.sessionToken);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
