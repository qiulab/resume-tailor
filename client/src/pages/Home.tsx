import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  FileText,
  Link2,
  Linkedin,
  Target,
  PenTool,
  BarChart3,
  Code2,
  Briefcase,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const WHAT_IT_DOES = [
  {
    icon: Target,
    title: "Keyword match score",
    desc: "Compares your resume against the job description and shows which keywords are present or missing. The score is an estimate — not a real ATS output.",
  },
  {
    icon: PenTool,
    title: "Inline edit suggestions",
    desc: "AI rewrites specific lines in your resume to better match the job. You review each one and accept or reject it.",
  },
  {
    icon: BarChart3,
    title: "Skill benchmark",
    desc: "Shows which skills are commonly required for the role based on similar job postings, and which ones you're missing.",
  },
  {
    icon: Sparkles,
    title: "Summary rewrite",
    desc: "Rewrites your professional summary to be more relevant to the specific job you're applying to.",
  },
  {
    icon: FileText,
    title: "Cover letter",
    desc: "Generates a cover letter based on your resume and the job description. You can regenerate it in three different tones.",
  },
  {
    icon: Code2,
    title: "Project ideas",
    desc: "Suggests specific projects — at work or as side projects — to help you build the skills you're missing for the role.",
  },
  {
    icon: Briefcase,
    title: "Jobs to consider",
    desc: "Recommends similar roles you're qualified for, with direct search links to LinkedIn Jobs and Indeed.",
  },
  {
    icon: Linkedin,
    title: "LinkedIn profile parsing",
    desc: "If you add your LinkedIn URL, it scrapes your public profile and uses your full work history for a more accurate analysis.",
  },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Nav ─────────────────────────────────────────────────────── */}
      <nav className="border-b border-border/60">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-serif font-semibold text-foreground">ResumeTailor</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
            History
          </Button>
        </div>
      </nav>

      <div className="container max-w-2xl mx-auto py-16 px-4">
        {/* ─── Hero ──────────────────────────────────────────────────── */}
        <div className="mb-14">
          <h1 className="text-4xl font-serif font-semibold text-foreground mb-4 leading-tight">
            Tailor your resume to a job posting
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Paste a job URL, upload your resume, and get a breakdown of what's
            missing — keyword gaps, suggested edits, a rewritten summary, a cover
            letter, and job recommendations. No account needed.
          </p>

          <div className="flex items-center gap-3 mb-6">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => navigate("/analyze")}
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/history")}
            >
              View history
            </Button>
          </div>

          {/* How it works — 3 steps, plain */}
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
            {[
              { icon: Linkedin, text: "Add your LinkedIn URL (optional)" },
              { icon: Link2, text: "Paste the job posting URL" },
              { icon: FileText, text: "Upload your resume (PDF or DOCX)" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <step.icon className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                <span>{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Divider ───────────────────────────────────────────────── */}
        <div className="border-t border-border mb-14" />

        {/* ─── What it does ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
            What it does
          </h2>

          <div className="space-y-6">
            {WHAT_IT_DOES.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm mb-1">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Divider ───────────────────────────────────────────────── */}
        <div className="border-t border-border my-14" />

        {/* ─── Honest note ───────────────────────────────────────────── */}
        <div className="bg-secondary/50 rounded-xl p-5 text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">A note on the score</p>
          <p>
            The ATS compatibility score is a keyword-match estimate — it counts
            how many job description keywords appear in your resume. It is not a
            real ATS system score. Actual ATS results vary by company and
            platform. Use the score as a rough guide, not a guarantee.
          </p>
        </div>

        {/* ─── Footer ────────────────────────────────────────────────── */}
        <div className="mt-14 pt-8 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>ResumeTailor · No account required</span>
          <span>Results in ~60–90 seconds</span>
        </div>
      </div>
    </div>
  );
}
