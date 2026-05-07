import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import {
  FileText, Link2, Linkedin, Upload, ArrowRight, ArrowLeft,
  CheckCircle, Loader2, X, FileUp, Sparkles, Briefcase, GraduationCap, Star,
} from "lucide-react";

const STEPS = [
  { id: 1, title: "LinkedIn Profile", icon: Linkedin, description: "Optional — enables deeper analysis" },
  { id: 2, title: "Job Posting", icon: Link2, description: "Paste the URL of the job you're targeting" },
  { id: 3, title: "Your Resume", icon: FileUp, description: "Upload your current resume (PDF or DOCX)" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PROCESSING_STEPS = [
  "Uploading resume...",
  "Reading job description...",
  "Parsing LinkedIn profile...",
  "Running AI analysis...",
  "Benchmarking similar roles...",
  "Generating project ideas & job matches...",
];

const LINKEDIN_BENEFITS = [
  { icon: Briefcase, label: "Full work history", desc: "All roles, not just what's on your resume" },
  { icon: Star, label: "LinkedIn skills", desc: "Endorsed skills vs. job requirements" },
  { icon: GraduationCap, label: "Education & certs", desc: "Degree and certification gap analysis" },
];

export default function Analyze() {
  const [, navigate] = useLocation();
  const sessionToken = useSession();
  const [step, setStep] = useState(1);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startAnalysis = trpc.resume.startAnalysis.useMutation();

  const validateJobUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const validateLinkedInUrl = (url: string) => {
    if (!url) return true; // optional
    return /linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/i.test(url);
  };

  const handleNext = () => {
    if (step === 1 && linkedinUrl && !validateLinkedInUrl(linkedinUrl)) {
      toast.error("Please enter a valid LinkedIn profile URL (e.g. linkedin.com/in/yourname)");
      return;
    }
    if (step === 2 && !validateJobUrl(jobUrl)) {
      toast.error("Please enter a valid job posting URL");
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.includes("pdf") || file.type.includes("word") || file.name.endsWith(".docx"))) {
      setResumeFile(file);
    } else {
      toast.error("Please upload a PDF or DOCX file");
    }
  }, []);

  const simulateProgress = () => {
    let current = 0;
    const hasLinkedIn = !!linkedinUrl;
    const steps = hasLinkedIn ? PROCESSING_STEPS : PROCESSING_STEPS.filter((_, i) => i !== 2);
    const interval = setInterval(() => {
      current++;
      if (current < steps.length) setProcessingStep(current);
      else clearInterval(interval);
    }, hasLinkedIn ? 10000 : 8000);
    return interval;
  };

  const handleSubmit = async () => {
    if (!resumeFile) { toast.error("Please upload your resume"); return; }
    if (!validateJobUrl(jobUrl)) { toast.error("Please enter a valid job posting URL"); return; }

    setIsSubmitting(true);
    setProcessingStep(0);
    const progressInterval = simulateProgress();

    try {
      const base64 = await fileToBase64(resumeFile);
      const { analysisId } = await startAnalysis.mutateAsync({
        sessionToken,
        linkedinUrl: linkedinUrl || undefined,
        jobUrl,
        resumeBase64: base64,
        resumeFileName: resumeFile.name,
        resumeMimeType: resumeFile.type || "application/pdf",
      });
      clearInterval(progressInterval);
      navigate(`/results/${analysisId}`);
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error(err?.message ?? "Failed to start analysis. Please try again.");
      setIsSubmitting(false);
      setProcessingStep(0);
    }
  };

  const activeSteps = linkedinUrl ? PROCESSING_STEPS : PROCESSING_STEPS.filter((_, i) => i !== 2);

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
            {linkedinUrl ? "Deep analysis in progress" : "Analyzing your resume"}
          </h2>
          <p className="text-muted-foreground mb-8 text-sm">
            {linkedinUrl
              ? "Parsing your LinkedIn profile and running a comprehensive AI analysis. This takes about 60–90 seconds."
              : "Running AI analysis on your resume and the job description. About 30–60 seconds."}
          </p>
          <div className="space-y-3 mb-8">
            {activeSteps.map((s, i) => (
              <div key={s} className="flex items-center gap-3 text-sm">
                {i < processingStep ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : i === processingStep ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                )}
                <span className={
                  i < processingStep ? "text-muted-foreground line-through" :
                  i === processingStep ? "text-foreground font-medium" :
                  "text-muted-foreground"
                }>{s}</span>
              </div>
            ))}
          </div>
          <Progress value={(processingStep / activeSteps.length) * 100} className="h-1.5" />
        </div>
      </div>
    );
  }

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
          <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>My History</Button>
        </div>
      </nav>

      <div className="container py-12 max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step > s.id ? "bg-emerald-500 text-white" :
                    step === s.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {step > s.id ? <CheckCircle className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${step === s.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 mb-5 transition-colors ${step > s.id ? "bg-emerald-300" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {/* Step 1: LinkedIn */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Linkedin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-serif font-semibold text-xl text-foreground">LinkedIn Profile</h2>
                  <p className="text-sm text-muted-foreground">Optional — but unlocks much deeper analysis</p>
                </div>
              </div>

              {/* Benefits grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {LINKEDIN_BENEFITS.map((b) => (
                  <div key={b.label} className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
                    <b.icon className="w-4 h-4 text-blue-600 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-blue-900">{b.label}</p>
                    <p className="text-[10px] text-blue-600 mt-0.5 leading-tight">{b.desc}</p>
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="linkedin" className="text-sm font-medium text-foreground mb-2 block">
                  LinkedIn Profile URL
                </Label>
                <Input
                  id="linkedin" type="url"
                  placeholder="https://linkedin.com/in/your-profile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  We'll scrape your public profile to compare your full work history and LinkedIn skills against the job requirements. Your profile must be public.
                </p>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => navigate("/")}>Cancel</Button>
                <div className="flex gap-2">
                  {linkedinUrl && (
                    <Button variant="ghost" onClick={() => { setLinkedinUrl(""); setStep(2); }}>
                      Skip LinkedIn
                    </Button>
                  )}
                  <Button onClick={handleNext}>
                    {linkedinUrl ? "Continue with LinkedIn" : "Skip for now"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Job URL */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-serif font-semibold text-xl text-foreground">Job Posting URL</h2>
                  <p className="text-sm text-muted-foreground">Paste the link to the job you're targeting</p>
                </div>
              </div>
              <div>
                <Label htmlFor="jobUrl" className="text-sm font-medium text-foreground mb-2 block">
                  Job Posting URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="jobUrl" type="url"
                  placeholder="https://jobs.company.com/position/123"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Works with LinkedIn Jobs, Indeed, Greenhouse, Lever, Workday, and most job boards.
                </p>
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleNext} disabled={!jobUrl}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Resume Upload */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-serif font-semibold text-xl text-foreground">Upload Your Resume</h2>
                  <p className="text-sm text-muted-foreground">PDF or DOCX format, up to 10MB</p>
                </div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDragging ? "border-primary bg-primary/5" :
                  resumeFile ? "border-emerald-300 bg-emerald-50" :
                  "border-border hover:border-primary/50 hover:bg-secondary/50"
                }`}
              >
                <input
                  ref={fileInputRef} type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setResumeFile(f); }}
                />
                {resumeFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
                    <p className="font-medium text-foreground">{resumeFile.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}
                      className="mt-3 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="font-medium text-foreground mb-1">Drop your resume here</p>
                    <p className="text-sm text-muted-foreground">or <span className="text-primary">browse files</span></p>
                    <p className="text-xs text-muted-foreground mt-3">Supports PDF and DOCX</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={!resumeFile || isSubmitting} className="shadow-lg shadow-primary/20">
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> {linkedinUrl ? "Analyze with LinkedIn" : "Analyze my resume"}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Summary of inputs */}
        {step === 3 && (linkedinUrl || jobUrl) && (
          <div className="mt-4 bg-secondary/50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Analysis will include</p>
            {linkedinUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Linkedin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-muted-foreground truncate">{linkedinUrl}</span>
                <span className="text-xs text-blue-600 font-medium shrink-0">Deep analysis</span>
              </div>
            )}
            {jobUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-muted-foreground truncate">{jobUrl}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
