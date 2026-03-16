'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'
import { BarChart3, TrendingUp, Target, Loader2 } from 'lucide-react'
import {
  getRecentSessions,
  computeUserStats,
  formatDate,
  type Session,
} from '@/lib/firestore'
import { getScoreColors } from '@/lib/scoreUtils'

function ScoreBadge({ score }: { score: number }) {
  const { text, bg } = getScoreColors(score)
  return (
    <div className="space-y-2">
      <p className={`text-3xl font-bold tabular-nums ${text}`}>{score.toFixed(1)}</p>
      <div className="w-full bg-muted/20 rounded-full h-1.5">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <Suspense>
        <ReportsContent />
      </Suspense>
    </ProtectedRoute>
  )
}

function ReportsContent() {
  const { firebaseUser } = useAuth()
  const searchParams = useSearchParams()
  const focusSessionId = searchParams.get('session')

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!firebaseUser) return
    getRecentSessions(firebaseUser.uid, 50).then((data) => {
      setSessions(data)
      setLoading(false)
    })
  }, [firebaseUser])

  const completed = sessions.filter((s) => s.status === 'completed' && s.score != null)
  const stats = computeUserStats(sessions)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="mx-auto w-full max-w-7xl p-6 space-y-8">
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold text-foreground mb-1">Interview Reports</h1>
            <p className="text-muted-foreground">Your detailed interview feedback and performance analytics</p>
          </div>

          {/* Overview stats */}
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                label: 'Average Score',
                value: loading ? '—' : stats.avgScore != null ? `${stats.avgScore}/10` : 'No data',
                sub: completed.length > 0 ? `Based on ${completed.length} session${completed.length !== 1 ? 's' : ''}` : 'Complete an interview to see your score',
                subColor: 'text-muted-foreground',
                icon: TrendingUp, iconBg: 'bg-primary/10', iconColor: 'text-primary', delay: 'delay-75',
              },
              {
                label: 'Total Reports',
                value: loading ? '—' : String(sessions.length),
                sub: 'All time',
                subColor: 'text-muted-foreground',
                icon: BarChart3, iconBg: 'bg-secondary/10', iconColor: 'text-secondary', delay: 'delay-150',
              },
              {
                label: 'Best Category',
                value: loading ? '—' : stats.bestCategory ?? '—',
                sub: stats.bestCategory ? 'Highest average score' : 'Complete more interviews',
                subColor: 'text-muted-foreground',
                icon: Target, iconBg: 'bg-accent/10', iconColor: 'text-accent', delay: 'delay-225',
              },
            ].map(({ label, value, sub, subColor, icon: Icon, iconBg, iconColor, delay }) => (
              <Card key={label} className={`bg-card/60 border-border/40 p-6 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 animate-fade-up ${delay}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className={`text-xs font-medium ${subColor}`}>{sub}</p>
                  </div>
                  <div className={`rounded-xl ${iconBg} p-3`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Session reports */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading reports…
            </div>
          ) : completed.length === 0 ? (
            <Card className="bg-card/60 border-border/40 p-12 text-center space-y-4">
              <p className="text-muted-foreground">No completed interviews yet.</p>
              <p className="text-sm text-muted-foreground">Complete an interview session to see your report here.</p>
              <Link href="/interview/new">
                <Button>Start an Interview</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {completed.map((session, i) => (
                <Card
                  key={session.id}
                  className={`bg-card/60 border-border/40 overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 animate-fade-up group ${
                    focusSessionId === session.id ? 'ring-2 ring-primary/50' : ''
                  } delay-${Math.min(i * 75 + 75, 300)}`}
                >
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-base font-bold text-foreground truncate">
                          {session.company
                            ? `${session.company} — ${session.type}`
                            : session.type}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.createdAt)} · {session.type}
                        </p>
                      </div>
                      {session.score != null && (
                        <div className="shrink-0 text-right">
                          <ScoreBadge score={session.score} />
                          <p className="text-xs text-muted-foreground mt-1">out of 10</p>
                        </div>
                      )}
                    </div>

                    {/* Transcript preview */}
                    {session.transcript && session.transcript.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                          Interview Transcript ({session.transcript.length} turns)
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {session.transcript.find(t => t.role === 'ai')?.text ?? '—'}
                        </p>
                      </div>
                    )}

                    <Link href={`/reports/${session.id}`}>
                      <Button variant="outline" className="w-full opacity-80 group-hover:opacity-100 transition-opacity">
                        View Report
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
