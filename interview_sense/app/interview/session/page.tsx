'use client'

import { useEffect, useState } from 'react'
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
    return <div>Loading...</div>
  }

  return <InterviewSession config={config} />
}
