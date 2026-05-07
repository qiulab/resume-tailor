import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  analyses,
  suggestions,
  coverLetters,
  InsertAnalysis,
  InsertSuggestion,
  InsertCoverLetter,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ─────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Analyses (anonymous session-based) ───────────────────────────────────
export async function createAnalysis(data: InsertAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(analyses).values(data);
  return result.insertId as number;
}

export async function updateAnalysis(id: number, data: Partial<InsertAnalysis>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set(data).where(eq(analyses.id, id));
}

export async function getAnalysisById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  return result[0];
}

export async function getSessionAnalyses(sessionToken: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(analyses)
    .where(and(eq(analyses.sessionToken, sessionToken), eq(analyses.status, "completed")))
    .orderBy(desc(analyses.createdAt))
    .limit(20);
}

// ─── Suggestions ───────────────────────────────────────────────────────────
export async function createSuggestions(data: InsertSuggestion[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(suggestions).values(data);
}

export async function getSuggestionsByAnalysisId(analysisId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(suggestions)
    .where(eq(suggestions.analysisId, analysisId))
    .orderBy(suggestions.sortOrder);
}

export async function updateSuggestionStatus(
  id: number,
  status: "pending" | "accepted" | "rejected"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suggestions).set({ status }).where(eq(suggestions.id, id));
}

// ─── Cover Letters ─────────────────────────────────────────────────────────
export async function createCoverLetter(data: InsertCoverLetter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(coverLetters).values(data);
  return result.insertId as number;
}

export async function getCoverLetterByAnalysisId(analysisId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(coverLetters)
    .where(eq(coverLetters.analysisId, analysisId))
    .limit(1);
  return result[0];
}

export async function updateCoverLetter(id: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(coverLetters).set({ content }).where(eq(coverLetters.id, id));
}

export async function deleteAnalysis(id: number, sessionToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  if (!existing[0] || existing[0].sessionToken !== sessionToken) {
    throw new Error("Not found or unauthorized");
  }
  await db.delete(suggestions).where(eq(suggestions.analysisId, id));
  await db.delete(coverLetters).where(eq(coverLetters.analysisId, id));
  await db.delete(analyses).where(eq(analyses.id, id));
}
