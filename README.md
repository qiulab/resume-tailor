# LevelUp

**Level up your skills and resume to get the job.** Paste a job posting URL, optionally upload your resume or LinkedIn profile, and get a detailed analysis of how well you match the role — along with specific suggestions, skill benchmarking, project ideas to close your gaps, and a tailored resume you can download.

No account required. Results in under 90 seconds.

---

## Live Demo

[resumetailor-vev9lyjk.manus.space](https://resumetailor-vev9lyjk.manus.space) *(domain update pending)*

---

## What It Does

ResumeTailor evaluates your resume against a specific job description using semantic AI analysis — not just keyword counting. It understands context, synonyms, and implied skills, then gives you a clear picture of where you stand and what to do about it.

| Feature | Description |
|---|---|
| **Semantic match score** | AI evaluates genuine fit, not just keyword overlap. Capped at 88 — never inflated. |
| **What's working / What's missing** | Plain-language qualitative assessment of your strengths and gaps. |
| **Inline suggestions** | AI rewrites specific lines in your resume. Accept or reject each one. |
| **Skill benchmark** | Shows which skills are most common for the role, sorted by what you have (green) and what's missing (red). |
| **Project ideas** | Suggests concrete at-work and side projects to build the skills you're missing. |
| **Generate improved resume** | Produces a full rewritten resume incorporating your accepted suggestions, tailored to the job. |
| **LinkedIn profile parsing** | Scrapes your public LinkedIn profile to enrich the analysis with your full work history. |
| **No account required** | Sessions are identified by a browser-local token. Nothing is tied to an account. |

---

## How to Use

1. Paste the job posting URL
2. Optionally add your LinkedIn profile URL for deeper analysis
3. Upload your resume (PDF or DOCX) or paste the text directly
4. Add any notes or concerns (e.g. career gap, industry switch)
5. Click **Evaluate my resume**
6. Review the evaluation, accept suggestions, then click **Generate Resume** for a tailored version

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Wouter |
| Backend | Node.js, Express, tRPC 11 |
| Database | MySQL / TiDB (via Drizzle ORM) |
| AI | Gemini 2.5 Flash via Manus Forge API |
| File parsing | pdf-parse, mammoth (DOCX) |
| Auth | Anonymous session tokens (localStorage) |
| Hosting | Manus |

---

## Project Structure

```
client/          React frontend
  src/
    pages/       Home, Results, History
    hooks/       useSession (anonymous session management)
    components/  shadcn/ui components

server/          Express + tRPC backend
  routers.ts     All API procedures
  analysisService.ts  AI analysis, scoring, benchmarking, project ideas
  linkedinService.ts  LinkedIn profile scraper
  db.ts          Drizzle query helpers

drizzle/         Database schema and migrations
```

---

## Key Design Decisions

**Honest scoring.** The match score is a semantic AI estimate, not a real ATS system output. It's capped at 88 and always shown with a disclaimer. Real ATS systems vary wildly by company and platform — this is a guide, not a guarantee.

**No summary/objective suggestions.** The AI is explicitly instructed never to suggest changes to the summary or objective section of a resume. That section is personal and should reflect the candidate's own voice.

**Anonymous by default.** No login, no email, no account. A random session token is generated on first visit and stored in localStorage. All analyses are scoped to that token.

**LinkedIn as enrichment, not requirement.** LinkedIn scraping is optional and gracefully degrades — if the profile is private or scraping fails, the analysis continues without it.

---

## Local Development

```bash
# Install dependencies
pnpm install

# Set up environment variables (see .env.example)
cp .env.example .env

# Run database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Start development server
pnpm dev
```

The app runs on `http://localhost:3000`.

---

## Running Tests

```bash
pnpm test
```

25 tests across 4 test files covering: anonymous session flow, ATS scoring logic, LinkedIn URL parsing, job recommendations, and cover letter generation.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge API key (LLM access) |
| `BUILT_IN_FORGE_API_URL` | Manus Forge API base URL |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | OAuth application ID |

---

## License

MIT
