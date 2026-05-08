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
  FileText, CheckCircle, XCircle, RotateCcw, Copy, Sparkles,
  ArrowLeft, Loader2, RefreshCw, ChevronDown, ChevronUp,
  AlertCircle, Clock, Info, BarChart3, Briefcase, Code2,
  Linkedin, ExternalLink, ArrowUpRight, TrendingUp, Star,
  BookOpen, Download, Wand2,
} from "lucide-react";

// ─── Score ring ────────────────────────────────────────────────────────────
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
              <TooltipContent side="right" className="max-w-xs text-xs">{disclaimer}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Keyword match estimate</p>
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
  return { status: data?.status, jobTitle: data?.jobTitle, companyName: data?.companyName, isLoading };
}

function getLabel(score: number) {
  if (score >= 70) return "Strong match";
  if (score >= 50) return "Moderate match";
  if (score >= 30) return "Partial match";
  return "Low match";
}

// ─── Job card ──────────────────────────────────────────────────────────────
function JobCard({ job }: { job: any }) {
  const typeColor: Record<string, string> = {
    stretch: "bg-purple-50 text-purple-700 border-purple-200",
    lateral: "bg-blue-50 text-blue-700 border-blue-200",
    pivot: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const typeLabel: Record<string, string> = {
    stretch: "Stretch", lateral: "Lateral", pivot: "Pivot",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground leading-snug">{job.title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="secondary" className={`text-[10px] ${typeColor[job.type] ?? ""}`}>
              {typeLabel[job.type] ?? job.type}
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{job.seniorityLevel}</Badge>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{job.whyItFits}</p>
      <div className="flex gap-3 text-xs">
        <a href={job.linkedinSearchUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 hover:underline">
          <Linkedin className="w-3 h-3" /> LinkedIn <ExternalLink className="w-2.5 h-2.5" />
        </a>
        <a href={job.indeedSearchUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-amber-600 hover:underline">
          <Briefcase className="w-3 h-3" /> Indeed <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
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
        <span className="text-xs text-muted-foreground">{project.estimatedTime}</span>
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
  const [coverTone, setCoverTone] = useState<"professional" | "enthusiastic" | "concise">("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const utils = trpc.useUtils();

  const { status, jobTitle, isLoading: polling } = usePolling(analysisId, sessionToken, () => setIsReady(true));

  const { data, isLoading } = trpc.resume.getAnalysis.useQuery(
    { analysisId, sessionToken },
    { enabled: isReady && !!sessionToken }
  );

  const updateSuggestion = trpc.resume.updateSuggestion.useMutation({
    onSuccess: () => utils.resume.getAnalysis.invalidate({ analysisId, sessionToken }),
  });
  const regenerateCoverLetter = trpc.resume.regenerateCoverLetter.useMutation({
    onSuccess: () => { utils.resume.getAnalysis.invalidate({ analysisId, sessionToken }); toast.success("Regenerated"); },
  });
  const regenerateSummary = trpc.resume.regenerateSummary.useMutation({
    onSuccess: () => { utils.resume.getAnalysis.invalidate({ analysisId, sessionToken }); toast.success("Summary rewritten"); },
  });
  const generateResume = trpc.resume.generateResume.useMutation({
    onSuccess: () => {
      utils.resume.getAnalysis.invalidate({ analysisId, sessionToken });
      setActiveTab("generated");
      setIsGenerating(false);
      toast.success("Resume generated");
    },
    onError: () => { setIsGenerating(false); toast.error("Failed to generate resume"); },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateResume.mutate({ analysisId, sessionToken });
  };

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (!isReady || polling) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          {status === "failed" ? (
            <>
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-serif font-semibold text-foreground mb-2">Evaluation failed</h2>
              <p className="text-sm text-muted-foreground mb-5">Something went wrong. Please try again.</p>
              <Button onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4 mr-2" /> Try again</Button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <h2 className="text-lg font-serif font-semibold text-foreground mb-2">
                {jobTitle ? `Evaluating for ${jobTitle}` : "Evaluating your resume"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Reading the job description, analyzing your resume, and generating feedback.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>~60–90 seconds</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  }

  const { analysis, suggestions, coverLetter } = data;
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
  const jobRecs = (analysis.jobRecommendations as any[]) ?? [];
  const linkedinData = analysis.linkedinData as any;
  const isLinkedIn = analysis.linkedinEnriched === 1;
  const generatedResume = analysis.generatedResume as string | undefined;
  const pending = suggestions.filter((s) => s.status === "pending");

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
            {isLinkedIn && (
              <Badge className="text-[10px] bg-blue-600 text-white border-0 gap-1 hidden sm:flex">
                <Linkedin className="w-2.5 h-2.5" /> LinkedIn
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/history")} className="text-muted-foreground">History</Button>
        </div>
      </nav>

      <div className="container max-w-3xl mx-auto py-8 px-4">

        {/* ─── Score + Generate button ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8 pb-8 border-b border-border">
          <ScoreRing score={score} label={label} disclaimer={disclaimer} />
          <Button
            size="lg"
            className="gap-2 shadow-md"
            onClick={handleGenerate}
            disabled={isGenerating || generateResume.isPending}
          >
            {isGenerating || generateResume.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : generatedResume ? (
              <><RefreshCw className="w-4 h-4" /> Regenerate resume</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate improved resume</>
            )}
          </Button>
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-10 bg-secondary/60 p-1 rounded-lg flex-wrap gap-1">
            <TabsTrigger value="evaluation" className="rounded-md text-sm">Evaluation</TabsTrigger>
            <TabsTrigger value="suggestions" className="rounded-md text-sm gap-1.5">
              Suggestions
              {pending.length > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1">{pending.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="rounded-md text-sm">Skills</TabsTrigger>
            <TabsTrigger value="projects" className="rounded-md text-sm">Projects</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-md text-sm">Summary</TabsTrigger>
            <TabsTrigger value="coverletter" className="rounded-md text-sm">Cover letter</TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-md text-sm">Jobs</TabsTrigger>
            {generatedResume && (
              <TabsTrigger value="generated" className="rounded-md text-sm gap-1">
                <Wand2 className="w-3 h-3" /> Generated
              </TabsTrigger>
            )}
          </TabsList>

          {/* ─── Evaluation ───────────────────────────────────────────────── */}
          <TabsContent value="evaluation" className="space-y-6">
            {/* Score breakdown */}
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

            {/* LinkedIn enrichment note */}
            {isLinkedIn && linkedinData && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
                <Linkedin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">{linkedinData.name} · {linkedinData.currentTitle}</p>
                  <p className="text-blue-700 text-xs mt-0.5">
                    {linkedinData.experience?.length ?? 0} roles · {linkedinData.skills?.length ?? 0} skills · {linkedinData.education?.length ?? 0} education entries parsed from LinkedIn
                  </p>
                </div>
              </div>
            )}

            {/* Missing keywords */}
            {missing.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Missing keywords ({missing.length})</p>
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
                <p className="text-sm font-medium text-foreground mb-2">Matched keywords ({matched.length})</p>
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

            {/* Honest note */}
            <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 leading-relaxed">
              The score above is a keyword-match estimate, not a real ATS system output. Use it as a rough guide.
            </div>
          </TabsContent>

          {/* ─── Suggestions ──────────────────────────────────────────────── */}
          <TabsContent value="suggestions" className="space-y-2.5">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No suggestions generated.</p>
            ) : (
              suggestions.map((s) => (
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
                        }`}>{s.impact}</Badge>
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
              ))
            )}
          </TabsContent>

          {/* ─── Skills benchmark ─────────────────────────────────────────── */}
          <TabsContent value="benchmark">
            {benchmarkSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No benchmark data.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-4">
                  {benchmarkSource || `Skills commonly required for ${analysis.jobTitle} roles`}
                </p>
                {[...benchmarkSkills].sort((a: any, b: any) => b.frequency - a.frequency).map((skill: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${skill.present ? "bg-emerald-500" : "bg-red-400"}`} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={skill.present ? "text-foreground" : "text-muted-foreground"}>{skill.skill}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${skill.present ? "text-emerald-600" : "text-red-500"}`}>
                            {skill.present ? "Present" : "Missing"}
                          </span>
                          <span className="text-xs text-muted-foreground">{Math.round(skill.frequency)}%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${skill.present ? "bg-emerald-500" : "bg-red-300"}`} style={{ width: `${skill.frequency}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">Frequency estimates are AI-generated, not from a live scrape.</p>
              </div>
            )}
          </TabsContent>

          {/* ─── Projects ─────────────────────────────────────────────────── */}
          <TabsContent value="projects">
            {projectIdeas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No project ideas generated.</p>
            ) : (
              <div className="space-y-4">
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

          {/* ─── Summary ──────────────────────────────────────────────────── */}
          <TabsContent value="summary">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Original</p>
                <div className="bg-secondary/50 rounded-xl p-4 text-sm text-foreground leading-relaxed">
                  {analysis.originalSummary || "No summary found in your resume."}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rewritten</p>
                  <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => regenerateSummary.mutate({ analysisId, sessionToken })}>
                    {regenerateSummary.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Regenerate
                  </button>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-foreground leading-relaxed">
                  {regenerateSummary.isPending ? "Rewriting..." : (analysis.rewrittenSummary || "Click regenerate to rewrite.")}
                </div>
                {analysis.rewrittenSummary && (
                  <button className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => { navigator.clipboard.writeText(analysis.rewrittenSummary ?? ""); toast.success("Copied"); }}>
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── Cover letter ─────────────────────────────────────────────── */}
          <TabsContent value="coverletter">
            <div className="flex items-center justify-between mb-4">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["professional", "enthusiastic", "concise"] as const).map((t) => (
                  <button key={t} onClick={() => setCoverTone(t)}
                    className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      coverTone === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                    }`}>{t}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                  onClick={() => regenerateCoverLetter.mutate({ analysisId, sessionToken, tone: coverTone })}
                  disabled={regenerateCoverLetter.isPending}>
                  {regenerateCoverLetter.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Regenerate
                </Button>
                <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
                  if (coverLetter?.content) { navigator.clipboard.writeText(coverLetter.content); toast.success("Copied"); }
                }} disabled={!coverLetter?.content}>
                  <Copy className="w-3 h-3" /> Copy
                </Button>
              </div>
            </div>
            {regenerateCoverLetter.isPending ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Generating...</span>
              </div>
            ) : coverLetter?.content ? (
              <div className="bg-secondary/30 rounded-xl p-5 border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {coverLetter.content}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm mb-3">No cover letter yet.</p>
                <Button size="sm" variant="outline"
                  onClick={() => regenerateCoverLetter.mutate({ analysisId, sessionToken, tone: coverTone })}>
                  Generate
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ─── Jobs ─────────────────────────────────────────────────────── */}
          <TabsContent value="jobs">
            {jobRecs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No job recommendations generated.</p>
            ) : (
              <div className="space-y-5">
                {["stretch", "lateral", "pivot"].map((type) => {
                  const items = jobRecs.filter((j: any) => j.type === type);
                  if (!items.length) return null;
                  const labels: Record<string, string> = { stretch: "Stretch roles", lateral: "Lateral moves", pivot: "Career pivots" };
                  return (
                    <div key={type}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{labels[type]}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {items.map((j: any, i: number) => <JobCard key={i} job={j} />)}
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">AI-generated suggestions. Use the search links to find real open roles.</p>
              </div>
            )}
          </TabsContent>

          {/* ─── Generated resume ─────────────────────────────────────────── */}
          {generatedResume && (
            <TabsContent value="generated">
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
              <div className="bg-card border border-border rounded-xl p-6 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs">
                {generatedResume}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
