import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  X,
  CheckCircle,
  Loader2,
  Sparkles,
  History,
} from "lucide-react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [, navigate] = useLocation();
  const sessionToken = useSession();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startAnalysis = trpc.resume.startAnalysis.useMutation();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.type.includes("pdf") ||
        file.type.includes("word") ||
        file.name.endsWith(".docx"))
    ) {
      setResumeFile(file);
    } else {
      toast.error("Please upload a PDF or DOCX file");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobUrl.trim()) {
      toast.error("Job posting URL is required");
      return;
    }
    try { new URL(jobUrl); } catch {
      toast.error("Please enter a valid job posting URL");
      return;
    }
    setIsSubmitting(true);
    try {
      const base64 = resumeFile ? await fileToBase64(resumeFile) : "";
      const { analysisId } = await startAnalysis.mutateAsync({
        sessionToken,
        linkedinUrl: linkedinUrl || undefined,
        jobUrl,
        resumeBase64: base64,
        resumeFileName: resumeFile?.name ?? "",
        resumeMimeType: resumeFile?.type || "application/pdf",
        notes: notes || undefined,
      } as any);
      navigate(`/results/${analysisId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h2 className="text-lg font-serif font-semibold text-foreground mb-2">
            Evaluating your resume
          </h2>
          <p className="text-sm text-muted-foreground">
            Reading the job description{resumeFile ? ", analyzing your resume," : ""} and generating
            feedback. This takes about 60–90 seconds.
          </p>
          <div className="mt-6 flex gap-1.5 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-serif font-semibold text-foreground">
              ResumeTailor
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => navigate("/history")}
          >
            <History className="w-3.5 h-3.5" />
            History
          </Button>
        </div>
      </nav>

      {/* Main form */}
      <div className="container max-w-xl mx-auto py-14 px-4">
        <div className="mb-10">
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-3">
            Resume evaluation
          </h1>
          <p className="text-muted-foreground">
          Paste a job URL and optionally upload your resume. We'll evaluate the fit, identify gaps, and let you generate a tailored version.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job URL */}
          <div>
            <Label
              htmlFor="jobUrl"
              className="text-sm font-medium text-foreground mb-1.5 block"
            >
              Job posting URL
            </Label>
            <Input
              id="jobUrl"
              type="url"
              placeholder="https://jobs.company.com/..."
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="h-10"
              required
            />
          </div>

          {/* LinkedIn URL */}
          <div>
            <Label
              htmlFor="linkedin"
              className="text-sm font-medium text-foreground mb-1.5 block"
            >
              LinkedIn profile URL{" "}
              <span className="text-muted-foreground font-normal">
                — optional, enables deeper analysis
              </span>
            </Label>
            <Input
              id="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/your-profile"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Resume upload */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-1.5 block">
              Resume{" "}
              <span className="text-muted-foreground font-normal">— optional</span>
            </Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : resumeFile
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-border hover:border-primary/40 hover:bg-secondary/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setResumeFile(f);
                }}
              />
              {resumeFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      {resumeFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setResumeFile(null);
                    }}
                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Drop your resume here or{" "}
                    <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    PDF or DOCX · optional
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes / concerns */}
          <div>
            <Label
              htmlFor="notes"
              className="text-sm font-medium text-foreground mb-1.5 block"
            >
              Notes or concerns{" "}
              <span className="text-muted-foreground font-normal">
                — optional
              </span>
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. I'm switching industries, I have a gap in employment, I'm not sure how to highlight my freelance work..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-24 text-sm"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full gap-2"
            disabled={!jobUrl || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Evaluate my resume
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            No account required · Results in ~60–90 seconds
          </p>
        </form>
      </div>
    </div>
  );
}
