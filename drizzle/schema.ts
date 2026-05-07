import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Resume Analyses ───────────────────────────────────────────────────────
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  // Anonymous session token (stored in browser localStorage)
  sessionToken: varchar("sessionToken", { length: 128 }).notNull(),

  // Inputs
  linkedinUrl: text("linkedinUrl"),
  jobUrl: text("jobUrl"),
  jobTitle: text("jobTitle"),
  companyName: text("companyName"),
  jobDescription: text("jobDescription"),
  resumeFileKey: text("resumeFileKey"),
  resumeFileName: text("resumeFileName"),
  resumeText: text("resumeText"),

  // Honest ATS scoring
  atsScore: float("atsScore"),              // 0–100 keyword-match estimate
  atsBreakdown: json("atsBreakdown"),       // { keywordMatch, skillsCoverage, formatSignals }
  atsDisclaimer: text("atsDisclaimer"),     // Honest explanation of what the score means
  missingKeywords: json("missingKeywords"), // string[]
  matchedKeywords: json("matchedKeywords"), // string[]
  skillGaps: json("skillGaps"),            // { skill, importance, placement }[]

  // Skill benchmarking from comparable jobs
  benchmarkSkills: json("benchmarkSkills"), // { skill, frequency, present }[]
  benchmarkSource: text("benchmarkSource"), // "Based on X similar job postings for [title]"

  // Summary rewriter
  rewrittenSummary: text("rewrittenSummary"),
  originalSummary: text("originalSummary"),

  // Project brainstorming
  projectIdeas: json("projectIdeas"), // ProjectIdea[]

  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"])
    .default("pending")
    .notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

// ─── Inline Suggestions ────────────────────────────────────────────────────
export const suggestions = mysqlTable("suggestions", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  section: varchar("section", { length: 128 }).notNull(),
  originalText: text("originalText").notNull(),
  suggestedText: text("suggestedText").notNull(),
  reason: text("reason"),
  impact: mysqlEnum("impact", ["high", "medium", "low"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = typeof suggestions.$inferInsert;

// ─── Cover Letters ─────────────────────────────────────────────────────────
export const coverLetters = mysqlTable("coverLetters", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  content: text("content").notNull(),
  tone: mysqlEnum("tone", ["professional", "enthusiastic", "concise"]).default("professional").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CoverLetter = typeof coverLetters.$inferSelect;
export type InsertCoverLetter = typeof coverLetters.$inferInsert;
