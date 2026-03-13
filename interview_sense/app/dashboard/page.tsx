'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Clock, Target, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DashboardHeader } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { StatsCard } from '@/components/dashboard/stats-card'
import {
  getRecentSessions,
  computeUserStats,
  formatDate,
  formatDuration,
  type Session,
} from '@/lib/firestore'

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getRecentSessions(10).then((data) => {
      setSessions(data)
      setLoading(false)
    })
  }, [])

  const stats = computeUserStats(sessions)
  const recent = sessions.slice(0, 5)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="mx-auto w-full max-w-7xl p-6 space-y-8">
          {/* Heading */}
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard</h1>
            <p className="text-muted-foreground">Your interview performance overview</p>
          </div>

          {/* Stats */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard label="Total Interviews" value={loading ? '—' : String(stats.totalSessions)}        icon={Target}     animationDelay="delay-75" />
            <StatsCard label="Avg Score"         value={loading ? '—' : stats.avgScore != null ? `${stats.avgScore}/10` : '—'} icon={TrendingUp}  animationDelay="delay-150" />
            <StatsCard label="This Month"        value={loading ? '—' : String(stats.thisMonthCount)}      icon={Clock}      animationDelay="delay-225" />
            <StatsCard label="Pending Review"    value={loading ? '—' : String(sessions.filter(s => s.status === 'in-progress').length)} icon={AlertCircle} animationDelay="delay-300" />
          </div>

          {/* Quick Actions */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-primary/15 to-accent/8 border-primary/30 p-6 space-y-4 hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-300 animate-fade-up delay-300">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-foreground">Start New Interview</h2>
                <p className="text-sm text-muted-foreground">Practice with real-time AI coaching and live feedback</p>
              </div>
              <Link href="/interview/new">
                <Button className="w-full">
                  Begin Interview
                  <ArrowRight />
                </Button>
              </Link>
            </Card>

            <Card className="bg-gradient-to-br from-secondary/15 to-primary/8 border-secondary/30 p-6 space-y-4 hover:border-secondary/50 hover:-translate-y-0.5 transition-all duration-300 animate-fade-up delay-375">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-foreground">View Reports</h2>
                <p className="text-sm text-muted-foreground">Review your performance metrics and AI feedback</p>
              </div>
              <Link href="/reports">
                <Button variant="secondary" className="w-full">
                  View Reports
                  <ArrowRight />
                </Button>
              </Link>
            </Card>
          </div>

          {/* Recent Interviews */}
          <Card className="bg-card/60 border-border/40 overflow-hidden animate-fade-up delay-450">
            <div className="px-6 py-4 border-b border-border/40">
              <h2 className="text-base font-bold text-foreground">Recent Interviews</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading sessions…
              </div>
            ) : recent.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm">No interviews yet.</p>
                <Link href="/interview/new" className="inline-block mt-3">
                  <Button size="sm">Start your first interview</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recent.map((session, i) => (
                  <div
                    key={session.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-muted/8 transition-colors duration-150 group"
                  >
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {session.type}{session.company ? ` — ${session.company}` : ''}
                        {session.role ? ` (${session.role})` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(session.createdAt)}
                        {session.durationSeconds ? ` · ${formatDuration(session.durationSeconds)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {session.score != null ? (
                        <p className="font-bold text-primary tabular-nums">{session.score}/10</p>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {session.status === 'in-progress' ? 'In progress' : 'No score'}
                        </span>
                      )}
                      <Link href={`/reports?session=${session.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}
