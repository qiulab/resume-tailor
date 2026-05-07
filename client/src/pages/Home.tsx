import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  FileText,
  Zap,
  Target,
  PenTool,
  TrendingUp,
  Download,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Clock,
  Shield,
  ChevronRight,
  Star,
} from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "ATS Compatibility Score",
    description:
      "Instantly see how well your resume matches the job posting with a precise ATS score and detailed breakdown.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Zap,
    title: "Keyword Gap Analysis",
    description:
      "Identify every missing keyword from the job description and get exact placement recommendations.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: PenTool,
    title: "Inline Resume Editor",
    description:
      "Review AI-suggested edits directly on your resume with one-click accept or reject controls.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Sparkles,
    title: "Resume Summary Rewriter",
    description:
      "AI rewrites your professional summary to perfectly align with the target role and company.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: FileText,
    title: "Cover Letter Generator",
    description:
      "Generate a tailored, compelling cover letter in seconds — choose from three professional tones.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    icon: Download,
    title: "Export & Share",
    description:
      "Download your optimized resume as PDF and copy your cover letter to clipboard instantly.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
];

const BEFORE_AFTER = {
  before: {
    label: "Before",
    score: 42,
    summary:
      "Experienced software engineer with 5 years of experience in web development. Worked on various projects using different technologies. Good team player and problem solver.",
    keywords: ["JavaScript", "React", "Node.js"],
    missing: 8,
  },
  after: {
    label: "After",
    score: 91,
    summary:
      "Senior Full-Stack Engineer with 5+ years delivering scalable React and Node.js applications. Led cross-functional teams to ship 3 enterprise SaaS products, reducing load times by 40%. Passionate about TypeScript, cloud architecture, and driving measurable business outcomes.",
    keywords: ["TypeScript", "React", "Node.js", "AWS", "CI/CD", "Agile", "REST APIs"],
    missing: 1,
  },
};

