import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText, Upload, X, CheckCircle, Loader2, Sparkles, History,
  Search, Brain, Zap, Code2, Wand2, Linkedin,
} from "lucide-react";

// ─── Animated progress screen ─────────────────────────────────────────────────
function LoadingScreen({ hasResume, hasLinkedIn }: { hasResume: boolean; hasLinkedIn: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    { icon: Search, label: "Reading job posting", detail: "Extracting requirements, skills, and responsibilities", duration: 8000 },
    ...(hasLinkedIn ? [{ icon: Linkedin, label: "Scanning LinkedIn profile", detail: "Parsing your work history, skills, and education", duration: 10000 }] : []),
    ...(hasResume ? [{ icon: FileText, label: "Reading your resume", detail: "Extracting experience, skills, and achievements", duration: 7000 }] : []),
    { icon: Brain, label: "Analyzing the fit", detail: "Comparing your background to the role semantically", duration: 12000 },
    { icon: Zap, label: "Finding skill gaps", detail: "Identifying what's missing and what's strong", duration: 8000 },
    { icon: Code2, label: "Generating project ideas", detail: "Brainstorming ways to close your skill gaps", duration: 8000 },
    { icon: Wand2, label: "Preparing your results", detail: "Almost done — putting it all together", duration: 5000 },
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
        {/* Animated icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ActiveIcon className="w-9 h-9 text-primary" />
            </div>
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping opacity-30" />
          </div>
        </div>

        {/* Current step text */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-serif font-semibold text-foreground mb-1">
            {steps[activeStep]?.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {steps[activeStep]?.detail}
          </p>
        </div>

        {/* Step list */}
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
                    isDone ? "text-muted-foreground line-through" :
                    isActive ? "text-foreground" :
                    "text-muted-foreground/50"
                  }`}>{step.label}</p>
                </div>
                {isDone && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
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
  const [resumeText, setResumeText] = useState("");
  const [resumeMode, setResumeMode] = useState<"upload" | "paste">("upload");
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
      // Handle both upload and paste modes
      let base64 = "";
      let fileName = "";
      let mimeType = "text/plain";
      if (resumeMode === "upload" && resumeFile) {
        base64 = await fileToBase64(resumeFile);
        fileName = resumeFile.name;
        mimeType = resumeFile.type || "application/pdf";
      } else if (resumeMode === "paste" && resumeText.trim()) {
        base64 = btoa(unescape(encodeURIComponent(resumeText)));
        fileName = "resume.txt";
        mimeType = "text/plain";
      }
      const { analysisId } = await startAnalysis.mutateAsync({
        sessionToken,
        linkedinUrl: linkedinUrl || undefined,
        jobUrl,
        resumeBase64: base64,
        resumeFileName: fileName,
        resumeMimeType: mimeType,
        notes: notes || undefined,
      } as any);
      navigate(`/results/${analysisId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const hasResume = resumeMode === "upload" ? !!resumeFile : resumeText.trim().length > 0;

  if (isSubmitting) {
    return <LoadingScreen hasResume={hasResume} hasLinkedIn={!!linkedinUrl} />;
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
              LevelUp
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
            LevelUp
          </h1>
          <p className="text-muted-foreground">
            Level up your skills and resume to get the job. Paste a job URL, add your resume, and get a clear picture of what's missing — with project ideas to close the gap.
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

          {/* Resume — upload or paste toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium text-foreground">
                Resume{" "}
                <span className="text-muted-foreground font-normal">— optional</span>
              </Label>
              <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setResumeMode("upload")}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    resumeMode === "upload"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setResumeMode("paste")}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    resumeMode === "paste"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Paste text
                </button>
              </div>
            </div>

            {resumeMode === "paste" ? (
              <Textarea
                placeholder="Paste your resume text here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="resize-none h-40 text-sm font-mono"
              />
            ) : (
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
            )}
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
