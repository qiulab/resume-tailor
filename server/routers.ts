import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createAnalysis,
  updateAnalysis,
  getAnalysisById,
  getUserAnalyses,
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

  // ─── Resume Analysis ────────────────────────────────────────────────────
  resume: router({
    // Upload resume file and start analysis
    startAnalysis: protectedProcedure
      .input(
        z.object({
          linkedinUrl: z.string().optional(),
          jobUrl: z.string().url("Please enter a valid job posting URL"),
          resumeBase64: z.string(),
          resumeFileName: z.string(),
          resumeMimeType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const sessionId = ctx.user.openId;

        // Create pending analysis record
        const analysisId = await createAnalysis({
          userId,
          sessionId,
          linkedinUrl: input.linkedinUrl,
          jobUrl: input.jobUrl,
          resumeFileName: input.resumeFileName,
          status: "processing",
        });

        // Process asynchronously (fire and forget with error handling)
        (async () => {
          try {
            // 1. Upload resume to storage
            const buffer = Buffer.from(input.resumeBase64, "base64");
            const fileKey = `resumes/${userId}/${Date.now()}-${input.resumeFileName}`;
            const { key } = await storagePut(fileKey, buffer, input.resumeMimeType);

            // 2. Extract text from resume
            const resumeText = await extractTextFromBuffer(buffer, input.resumeMimeType);

            // 3. Scrape job description
            const { jobTitle, companyName, description: jobDescription } =
              await scrapeJobDescription(input.jobUrl);

            // 4. Run AI analysis
            const analysis = await analyzeResume(
              resumeText,
              jobDescription,
              jobTitle,
              companyName
            );

            // 5. Save analysis results
            await updateAnalysis(analysisId, {
              resumeFileKey: key,
              resumeText,
              jobDescription,
              jobTitle: analysis.jobTitle,
              companyName: analysis.companyName,
              atsScore: analysis.atsScore,
              atsBreakdown: analysis.atsBreakdown,
              missingKeywords: analysis.missingKeywords,
              matchedKeywords: analysis.matchedKeywords,
              skillGaps: analysis.skillGaps,
              originalSummary: analysis.originalSummary,
              rewrittenSummary: analysis.rewrittenSummary,
              status: "completed",
            });

            // 6. Save suggestions
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

            // 7. Generate cover letter
            const coverLetterContent = await generateCoverLetter(
              resumeText,
              jobDescription,
              analysis.jobTitle,
              analysis.companyName,
              "professional"
            );
            await createCoverLetter({
              analysisId,
              content: coverLetterContent,
              tone: "professional",
            });
          } catch (err) {
            console.error("[startAnalysis] Processing error:", err);
            await updateAnalysis(analysisId, { status: "failed" });
          }
        })();

        return { analysisId };
      }),

    // Poll analysis status
    getStatus: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .query(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.userId !== ctx.user.id) {
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
    getAnalysis: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .query(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (analysis.status !== "completed") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Analysis not ready" });
        }

        const [suggestionsList, coverLetter] = await Promise.all([
          getSuggestionsByAnalysisId(input.analysisId),
          getCoverLetterByAnalysisId(input.analysisId),
        ]);

        return {
          analysis,
          suggestions: suggestionsList,
          coverLetter,
        };
      }),

    // Get user's analysis history
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      return getUserAnalyses(ctx.user.id);
    }),

    // Update suggestion status (accept/reject)
    updateSuggestion: protectedProcedure
      .input(
        z.object({
          suggestionId: z.number(),
          status: z.enum(["pending", "accepted", "rejected"]),
        })
      )
      .mutation(async ({ input }) => {
        await updateSuggestionStatus(input.suggestionId, input.status);
        return { success: true };
      }),

    // Regenerate cover letter with different tone
    regenerateCoverLetter: protectedProcedure
      .input(
        z.object({
          analysisId: z.number(),
          tone: z.enum(["professional", "enthusiastic", "concise"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.userId !== ctx.user.id) {
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

    // Delete an analysis from history
    deleteHistory: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteAnalysis(input.analysisId, ctx.user.id);
        return { success: true };
      }),

    // Regenerate professional summary
    regenerateSummary: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const { invokeLLM } = await import("./_core/llm");
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are an expert resume writer. Rewrite professional summaries to be compelling, ATS-optimized, and tailored to specific roles.",
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
  }),
});

export type AppRouter = typeof appRouter;
