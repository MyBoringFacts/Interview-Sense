'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowRight, Zap, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const interviewTypes = [
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    description: 'Practice answering behavioral questions using the STAR method',
    difficulty: 'All Levels',
    duration: '15–20 min',
  },
  {
    id: 'technical',
    title: 'Technical Round',
    description: 'Solve coding problems with AI assistance and real-time feedback',
    difficulty: 'Intermediate–Advanced',
    duration: '30–45 min',
  },
  {
    id: 'system-design',
    title: 'System Design',
    description: 'Architect scalable systems and communicate your design decisions',
    difficulty: 'Advanced',
    duration: '45–60 min',
  },
  {
    id: 'product',
    title: 'Product Manager',
    description: 'Practice product sense and strategy questions',
    difficulty: 'All Levels',
    duration: '20–30 min',
  },
]

interface InterviewSetupProps {
  onStart: (config: { type: string; resume?: string; jobDescription?: string }) => void
}

export function InterviewSetup({ onStart }: InterviewSetupProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isResumeDragging, setIsResumeDragging] = useState(false)
  const [isJobDragging, setIsJobDragging] = useState(false)
  const [resumeMode, setResumeMode] = useState<'idle' | 'file' | 'text'>('idle')
  const [jobMode, setJobMode] = useState<'idle' | 'file' | 'text'>('idle')

  const resumeInputRef = useRef<HTMLInputElement | null>(null)
  const jobInputRef = useRef<HTMLInputElement | null>(null)

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
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
    if (selectedType && resume.trim()) {
      onStart({ type: selectedType, resume: resume.trim(), jobDescription: jobDescription.trim() || undefined })
    }
  }

  const isReady = selectedType && resume.trim().length > 0

  return (
    <div className="space-y-8">
      {/* Interview Type Selection */}
      <div className="animate-fade-up">
        <h2 className="text-xl font-bold text-foreground mb-4">Select Interview Type</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {interviewTypes.map((type, i) => (
            <Card
              key={type.id}
              className={cn(
                'p-5 cursor-pointer transition-all duration-200 border-2 hover:-translate-y-0.5 animate-fade-up',
                i === 0 ? '' : i === 1 ? 'delay-75' : i === 2 ? 'delay-150' : 'delay-225',
                selectedType === type.id
                  ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
                  : 'border-border/40 bg-card/40 hover:border-primary/50'
              )}
              onClick={() => setSelectedType(type.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground">{type.title}</h3>
                {selectedType === type.id && (
                  <span className="h-2 w-2 rounded-full bg-primary animate-scale-in" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{type.description}</p>
              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">
                  {type.difficulty}
                </span>
                <span className="px-2.5 py-1 bg-secondary/10 text-secondary rounded-full font-medium">
                  {type.duration}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Resume and JD Selection */}
      {selectedType && (
        <div className="space-y-6 animate-fade-up">
          <div className="space-y-3">
            <Label htmlFor="resume" className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Your Resume (Required)
            </Label>
            <p className="text-sm text-muted-foreground">
              Upload your resume so the AI can tailor the interview to your experience.
            </p>
            {resumeMode === 'idle' && (
              <Button
                type="button"
                variant="outline"
                className="mt-1"
                onClick={() => setResumeMode('file')}
              >
                Upload resume
              </Button>
            )}
            {resumeMode === 'file' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Upload from your device</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setResumeMode('text')}
                  >
                    Or paste text
                  </Button>
                </div>
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-xs sm:text-sm text-muted-foreground cursor-pointer transition-colors bg-muted/40',
                    isResumeDragging
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 hover:border-primary/60 hover:bg-muted/60'
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsResumeDragging(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setIsResumeDragging(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsResumeDragging(false)
                    const file = e.dataTransfer.files?.[0]
                    void handleResumeFile(file)
                  }}
                  onClick={() => resumeInputRef.current?.click()}
                >
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      void handleResumeFile(file)
                    }}
                  />
                  <span className="font-medium">Drag &amp; drop your resume file here</span>
                  <span className="text-[11px] sm:text-xs">or click to browse files</span>
                </div>
              </div>
            )}
            {resumeMode === 'text' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Paste your resume</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setResumeMode('file')}
                  >
                    Or upload file
                  </Button>
                </div>
                <Textarea
                  id="resume"
                  placeholder="e.g., Senior Frontend Engineer with 5 years of experience in React..."
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  className="min-h-[150px] resize-y"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="jd" className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Job Description (Optional)
            </Label>
            <p className="text-sm text-muted-foreground">
              Add the target job description to get role-specific questions.
            </p>
            {jobMode === 'idle' && (
              <Button
                type="button"
                variant="outline"
                className="mt-1"
                onClick={() => setJobMode('file')}
              >
                Add job description
              </Button>
            )}
            {jobMode === 'file' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Upload from your device</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setJobMode('text')}
                  >
                    Or paste text
                  </Button>
                </div>
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-xs sm:text-sm text-muted-foreground cursor-pointer transition-colors bg-muted/40',
                    isJobDragging
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 hover:border-primary/60 hover:bg-muted/60'
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsJobDragging(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setIsJobDragging(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsJobDragging(false)
                    const file = e.dataTransfer.files?.[0]
                    void handleJobFile(file)
                  }}
                  onClick={() => jobInputRef.current?.click()}
                >
                  <input
                    ref={jobInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      void handleJobFile(file)
                    }}
                  />
                  <span className="font-medium">Drag &amp; drop the job description file</span>
                  <span className="text-[11px] sm:text-xs">or click to browse files (optional)</span>
                </div>
              </div>
            )}
            {jobMode === 'text' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Paste the job description</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setJobMode('file')}
                  >
                    Or upload file
                  </Button>
                </div>
                <Textarea
                  id="jd"
                  placeholder="e.g., We are looking for a Senior React Developer to join our core team..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[150px] resize-y"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="flex gap-3 animate-fade-up delay-300">
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">Cancel</Button>
        </Link>
        <Button
          onClick={handleStart}
          disabled={!isReady}
          className="flex-1"
        >
          <Zap />
          Start Interview
          <ArrowRight />
        </Button>
      </div>
    </div>
  )
}
