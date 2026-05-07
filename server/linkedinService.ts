import { invokeLLM } from "./_core/llm";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface LinkedInExperience {
  title: string;
  company: string;
  duration: string;
  description?: string;
  isCurrent: boolean;
}

export interface LinkedInEducation {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  years?: string;
}

export interface LinkedInSkill {
  name: string;
  endorsements?: number;
}

export interface LinkedInProfile {
  name: string;
  headline: string;
  summary: string;
  location: string;
  experience: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: LinkedInSkill[];
  totalYearsExperience: number;
  currentTitle: string;
  currentCompany: string;
  scrapedAt: string;
}

// ─── URL Parser ────────────────────────────────────────────────────────────
export function extractLinkedInUsername(url: string): string | null {
  try {
    const normalized = url.trim().replace(/\/$/, "");
    // Match patterns: linkedin.com/in/username or linkedin.com/in/username/
    const match = normalized.match(
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

// ─── HTML Cleaner ──────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSection(html: string, sectionAttr: string): string {
  const regex = new RegExp(
    `<section[^>]*data-section="${sectionAttr}"[^>]*>([\\s\\S]*?)</section>`,
    "i"
  );
  const match = html.match(regex);
  return match ? stripHtml(match[1]) : "";
}

// ─── Profile Scraper ───────────────────────────────────────────────────────
export async function scrapeLinkedInProfile(
  linkedinUrl: string
): Promise<LinkedInProfile | null> {
  const username = extractLinkedInUsername(linkedinUrl);
  if (!username) return null;

  try {
    const profileUrl = `https://www.linkedin.com/in/${username}`;
    const response = await fetch(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[LinkedIn] HTTP ${response.status} for ${profileUrl}`);
      return null;
    }

    const html = await response.text();

    // Extract key sections
    const nameMeta = html.match(
      /<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i
    );
    const headlineMeta = html.match(
      /class="[^"]*top-card-layout__headline[^"]*"[^>]*>([\s\S]*?)<\//i
    );
    const locationMeta = html.match(
      /class="[^"]*top-card__subline-item[^"]*"[^>]*>([\s\S]*?)<\//i
    );

    const name = nameMeta ? stripHtml(nameMeta[1]) : "";
    const headline = headlineMeta ? stripHtml(headlineMeta[1]) : "";
    const location = locationMeta ? stripHtml(locationMeta[1]) : "";

    // Extract sections as raw text
    const experienceRaw = extractSection(html, "experience");
    const educationRaw = extractSection(html, "educations");
    const summaryRaw = extractSection(html, "summary");

    // Extract skills section (different attribute)
    const skillsMatch = html.match(
      /class="[^"]*skills-section[^"]*"[^>]*>([\s\S]*?)<\/section>/i
    );
    const skillsRaw = skillsMatch ? stripHtml(skillsMatch[1]) : "";

    // Also try to get skills from the top card
    const topSkillsMatch = html.match(
      /Top skills[^<]*<\/[^>]+>([\s\S]*?)(?:<\/section>|data-section)/i
    );
    const topSkillsRaw = topSkillsMatch ? stripHtml(topSkillsMatch[1]) : "";

    // Combine all raw text for AI parsing
    const profileText = `
NAME: ${name}
HEADLINE: ${headline}
LOCATION: ${location}

SUMMARY:
${summaryRaw || "Not available"}

EXPERIENCE:
${experienceRaw || "Not available"}

EDUCATION:
${educationRaw || "Not available"}

SKILLS:
${skillsRaw || topSkillsRaw || "Not available"}
`.trim();

    // Use AI to parse the raw text into structured data
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a LinkedIn profile parser. Extract structured information from the provided raw LinkedIn profile text. Return only valid JSON. Be thorough and accurate.",
        },
        {
          role: "user",
          content: `Parse this LinkedIn profile text into structured JSON. Extract all experience entries, education, skills, and summary.

PROFILE TEXT:
${profileText.slice(0, 6000)}

Return a complete structured profile with all experience, education, and skills you can identify.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "linkedin_profile",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              headline: { type: "string" },
              summary: { type: "string" },
              location: { type: "string" },
              currentTitle: { type: "string" },
              currentCompany: { type: "string" },
              totalYearsExperience: {
                type: "number",
                description: "Estimated total years of professional experience",
              },
              experience: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    company: { type: "string" },
                    duration: { type: "string" },
                    description: { type: "string" },
                    isCurrent: { type: "boolean" },
                  },
                  required: ["title", "company", "duration", "description", "isCurrent"],
                  additionalProperties: false,
                },
              },
              education: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    school: { type: "string" },
                    degree: { type: "string" },
                    fieldOfStudy: { type: "string" },
                    years: { type: "string" },
                  },
                  required: ["school", "degree", "fieldOfStudy", "years"],
                  additionalProperties: false,
                },
              },
              skills: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    endorsements: { type: "number" },
                  },
                  required: ["name", "endorsements"],
                  additionalProperties: false,
                },
              },
            },
            required: [
              "name", "headline", "summary", "location",
              "currentTitle", "currentCompany", "totalYearsExperience",
              "experience", "education", "skills",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = result.choices[0]?.message?.content;
    const content = typeof raw === "string" ? raw : null;
    if (!content) return null;

    const parsed = JSON.parse(content) as LinkedInProfile;
    parsed.scrapedAt = new Date().toISOString();
    return parsed;
  } catch (err) {
    console.error("[LinkedIn] Scraping error:", err);
    return null;
  }
}

// ─── LinkedIn-enriched analysis context builder ────────────────────────────
export function buildLinkedInContext(profile: LinkedInProfile): string {
  const expList = profile.experience
    .slice(0, 6)
    .map(
      (e) =>
        `- ${e.title} at ${e.company} (${e.duration})${e.description ? ": " + e.description.slice(0, 150) : ""}`
    )
    .join("\n");

  const eduList = profile.education
    .map((e) => `- ${e.degree || ""} ${e.fieldOfStudy || ""} at ${e.school} (${e.years || ""})`)
    .join("\n");

  const skillList = profile.skills
    .slice(0, 20)
    .map((s) => s.name)
    .join(", ");

  return `
LINKEDIN PROFILE DATA (use this for deeper analysis):
Name: ${profile.name}
Current Role: ${profile.currentTitle} at ${profile.currentCompany}
Total Experience: ~${profile.totalYearsExperience} years
Location: ${profile.location}

Professional Summary:
${profile.summary || "Not provided"}

Work Experience:
${expList || "Not available"}

Education:
${eduList || "Not available"}

LinkedIn Skills (${profile.skills.length} total):
${skillList || "Not available"}
`.trim();
}
