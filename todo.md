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
