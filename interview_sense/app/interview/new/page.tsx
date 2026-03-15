'use client'

import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardHeader } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { InterviewSetup } from '@/components/interview/interview-setup'

export default function NewInterviewPage() {
  const router = useRouter()

  const handleStart = (config: { type: string; resume?: string; jobDescription?: string }) => {
    sessionStorage.setItem('interviewConfig', JSON.stringify(config))
    router.push('/interview/session')
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        
        <div className="flex-1">
          <DashboardHeader />
          
          <main className="mx-auto max-w-2xl p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Start New Interview</h1>
              <p className="text-muted-foreground">Configure your interview session and begin practicing</p>
            </div>

            <InterviewSetup onStart={handleStart} />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
