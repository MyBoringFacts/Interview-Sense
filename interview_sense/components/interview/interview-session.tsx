'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PhoneOff,
  Mic,
  MicOff,
  MessageCircle,
  Monitor,
  MonitorOff,
  Send,
  Zap,
  CheckCircle2,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AudioVisualizer } from './audio-visualizer'
import { useGeminiLive } from '@/hooks/use-gemini-live'

interface InterviewSessionProps {
  config: {
    type: string
    company?: string
    role?: string
  }
}

const STATE_LABELS: Record<string, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  listening: 'Listening',
  speaking: 'AI Speaking',
}

export function InterviewSession({ config }: InterviewSessionProps) {
  const [sessionEnded, setSessionEnded] = useState(false)
  const [inputValue, setInputValue]     = useState('')
  const [sessionTime, setSessionTime]   = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    sendText,
  } = useGeminiLive(config)

  // ── Auto-connect when component mounts ──────────────────────────────────
  useEffect(() => {
    connect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Session timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (agentState === 'disconnected') return
    const timer = setInterval(() => setSessionTime((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [agentState])

  // ── Auto-scroll transcript ───────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim()) return
    sendText(inputValue.trim())
    setInputValue('')
  }, [inputValue, sendText])

  const handleEndInterview = useCallback(() => {
    disconnect()
    setSessionEnded(true)
  }, [disconnect])

  // ── Session ended screen ─────────────────────────────────────────────────
  if (sessionEnded) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="bg-card/70 border-border/40 p-10 max-w-md w-full text-center space-y-5 animate-scale-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 border border-green-500/30">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Interview Complete</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your session is being analyzed. You&apos;ll receive your detailed report shortly.
          </p>
          <Button className="w-full" size="lg">View Report</Button>
        </Card>
      </div>
    )
  }

  const isConnected = agentState !== 'disconnected' && agentState !== 'connecting'

  return (
    <div className="grid grid-cols-3 gap-5 h-screen p-5 overflow-hidden animate-fade-in">

      {/* ── Left: AI Avatar + Controls ─────────────────────────────────── */}
      <div className="col-span-2 bg-black/80 rounded-xl overflow-hidden flex flex-col border border-border/20">
        <div className="flex-1 bg-gradient-to-br from-primary/15 to-accent/8 flex items-center justify-center relative">

          {/* AI Avatar / Visualizer */}
          <div className="space-y-5 text-center flex flex-col items-center">
            {agentState === 'connecting' ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Connecting to AI Interviewer…</p>
              </div>
            ) : (
              <>
                <AudioVisualizer state={agentState} />
                <p className="text-foreground font-medium text-sm">AI Interviewer</p>
                {config.company && (
                  <p className="text-xs text-muted-foreground">{config.company} — {config.type}</p>
                )}
              </>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="absolute top-4 left-4 right-4 flex items-center gap-2 bg-red-950/80 border border-red-500/40 rounded-lg px-4 py-2.5 backdrop-blur-sm text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Status + Timer */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {/* Connection indicator */}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border backdrop-blur-sm',
              isConnected
                ? 'bg-green-950/60 border-green-500/30 text-green-400'
                : 'bg-black/60 border-white/10 text-muted-foreground'
            )}>
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {STATE_LABELS[agentState]}
            </div>
            {/* Timer */}
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
              <p className="font-mono text-sm text-foreground tabular-nums">{formatTime(sessionTime)}</p>
            </div>
          </div>

          {/* Screen share indicator */}
          {isScreenSharing && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-blue-950/70 border border-blue-500/30 rounded-lg px-2.5 py-1 text-xs text-blue-300 backdrop-blur-sm">
              <Monitor className="h-3 w-3" />
              Screen shared
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-5 left-0 right-0 flex gap-3 justify-center">
            {/* Mic */}
            <Button
              size="lg"
              variant="outline"
              onClick={toggleMic}
              disabled={!isConnected}
              title={isMicMuted ? 'Unmute mic' : 'Mute mic'}
              className={cn(
                'bg-black/50 border-white/20 hover:bg-black/70',
                isMicMuted && 'bg-red-500/20 border-red-500/50 text-red-400'
              )}
            >
              {isMicMuted ? <MicOff /> : <Mic />}
            </Button>

            {/* Screen share */}
            <Button
              size="lg"
              variant="outline"
              onClick={toggleScreenShare}
              disabled={!isConnected}
              title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
              className={cn(
                'bg-black/50 border-white/20 hover:bg-black/70',
                isScreenSharing && 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              )}
            >
              {isScreenSharing ? <MonitorOff /> : <Monitor />}
            </Button>

            {/* End interview */}
            <Button
              size="lg"
              onClick={handleEndInterview}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-900/50"
            >
              <PhoneOff />
              End Interview
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right: Transcript / Chat ────────────────────────────────────── */}
      <div className="bg-card/40 border border-border/40 rounded-xl flex flex-col overflow-hidden">
        <div className="border-b border-border/40 px-4 py-3.5">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <MessageCircle className="h-4 w-4 text-primary" />
            Live Transcript
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{config.type}{config.company ? ` · ${config.company}` : ''}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {transcript.length === 0 && agentState !== 'disconnected' && (
            <p className="text-xs text-muted-foreground text-center pt-6 leading-relaxed">
              {agentState === 'connecting'
                ? 'Connecting to the AI interviewer…'
                : 'The AI interviewer will speak shortly. Transcript will appear here.'}
            </p>
          )}

          {transcript.map((entry, i) => (
            <div
              key={i}
              className={cn('flex animate-fade-up', entry.role === 'user' && 'justify-end')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                  entry.role === 'ai'
                    ? 'bg-primary/15 text-foreground border border-primary/20'
                    : 'bg-secondary/20 text-foreground border border-secondary/20'
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-50 block mb-1">
                  {entry.role === 'ai' ? 'AI Interviewer' : 'You'}
                </span>
                {entry.text}
              </div>
            </div>
          ))}

          {agentState === 'speaking' && (
            <div className="flex gap-1.5 px-1 animate-fade-in">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Text input (as a fallback / supplement to voice) */}
        <div className="border-t border-border/40 p-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message…"
              value={inputValue}
              disabled={!isConnected}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="flex-1 px-3 py-2 bg-input/60 border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-40"
            />
            <Button
              size="icon-sm"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !isConnected}
            >
              <Send />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground px-1">
            {isConnected ? 'Speak naturally or type your response.' : 'Waiting for connection…'}
          </p>
        </div>
      </div>
    </div>
  )
}
