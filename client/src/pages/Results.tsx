import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  FileText, CheckCircle, XCircle, RotateCcw, Copy,
  Sparkles, ArrowLeft, Loader2, RefreshCw, ChevronDown, ChevronUp,
  AlertCircle, Clock, Info, Wand2, Download, Code2, Briefcase,
  Search, Brain, Zap,
} from "lucide-react";
// ─── Multi-step loading screen ─────────────────────────────────────────────────────────────
function LoadingScreenMultiStep() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    { icon: Search, label: "Reading job posting", detail: "Extracting requirements, skills, and responsibilities", duration: 2000 },
    { icon: FileText, label: "Reading your resume", detail: "Extracting experience, skills, and achievements", duration: 1800 },
    { icon: Brain, label: "Analyzing the fit", detail: "Comparing your background to the role semantically", duration: 2200 },
    { icon: Zap, label: "Finding skill gaps", detail: "Identifying what's missing and what's strong", duration: 2000 },
    { icon: Code2, label: "Generating project ideas", detail: "Brainstorming ways to close your skill gaps", duration: 2000 },
    { icon: Wand2, label: "Preparing your results", detail: "Almost done — putting it all together", duration: 99999 },
  ];

  useEffect(() => {
    let step = 0;
    const advance = () => {
      if (step < steps.length - 1) {
        setCompletedSteps((prev) => [...prev, step]);
        step++;
        setActiveStep(step);
        setTimeout(advance, steps[step]?.duration ?? 8000);
      }
    };
    setTimeout(advance, steps[0]?.duration ?? 8000);
  }, []);

  const ActiveIcon = steps[activeStep]?.icon ?? Sparkles;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ActiveIcon className="w-9 h-9 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping opacity-30" />
          </div>
        </div>
        <div className="text-center mb-8">
          <h2 className="text-xl font-serif font-semibold text-foreground mb-1">
            {steps[activeStep]?.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {steps[activeStep]?.detail}
          </p>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isDone = completedSteps.includes(i);
            const isActive = i === activeStep;
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                isActive ? "bg-primary/8 border border-primary/20" :
                isDone ? "opacity-60" :
                "opacity-30"
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  isDone ? "bg-emerald-100" :
                  isActive ? "bg-primary/15" :
                  "bg-secondary"
                }`}>
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isDone ? "text-emerald-600 line-through" :
                    isActive ? "text-foreground" :
                    "text-muted-foreground/50"
                  }`}>{step.label}</p>
                </div>
                {isDone && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                {isActive && (
                  <div className="flex gap-0.5 shrink-0">
                    {[0,1,2].map((j) => (
                      <div key={j} className="w-1 h-1 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          This usually takes 60–90 seconds — hang tight
        </p>
      </div>
    </div>
  );
}

// ─── Score ring ─────────────────────────────────────────────────────────────
function ScoreRing({ score, label, disclaimer }: { score: number; label: string; disclaimer?: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : score >= 30 ? "#f97316" : "#ef4444";

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 104 104">
          <circle cx="52" cy="52" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
          <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-serif font-bold text-foreground leading-none">{score}</span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">{label}</span>
          {disclaimer && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/60 hover:text-muted-foreground">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">{disclaimer}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Semantic fit score</p>
      </div>
    </div>
  );
}

// ─── Polling ───────────────────────────────────────────────────────────────
function usePolling(analysisId: number, sessionToken: string, onDone: () => void) {
  const { data, isLoading } = trpc.resume.getStatus.useQuery(
    { analysisId, sessionToken },
    {
      enabled: !!sessionToken,
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "completed" || s === "failed" ? false : 3000;
      },
    }
  );
  useEffect(() => { if (data?.status === "completed") onDone(); }, [data?.status]);
  return { status: data?.status, jobTitle: data?.jobTitle, isLoading };
}

function getLabel(score: number) {
  if (score >= 70) return "Strong Match";
  if (score >= 50) return "Moderate Match";
  if (score >= 30) return "Partial Match";
  return "Low Match";
}

// ─── Project card ──────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: any }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-sm text-foreground leading-snug">{project.title}</p>
        <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">{project.difficulty}</Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{project.description}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {(project.skillsGained as string[]).map((s: string) => (
          <span key={s} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{s}</span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />{project.estimatedTime}
        </span>
        <button className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(`${project.title}\n\n${project.description}\n\nSkills: ${project.skillsGained.join(", ")}`);
            toast.success("Copied");
          }}>
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function Results() {
  const params = useParams<{ id: string }>();
  const analysisId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const sessionToken = useSession();
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("evaluation");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(new Set(["evaluation"]));
  const utils = trpc.useUtils();

  const { status, jobTitle, isLoading: polling } = usePolling(analysisId, sessionToken, () => setIsReady(true));

  const { data, isLoading } = trpc.resume.getAnalysis.useQuery(
    { analysisId, sessionToken },
    { enabled: isReady && !!sessionToken }
  );

  // Lazy load other tabs after first tab renders
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      setLoadedTabs(new Set(["evaluation", "suggestions", "skills", "projects", "generate"]));
    }, 300);
    return () => clearTimeout(timer);
  }, [data]);

  const shouldRenderTab = (tabName: string) => loadedTabs.has(tabName);

  const updateSuggestion = trpc.resume.updateSuggestion.useMutation({
    onSuccess: () => utils.resume.getAnalysis.invalidate({ analysisId, sessionToken }),
  });

  const generateResume = trpc.resume.generateResume.useMutation({
    onSuccess: () => {
      utils.resume.getAnalysis.invalidate({ analysisId, sessionToken });
      setActiveTab("generate");
      setIsGenerating(false);
      toast.success("Improved resume generated");
    },
    onError: () => { setIsGenerating(false); toast.error("Failed to generate resume"); },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateResume.mutate({ analysisId, sessionToken });
  };

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (!isReady || polling) {
    if (status === "failed") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto px-6">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-serif font-semibold text-foreground mb-2">Evaluation failed</h2>
            <p className="text-sm text-muted-foreground mb-5">Something went wrong. Please try again.</p>
            <Button onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4 mr-2" /> Try again</Button>
          </div>
        </div>
      );
    }
    return <LoadingScreenMultiStep />;
  }

  if (isLoading || !data) {
    return <LoadingScreenMultiStep />;
  }

  const { analysis, suggestions } = data;
  const score = Math.round(analysis.atsScore ?? 0);
  const label = getLabel(score);
  const disclaimer = analysis.atsDisclaimer as string | undefined;
  const breakdown = (analysis.atsBreakdown as any) ?? {};
  const missing = (analysis.missingKeywords as string[]) ?? [];
  const matched = (analysis.matchedKeywords as string[]) ?? [];
  const skillGaps = (analysis.skillGaps as any[]) ?? [];
  const benchmarkSkills = (analysis.benchmarkSkills as any[]) ?? [];
  const benchmarkSource = analysis.benchmarkSource as string | undefined;
  const projectIdeas = (analysis.projectIdeas as any[]) ?? [];
  const strengths = (analysis.atsStrengths as string[]) ?? [];
  const weaknesses = (analysis.atsWeaknesses as string[]) ?? [];
  const generatedResume = analysis.generatedResume as string | undefined;
  const pending = suggestions.filter((s) => s.status === "pending");

  // Skills: sort present (green) first, then missing (red), by frequency
  const sortedSkills = [...benchmarkSkills].sort((a: any, b: any) => {
    if (a.present && !b.present) return -1;
    if (!a.present && b.present) return 1;
    return b.frequency - a.frequency;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60 sticky top-0 z-50 bg-background/90 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> New evaluation
            </Button>
            <span className="text-border">|</span>
            <span className="text-sm text-foreground font-medium truncate max-w-xs">
              {analysis.jobTitle}{analysis.companyName ? ` · ${analysis.companyName}` : ""}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/history")} className="text-muted-foreground">History</Button>
        </div>
      </nav>

      <div className="container max-w-3xl mx-auto py-8 px-4">

        {/* ─── Score header ─────────────────────────────────────────────── */}
        <div className="mb-8 pb-8 border-b border-border">
          <ScoreRing score={score} label={label} disclaimer={disclaimer} />
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-10 bg-secondary/60 p-1 rounded-lg">
            <TabsTrigger value="evaluation" className="rounded-md text-sm">Evaluation</TabsTrigger>
            <TabsTrigger value="suggestions" className="rounded-md text-sm gap-1.5">
              Suggestions
              {pending.length > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1">{pending.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="skills" className="rounded-md text-sm">Skills</TabsTrigger>
            <TabsTrigger value="projects" className="rounded-md text-sm">Projects</TabsTrigger>
            <TabsTrigger value="generate" className="rounded-md text-sm gap-1">
              <Wand2 className="w-3 h-3" /> Generate Resume
            </TabsTrigger>
          </TabsList>

          {/* ─── Evaluation ───────────────────────────────────────────────── */}
          <TabsContent value="evaluation" className="space-y-7">

            {/* Strengths & Weaknesses from semantic analysis */}
            {(strengths.length > 0 || weaknesses.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-2.5">What's working</p>
                    <ul className="space-y-2">
                      {strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-foreground leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {weaknesses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-2.5">What's missing</p>
                    <ul className="space-y-2">
                      {weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span className="text-foreground leading-relaxed">{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Score breakdown bars */}
            <div className="space-y-3">
              {[
                { label: "Keyword coverage", value: breakdown.keywordMatch ?? 0 },
                { label: "Skills coverage", value: breakdown.skillsCoverage ?? 0 },
                { label: "Format signals", value: breakdown.formatSignals ?? 0 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">{Math.round(item.value)}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${item.value}%`, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Missing keywords */}
            {missing.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Missing keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((kw) => (
                    <span key={kw} className="text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Matched keywords */}
            {matched.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Matched keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {matched.map((kw) => (
                    <span key={kw} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                      <CheckCircle className="w-2.5 h-2.5 inline mr-1" />{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skill gaps */}
            {skillGaps.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Skill gaps</p>
                <div className="space-y-2">
                  {skillGaps.map((gap: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Badge variant="secondary" className={`text-[10px] shrink-0 mt-0.5 ${
                        gap.importance === "high" ? "bg-red-50 text-red-700 border-red-200" :
                        gap.importance === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>{gap.importance}</Badge>
                      <div>
                        <span className="font-medium text-foreground">{gap.skill}</span>
                        {gap.placement && <span className="text-muted-foreground"> — add to {gap.placement}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 leading-relaxed">
              Score uses AI semantic analysis — considers synonyms, implied skills, and experience relevance. Not a real ATS system output.
            </p>
          </TabsContent>

          {/* ─── Suggestions ────────────────────────────────────────────────────── */}
          <TabsContent value="suggestions" className="space-y-2.5">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No suggestions generated.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Accept the changes you want to apply — they'll be incorporated when you generate your improved resume.
                </p>
                {suggestions.map((s) => (
                  <div key={s.id} className={`border rounded-xl overflow-hidden transition-all ${
                    s.status === "accepted" ? "border-emerald-200 bg-emerald-50/30" :
                    s.status === "rejected" ? "border-border opacity-50" : "border-border"
                  }`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">{s.section}</Badge>
                          <Badge variant="secondary" className={`text-xs ${
                            s.impact === "high" ? "bg-red-50 text-red-700 border-red-200" :
                            s.impact === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {s.impact === "high" ? "High impact" : s.impact === "medium" ? "Medium impact" : "Low impact"}
                          </Badge>
                          {s.status === "accepted" && <Badge className="text-xs bg-emerald-500 text-white border-0">Accepted</Badge>}
                          {s.status === "rejected" && <Badge variant="secondary" className="text-xs">Rejected</Badge>}
                        </div>
                        <button onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                          className="text-muted-foreground hover:text-foreground shrink-0">
                          {expanded === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                      {s.reason && <p className="text-xs text-muted-foreground mt-2">{s.reason}</p>}
                      {expanded === s.id && (
                        <div className="mt-3 grid sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Original</p>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-foreground leading-relaxed">{s.originalText}</div>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Suggested</p>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-foreground leading-relaxed">{s.suggestedText}</div>
                          </div>
                        </div>
                      )}
                      {s.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => updateSuggestion.mutate({ suggestionId: s.id, status: "accepted", sessionToken })}>
                            <CheckCircle className="w-3 h-3" /> Accept
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => updateSuggestion.mutate({ suggestionId: s.id, status: "rejected", sessionToken })}>
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground ml-auto"
                            onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                            {expanded === s.id ? "Collapse" : "View"}
                          </Button>
                        </div>
                      )}
                      {s.status !== "pending" && (
                        <button className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          onClick={() => updateSuggestion.mutate({ suggestionId: s.id, status: "pending" as any, sessionToken })}>
                          <RotateCcw className="w-3 h-3" /> Undo
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Accepted suggestions will be incorporated when you generate your improved resume in the <button className="text-primary hover:underline" onClick={() => setActiveTab("generate")}>Generate Resume</button> tab.
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── Skills (green first, red second) ────────────────────────── */}
          <TabsContent value="skills">
            {sortedSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No skill data available.</p>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground mb-4">
                  {benchmarkSource || `Skills commonly required for ${analysis.jobTitle} roles`} — sorted by what you have, then what's missing.
                </p>

                {/* Present skills (green) */}
                {sortedSkills.filter((s: any) => s.present).length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-3">
                      In your resume ({sortedSkills.filter((s: any) => s.present).length})
                    </p>
                    <div className="space-y-2">
                      {sortedSkills.filter((s: any) => s.present).map((skill: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-foreground font-medium">{skill.skill}</span>
                              <span className="text-xs text-muted-foreground">{Math.round(skill.frequency)}% of job postings</span>
                            </div>
                            <div className="h-1 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${skill.frequency}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing skills (red) */}
                {sortedSkills.filter((s: any) => !s.present).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-3">
                      Missing from your resume ({sortedSkills.filter((s: any) => !s.present).length})
                    </p>
                    <div className="space-y-2">
                      {sortedSkills.filter((s: any) => !s.present).map((skill: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{skill.skill}</span>
                              <span className="text-xs text-muted-foreground">{Math.round(skill.frequency)}% of job postings</span>
                            </div>
                            <div className="h-1 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-red-300 rounded-full" style={{ width: `${skill.frequency}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground pt-2">Frequency estimates are AI-generated, not from a live scrape.</p>
              </div>
            )}
          </TabsContent>

          {/* ─── Projects ─────────────────────────────────────────────────── */}
          <TabsContent value="projects">
            {projectIdeas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No project ideas generated.</p>
            ) : (
              <div className="space-y-5">
                <p className="text-xs text-muted-foreground">
                  Specific projects to build the skills you're missing. Even one of these gives you something concrete to add to your resume.
                </p>
                {["work", "side"].map((type) => {
                  const items = projectIdeas.filter((p: any) => p.type === type);
                  if (!items.length) return null;
                  return (
                    <div key={type}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        {type === "work" ? "At work" : "Side projects"}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {items.map((p: any, i: number) => <ProjectCard key={i} project={p} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── Generated resume ─────────────────────────────────────────── */}
          {/* ─── Generate Resume Tab ────────────────────────────────────────────── */}
          <TabsContent value="generate">
            {generatedResume ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-foreground">Improved resume</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => { navigator.clipboard.writeText(generatedResume); toast.success("Copied"); }}>
                      <Copy className="w-3 h-3" /> Copy
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => {
                        const blob = new Blob([generatedResume], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = "resume-improved.txt"; a.click();
                        URL.revokeObjectURL(url);
                      }}>
                      <Download className="w-3 h-3" /> Download
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8 text-muted-foreground"
                      onClick={handleGenerate} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regenerate
                    </Button>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-6 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono">
                  {generatedResume}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Wand2 className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-serif font-semibold text-lg text-foreground mb-2">Generate your improved resume</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                  We'll rewrite your resume using the job description, your accepted suggestions, and the rewritten summary — tailored specifically for this role.
                </p>
                <Button size="lg" className="gap-2" onClick={handleGenerate} disabled={isGenerating || generateResume.isPending}>
                  {isGenerating || generateResume.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> Generate improved resume</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Tip: accept suggestions in the Suggestions tab first for the best result.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
