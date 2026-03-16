'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowRight,
  Zap,
  FileText,
  Monitor,
  Users,
  Code2,
  Layers,
  Pencil,
  Check,
  UploadCloud,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const interviewTypes = [
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    description: 'Soft skills, conflict resolution, and team collaboration using the STAR method',
    difficulty: 'All Levels',
    duration: '15–20 min',
    icon: Users,
    badge: null,
  },
  {
    id: 'technical',
    title: 'Technical Round',
    description: 'Solve LeetCode-style coding challenges with real-time AI feedback',
    difficulty: 'Intermediate–Advanced',
    duration: '30–45 min',
    icon: Code2,
    badge: null,
  },
  {
    id: 'system-design',
    title: 'System Design',
    description: 'Architect scalable systems — the AI observes your whiteboard via screen share',
    difficulty: 'Advanced',
    duration: '45–60 min',
    icon: Layers,
    badge: 'Screen Share',
  },
  {
    id: 'custom',
    title: 'Custom Interview',
    description: 'Define your own topics — mix coding, design, and behavioral in one session',
    difficulty: 'All Levels',
    duration: '15–60 min',
    icon: Pencil,
    badge: null,
  },
]

const difficultyConfig = {
  easy: {
    label: 'Easy',
    sublabel: 'Warm-up questions',
    dot: 'bg-emerald-500',
    selectedBg: 'bg-emerald-500/15',
    selectedBorder: 'border-emerald-500',
    selectedText: 'text-emerald-400',
    selectedCheck: 'bg-emerald-500',
    hoverBorder: 'hover:border-emerald-500/40',
  },
  medium: {
    label: 'Medium',
    sublabel: 'Industry standard',
    dot: 'bg-amber-400',
    selectedBg: 'bg-amber-500/15',
    selectedBorder: 'border-amber-400',
    selectedText: 'text-amber-400',
    selectedCheck: 'bg-amber-400',
    hoverBorder: 'hover:border-amber-400/40',
  },
  hard: {
    label: 'Hard',
    sublabel: 'Senior / FAANG',
    dot: 'bg-red-500',
    selectedBg: 'bg-red-500/15',
    selectedBorder: 'border-red-500',
    selectedText: 'text-red-400',
    selectedCheck: 'bg-red-500',
    hoverBorder: 'hover:border-red-500/40',
  },
} as const

interface InterviewSetupProps {
  onStart: (config: {
    type: string
    difficulty: 'easy' | 'medium' | 'hard'
    role: string
    companyName?: string | null
    customTopics?: string
    resume?: string
    jobDescription?: string
  }) => void
}

