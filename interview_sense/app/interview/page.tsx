"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AudioVisualizer } from "@/components/interview/audio-visualizer";
import { useGeminiLive } from "@/hooks/use-gemini-live";
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, AlertCircle } from "lucide-react";

/**
 * This is an alternative standalone interview page.
 * The main flow goes through /interview/session (via setup → session).
 * This page can serve as a quick-start demo or dev test page.
 */
export default function InterviewPage() {
  const config = { type: "Technical Interview", company: undefined, role: undefined };

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
  } = useGeminiLive(config);

  const handleStart = () => connect();
  const handleEnd   = () => disconnect();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h1 className="text-xl font-bold">Frontend Engineering Interview</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Agent Status:{" "}
          <span className="uppercase tracking-wider font-semibold text-primary">
            {agentState}
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 relative overflow-hidden">
        {/* Left: AI Visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card/20 rounded-2xl border border-border/40 relative">
          <div className="mb-12">
            <AudioVisualizer state={agentState} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-2 mb-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <p className="text-xl text-balance text-center text-muted-foreground max-w-md">
            {agentState === "disconnected"
              ? "Ready to begin your interview? The AI is waiting for you."
              : agentState === "listening"
              ? "Listening to you..."
              : agentState === "speaking"
              ? "The agent is speaking..."
              : "Connecting to agent..."}
          </p>

          {/* Transcript preview */}
          {transcript.length > 0 && (
            <div className="mt-6 w-full max-w-lg max-h-48 overflow-y-auto space-y-2">
              {transcript.slice(-5).map((t, i) => (
                <p key={i} className={`text-sm ${t.role === "ai" ? "text-primary" : "text-foreground"}`}>
                  <span className="font-semibold">{t.role === "ai" ? "AI: " : "You: "}</span>
                  {t.text}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="w-full md:w-80 flex flex-col gap-6">
          <Card className="flex-1 bg-black overflow-hidden relative min-h-[200px] flex items-center justify-center border-border/40">
            {isScreenSharing ? (
              <div className="text-white opacity-50 text-sm flex flex-col items-center">
                <Monitor className="mb-2 h-8 w-8 text-primary" />
                Screen shared to AI
              </div>
            ) : (
              <div className="text-white opacity-30 text-sm flex flex-col items-center">
                <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
                Camera / Screen off
              </div>
            )}
          </Card>

          <Card className="p-4 grid grid-cols-4 gap-2 border-border/40 bg-card/60 backdrop-blur-md">
            {agentState === "disconnected" ? (
              <Button className="col-span-4 h-12 font-semibold" onClick={handleStart}>
                Start Interview
              </Button>
            ) : (
              <>
                <Button
                  variant={isMicMuted ? "destructive" : "secondary"}
                  className="h-12"
                  onClick={toggleMic}
                >
                  {isMicMuted ? <MicOff /> : <Mic />}
                </Button>

                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  className="h-12"
                  onClick={toggleScreenShare}
                >
                  {isScreenSharing ? <MonitorOff /> : <Monitor />}
                </Button>

                <Button variant="destructive" className="h-12 col-span-2" onClick={handleEnd}>
                  <PhoneOff className="mr-2" /> End
                </Button>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
