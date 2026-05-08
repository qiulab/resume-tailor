# LevelUp

> **Level up your skills and resume to get the job.**

LevelUp is an AI-powered resume evaluation tool that goes beyond keyword matching. Paste a job URL, add your resume, and get a clear picture of what's missing — with specific project ideas to close the gap and a tailored resume you can download.

**No account required. Results in under 90 seconds.**

🔗 **Live:** [resumetailor-vev9lyjk.manus.space](https://resumetailor-vev9lyjk.manus.space)

---

## Demo

https://files.manuscdn.com/user_upload_by_module/session_file/310519663637683954/obhqwZCtYmGJanSN.mp4

---

## Screenshots

### Home — Clean single-page form
![LevelUp home page](https://files.manuscdn.com/user_upload_by_module/session_file/310519663637683954/CjvHyKzJETEuSEbe.png)

### Evaluation — Semantic match score with strengths and gaps
![Evaluation results](https://files.manuscdn.com/user_upload_by_module/session_file/310519663637683954/nIauLwkpqVbNTLEY.png)

### Projects — Concrete project ideas to close your skill gaps
![Projects tab](https://files.manuscdn.com/user_upload_by_module/session_file/310519663637683954/OquZeuUqYGDyUNna.png)

---

## What Makes This Different

Most resume tools just count keywords. LevelUp uses AI to evaluate **semantic fit** — it understands synonyms, implied skills, and whether your actual experience genuinely matches the role. Then it tells you specifically what to do about it.

The standout feature is the **Projects tab**: instead of just listing what you're missing, LevelUp suggests concrete projects you can work on — at your current job or as side projects — to actually build those skills. Each project includes what skills you'd gain, how long it takes, and the difficulty level.

---

## Features

| Feature | Description |
|---|---|
| **Semantic match score** | AI evaluates genuine fit beyond keyword counting. Capped at 88 — never inflated. Includes "What's working" and "What's missing" in plain language. |
| **Inline suggestions** | AI rewrites specific lines in your resume. Accept or reject each one individually. Summary/objective sections are never touched. |
| **Skill benchmark** | Shows which skills are most common for the role — green for what you have, red for what's missing, sorted by frequency. |
| **Project ideas** | Suggests specific at-work and side projects to build the skills you're missing. Each includes skills gained, time estimate, and difficulty. |
| **Generate improved resume** | Produces a full rewritten resume incorporating your accepted suggestions, tailored to the specific job. |
| **LinkedIn profile parsing** | Scrapes your public LinkedIn profile to enrich the analysis with your full work history, skills, and education. |
| **Upload or paste** | Upload a PDF/DOCX or paste resume text directly — no file required. |
| **No account required** | Sessions are identified by a browser-local token. Nothing is tied to an account or email. |

---

## How It Works

```
1. Paste job posting URL (required)
2. Add LinkedIn profile URL (optional — enables deeper analysis)
3. Upload resume PDF/DOCX or paste text (optional)
4. Add notes or concerns (optional — e.g. "I'm switching industries")
5. Click "Level up my resume"
```

The app then:
- Scrapes and parses the job description
- Parses your LinkedIn profile (if provided)
- Extracts text from your resume
- Runs semantic AI analysis comparing your background to the role
- Generates skill benchmarks from comparable job postings
- Suggests specific projects to close skill gaps
- Produces inline edit suggestions (filtering out summary/objective sections)
- Generates job recommendations with LinkedIn and Indeed search links

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Tailwind CSS 4, shadcn/ui, Wouter |
| **Backend** | Node.js, Express, tRPC 11 |
| **Database** | MySQL / TiDB via Drizzle ORM |
| **AI** | Gemini 2.5 Flash (semantic scoring, analysis, generation) |
| **File parsing** | pdf-parse (PDF), mammoth (DOCX) |
| **LinkedIn** | Custom HTML scraper + AI-powered structured extraction |
| **Auth** | Anonymous session tokens stored in localStorage |
| **Hosting** | Manus |

---

## Project Structure

```
client/src/
  pages/
    Home.tsx          Single-page form (job URL, LinkedIn, resume, notes)
    Results.tsx       Evaluation results with 5 tabs
    History.tsx       Past analyses scoped to session
  hooks/
    useSession.ts     Anonymous session token management

server/
  routers.ts          All tRPC API procedures
  analysisService.ts  AI analysis, semantic scoring, benchmarking, projects
  linkedinService.ts  LinkedIn profile scraper and parser
  db.ts               Drizzle query helpers

drizzle/
  schema.ts           Database schema (analyses, suggestions, coverLetters)
```

---

## Design Decisions

**Honest scoring.** The match score is a semantic AI estimate, not a real ATS system output. It's capped at 88 and always shown with a plain-language disclaimer. Real ATS systems vary wildly — this is a guide, not a guarantee.

**No summary/objective suggestions.** The AI is explicitly instructed to never suggest changes to the summary or objective section. That section is personal and should reflect the candidate's own voice.

**Projects over platitudes.** Most resume tools tell you what's missing. LevelUp tells you how to actually build it — with specific, actionable project ideas tied directly to your skill gaps.

**Anonymous by default.** No login, no email, no account. A random session token is generated on first visit and stored in localStorage. All analyses are scoped to that token.

---

## Local Development

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in: DATABASE_URL, BUILT_IN_FORGE_API_KEY, BUILT_IN_FORGE_API_URL, JWT_SECRET

# Run database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Start development server
pnpm dev
# App runs at http://localhost:3000
```

## Tests

```bash
pnpm test
# 25 tests across 4 files:
# - Anonymous session flow
# - Semantic ATS scoring (computeHonestATSScore unit tests)
# - LinkedIn URL parsing
# - Job recommendations structure
# - Cover letter generation
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `BUILT_IN_FORGE_API_KEY` | LLM API key (Manus Forge / Gemini) |
| `BUILT_IN_FORGE_API_URL` | LLM API base URL |
| `JWT_SECRET` | Session signing secret |
| `VITE_APP_ID` | OAuth application ID |

---

## License

MIT
