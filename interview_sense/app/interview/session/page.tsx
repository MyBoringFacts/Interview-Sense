'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { InterviewSession } from '@/components/interview/interview-session'

export default function SessionPage() {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('interviewConfig')
    if (stored) {
      setConfig(JSON.parse(stored))
    }
  }, [])

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
