# ResumeTailor – Project TODO

## Design System & Infrastructure
- [x] Set up elegant color palette (deep navy, warm cream, gold accents) in index.css
- [x] Configure premium typography (Playfair Display + Inter) via Google Fonts
- [x] Define spacing, shadow, and radius tokens
- [x] Set up DB schema: analyses, suggestions, cover_letters tables
- [x] Run DB migrations

## Landing Page
- [x] Hero section with headline, subheadline, and CTA
- [x] Feature highlights section (6 feature cards)
- [x] Before/after resume comparison section
- [x] Testimonials / social proof section
- [x] Footer with nav links
- [x] Sticky top navigation with login button

## Backend & AI
- [x] Resume file upload endpoint (PDF/DOCX) with S3 storage
- [x] Job URL scraping procedure (fetch and parse job description)
- [x] LinkedIn URL scraping procedure
- [x] Resume text extraction (PDF/DOCX parsing)
- [x] AI resume analysis: keyword gaps, skill mismatches, ATS score
- [x] AI inline suggestions generation (section-by-section edits)
- [x] AI resume summary rewriter
- [x] AI cover letter generator
- [x] Save analysis to DB (analyses table)
- [x] Save suggestions to DB (suggestions table)
- [x] Save cover letter to DB (cover_letters table)
- [x] Fetch user's analysis history

## Multi-Step Input Form
- [x] Step 1: LinkedIn URL input with validation
- [x] Step 2: Job posting URL input with validation
- [x] Step 3: Resume upload (PDF/DOCX) with drag-and-drop
- [x] Step progress indicator
- [x] Form state persistence across steps
- [x] Loading/processing state with animated progress

## Analysis Results Page
- [x] ATS Compatibility Score ring/gauge with animated reveal
- [x] Keyword Gap Analysis panel (missing keywords + placement suggestions)
- [x] Inline resume editor with highlighted AI suggestions
- [x] Accept/reject controls per suggestion
- [x] Resume Summary Rewriter panel
- [x] Cover Letter Generator panel
- [x] Export: download edited resume as PDF
- [x] Export: copy cover letter to clipboard

## Resume History Page
- [x] List past analyses scoped to user session
- [x] Click to reload a past analysis
- [x] Delete history entry

## Tests
- [x] Vitest: resume analysis procedure
- [x] Vitest: cover letter generation procedure
- [x] Vitest: ATS score calculation

## Overhaul: No-Auth Anonymous Flow
- [x] Remove all login/auth gates from Analyze, Results, History pages
- [x] Replace user-scoped DB queries with anonymous session ID (stored in localStorage)
- [x] Remove auth nav buttons from landing page and all inner pages
- [x] Update DB schema: make userId nullable, add sessionToken column
- [x] Generate and persist anonymous session ID on first visit
- [x] Update all tRPC procedures to use sessionToken instead of userId

## Honest ATS Scoring System
- [x] Replace inflated score with flat, honest scoring algorithm
- [x] Add clear disclaimer: "This is a keyword-match estimate, not a real ATS system"
- [x] Score breakdown: keyword match %, skills coverage %, format signals
- [x] Color-coded labels: Low / Moderate / Good / Strong (no "Excellent" for anything under 85)
- [x] Add "What this score means" explainer tooltip on the score ring

## Skill Benchmarking (Comparable Jobs & Professionals)
- [x] Scrape 3–5 similar job postings from the same title/company type
- [x] Extract top skills required across those comparable postings
- [x] Surface "Skills commonly required for this role" panel
- [x] Show which of those skills are present vs. missing in user's resume
- [x] Add "Based on X similar job postings" attribution

## Project Brainstorming
- [x] AI generates 5–8 project ideas to close skill gaps
- [x] Each project: title, description, skills gained, estimated time, work vs. side project tag
- [x] Separate "At Work" and "Side Project / Personal" sections
- [x] Copy project idea to clipboard button
- [x] Add as new tab in Results page

## Tests
- [x] Vitest: anonymous session flow
- [x] Vitest: honest ATS scoring
- [x] Vitest: skill benchmarking procedure
- [x] Vitest: project brainstorming procedure

## LinkedIn Profile Integration
- [x] Build LinkedIn URL parser: extract username from URL
- [x] Build LinkedIn profile scraper: fetch public profile HTML
- [x] Parse experience section: titles, companies, durations, descriptions
- [x] Parse skills section: skill names and endorsement counts
- [x] Parse education section: degrees, schools, years
- [x] Parse summary/about section
- [x] Build linkedinService.ts with scrapeLinkedInProfile()
- [x] Update DB schema: add linkedinData JSON column to analyses
- [x] Update startAnalysis procedure to scrape LinkedIn if URL provided
- [x] Update analyzeResume to incorporate LinkedIn data in AI prompt
- [x] Surface LinkedIn enrichment in results: "Enriched with LinkedIn data" badge
- [x] Show LinkedIn-specific insights: experience gaps, title progression, skills not on resume
- [x] Update Analyze page step 1 to show what data will be extracted
- [x] Vitest: LinkedIn URL parsing
- [x] Vitest: LinkedIn data integration in analysis

## LinkedIn Profile Integration
- [x] Build LinkedIn URL parser: extract username from URL
- [x] Build LinkedIn profile scraper: fetch public profile HTML and parse it
- [x] Parse experience, skills, education, summary sections
- [x] Build linkedinService.ts with scrapeLinkedInProfile()
- [x] Update DB schema: add linkedinData JSON column to analyses
- [x] Update startAnalysis to scrape LinkedIn if URL provided
- [x] Update analyzeResume AI prompt to use LinkedIn data for deeper gap analysis
- [x] Surface LinkedIn enrichment badge in results header
- [x] Show LinkedIn-specific insights panel (experience gaps, hidden skills, title progression)
- [x] Update Analyze page step 1 to explain what LinkedIn data will be used for
- [x] Vitest: LinkedIn URL parsing and scraper
- [x] Vitest: LinkedIn-enriched analysis procedure

## Jobs to Consider
- [x] AI generates 5-6 job role recommendations based on resume + target role
- [x] Each job: title, why it fits, required skills overlap, seniority level, search links
- [x] Generate LinkedIn Jobs and Indeed search URLs for each recommendation
- [x] Show "Jobs to Consider" section at bottom of Results page
- [x] Include "Stretch roles" (slightly above current level) and "Lateral roles" (same level, different domain)
- [x] Add jobRecommendations JSON column to analyses DB schema
- [x] Vitest: job recommendations procedure

## App Flow Redesign
- [ ] Collapse landing page into a single inline form (no multi-step wizard)
- [ ] Form fields: LinkedIn URL (optional), job URL (required), resume upload (required), notes/concerns (optional textarea)
- [ ] Remove the separate Analyze page — form lives on the home page
- [ ] Redesign Results as a clean evaluation: score, what's missing, what's good, improvements list
- [ ] Add prominent "Generate improved resume" button on Results page
- [ ] Build GeneratedResume page: full rewritten resume document, copy + download options
- [ ] Add generateImprovedResume backend procedure
- [ ] Add generatedResume column to analyses DB schema
- [ ] Vitest: generateImprovedResume procedure