const STATS = [
  { value: "3×", label: "More interview callbacks" },
  { value: "91%", label: "Average ATS score improvement" },
  { value: "< 2 min", label: "Time to optimize" },
  { value: "10k+", label: "Resumes optimized" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/analyze");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Navigation ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif font-semibold text-lg text-foreground">
              ResumeTailor
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#comparison" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              See results
            </a>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                  My History
                </Button>
                <Button size="sm" onClick={() => navigate("/analyze")}>
                  Optimize Resume
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = getLoginUrl()}>
                  Sign in
                </Button>
                <Button size="sm" onClick={handleGetStarted}>
                  Get started free
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/10 blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge
              variant="secondary"
              className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide uppercase border border-border"
            >
              <Sparkles className="w-3 h-3 mr-1.5 text-accent" />
              AI-Powered Resume Optimization
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-semibold leading-[1.1] tracking-tight text-foreground mb-6">
              Land your dream job{" "}
              <span className="text-gradient-gold italic">faster</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Paste a job URL, upload your resume, and watch AI tailor every word to beat
              the ATS and impress hiring managers — in under two minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-13 px-8 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all"
                onClick={handleGetStarted}
              >
                Optimize my resume
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-13 px-8 text-base font-medium"
                onClick={() => document.getElementById("comparison")?.scrollIntoView({ behavior: "smooth" })}
              >
                See a live example
              </Button>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              No credit card required · Free to use · Results in &lt; 2 minutes
            </p>
          </div>

          {/* Hero stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-serif font-semibold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-secondary/40">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
              Three steps to your best resume
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our AI does the heavy lifting so you can focus on what matters — preparing for the interview.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Upload your resume",
                desc: "Add your LinkedIn URL, paste the job posting link, and upload your existing resume (PDF or DOCX).",
              },
              {
                step: "02",
                icon: BarChart3,
                title: "AI analyzes everything",
                desc: "Our AI scans the job description, identifies keyword gaps, scores your ATS compatibility, and generates targeted suggestions.",
              },
              {
                step: "03",
                icon: Download,
                title: "Export & apply",
                desc: "Accept the suggestions you love, download your optimized resume, and send the generated cover letter.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-card border border-border rounded-2xl p-8 h-full card-hover">
                  <div className="text-5xl font-serif font-bold text-border mb-4 select-none">
                    {item.step}
                  </div>
                  <item.icon className="w-6 h-6 text-primary mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                {item.step !== "03" && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 w-6 h-6 text-muted-foreground/30 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
              Everything you need to get hired
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete toolkit built for modern job seekers — from ATS optimization to cover letter generation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group bg-card border border-border rounded-2xl p-7 card-hover"
              >
                <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-[15px]">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Before / After Comparison ────────────────────────────────── */}
      <section id="comparison" className="py-24 bg-secondary/40">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
              See the transformation
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A real example of how ResumeTailor turns a generic resume into a targeted, ATS-optimized application.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Before */}
            <div className="bg-card border-2 border-destructive/20 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-destructive uppercase tracking-wider">Before</span>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-serif font-bold text-destructive">
                    {BEFORE_AFTER.before.score}
                  </div>
                  <div className="text-xs text-muted-foreground">ATS Score</div>
                </div>
              </div>

              <div className="mb-5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Professional Summary
                </div>
                <p className="text-sm text-foreground leading-relaxed bg-destructive/5 rounded-lg p-4 border border-destructive/10">
                  {BEFORE_AFTER.before.summary}
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Keywords matched
                </div>
                <div className="flex flex-wrap gap-2">
                  {BEFORE_AFTER.before.keywords.map((kw) => (
                    <span key={kw} className="text-xs px-2.5 py-1 bg-secondary rounded-full text-muted-foreground">
                      {kw}
                    </span>
                  ))}
                  <span className="text-xs px-2.5 py-1 bg-destructive/10 text-destructive rounded-full">
                    +{BEFORE_AFTER.before.missing} missing
                  </span>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="bg-card border-2 border-emerald-200 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-emerald-500 text-white border-0 shadow-md">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Optimized
                </Badge>
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-emerald-600 uppercase tracking-wider">After</span>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-serif font-bold text-emerald-600">
                    {BEFORE_AFTER.after.score}
                  </div>
                  <div className="text-xs text-muted-foreground">ATS Score</div>
                </div>
              </div>

              <div className="mb-5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Professional Summary
                </div>
                <p className="text-sm text-foreground leading-relaxed bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  {BEFORE_AFTER.after.summary}
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Keywords matched
                </div>
                <div className="flex flex-wrap gap-2">
                  {BEFORE_AFTER.after.keywords.map((kw) => (
                    <span key={kw} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                      <CheckCircle className="w-2.5 h-2.5 inline mr-1" />
                      {kw}
                    </span>
                  ))}
                  <span className="text-xs px-2.5 py-1 bg-secondary text-muted-foreground rounded-full">
                    +{BEFORE_AFTER.after.missing} remaining
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
              Trusted by job seekers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote:
                  "I went from 0 callbacks to 4 interviews in one week after optimizing my resume with ResumeTailor. The keyword gap analysis was eye-opening.",
                name: "Sarah K.",
                role: "Software Engineer",
              },
              {
                quote:
                  "The cover letter generator saved me hours. Each letter felt genuinely tailored, not generic. I landed my dream role at a Series B startup.",
                name: "Marcus T.",
                role: "Product Manager",
              },
              {
                quote:
                  "My ATS score jumped from 38 to 87 in one session. The inline suggestions were spot-on and easy to review. Highly recommend.",
                name: "Priya M.",
                role: "Data Analyst",
              },
            ].map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-2xl p-7 card-hover">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-5 italic">
                  "{t.quote}"
                </p>
                <div>
                  <div className="font-medium text-sm text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center bg-primary rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 -z-0">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-accent/20 blur-2xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-primary-foreground mb-4">
                Ready to land your next role?
              </h2>
              <p className="text-primary-foreground/70 mb-8 max-w-lg mx-auto">
                Join thousands of job seekers who've used ResumeTailor to get more interviews and better offers.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="h-13 px-8 text-base font-medium bg-white text-primary hover:bg-white/90 shadow-xl"
                onClick={handleGetStarted}
              >
                Start optimizing for free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <FileText className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-serif font-semibold text-foreground">ResumeTailor</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ResumeTailor. AI-powered resume optimization.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy first</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Results in 2 min</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
