'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  MessageCircle,
  Brain,
  Users,
  Star,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSession, getEvaluationsForSession, formatDate, formatDuration, type Session, type Evaluation } from '@/lib/firestore'
import { getScoreColors, getScoreLabel } from '@/lib/scoreUtils'
import { useAuth } from '@/context/AuthContext'

function ScoreRing({ score }: { score: number }) {
  const colors = getScoreColors(score)
  const pct = (score / 10) * 100
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (pct / 100) * circumference
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
        <circle
          cx="72" cy="72" r="42" fill="none" strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${colors.text} transition-all duration-1000`}
        />
      </svg>
      <div className="text-center">
        <p className={`text-3xl font-bold tabular-nums ${colors.text}`}>{score.toFixed(1)}</p>
        <p className="text-xs text-muted-foreground">/ 10</p>
      </div>
    </div>
  )
}

function CategoryBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) {
  const colors = getScoreColors(score)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colors.text}`} />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${colors.text}`}>{score.toFixed(1)}</span>
      </div>
      <div className="w-full bg-muted/20 rounded-full h-2">
        <div
          className={`h-full rounded-full ${colors.bg} transition-all duration-700`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SessionReportPage() {
  return (
    <ProtectedRoute>
      <ReportContent />
    </ProtectedRoute>
  )
}

function ReportContent() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const { firebaseUser } = useAuth()

  const [session, setSession] = useState<Session | null>(null)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    async function load() {
      try {
        const [sess, evals] = await Promise.all([
          getSession(sessionId as string),
          getEvaluationsForSession(sessionId as string),
        ])
        setSession(sess)
        setEvaluation(evals[evals.length - 1] ?? null)
      } catch (err: any) {
        setError(err.message ?? 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="mx-auto w-full max-w-5xl p-6 space-y-8">
          {/* Back */}
          <Button variant="ghost" size="sm" onClick={() => router.push('/reports')} className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            All Reports
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-32 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading your report…
            </div>
          ) : error ? (
            <Card className="bg-card/60 border-border/40 p-12 text-center space-y-4">
              <p className="text-destructive font-medium">{error}</p>
              <Link href="/reports"><Button variant="outline">Back to Reports</Button></Link>
            </Card>
          ) : !session ? (
            <Card className="bg-card/60 border-border/40 p-12 text-center space-y-4">
              <p className="text-muted-foreground">Session not found.</p>
              <Link href="/reports"><Button variant="outline">Back to Reports</Button></Link>
            </Card>
          ) : (
            <>
              {/* Header */}
              <div className="animate-fade-up space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-foreground capitalize">
                    {session.type.replace('-', ' ')} Interview
                  </h1>
                  {session.score != null && (
                    <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', getScoreColors(session.score).badge)}>
                      {session.score.toFixed(1)} / 10
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {formatDate(session.createdAt)}
                  {session.durationSeconds ? ` · ${formatDuration(session.durationSeconds)}` : ''}
                  {session.transcript ? ` · ${session.transcript.length} transcript turns` : ''}
                </p>
              </div>

              {evaluation ? (
                <div className="space-y-6">
                  {/* Score + Summary */}
                  <div className="grid md:grid-cols-[auto_1fr] gap-5 animate-fade-up delay-75">
                    <Card className="bg-card/60 border-border/40 p-6 flex flex-col items-center justify-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Overall Score</p>
                      <ScoreRing score={evaluation.overallScore ?? session.score ?? 0} />
                      <div className={cn('px-3 py-1 rounded-full text-xs font-semibold', getScoreColors(evaluation.overallScore ?? 0).badge)}>
                        {getScoreLabel(evaluation.overallScore ?? 0)}
                      </div>
                    </Card>

                    <Card className="bg-card/60 border-border/40 p-6 space-y-4">
                      <h2 className="font-semibold text-foreground flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        Summary
                      </h2>
                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {evaluation.summary}
                      </p>

                      {/* Category bars */}
                      {evaluation.categories && (
                        <div className="space-y-3 pt-2 border-t border-border/30">
                          <CategoryBar label="Technical Knowledge" score={evaluation.categories.technicalKnowledge?.score ?? 0} icon={Brain} />
                          <CategoryBar label="Communication" score={evaluation.categories.communication?.score ?? 0} icon={MessageCircle} />
                          <CategoryBar label="Problem Solving" score={evaluation.categories.problemSolving?.score ?? 0} icon={TrendingUp} />
                          <CategoryBar label="Culture Fit" score={evaluation.categories.cultureFit?.score ?? 0} icon={Users} />
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Category Details */}
                  {evaluation.categories && (
                    <Card className="bg-card/60 border-border/40 p-6 space-y-4 animate-fade-up delay-150">
                      <h2 className="font-semibold text-foreground">Category Breakdown</h2>
                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          { key: 'technicalKnowledge' as const, label: 'Technical Knowledge', icon: Brain },
                          { key: 'communication' as const,      label: 'Communication',       icon: MessageCircle },
                          { key: 'problemSolving' as const,     label: 'Problem Solving',     icon: TrendingUp },
                          { key: 'cultureFit' as const,         label: 'Culture Fit',         icon: Users },
                        ].map(({ key, label, icon: Icon }) => {
                          const cat = evaluation.categories[key]
                          if (!cat) return null
                          const colors = getScoreColors(cat.score)
                          return (
                            <div key={key} className={cn('rounded-xl p-4 border space-y-2', colors.border, 'bg-card/40')}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className={`h-4 w-4 ${colors.text}`} />
                                  <span className="font-medium text-sm text-foreground">{label}</span>
                                </div>
                                <span className={`text-lg font-bold tabular-nums ${colors.text}`}>{cat.score.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{cat.notes}</p>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Strengths & Improvements */}
                  <div className="grid md:grid-cols-2 gap-5 animate-fade-up delay-225">
                    {evaluation.strengths?.length > 0 && (
                      <Card className="bg-card/60 border-border/40 p-6 space-y-3">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          Strengths
                        </h2>
                        <ul className="space-y-2">
                          {evaluation.strengths.map((s, i) => (
                            <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {evaluation.improvements?.length > 0 && (
                      <Card className="bg-card/60 border-border/40 p-6 space-y-3">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          Areas to Improve
                        </h2>
                        <ul className="space-y-2">
                          {evaluation.improvements.map((s, i) => (
                            <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>

                  {/* Highlights + Recommended Resources */}
                  <div className="grid md:grid-cols-2 gap-5 animate-fade-up delay-300">
                    {evaluation.highlights?.length > 0 && (
                      <Card className="bg-card/60 border-border/40 p-6 space-y-3">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          Session Highlights
                        </h2>
                        <ul className="space-y-2">
                          {evaluation.highlights.map((s, i) => (
                            <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {evaluation.recommendedResources?.length > 0 && (
                      <Card className="bg-card/60 border-border/40 p-6 space-y-3">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-accent" />
                          Recommended Study Areas
                        </h2>
                        <ul className="space-y-2">
                          {evaluation.recommendedResources.map((s, i) => (
                            <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <Card className="bg-card/60 border-border/40 p-8 text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground text-sm">Evaluation is being processed…</p>
                </Card>
              )}

              {/* Transcript */}
              {session.transcript && session.transcript.length > 0 && (
                <Card className="bg-card/60 border-border/40 overflow-hidden animate-fade-up">
                  <button
                    onClick={() => setTranscriptExpanded((v) => !v)}
                    className="w-full flex items-center justify-between p-6 hover:bg-muted/5 transition-colors"
                  >
                    <h2 className="font-semibold text-foreground flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      Full Transcript
                      <span className="text-xs font-normal text-muted-foreground">
                        ({session.transcript.length} turns)
                      </span>
                    </h2>
                    {transcriptExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {transcriptExpanded && (
                    <div className="px-6 pb-6 space-y-3 max-h-[60vh] overflow-y-auto border-t border-border/30 pt-4">
                      {session.transcript.map((entry, i) => (
                        <div key={i} className={cn('flex', entry.role === 'user' && 'justify-end')}>
                          <div
                            className={cn(
                              'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                              entry.role === 'ai'
                                ? 'bg-primary/10 border border-primary/20 text-foreground'
                                : 'bg-secondary/15 border border-secondary/20 text-foreground'
                            )}
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-50 block mb-1">
                              {entry.role === 'ai' ? 'AI Interviewer' : 'You'}
                            </span>
                            {entry.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 pb-8 animate-fade-up">
                <Link href="/reports" className="flex-1">
                  <Button variant="outline" className="w-full">All Reports</Button>
                </Link>
                <Link href="/interview/new" className="flex-1">
                  <Button className="w-full">Start Another Interview</Button>
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
