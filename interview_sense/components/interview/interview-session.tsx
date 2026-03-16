'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PhoneOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  CheckCircle2,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Play,
  FileText,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AudioVisualizer } from './audio-visualizer'
import { useGeminiLive } from '@/hooks/use-gemini-live'
import { useAuth } from '@/context/AuthContext'
import type { QuestionPlan } from '@/lib/questionDiscovery'

interface InterviewSessionProps {
  config: {
    type: string
    resume?: string
    jobDescription?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    role?: string
    companyName?: string | null
    questionPlan?: QuestionPlan
  }
}

const STATE_LABELS: Record<string, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  listening: 'Listening',
  speaking: 'AI Speaking',
}

// Fire background notes every N user turns
const NOTES_INTERVAL = 4

export function InterviewSession({ config }: InterviewSessionProps) {
  const router = useRouter()
  const { firebaseUser } = useAuth()

  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [sessionTime, setSessionTime]   = useState(0)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluationDone, setEvaluationDone] = useState(false)
  const [evalError, setEvalError] = useState<string | null>(null)
  const [showFallbackNotice, setShowFallbackNotice] = useState(true)
  const [screenShareAcknowledged, setScreenShareAcknowledged] = useState(false)

  // Persist session ID and background notes across renders without triggering re-renders
  const sessionIdRef = useRef<string | null>(null)
  const backgroundNotesRef = useRef<any[]>([])
  const lastNotedTurnRef = useRef(0)
  const sessionTimeRef = useRef(0)

  const {
    agentState,
    transcript,
    isMicMuted,
    isScreenSharing,
    error,
    connect,
    disconnect,
    toggleMic,
    toggleScreenShare,
  } = useGeminiLive({
    type: config.type,
    resume: config.resume,
    jobDescription: config.jobDescription,
    company: config.companyName ?? undefined,
    role: config.role,
    difficulty: config.difficulty,
    questionPlan: config.questionPlan,
  })

  // Keep sessionTimeRef in sync so we can read it in the end-handler
  useEffect(() => {
    sessionTimeRef.current = sessionTime
  }, [sessionTime])

  // ── Create Firestore session on start (from user-gesture handler) ─────────
  const createFirestoreSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: firebaseUser?.uid ?? null,
          type: config.type,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        sessionIdRef.current = data.sessionId
        console.debug('[InterviewSession] Session created:', data.sessionId)
      }
    } catch (err) {
      console.error('[InterviewSession] Failed to create session:', err)
    }
  }, [firebaseUser, config.type])

  // connect() must be triggered by a user click so the browser allows
  // AudioContext activation (mic capture + AI audio playback).
  const handleStartSession = useCallback(() => {
    setSessionStarted(true)
    connect()
    createFirestoreSession()
  }, [connect, createFirestoreSession])

  // ── Session timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (agentState === 'disconnected') return
    const timer = setInterval(() => setSessionTime((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [agentState])

  // ── Background note-taking every NOTES_INTERVAL user turns ───────────────
  useEffect(() => {
    const userTurns = transcript.filter((t) => t.role === 'user').length
    if (userTurns === 0) return
    if (userTurns - lastNotedTurnRef.current < NOTES_INTERVAL) return
    if (transcript.length < 4) return // wait for a real conversation to develop

    lastNotedTurnRef.current = userTurns

    // Omit large resume/JD fields — the notes observer prompt doesn't use them
    const { resume: _r, jobDescription: _jd, ...notesConfig } = config

    // Fire-and-forget: no await, no blocking
    fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, sessionConfig: notesConfig }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.notes) {
          backgroundNotesRef.current = [...backgroundNotesRef.current, data.notes]
          console.debug('[InterviewSession] Background note captured:', data.notes.observations)
        }
      })
      .catch((err) => console.warn('[InterviewSession] Background notes failed:', err))
  }, [transcript, config])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // ── End interview: save session → evaluate → redirect ────────────────────
  const handleEndInterview = useCallback(async () => {
    disconnect()
    setSessionEnded(true)
    setIsEvaluating(true)

    const duration = sessionTimeRef.current
    const sessionId = sessionIdRef.current
    const notes = [...backgroundNotesRef.current]
    const finalTranscript = [...transcript]

    try {
      // 1. Persist transcript + duration to Firestore
      if (sessionId) {
        await fetch('/api/session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            transcript: finalTranscript,
            durationSeconds: duration,
          }),
        })
      }

      // 2. Run Gemini evaluation
      const evalRes = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: firebaseUser?.uid ?? null,
          transcript: finalTranscript,
          sessionConfig: config,
          backgroundNotes: notes,
        }),
      })

      if (!evalRes.ok) {
        const errBody = await evalRes.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'Evaluation failed')
      }

      setIsEvaluating(false)
      setEvaluationDone(true)

      // 3. Redirect to the report page after a short delay
      if (sessionId) {
        setTimeout(() => router.push(`/reports/${sessionId}`), 1500)
      }
    } catch (err: any) {
      console.error('[InterviewSession] End-of-session pipeline failed:', err)
      setIsEvaluating(false)
      setEvalError(err?.message ?? 'Something went wrong during evaluation.')
    }
  }, [disconnect, transcript, firebaseUser, config, router])

  // ── Pre-session: require a click so AudioContext is allowed ─────────────
  const hasScreenSharePrompt =
    !!config.questionPlan && !!config.questionPlan.screen_share_prompt

  if (!sessionStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="bg-card/70 border-border/40 p-10 max-w-lg w-full space-y-6 animate-scale-in">
          <div className="flex items-center gap-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Ready to Begin?</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Your{' '}
                <span className="capitalize font-medium text-foreground">
                  {config.type.replace('-', ' ')}
                </span>{' '}
                interview session is ready. You&apos;ll need to allow microphone access so the AI
                interviewer can hear you.
              </p>
            </div>
          </div>

          {hasScreenSharePrompt && !screenShareAcknowledged && (
            <div className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-4 text-left">
              <p className="text-sm font-medium text-primary">
                {config.questionPlan?.screen_share_prompt}
              </p>
              {config.questionPlan?.questions?.length ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    LeetCode problems for this session:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {config.questionPlan.questions.map((q) => (
                      <li key={q.order}>
                        {q.leetcode_url ? (
                          <a
                            href={q.leetcode_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {q.title}
                          </a>
                        ) : (
                          <span>{q.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => {
                if (hasScreenSharePrompt && !screenShareAcknowledged) {
                  setScreenShareAcknowledged(true)
                } else {
                  handleStartSession()
                }
              }}
            >
              <Play className="h-4 w-4" />
              {hasScreenSharePrompt && !screenShareAcknowledged
                ? "I've opened the problems — Continue"
                : 'Start Interview'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Session ended screen ─────────────────────────────────────────────────
  if (sessionEnded) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="bg-card/70 border-border/40 p-10 max-w-md w-full text-center space-y-6 animate-scale-in">
          {isEvaluating ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Analyzing Your Session</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Our AI is reviewing your transcript and background notes to generate your personalized feedback report.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                This takes about 10–15 seconds…
              </div>
            </>
          ) : evaluationDone ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 border border-green-500/30">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Report Ready!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your evaluation is complete. Redirecting you to your report…
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting…
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Evaluation Failed</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {evalError ?? 'Something went wrong. Your transcript was saved.'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
                  Dashboard
                </Button>
                {sessionIdRef.current && (
                  <Button className="flex-1 gap-2" onClick={() => router.push(`/reports/${sessionIdRef.current}`)}>
                    <FileText className="h-4 w-4" />
                    View Partial Report
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    )
  }

  const isConnected = agentState !== 'disconnected' && agentState !== 'connecting'

  const ambientBg =
    agentState === 'speaking'
      ? 'radial-gradient(ellipse 55% 45% at 50% 52%, rgba(109,40,217,0.14) 0%, transparent 70%)'
      : agentState === 'listening' || agentState === 'connected'
      ? 'radial-gradient(ellipse 55% 45% at 50% 52%, rgba(37,99,235,0.10) 0%, transparent 70%)'
      : 'radial-gradient(ellipse 55% 45% at 50% 52%, rgba(255,255,255,0.02) 0%, transparent 70%)'

  return (
    <div className="h-screen overflow-hidden bg-[#07070d] relative flex flex-col items-center justify-center animate-fade-in">

      {/* Dynamic ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ background: ambientBg }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
        {/* Screen share pill */}
        <div className="min-w-[80px]">
          {isScreenSharing && (
            <div className="flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm w-fit">
              <Monitor className="h-3 w-3" />
              Screen shared
            </div>
          )}
        </div>

        {/* Status + timer */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm">
            <span className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors duration-500',
              agentState === 'speaking' ? 'bg-violet-400 animate-pulse' :
              agentState === 'listening' || agentState === 'connected' ? 'bg-blue-400 animate-pulse' :
              isConnected ? 'bg-emerald-400' : 'bg-white/20'
            )} />
            {STATE_LABELS[agentState]}
          </div>
          <div className="bg-white/6 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
            <p className="font-mono text-xs text-white/60 tabular-nums">{formatTime(sessionTime)}</p>
          </div>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <div className="absolute top-16 left-5 right-5 flex items-center gap-2 bg-red-950/80 border border-red-500/30 rounded-2xl px-4 py-3 backdrop-blur-sm text-sm text-red-300 z-10">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Fallback notice ───────────────────────────────────────────── */}
      {config.questionPlan?.source === 'fallback_random' && showFallbackNotice && (
        <div className="absolute top-16 left-5 right-5 flex items-start justify-between gap-3 bg-amber-950/70 border border-amber-500/30 rounded-2xl px-4 py-3 backdrop-blur-sm text-xs text-amber-200 z-10">
          <p>
            We couldn&apos;t find specific questions for{' '}
            <span className="font-semibold">
              {config.questionPlan.company ?? config.companyName ?? 'this company'}
            </span>
            . Using a curated set instead.
          </p>
          <button
            type="button"
            onClick={() => setShowFallbackNotice(false)}
            className="text-amber-300 hover:text-amber-100 text-[10px] underline-offset-2 hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Centre: Visualizer ────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-6 relative z-10">
        {agentState === 'connecting' ? (
          <div className="flex flex-col items-center gap-5">
            <div className="w-22 h-22 flex items-center justify-center" style={{ width: 88, height: 88 }}>
              <Loader2 className="h-12 w-12 text-white/40 animate-spin" />
            </div>
            <p className="text-white/40 text-sm tracking-wide">Connecting to AI Interviewer…</p>
          </div>
        ) : (
          <>
            <AudioVisualizer state={agentState} />
            <div className="text-center space-y-1.5">
              <p className="text-white/90 font-medium tracking-wide">AI Interviewer</p>
              <p className="text-white/35 text-xs tracking-widest uppercase">
                {config.type.replace('-', ' ')} Interview
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Background notes pill ────────────────────────────────────── */}
      {backgroundNotesRef.current.length > 0 && (
        <div className="absolute bottom-28 flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white/40 backdrop-blur-sm">
          <Sparkles className="h-3 w-3" />
          {backgroundNotesRef.current.length} note{backgroundNotesRef.current.length !== 1 ? 's' : ''} captured
        </div>
      )}

      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="absolute bottom-8 flex items-center gap-3">
        {/* Mic */}
        <button
          onClick={toggleMic}
          disabled={!isConnected}
          title={isMicMuted ? 'Unmute mic' : 'Mute mic'}
          aria-label={isMicMuted ? 'Unmute mic' : 'Mute mic'}
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all duration-200 disabled:opacity-30',
            isMicMuted
              ? 'bg-red-500/15 border-red-400/30 text-red-300 hover:bg-red-500/25'
              : 'bg-white/8 border-white/12 text-white/70 hover:bg-white/14 hover:text-white'
          )}
        >
          {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Screen share */}
        <button
          onClick={toggleScreenShare}
          disabled={!isConnected}
          title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
          aria-label={isScreenSharing ? 'Stop screen share' : 'Share screen'}
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all duration-200 disabled:opacity-30',
            isScreenSharing
              ? 'bg-blue-500/15 border-blue-400/30 text-blue-300 hover:bg-blue-500/25'
              : 'bg-white/8 border-white/12 text-white/70 hover:bg-white/14 hover:text-white'
          )}
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </button>

        {/* End interview */}
        <button
          onClick={handleEndInterview}
          aria-label="End interview"
          className="h-12 px-5 rounded-full flex items-center gap-2 bg-red-500/90 hover:bg-red-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-red-900/30"
        >
          <PhoneOff className="h-4 w-4" />
          End Interview
        </button>
      </div>
    </div>
  )
}
