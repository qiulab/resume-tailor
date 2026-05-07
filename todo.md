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
- [ ] Remove all login/auth gates from Analyze, Results, History pages
- [ ] Replace user-scoped DB queries with anonymous session ID (stored in localStorage)
- [ ] Remove auth nav buttons from landing page and all inner pages
- [ ] Update DB schema: make userId nullable, add sessionToken column
- [ ] Generate and persist anonymous session ID on first visit
- [ ] Update all tRPC procedures to use sessionToken instead of userId

## Honest ATS Scoring System
- [ ] Replace inflated score with flat, honest scoring algorithm
- [ ] Add clear disclaimer: "This is a keyword-match estimate, not a real ATS system"
- [ ] Score breakdown: keyword match %, skills coverage %, format signals
- [ ] Color-coded labels: Low / Moderate / Good / Strong (no "Excellent" for anything under 85)
- [ ] Add "What this score means" explainer tooltip on the score ring

## Skill Benchmarking (Comparable Jobs & Professionals)
- [ ] Scrape 3–5 similar job postings from the same title/company type
- [ ] Extract top skills required across those comparable postings
- [ ] Surface "Skills commonly required for this role" panel
- [ ] Show which of those skills are present vs. missing in user's resume
- [ ] Add "Based on X similar job postings" attribution

## Project Brainstorming
- [ ] AI generates 5–8 project ideas to close skill gaps
- [ ] Each project: title, description, skills gained, estimated time, work vs. side project tag
- [ ] Separate "At Work" and "Side Project / Personal" sections
- [ ] Copy project idea to clipboard button
- [ ] Add as new tab in Results page

## Tests
- [ ] Vitest: anonymous session flow
- [ ] Vitest: honest ATS scoring
- [ ] Vitest: skill benchmarking procedure
- [ ] Vitest: project brainstorming procedure