export function InterviewSetup({ onStart }: InterviewSetupProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [role, setRole] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [customTopics, setCustomTopics] = useState('')
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isResumeDragging, setIsResumeDragging] = useState(false)
  const [isJobDragging, setIsJobDragging] = useState(false)
  const [resumeMode, setResumeMode] = useState<'idle' | 'file' | 'text'>('idle')
  const [jobMode, setJobMode] = useState<'idle' | 'file' | 'text'>('idle')

  const resumeInputRef = useRef<HTMLInputElement | null>(null)
  const jobInputRef = useRef<HTMLInputElement | null>(null)

  const extractPdfText = async (file: File): Promise<string> => {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
    GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url,
    ).toString()

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise

    const pageTexts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      pageTexts.push(pageText)
    }

    return pageTexts.join('\n').replace(/\s{3,}/g, '  ').trim()
  }

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        extractPdfText(file).then(resolve).catch(reject)
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string) || '')
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })

  const handleResumeFile = async (file?: File | null) => {
    if (!file) return
    try {
      const text = await readFileAsText(file)
      if (text.trim()) {
        setResume(text)
        setResumeMode('text')
      }
    } catch (err) {
      console.error('Failed to load resume file', err)
    }
  }

  const handleJobFile = async (file?: File | null) => {
    if (!file) return
    try {
      const text = await readFileAsText(file)
      setJobDescription(text)
      setJobMode('text')
    } catch (err) {
      console.error('Failed to load job description file', err)
    }
  }

  const handleStart = () => {
    if (selectedType && resume.trim() && role.trim()) {
      onStart({
        type: selectedType,
        difficulty,
        role: role.trim(),
        companyName: selectedType === 'technical' && companyName.trim() ? companyName.trim() : null,
        customTopics: selectedType === 'custom' && customTopics.trim() ? customTopics.trim() : undefined,
        resume: resume.trim(),
        jobDescription: jobDescription.trim() || undefined,
      })
    }
  }

  const isReady = selectedType && resume.trim().length > 0 && role.trim().length > 0

  return (
    <div className="space-y-8">

      {/* ── Step 1: Interview Type ───────────────────────────────────────── */}
      <section className="animate-fade-up">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shrink-0">
            1
          </span>
          <h2 className="text-base font-semibold text-foreground">Choose Interview Type</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {interviewTypes.map((type, i) => {
            const Icon = type.icon
            const isSelected = selectedType === type.id
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  'group relative text-left rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 animate-fade-up',
                  i === 0 ? '' : i === 1 ? 'delay-75' : i === 2 ? 'delay-150' : 'delay-225',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/15'
                    : 'border-border/40 bg-card/40 hover:border-primary/40 hover:bg-card/70'
                )}
              >
                {/* Selected checkmark */}
                <span
                  className={cn(
                    'absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200',
                    isSelected
                      ? 'border-primary bg-primary scale-100'
                      : 'border-border/50 bg-transparent scale-90 opacity-0 group-hover:opacity-40 group-hover:scale-100'
                  )}
                >
                  <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                </span>

                <div className="flex items-start gap-3 mb-2 pr-6">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{type.title}</h3>
                    {type.badge && (
                      <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-secondary/20 text-secondary text-[10px] font-medium rounded-full border border-secondary/30">
                        <Monitor className="h-2.5 w-2.5" />
                        {type.badge}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-3 pl-11">
                  {type.description}
                </p>

                <div className="flex gap-2 pl-11">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full font-medium">
                    {type.difficulty}
                  </span>
                  <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[11px] rounded-full font-medium">
                    {type.duration}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Steps 2–4: Configuration (revealed after type is chosen) ────── */}
      {selectedType && (
        <div className="relative z-10 space-y-6 animate-fade-up">

          {/* ── Step 2: Role + Difficulty ──────────────────────────────────── */}
          <Card className="border-border/40 bg-card/50 p-5 gap-0">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shrink-0">
                2
              </span>
              <h2 className="text-base font-semibold text-foreground">Session Details</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Target Role */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-foreground">
                  Target Role <span className="text-destructive">*</span>
                </Label>
                <input
                  id="role"
                  type="text"
                  placeholder="e.g. Frontend Engineer, Backend Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors"
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Difficulty</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((level) => {
                    const cfg = difficultyConfig[level]
                    const isActive = difficulty === level
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={cn(
                          'relative flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 cursor-pointer transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                          isActive
                            ? `${cfg.selectedBg} ${cfg.selectedBorder}`
                            : `border-border/40 bg-background/50 ${cfg.hoverBorder} hover:bg-card/60`
                        )}
                      >
                        {/* Color dot */}
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full transition-transform duration-150',
                            cfg.dot,
                            isActive ? 'scale-125' : 'opacity-60'
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs font-semibold capitalize leading-none',
                            isActive ? cfg.selectedText : 'text-muted-foreground'
                          )}
                        >
                          {cfg.label}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] leading-none text-center',
                            isActive ? cfg.selectedText + ' opacity-80' : 'text-muted-foreground/60'
                          )}
                        >
                          {cfg.sublabel}
                        </span>
                        {/* Active checkmark */}
                        {isActive && (
                          <span
                            className={cn(
                              'absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full',
                              cfg.selectedCheck
                            )}
                          >
                            <Check className="h-2 w-2 text-white" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Company Name — Technical only */}
            {selectedType === 'technical' && (
              <div className="mt-5 space-y-2">
                <Label htmlFor="company" className="text-sm font-medium text-foreground">
                  Company Name{' '}
                  <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </Label>
                <input
                  id="company"
                  type="text"
                  placeholder="e.g. Google, Meta, Amazon"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors"
                />
              </div>
            )}

            {/* Custom Topics — Custom only */}
            {selectedType === 'custom' && (
              <div className="mt-5 space-y-2">
                <Label htmlFor="custom-topics" className="text-sm font-medium text-foreground">
                  Topics to Practice{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (Optional — leave blank for a general mix)
                  </span>
                </Label>
                <Textarea
                  id="custom-topics"
                  placeholder="e.g. Dynamic programming, Kubernetes internals, system design for ML pipelines…"
                  value={customTopics}
                  onChange={(e) => setCustomTopics(e.target.value)}
                  className="min-h-[90px] resize-y"
                />
              </div>
            )}

            {/* System Design screen-share hint */}
            {selectedType === 'system-design' && (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3">
                <Monitor className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-secondary">Screen Share Required</span> — once the session starts,
                  share your screen with a whiteboard tool (Excalidraw, draw.io, etc.). The AI will observe your diagram
                  and ask follow-up questions in real time.
                </p>
              </div>
            )}
          </Card>

          {/* ── Step 3: Resume ─────────────────────────────────────────────── */}
          <Card className="border-border/40 bg-card/50 p-5 gap-0">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shrink-0 transition-colors',
                  resume.trim()
                    ? 'bg-emerald-500 text-white'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {resume.trim() ? <Check className="h-3 w-3" strokeWidth={3} /> : '3'}
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground leading-none">
                  Your Resume <span className="text-destructive text-sm">*</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Helps the AI tailor questions to your experience
                </p>
              </div>
            </div>

            {resumeMode === 'idle' && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setResumeMode('file')}
              >
                <UploadCloud className="h-4 w-4" />
                Upload resume
              </Button>
            )}

            {resumeMode === 'file' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Upload from your device</p>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => setResumeMode('text')}>
                    Or paste text
                  </Button>
                </div>
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground cursor-pointer transition-all duration-150',
                    isResumeDragging
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setIsResumeDragging(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsResumeDragging(false) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsResumeDragging(false)
                    void handleResumeFile(e.dataTransfer.files?.[0])
                  }}
                  onClick={() => resumeInputRef.current?.click()}
                >
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => void handleResumeFile(e.target.files?.[0])}
                  />
                  <UploadCloud className={cn('h-7 w-7', isResumeDragging ? 'text-primary' : 'text-muted-foreground/50')} />
                  <span className="font-medium text-sm">Drag &amp; drop your resume file</span>
                  <span className="text-xs text-muted-foreground/60">or click to browse · .txt .md .pdf .doc .docx</span>
                </div>
              </div>
            )}

            {resumeMode === 'text' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Paste your resume text</p>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => setResumeMode('file')}>
                    Or upload file
                  </Button>
                </div>
                <Textarea
                  id="resume"
                  placeholder="e.g. Senior Frontend Engineer with 5 years of experience in React…"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  className="min-h-[150px] resize-y"
                />
              </div>
            )}
          </Card>

          {/* ── Step 4: Job Description (optional) ────────────────────────── */}
          <Card className="border-border/40 bg-card/50 p-5 gap-0">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shrink-0 transition-colors',
                  jobDescription.trim()
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {jobDescription.trim() ? <Check className="h-3 w-3" strokeWidth={3} /> : '4'}
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground leading-none">
                  Job Description{' '}
                  <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Unlocks role-specific, targeted questions
                </p>
              </div>
            </div>

            {jobMode === 'idle' && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setJobMode('file')}
              >
                <FileText className="h-4 w-4" />
                Add job description
              </Button>
            )}

            {jobMode === 'file' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Upload from your device</p>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => setJobMode('text')}>
                    Or paste text
                  </Button>
                </div>
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground cursor-pointer transition-all duration-150',
                    isJobDragging
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setIsJobDragging(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsJobDragging(false) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsJobDragging(false)
                    void handleJobFile(e.dataTransfer.files?.[0])
                  }}
                  onClick={() => jobInputRef.current?.click()}
                >
                  <input
                    ref={jobInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => void handleJobFile(e.target.files?.[0])}
                  />
                  <UploadCloud className={cn('h-7 w-7', isJobDragging ? 'text-primary' : 'text-muted-foreground/50')} />
                  <span className="font-medium text-sm">Drag &amp; drop the job description</span>
                  <span className="text-xs text-muted-foreground/60">or click to browse · .txt .md .pdf .doc .docx</span>
                </div>
              </div>
            )}

            {jobMode === 'text' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Paste the job description</p>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => setJobMode('file')}>
                    Or upload file
                  </Button>
                </div>
                <Textarea
                  id="jd"
                  placeholder="e.g. We are looking for a Senior React Developer to join our core team…"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[150px] resize-y"
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Start / Cancel ──────────────────────────────────────────────── */}
      <div className="flex gap-3 animate-fade-up delay-300">
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">Cancel</Button>
        </Link>
        <Button
          onClick={handleStart}
          disabled={!isReady}
          className="flex-1"
        >
          <Zap className="h-4 w-4" />
          Start Interview
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
