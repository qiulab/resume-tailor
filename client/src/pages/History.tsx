import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  FileText, Plus, Clock, Building2, ChevronRight, Sparkles, TrendingUp, Trash2,
} from "lucide-react";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const rounded = Math.round(score);
  const cls =
    rounded >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    rounded >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-red-50 text-red-700 border-red-200";
  return <Badge variant="secondary" className={`text-xs font-semibold ${cls}`}>{rounded}</Badge>;
}

export default function History() {
  const [, navigate] = useLocation();
  const sessionToken = useSession();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: analyses, isLoading } = trpc.resume.getHistory.useQuery(
    { sessionToken },
    { enabled: !!sessionToken }
  );

  const deleteHistory = trpc.resume.deleteHistory.useMutation({
    onSuccess: () => {
      utils.resume.getHistory.invalidate({ sessionToken });
      toast.success("Analysis deleted");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete analysis");
      setDeleteId(null);
    },
  });

  const analysisToDelete = analyses?.find((a) => a.id === deleteId);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-serif font-semibold text-foreground">ResumeTailor</span>
          </button>
          <Button size="sm" onClick={() => navigate("/analyze")} className="gap-2">
            <Plus className="w-3.5 h-3.5" /> New Analysis
          </Button>
        </div>
      </nav>

      <div className="container py-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">Resume History</h1>
          <p className="text-muted-foreground text-sm">
            Your past analyses from this browser session — no account required.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-secondary rounded w-1/3 mb-3" />
                <div className="h-3 bg-secondary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !analyses || analyses.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-serif font-semibold text-xl text-foreground mb-2">No analyses yet</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Upload your resume and a job posting to get your first AI-powered optimization.
            </p>
            <Button onClick={() => navigate("/analyze")} className="gap-2">
              <Plus className="w-4 h-4" /> Start your first analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <div key={analysis.id} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all group">
                <div className="flex items-start gap-4">
                  <button onClick={() => navigate(`/results/${analysis.id}`)} className="flex items-start gap-4 flex-1 min-w-0 text-left">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {analysis.jobTitle ?? "Untitled Position"}
                        </h3>
                        {analysis.atsScore !== null && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                            <ScoreBadge score={analysis.atsScore} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {analysis.companyName && (
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{analysis.companyName}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {analysis.resumeFileName && (
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{analysis.resumeFileName}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(analysis.id); }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete analysis"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {analysis.atsScore !== null && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${analysis.atsScore >= 70 ? "bg-emerald-500" : analysis.atsScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${analysis.atsScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">Match: {Math.round(analysis.atsScore)}%</span>
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4 text-center">
              <Button variant="outline" onClick={() => navigate("/analyze")} className="gap-2">
                <Plus className="w-4 h-4" /> Start a new analysis
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the analysis for{" "}
              <strong>{analysisToDelete?.jobTitle ?? "this position"}</strong>
              {analysisToDelete?.companyName ? ` at ${analysisToDelete.companyName}` : ""}, including all suggestions and the generated cover letter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteHistory.mutate({ analysisId: deleteId, sessionToken })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
