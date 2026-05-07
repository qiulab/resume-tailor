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
} from "./analysisService";
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
    // Start analysis — anonymous, identified by sessionToken from localStorage
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
        // Create pending analysis record
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

            // 4. Run AI analysis (honest scoring)
            const analysis = await analyzeResume(resumeText, jobDescription, jobTitle, companyName);

            // 5. Benchmark skills from comparable jobs
            const benchmark = await benchmarkSkillsForRole(jobTitle, companyName, resumeText);

            // 6. Brainstorm projects to close skill gaps
            const projects = await brainstormProjects(
              resumeText,
              jobTitle,
              analysis.skillGaps,
              analysis.missingKeywords
            );

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

    // Poll analysis status
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
        };
      }),

    // Get full analysis results
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

    // Get session history
    getHistory: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        return getSessionAnalyses(input.sessionToken);
      }),

    // Update suggestion status
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

    // Regenerate cover letter
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

    // Regenerate summary
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
              content:
                "You are an expert resume writer. Rewrite professional summaries to be compelling and tailored to specific roles. Be honest and specific — no fluff.",
            },
            {
              role: "user",
              content: `Rewrite this professional summary for a ${analysis.jobTitle} role at ${analysis.companyName}.

Original summary:
${analysis.originalSummary}

Job description context:
${(analysis.jobDescription ?? "").slice(0, 2000)}

Write a 3-4 sentence professional summary that highlights relevant experience, key skills matching the job, and a compelling value proposition. Be specific and quantifiable where possible.`,
            },
          ],
        });
        const raw = result.choices[0]?.message?.content;
        const rewrittenSummary = typeof raw === "string" ? raw : "";
        await updateAnalysis(input.analysisId, { rewrittenSummary });
        return { rewrittenSummary };
      }),

    // Delete history entry
    deleteHistory: publicProcedure
      .input(z.object({ analysisId: z.number(), sessionToken: z.string() }))
      .mutation(async ({ input }) => {
        await deleteAnalysis(input.analysisId, input.sessionToken);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
