'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { InterviewSession } from '@/components/interview/interview-session'

const QuestionSchema = z.object({
  order: z.number(),
  title: z.string(),
  topic_tags: z.array(z.string()),
  difficulty: z.string(),
  leetcode_url: z.string().nullable(),
  source_hint: z.string(),
  interviewer_notes: z.string(),
})

const QuestionPlanSchema = z.object({
  source: z.enum(['company_specific', 'random_leetcode', 'fallback_random', 'system_design', 'behavioral', 'custom']),
  company: z.string().nullable(),
  summary: z.string(),
  questions: z.array(QuestionSchema),
  screen_share_prompt: z.string().nullable(),
})

const StoredConfigSchema = z.object({
  type: z.string().min(1),
  resume: z.string().optional(),
  jobDescription: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  role: z.string().optional(),
  companyName: z.string().nullable().optional(),
  questionPlan: QuestionPlanSchema.optional(),
})

type StoredConfig = z.infer<typeof StoredConfigSchema>

export default function SessionPage() {
  const router = useRouter()
  const [config, setConfig] = useState<StoredConfig | null>(null)
  const [configError, setConfigError] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('interviewConfig')
    if (!stored) {
      setConfigError(true)
      return
    }
    try {
      const parsed = JSON.parse(stored)
      const validated = StoredConfigSchema.parse(parsed)
      setConfig(validated)
    } catch {
      console.error('[SessionPage] Invalid interviewConfig in sessionStorage')
      setConfigError(true)
    }
  }, [])

  if (configError) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <p className="text-destructive font-medium">Invalid or missing interview configuration.</p>
          <button
            onClick={() => router.push('/interview/new')}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Go back and set up a new interview
          </button>
        </div>
      </ProtectedRoute>
    )
  }

  if (!config) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <InterviewSession config={config} />
    </ProtectedRoute>
  )
}
