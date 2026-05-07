import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  FileText, CheckCircle, XCircle, RotateCcw, Download, Copy,
  Sparkles, Target, Zap, PenTool, ArrowLeft, Loader2, RefreshCw,
  ChevronDown, ChevronUp, AlertCircle, Clock, Info, BarChart3,
  Briefcase, Code2, TrendingUp, BookOpen,
} from "lucide-react";

// ─── Honest ATS Score Ring ─────────────────────────────────────────────────
function ATSRing({ score, label, disclaimer }: { score: number; label: string; disclaimer?: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? "oklch(0.62 0.15 150)" :
    score >= 50 ? "oklch(0.72 0.12 75)" :
    score >= 30 ? "oklch(0.58 0.2 25)" :
    "oklch(0.55 0.22 25)";
  const labelColor =
    score >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-border" />
          <circle
            cx="64" cy="64" r={radius} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-serif font-bold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <Badge variant="secondary" className={`text-xs font-medium ${labelColor}`}>
          {label}
        </Badge>
        {disclaimer && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
              {disclaimer}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ─── Polling hook ──────────────────────────────────────────────────────────
function usePollingStatus(analysisId: number, sessionToken: string, onComplete: () => void) {
  const { data, isLoading } = trpc.resume.getStatus.useQuery(
    { analysisId, sessionToken },
    {
      enabled: !!sessionToken,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "completed" || status === "failed") return false;
        return 3000;
      },
    }
  );
  useEffect(() => {
    if (data?.status === "completed") onComplete();
  }, [data?.status]);
  return { status: data?.status, jobTitle: data?.jobTitle, companyName: data?.companyName, isLoading };
}

// ─── Score label helper ────────────────────────────────────────────────────
function getScoreLabel(score: number): string {
  if (score >= 70) return "Strong Match";
  if (score >= 50) return "Moderate Match";
  if (score >= 30) return "Partial Match";
  return "Low Match";
}

export default function Results() {
  const params = useParams<{ id: string }>();
  const analysisId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const sessionToken = useSession();
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("suggestions");
  const [coverTone, setCoverTone] = useState<"professional" | "enthusiastic" | "concise">("professional");
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { status, jobTitle, companyName, isLoading: statusLoading } = usePollingStatus(
    analysisId, sessionToken, () => setIsReady(true)
  );

  const { data, isLoading: dataLoading } = trpc.resume.getAnalysis.useQuery(
    { analysisId, sessionToken },
    { enabled: isReady && !!sessionToken }
  );

  const updateSuggestion = trpc.resume.updateSuggestion.useMutation({
    onSuccess: () => utils.resume.getAnalysis.invalidate({ analysisId, sessionToken }),
  });

  const regenerateCoverLetter = trpc.resume.regenerateCoverLetter.useMutation({
    onSuccess: () => {
      utils.resume.getAnalysis.invalidate({ analysisId, sessionToken });
      toast.success("Cover letter regenerated!");
    },
  });

  const regenerateSummary = trpc.resume.regenerateSummary.useMutation({
    onSuccess: () => {
      utils.resume.getAnalysis.invalidate({ analysisId, sessionToken });
      toast.success("Summary rewritten!");
    },
  });

  const handleSuggestionAction = (id: number, action: "accepted" | "rejected") => {
    updateSuggestion.mutate({ suggestionId: id, status: action, sessionToken });
  };

  const handleCopyLetter = () => {
    if (data?.coverLetter?.content) {
      navigator.clipboard.writeText(data.coverLetter.content);
      toast.success("Cover letter copied to clipboard!");
    }
  };

  const handleDownloadResume = () => {
    if (!data?.analysis?.resumeText) return;
    const blob = new Blob([data.analysis.resumeText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-optimized.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Resume downloaded!");
  };

  // ─── Loading state ─────────────────────────────────────────────────────
  if (!isReady || statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          {status === "failed" ? (
            <>
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-serif font-semibold text-foreground mb-2">Analysis Failed</h2>
              <p className="text-muted-foreground text-sm mb-6">Something went wrong. Please try again.</p>
              <Button onClick={() => navigate("/analyze")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Try again
              </Button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
                {jobTitle ? `Analyzing for ${jobTitle}` : "Analyzing your resume"}
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Running AI analysis, benchmarking similar roles, and brainstorming projects...
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
                <Clock className="w-3.5 h-3.5" />
                <span>Usually takes 30–90 seconds</span>
              </div>
              <Progress className="h-1" value={undefined} />
            </>
          )}
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { analysis, suggestions, coverLetter } = data;
  const atsScore = Math.round(analysis.atsScore ?? 0);
  const atsLabel = getScoreLabel(atsScore);
  const atsDisclaimer = analysis.atsDisclaimer as string | undefined;
  const breakdown = (analysis.atsBreakdown as any) ?? {};
  const missingKeywords = (analysis.missingKeywords as string[]) ?? [];
  const matchedKeywords = (analysis.matchedKeywords as string[]) ?? [];
  const skillGaps = (analysis.skillGaps as any[]) ?? [];
  const benchmarkSkills = (analysis.benchmarkSkills as any[]) ?? [];
  const benchmarkSource = analysis.benchmarkSource as string | undefined;
  const projectIdeas = (analysis.projectIdeas as any[]) ?? [];
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");
  const acceptedSuggestions = suggestions.filter((s) => s.status === "accepted");

  const workProjects = projectIdeas.filter((p: any) => p.type === "work");
  const sideProjects = projectIdeas.filter((p: any) => p.type === "side");

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/analyze")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> New Analysis
            </Button>
            <div className="h-4 w-px bg-border" />
            <div>
              <span className="font-medium text-sm text-foreground">{analysis.jobTitle}</span>
              {analysis.companyName && (
                <span className="text-muted-foreground text-sm"> · {analysis.companyName}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadResume} className="gap-2">
              <Download className="w-3.5 h-3.5" /> Download Resume
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
              History
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* ─── ATS Score Header ──────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="shrink-0">
              <ATSRing score={atsScore} label={atsLabel} disclaimer={atsDisclaimer} />
              <p className="text-xs text-center text-muted-foreground mt-2">Keyword Match Estimate</p>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-start gap-2">
                <h2 className="font-serif font-semibold text-xl text-foreground">
                  Resume Match Analysis
                </h2>
              </div>

              {/* Honest disclaimer banner */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Honest scoring:</strong> This score estimates keyword coverage — not a real ATS system output.
                  Real ATS results vary by platform and company. Use this to guide improvements, not as a guarantee.
                </span>
              </div>

              {[
                { label: "Keyword Coverage", value: breakdown.keywordMatch ?? 0, color: "bg-blue-500", desc: "Job keywords found in your resume" },
                { label: "Skills Coverage", value: breakdown.skillsCoverage ?? 0, color: "bg-emerald-500", desc: "Required skills present" },
                { label: "Format Signals", value: breakdown.formatSignals ?? 0, color: "bg-purple-500", desc: "Readability and structure" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div>
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-xs text-muted-foreground/60 ml-2">{item.desc}</span>
                    </div>
                    <span className="font-medium text-foreground">{Math.round(item.value)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 grid grid-cols-2 gap-3 md:grid-cols-1">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif font-bold text-emerald-600">{matchedKeywords.length}</div>
                <div className="text-xs text-emerald-700 mt-0.5">Keywords matched</div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif font-bold text-red-500">{missingKeywords.length}</div>
                <div className="text-xs text-red-600 mt-0.5">Keywords missing</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif font-bold text-amber-600">{pendingSuggestions.length}</div>
                <div className="text-xs text-amber-700 mt-0.5">Suggestions pending</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-serif font-bold text-blue-600">{projectIdeas.length}</div>
                <div className="text-xs text-blue-700 mt-0.5">Project ideas</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Tabs ─────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-11 bg-secondary/60 p-1 rounded-xl flex-wrap gap-1">
            <TabsTrigger value="suggestions" className="gap-2 rounded-lg text-sm">
              <PenTool className="w-3.5 h-3.5" />
              Suggestions
              {pendingSuggestions.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-amber-100 text-amber-700">
                  {pendingSuggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-2 rounded-lg text-sm">
              <Zap className="w-3.5 h-3.5" />
              Keyword Gaps
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="gap-2 rounded-lg text-sm">
              <BarChart3 className="w-3.5 h-3.5" />
              Skill Benchmark
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2 rounded-lg text-sm">
              <Code2 className="w-3.5 h-3.5" />
              Project Ideas
              {projectIdeas.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-blue-100 text-blue-700">
                  {projectIdeas.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2 rounded-lg text-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="coverletter" className="gap-2 rounded-lg text-sm">
              <FileText className="w-3.5 h-3.5" />
              Cover Letter
            </TabsTrigger>
          </TabsList>

          {/* ─── Suggestions Tab ──────────────────────────────────────────── */}
          <TabsContent value="suggestions">
            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium text-foreground">No major suggestions generated.</p>
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <div key={suggestion.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${
                    suggestion.status === "accepted" ? "border-emerald-200 bg-emerald-50/30" :
                    suggestion.status === "rejected" ? "border-border opacity-50" :
                    "border-border hover:border-primary/30"
                  }`}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-medium capitalize">{suggestion.section}</Badge>
                          <Badge variant="secondary" className={`text-xs ${
                            suggestion.impact === "high" ? "bg-red-50 text-red-700 border-red-200" :
                            suggestion.impact === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>{suggestion.impact} impact</Badge>
                          {suggestion.status === "accepted" && (
                            <Badge className="text-xs bg-emerald-500 text-white border-0">
                              <CheckCircle className="w-3 h-3 mr-1" /> Accepted
                            </Badge>
                          )}
                          {suggestion.status === "rejected" && (
                            <Badge variant="secondary" className="text-xs">Rejected</Badge>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedSuggestion(expandedSuggestion === suggestion.id ? null : suggestion.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          {expandedSuggestion === suggestion.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                      {suggestion.reason && (
                        <p className="text-sm text-muted-foreground mt-2">{suggestion.reason}</p>
                      )}
                      {expandedSuggestion === suggestion.id && (
                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Original</div>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-foreground leading-relaxed">
                              {suggestion.originalText}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Suggested</div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-foreground leading-relaxed">
                              {suggestion.suggestedText}
                            </div>
                          </div>
                        </div>
                      )}
                      {suggestion.status === "pending" && (
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleSuggestionAction(suggestion.id, "accepted")} disabled={updateSuggestion.isPending}>
                            <CheckCircle className="w-3.5 h-3.5" /> Accept
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-destructive"
                            onClick={() => handleSuggestionAction(suggestion.id, "rejected")} disabled={updateSuggestion.isPending}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground ml-auto"
                            onClick={() => setExpandedSuggestion(expandedSuggestion === suggestion.id ? null : suggestion.id)}>
                            {expandedSuggestion === suggestion.id ? "Collapse" : "View changes"}
                          </Button>
                        </div>
                      )}
                      {suggestion.status !== "pending" && (
                        <Button size="sm" variant="ghost" className="mt-3 gap-1.5 text-xs text-muted-foreground"
                          onClick={() => handleSuggestionAction(suggestion.id, "pending" as any)} disabled={updateSuggestion.isPending}>
                          <RotateCcw className="w-3 h-3" /> Undo
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* ─── Keyword Gap Tab ──────────────────────────────────────────── */}
          <TabsContent value="keywords">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Missing Keywords</h3>
                    <p className="text-xs text-muted-foreground">{missingKeywords.length} keywords to add</p>
                  </div>
                </div>
                {missingKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No missing keywords found!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {missingKeywords.map((kw) => (
                      <span key={kw} className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-100 rounded-full font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Matched Keywords</h3>
                    <p className="text-xs text-muted-foreground">{matchedKeywords.length} keywords found</p>
                  </div>
                </div>
                {matchedKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No matched keywords yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {matchedKeywords.map((kw) => (
                      <span key={kw} className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-medium">
                        <CheckCircle className="w-2.5 h-2.5 inline mr-1" />{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {skillGaps.length > 0 && (
                <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Target className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Skill Gap Analysis</h3>
                      <p className="text-xs text-muted-foreground">Skills to highlight or develop</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {skillGaps.map((gap: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
                        <Badge variant="secondary" className={`shrink-0 text-xs ${
                          gap.importance === "high" ? "bg-red-50 text-red-700 border-red-200" :
                          gap.importance === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>{gap.importance}</Badge>
                        <div>
                          <p className="text-sm font-medium text-foreground">{gap.skill}</p>
                          {gap.placement && (
                            <p className="text-xs text-muted-foreground mt-0.5">Add to: {gap.placement}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Skill Benchmark Tab ──────────────────────────────────────── */}
          <TabsContent value="benchmark">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Skills Benchmark</h3>
                    <p className="text-xs text-muted-foreground">
                      {benchmarkSource || `Skills commonly required for ${analysis.jobTitle} roles`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Frequency estimates are based on AI knowledge of comparable job postings for this role.
                  They reflect general market trends, not a live scrape of current postings.
                </span>
              </div>

              {benchmarkSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">Benchmark data not available.</p>
              ) : (
                <div className="space-y-3">
                  {[...benchmarkSkills]
                    .sort((a: any, b: any) => b.frequency - a.frequency)
                    .map((skill: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${skill.present ? "bg-emerald-500" : "bg-red-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className={`font-medium ${skill.present ? "text-foreground" : "text-muted-foreground"}`}>
                              {skill.skill}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              {skill.present ? (
                                <span className="text-xs text-emerald-600 font-medium">In your resume</span>
                              ) : (
                                <span className="text-xs text-red-500 font-medium">Missing</span>
                              )}
                              <span className="text-xs text-muted-foreground">{Math.round(skill.frequency)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${skill.present ? "bg-emerald-500" : "bg-red-300"}`}
                              style={{ width: `${skill.frequency}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Present in your resume</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Missing from your resume</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Project Ideas Tab ────────────────────────────────────────── */}
          <TabsContent value="projects">
            <div className="space-y-4">
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  These project ideas are tailored to your specific skill gaps. Building even one or two of these
                  will give you concrete experience to add to your resume and discuss in interviews.
                </span>
              </div>

              {projectIdeas.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <Code2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No project ideas generated yet.</p>
                </div>
              ) : (
                <>
                  {workProjects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-foreground text-sm">At Work</h3>
                        <span className="text-xs text-muted-foreground">— Propose or lead these in your current role</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        {workProjects.map((project: any, i: number) => (
                          <ProjectCard key={i} project={project} />
                        ))}
                      </div>
                    </div>
                  )}

                  {sideProjects.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Code2 className="w-4 h-4 text-amber-600" />
                        <h3 className="font-semibold text-foreground text-sm">Side Projects</h3>
                        <span className="text-xs text-muted-foreground">— Personal, freelance, or open-source</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        {sideProjects.map((project: any, i: number) => (
                          <ProjectCard key={i} project={project} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ─── Summary Rewriter Tab ─────────────────────────────────────── */}
          <TabsContent value="summary">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Original Summary</h3>
                </div>
                <p className="text-sm text-foreground leading-relaxed bg-secondary/50 rounded-xl p-4">
                  {analysis.originalSummary || "No professional summary found in your resume."}
                </p>
              </div>

              <div className="bg-card border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">AI-Rewritten Summary</h3>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => regenerateSummary.mutate({ analysisId, sessionToken })}
                    disabled={regenerateSummary.isPending} className="gap-1.5 text-xs">
                    {regenerateSummary.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Regenerate
                  </Button>
                </div>
                <div className="text-sm text-foreground leading-relaxed bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  {regenerateSummary.isPending ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Rewriting...
                    </div>
                  ) : (
                    analysis.rewrittenSummary || "Click Regenerate to rewrite your summary."
                  )}
                </div>
                {analysis.rewrittenSummary && (
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-xs"
                    onClick={() => { navigator.clipboard.writeText(analysis.rewrittenSummary ?? ""); toast.success("Summary copied!"); }}>
                    <Copy className="w-3 h-3" /> Copy summary
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── Cover Letter Tab ─────────────────────────────────────────── */}
          <TabsContent value="coverletter">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Cover Letter</h3>
                    <p className="text-xs text-muted-foreground">Tailored for {analysis.jobTitle} at {analysis.companyName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {(["professional", "enthusiastic", "concise"] as const).map((tone) => (
                      <button key={tone} onClick={() => setCoverTone(tone)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                          coverTone === tone ? "bg-primary text-primary-foreground" :
                          "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}>{tone}</button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline"
                    onClick={() => regenerateCoverLetter.mutate({ analysisId, sessionToken, tone: coverTone })}
                    disabled={regenerateCoverLetter.isPending} className="gap-1.5 text-xs">
                    {regenerateCoverLetter.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Regenerate
                  </Button>
                  <Button size="sm" onClick={handleCopyLetter} disabled={!coverLetter?.content} className="gap-1.5 text-xs">
                    <Copy className="w-3 h-3" /> Copy to clipboard
                  </Button>
                </div>
              </div>

              {regenerateCoverLetter.isPending ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Generating your cover letter...</span>
                </div>
              ) : coverLetter?.content ? (
                <div className="bg-secondary/30 rounded-xl p-6 border border-border text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                  {coverLetter.content}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No cover letter generated yet.</p>
                  <Button size="sm" variant="outline" className="mt-3"
                    onClick={() => regenerateCoverLetter.mutate({ analysisId, sessionToken, tone: coverTone })}>
                    Generate cover letter
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Project Card Component ────────────────────────────────────────────────
function ProjectCard({ project }: { project: any }) {
  const difficultyColor = {
    beginner: "bg-emerald-50 text-emerald-700 border-emerald-200",
    intermediate: "bg-amber-50 text-amber-700 border-amber-200",
    advanced: "bg-red-50 text-red-700 border-red-200",
  }[project.difficulty as string] ?? "bg-secondary text-muted-foreground";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 card-hover">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-semibold text-foreground text-sm leading-snug">{project.title}</h4>
        <Badge variant="secondary" className={`text-xs shrink-0 ${difficultyColor}`}>
          {project.difficulty}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{project.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(project.skillsGained as string[]).map((skill: string) => (
          <span key={skill} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
            {skill}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{project.estimatedTime}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            const text = `${project.title}\n\n${project.description}\n\nSkills: ${project.skillsGained.join(", ")}\nTime: ${project.estimatedTime}`;
            navigator.clipboard.writeText(text);
            toast.success("Project idea copied!");
          }}
        >
          <Copy className="w-3 h-3" /> Copy
        </Button>
      </div>
    </div>
  );
}
