'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardHeader } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { InterviewSetup } from '@/components/interview/interview-setup'
import { discoverQuestions } from '@/lib/questionDiscovery'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function NewInterviewPage() {
  const router = useRouter()
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async (config: {
    type: string
    difficulty: 'easy' | 'medium' | 'hard'
    role: string
    companyName?: string | null
    customTopics?: string
    resume?: string
    jobDescription?: string
  }) => {
    setError(null)
    setIsPreparing(true)
    try {
      const plan = await discoverQuestions({
        interviewType: config.type,
        companyName: config.type === 'technical' ? (config.companyName ?? null) : null,
        difficulty: config.difficulty,
        role: config.role,
        customTopics: config.customTopics,
        numQuestions: 3,
      })

      const fullConfig = {
        ...config,
        questionPlan: plan,
      }

      sessionStorage.setItem('interviewConfig', JSON.stringify(fullConfig))
      router.push('/interview/session')
    } catch (err: any) {
      console.error('[NewInterviewPage] Failed to prepare questions', err)
      setError(err?.message ?? 'Failed to prepare interview questions.')
    } finally {
      setIsPreparing(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <div className="flex-1">
          <DashboardHeader />

          <main className="mx-auto max-w-2xl p-6">
            <div className="mb-8 space-y-2">
              <h1 className="text-3xl font-bold text-foreground mb-2">Start New Interview</h1>
              <p className="text-muted-foreground">Configure your interview session and begin practicing</p>
              {error && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              )}
            </div>

            <InterviewSetup onStart={handleStart} />
          </main>
        </div>
      </div>

      {/* Preparing overlay */}
      {isPreparing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 rounded-xl border border-border/60 bg-card px-10 py-8 shadow-2xl">
            <div className="relative flex items-center justify-center">
              <span className="absolute h-14 w-14 rounded-full bg-primary/10 animate-ping" />
              <Loader2 className="relative h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-base font-semibold text-foreground">
                Please wait a moment
              </p>
              <p className="text-sm text-muted-foreground">
                We are preparing the interview for you.
              </p>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
