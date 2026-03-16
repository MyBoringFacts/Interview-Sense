"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GEMINI_LIVE_MODEL } from "@/lib/gemini";
import type { QuestionPlan } from "@/lib/questionDiscovery";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking";

export interface TranscriptEntry {
  role: "ai" | "user";
  text: string;
}

interface SessionConfig {
  type: string;
  resume?: string;
  jobDescription?: string;
  company?: string;
  role?: string;
  difficulty?: "easy" | "medium" | "hard";
  customTopics?: string;
  questionPlan?: QuestionPlan;
}

// ─── PCM Audio Player ─────────────────────────────────────────────────────────
// Plays raw 16-bit LE PCM at 24 kHz by scheduling consecutive AudioBufferSource
// nodes so playback is smooth and gapless.

class PCMPlayer {
  private ctx: AudioContext;
  private gain: GainNode;
  private nextStart = 0;
  private active = new Set<AudioBufferSourceNode>();

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 24_000 });
    this.gain = this.ctx.createGain();
    this.gain.connect(this.ctx.destination);
  }

  async ensureResumed() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  enqueue(b64: string) {
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    const pcm = new Int16Array(bytes.buffer);
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float[i] = pcm[i] / 32768;

    const buf = this.ctx.createBuffer(1, float.length, 24_000);
    buf.copyToChannel(float, 0);

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.onended = () => this.active.delete(src);
    this.active.add(src);

    const now = this.ctx.currentTime;
    const at = Math.max(now, this.nextStart);
    src.start(at);
    this.nextStart = at + buf.duration;
  }

  flush() {
    for (const s of this.active) {
      try {
        s.stop();
      } catch {}
    }
    this.active.clear();
    this.nextStart = this.ctx.currentTime;
  }

  destroy() {
    this.flush();
    this.ctx.close().catch(() => {});
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let bin = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function buildSystemInstruction(config: SessionConfig): string {
  // ── Shared candidate context ──────────────────────────────────────────────
  let ctx = "";

  if (config.resume) {
    ctx += `Candidate resume/background:\n"""\n${config.resume}\n"""\n\n`;
  }
  if (config.jobDescription) {
    ctx += `Target job description:\n"""\n${config.jobDescription}\n"""\n\n`;
  }
  if (config.company) {
    ctx += `Target company: ${config.company}\n\n`;
  }
  if (config.role) {
    ctx += `Target role: ${config.role}\n\n`;
  }
  if (config.difficulty) {
    ctx += `Interview difficulty: ${config.difficulty}\n\n`;
  }

  // ── Track-specific persona & instructions ─────────────────────────────────
  let trackInstructions = "";

  switch (config.type) {
    case "technical":
      trackInstructions = `You are an expert software engineer conducting a Technical Round interview. This entire interview is conducted in ENGLISH only.

${ctx}
Your responsibilities:
1. Greet the candidate warmly and ask them to briefly introduce themselves.
2. Present the LeetCode-style coding problem from the question plan. Ask the candidate to walk you through their approach before coding.
3. While the candidate codes (on their shared screen), ask clarifying follow-up questions: time/space complexity, edge cases, alternative approaches.
4. If the candidate seems stuck, give subtle Socratic hints rather than the answer.
5. After each problem, briefly debrief and move on.
6. End the session warmly when the candidate asks to finish.

Important rules:
- LANGUAGE: English only (en-US) at all times.
- Speak naturally — you will be heard as voice audio.
- Keep responses concise (1-3 sentences) unless explaining a concept.
- Do NOT solve the problem for the candidate.
- Do NOT mention that you are an AI unless directly asked.`;
      break;

    case "system-design":
      trackInstructions = `You are a senior staff engineer conducting a System Design interview. This entire interview is conducted in ENGLISH only.

${ctx}
Your responsibilities:
1. Greet the candidate and ask them to introduce themselves briefly.
2. Present the system design problem. Start broad: "How would you design X?"
3. Guide the candidate through the standard framework: requirements clarification → capacity estimation → high-level architecture → deep-dives (DB schema, API design, scaling bottlenecks, failure modes).
4. The candidate is sharing their screen with a whiteboard. Actively reference what you see: "I can see you've drawn a load balancer here — how does traffic get distributed?"
5. Ask probing follow-ups on trade-offs: SQL vs NoSQL, synchronous vs async, consistency vs availability.
6. Keep track of time; ensure all major areas are covered within the session.
7. End warmly when the candidate wraps up.

Important rules:
- LANGUAGE: English only (en-US) at all times.
- Speak naturally — you will be heard as voice audio.
- Do NOT design the system for the candidate; guide with questions.
- Reference what you observe on their shared screen frequently.
- Do NOT mention that you are an AI unless directly asked.`;
      break;

    case "behavioral":
      trackInstructions = `You are an experienced hiring manager conducting a Behavioral Interview. This entire interview is conducted in ENGLISH only.

${ctx}
Your responsibilities:
1. Greet the candidate warmly and ask them to introduce themselves.
2. Ask behavioral questions focused on: conflict resolution, cross-functional collaboration, ownership, growth mindset, problem-solving under pressure, and leadership.
3. After each answer, probe deeper using the STAR method: "Can you tell me more about the specific action you took?" or "What was the measurable result?"
4. Listen for concrete examples. If the candidate speaks only in generalities, redirect: "Can you give me a specific situation where that happened?"
5. Cover diverse competencies — do not ask two consecutive questions on the same theme.
6. End warmly when the candidate asks to finish.

Important rules:
- LANGUAGE: English only (en-US) at all times.
- Speak naturally — you will be heard as voice audio.
- Keep responses concise (1-2 sentences) to leave space for the candidate.
- Do NOT lead the candidate toward a "correct" answer.
- Do NOT mention that you are an AI unless directly asked.`;
      break;

    case "custom":
      trackInstructions = `You are an expert interviewer conducting a Custom Interview session. This entire interview is conducted in ENGLISH only.

${ctx}${config.customTopics ? `Topics the candidate wants to practice:\n"""\n${config.customTopics}\n"""\n\n` : ""}
Your responsibilities:
1. Greet the candidate warmly and ask them to introduce themselves.
2. Cover the requested topics through a mix of coding challenges, system design questions, and behavioral questions as appropriate.
3. If the candidate is coding and sharing their screen, reference what you see and ask follow-up questions.
4. Adapt the session pace and depth to the candidate's responses.
5. End warmly when the candidate asks to finish.

Important rules:
- LANGUAGE: English only (en-US) at all times.
- Speak naturally — you will be heard as voice audio.
- Keep responses concise (1-3 sentences) unless a deeper explanation is needed.
- Do NOT mention that you are an AI unless directly asked.`;
      break;

    default:
      trackInstructions = `You are an expert interviewer conducting a ${config.type} interview. This entire interview is conducted in ENGLISH only.

${ctx}
Your responsibilities:
1. Greet the candidate warmly and ask them to introduce themselves.
2. Ask focused, realistic questions relevant to the interview type. Tailor to the job description and resume when provided.
3. Actively listen and ask insightful follow-up questions.
4. Keep a professional but friendly tone.
5. End warmly when the candidate asks to finish.

Important rules:
- LANGUAGE: English only (en-US) at all times.
- Speak naturally — you will be heard as voice audio.
- Keep responses concise (1-3 sentences) unless warranted.
- Do NOT mention that you are an AI unless directly asked.`;
  }

  return trackInstructions;
}

function buildQuestionPlanInstruction(questionPlan?: QuestionPlan): string | null {
  if (!questionPlan) return null;

  return `You are a technical interviewer. Here is the interview plan for this session:
${JSON.stringify(questionPlan, null, 2)}

Ask the questions in order. Use interviewer_notes to guide your follow-up questions.
If screen_share_prompt is non-null, the user is sharing their screen — reference what you see to ask contextual follow-up questions.`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeminiLive(sessionConfig: SessionConfig) {
  const [agentState, setAgentState] = useState<AgentState>("disconnected");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<PCMPlayer | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef = useRef(false);
  const epochRef = useRef(0);

  // ── Transcript (coalesce consecutive same-role entries) ─────────────────────

  const appendTranscript = useCallback((role: "ai" | "user", text: string) => {
    if (!text) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === role) {
        return [...prev.slice(0, -1), { role, text: last.text + text }];
      }
      return [...prev, { role, text }];
    });
  }, []);

  // ── Mic management ──────────────────────────────────────────────────────────

  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
  }, []);

  const startMic = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    micStreamRef.current = stream;

    const ctx = new AudioContext();
    micCtxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const sampleRate = ctx.sampleRate;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (mutedRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;

      const f32 = e.inputBuffer.getChannelData(0);
      const i16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) {
        i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768));
      }

      try {
        wsRef.current!.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                mimeType: `audio/pcm;rate=${sampleRate}`,
                data: toBase64(new Uint8Array(i16.buffer)),
              },
            },
          })
        );
      } catch {}
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  }, []);

  // ── Screen share management ─────────────────────────────────────────────────

  const stopScreenShare = useCallback(() => {
    if (screenTimerRef.current) {
      clearInterval(screenTimerRef.current);
      screenTimerRef.current = null;
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      const canvas = document.createElement("canvas");
      const ctx2d = canvas.getContext("2d")!;

      screenTimerRef.current = setInterval(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN || !video.videoWidth) return;

        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.round(
          (canvas.width / video.videoWidth) * video.videoHeight
        );
        ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);

        const b64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
        try {
          wsRef.current!.send(
            JSON.stringify({
              realtimeInput: {
                video: { mimeType: "image/jpeg", data: b64 },
              },
            })
          );
        } catch {}
      }, 1000);

      stream.getVideoTracks()[0].addEventListener("ended", stopScreenShare);
    } catch (err: unknown) {
      console.error("[useGeminiLive] Screen share error:", err);
    }
  }, [stopScreenShare]);

  // ── Connect to Live API via ephemeral token ─────────────────────────────────
  // Must be called from a user-gesture handler so AudioContext creation is
  // allowed by the browser's autoplay policy.

  const connect = useCallback(async () => {
    const epoch = ++epochRef.current;
    setAgentState("connecting");
    setError(null);
    setTranscript([]);

    try {
      // 1. Fetch ephemeral token from our server
      const res = await fetch("/api/live-token", { method: "POST" });
      if (epoch !== epochRef.current) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to get ephemeral token");
      }
      const { token } = await res.json();

      // 2. Create audio player (24 kHz output)
      playerRef.current?.destroy();
      const player = new PCMPlayer();
      await player.ensureResumed();
      playerRef.current = player;

      // 3. Open WebSocket (constrained endpoint for ephemeral tokens)
      const wsUrl =
        "wss://generativelanguage.googleapis.com/ws/" +
        "google.ai.generativelanguage.v1alpha.GenerativeService." +
        `BidiGenerateContentConstrained?access_token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (epoch !== epochRef.current) {
          ws.close();
          return;
        }

        const questionPlanInstruction = buildQuestionPlanInstruction(sessionConfig.questionPlan);

        // 4. Send session setup as the first message
        ws.send(
          JSON.stringify({
            setup: {
              model: `models/${GEMINI_LIVE_MODEL}`,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Puck" },
                  },
                },
              },
              systemInstruction: {
              parts: [
                { text: buildSystemInstruction(sessionConfig) },
                ...(questionPlanInstruction ? [{ text: questionPlanInstruction }] : []),
              ],
              },
              realtimeInputConfig: {
                automaticActivityDetection: {
                  disabled: false,
                  startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                  endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
                  silenceDurationMs: 2000,
                  prefixPaddingMs: 200,
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          })
        );
      };

      // 5. Handle incoming messages
      ws.onmessage = async (event) => {
        try {
          const raw =
            event.data instanceof Blob
              ? await event.data.text()
              : event.data;
          const msg = JSON.parse(raw);

          // ── Setup acknowledgment ──
          if (msg.setupComplete) {
            setAgentState("connected");
            try {
              await startMic();
              setAgentState("listening");
            } catch {
              setError("Microphone access denied or unavailable.");
            }
            return;
          }

          // ── GoAway: server is about to disconnect ──
          if (msg.goAway) {
            setError("Server is closing the session soon. Please reconnect.");
            return;
          }

          // ── Transcriptions (defensive: check top-level in case of API changes) ──
          if (msg.outputTranscription?.text) {
            appendTranscript("ai", msg.outputTranscription.text);
          }
          if (msg.inputTranscription?.text) {
            appendTranscript("user", msg.inputTranscription.text);
          }

          // ── Server content ──
          const sc = msg.serverContent;
          if (!sc) return;

          if (sc.interrupted) {
            playerRef.current?.flush();
            setAgentState("listening");
            return;
          }

          // Audio from model
          if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData?.data) {
                setAgentState("speaking");
                playerRef.current?.enqueue(part.inlineData.data);
              }
            }
          }

          // Transcriptions inside serverContent
          if (sc.outputTranscription?.text) {
            appendTranscript("ai", sc.outputTranscription.text);
          }
          if (sc.inputTranscription?.text) {
            appendTranscript("user", sc.inputTranscription.text);
          }

          if (sc.turnComplete) {
            setAgentState("listening");
          }
        } catch (err) {
          console.error("[useGeminiLive] Message parse error:", err);
        }
      };

      ws.onerror = () => {
        if (epoch !== epochRef.current) return;
        setError("WebSocket connection error.");
        setAgentState("disconnected");
      };

      ws.onclose = (e: CloseEvent) => {
        if (epoch !== epochRef.current) return;
        stopMic();
        setAgentState("disconnected");
        if (e.code !== 1000 && e.code !== 1005) {
          const reason = e.reason ? ` — ${e.reason}` : "";
          setError(`Connection closed unexpectedly (code ${e.code})${reason}`);
        }
      };
    } catch (err: unknown) {
      if (epoch !== epochRef.current) return;
      const message =
        err instanceof Error ? err.message : "Failed to connect";
      setError(message);
      setAgentState("disconnected");
    }
  }, [sessionConfig, appendTranscript, startMic, stopMic]);

  // ── Disconnect ──────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    epochRef.current++;
    stopMic();
    stopScreenShare();
    wsRef.current?.close();
    wsRef.current = null;
    playerRef.current?.destroy();
    playerRef.current = null;
    setAgentState("disconnected");
  }, [stopMic, stopScreenShare]);

  // ── Toggle mic mute ─────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    setIsMicMuted((prev) => {
      mutedRef.current = !prev;
      return !prev;
    });
  }, []);

  // ── Toggle screen share ─────────────────────────────────────────────────────

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) stopScreenShare();
    else startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // ── Send a text message ─────────────────────────────────────────────────────

  const sendText = useCallback(
    (text: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN || !text.trim()) return;
      appendTranscript("user", text);
      wsRef.current.send(
        JSON.stringify({
          clientContent: {
            turns: [{ role: "user", parts: [{ text }] }],
            turnComplete: true,
          },
        })
      );
    },
    [appendTranscript]
  );

  // ── Resume suspended AudioContexts on user gesture ──────────────────────────

  useEffect(() => {
    const resume = async () => {
      try {
        await micCtxRef.current?.resume();
      } catch {}
      try {
        await playerRef.current?.ensureResumed();
      } catch {}
    };
    document.addEventListener("click", resume);
    document.addEventListener("keydown", resume);
    return () => {
      document.removeEventListener("click", resume);
      document.removeEventListener("keydown", resume);
    };
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      epochRef.current++;
      stopMic();
      stopScreenShare();
      wsRef.current?.close();
      wsRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [stopMic, stopScreenShare]);

  return {
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
  };
}
