'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'
import { Download, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAllSessions,
  deleteSession,
  computeUserStats,
  formatDate,
  formatDuration,
  type Session,
} from '@/lib/firestore'

function scoreBadge(score: number) {
  if (score >= 8.5) return 'bg-green-500/15 text-green-400 border border-green-500/20'
  if (score >= 7)   return 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
  if (score >= 5.5) return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
  return 'bg-red-500/15 text-red-400 border border-red-500/20'
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  )
}

function HistoryContent() {
  const { firebaseUser } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseUser) return
    getAllSessions(firebaseUser.uid).then((data) => {
      setSessions(data)
      setLoading(false)
    })
  }, [firebaseUser])

  const stats = computeUserStats(sessions)
  const totalHrs = Math.floor(stats.totalDurationSeconds / 3600)
  const totalMins = Math.floor((stats.totalDurationSeconds % 3600) / 60)
  const totalTimeLabel = stats.totalDurationSeconds > 0
    ? totalHrs > 0 ? `${totalHrs}h ${totalMins}m` : `${totalMins} min`
    : '—'

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session? This cannot be undone.')) return
    setDeleting(id)
    await deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setDeleting(null)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="mx-auto w-full max-w-7xl p-6 space-y-8">
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold text-foreground mb-1">Interview History</h1>
            <p className="text-muted-foreground">All your past interview sessions</p>
          </div>

          {/* Stats row */}
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { label: 'Total Sessions', value: loading ? '—' : String(stats.totalSessions), delay: 'delay-75' },
              { label: 'Total Time',     value: loading ? '—' : totalTimeLabel,               delay: 'delay-150' },
              { label: 'This Month',     value: loading ? '—' : String(stats.thisMonthCount), delay: 'delay-225' },
            ].map(({ label, value, delay }) => (
              <Card
                key={label}
                className={`bg-card/60 border-border/40 p-6 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 animate-fade-up ${delay}`}
              >
                <p className="text-sm text-muted-foreground mb-1">{label}</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card className="bg-card/60 border-border/40 overflow-hidden animate-fade-up delay-300">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading sessions…
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground text-sm mb-3">No interview history yet.</p>
                <Link href="/interview/new">
                  <Button size="sm">Start your first interview</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/40 bg-muted/8">
                    <tr>
                      {['Interview', 'Type', 'Date', 'Score', 'Duration', 'Actions'].map((h, i) => (
                        <th
                          key={h}
                          className={cn(
                            'px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                            i === 3 || i === 4 ? 'text-center' : i === 5 ? 'text-right' : 'text-left'
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sessions.map((session, i) => (
                      <tr
                        key={session.id}
                        className={cn(
                          'hover:bg-muted/8 transition-colors duration-150 group animate-fade-up',
                          i === 0 ? '' : `delay-${Math.min(i * 50, 300)}`
                        )}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {session.company
                            ? `${session.company} — ${session.type}`
                            : session.type}
                          {session.role && (
                            <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                              {session.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{session.type}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(session.createdAt)}</td>
                        <td className="px-6 py-4 text-center">
                          {session.score != null ? (
                            <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums', scoreBadge(session.score))}>
                              {session.score}/10
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              {session.status === 'in-progress' ? 'In progress' : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-muted-foreground">
                          {session.durationSeconds ? formatDuration(session.durationSeconds) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Link href={`/reports?session=${session.id}`}>
                              <Button variant="ghost" size="icon-sm" title="View report">
                                <Download className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(session.id)}
                              disabled={deleting === session.id}
                              title="Delete session"
                            >
                              {deleting === session.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}
