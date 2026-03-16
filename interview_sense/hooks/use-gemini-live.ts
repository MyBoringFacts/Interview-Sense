"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GEMINI_LIVE_MODEL } from "@/lib/gemini";

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
}

// ─── PCM Audio Player (queued, non-blocking) ──────────────────────────────────

/**
 * Plays raw 16-bit LE PCM audio at 24 kHz using a queued scheduling approach.
 * Audio chunks are scheduled back-to-back so playback is smooth and continuous.
 */
class PCMPlayer {
  private ctx: AudioContext;
  private gainNode: GainNode;
  private scheduledTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 24000 });
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
  }

  async resume() {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  get state() {
    return this.ctx.state;
  }

  play(b64: string) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buffer = this.ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);

    source.onended = () => {
      this.activeSources.delete(source);
    };
    this.activeSources.add(source);

    const now = this.ctx.currentTime;
    const startAt = Math.max(now, this.scheduledTime);
    source.start(startAt);
    this.scheduledTime = startAt + buffer.duration;
  }

  interrupt() {
    for (const source of this.activeSources) {
      try { source.stop(); } catch (_) {}
    }
    this.activeSources.clear();
    this.scheduledTime = 0;
  }

  destroy() {
    this.interrupt();
    try {
      this.ctx.close();
    } catch (_) {}
  }
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
  const screenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef = useRef(false);
  const handleMessageRef = useRef<((msg: any) => Promise<void>) | null>(null);
  // Monotonically increasing ID to invalidate stale async connect() calls
  const connectionIdRef = useRef(0);

  // ── Append to transcript (coalesce consecutive same-role entries) ──────────
  const appendTranscript = useCallback((role: "ai" | "user", text: string) => {
    if (!text.trim()) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { role, text: last.text + text }];
      }
      return [...prev, { role, text }];
    });
  }, []);

  // ── Start mic capture (native rate, sends PCM16 base64 chunks) ─────────────
  const startMic = useCallback(async () => {
    if (!wsRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const micCtx = new AudioContext();
      micCtxRef.current = micCtx;
      if (micCtx.state === "suspended") {
        await micCtx.resume();
      }

      const nativeSR = micCtx.sampleRate;

      console.debug("[GeminiLive] Mic AudioContext state:", micCtx.state, "nativeSampleRate:", nativeSR);

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/c1bede61-ee4c-44ae-8160-6e68f61ed59e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c97d4'},body:JSON.stringify({sessionId:'5c97d4',location:'use-gemini-live.ts:startMic',message:'Mic v5 native-rate',data:{state:micCtx.state,nativeSampleRate:nativeSR,mimeType:`audio/pcm;rate=${nativeSR}`,streamActive:stream.active,trackSettings:stream.getAudioTracks()[0]?.getSettings()},timestamp:Date.now(),runId:'post-fix-v5',hypothesisId:'H-I'})}).catch(()=>{});
      // #endregion

      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let audioChunkCount = 0;
      processor.onaudioprocess = (e) => {
        if (mutedRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);

        // #region agent log
        audioChunkCount++;
        if (audioChunkCount <= 5 || audioChunkCount % 50 === 0) {
          let rms = 0; let maxVal = 0;
          for (let i = 0; i < float32.length; i++) { rms += float32[i]*float32[i]; if (Math.abs(float32[i]) > maxVal) maxVal = Math.abs(float32[i]); }
          rms = Math.sqrt(rms / float32.length);
          fetch('http://127.0.0.1:7540/ingest/c1bede61-ee4c-44ae-8160-6e68f61ed59e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c97d4'},body:JSON.stringify({sessionId:'5c97d4',location:'use-gemini-live.ts:onaudioprocess',message:'Audio chunk stats (v3)',data:{chunkNum:audioChunkCount,bufferLength:float32.length,rms:rms.toFixed(6),maxVal:maxVal.toFixed(6),nativeSR,wsReadyState:wsRef.current?.readyState},timestamp:Date.now(),runId:'post-fix-v3',hypothesisId:'H-F'})}).catch(()=>{});
        }
        // #endregion

        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        }
        const bytes = new Uint8Array(int16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        const mimeType = `audio/pcm;rate=${nativeSR}`;
        try {
          wsRef.current?.send(
            JSON.stringify({
              realtimeInput: {
                audio: {
                  mimeType,
                  data: b64,
                },
              },
            })
          );
        } catch (sendErr) {
          // #region agent log
          fetch('http://127.0.0.1:7540/ingest/c1bede61-ee4c-44ae-8160-6e68f61ed59e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c97d4'},body:JSON.stringify({sessionId:'5c97d4',location:'use-gemini-live.ts:ws-send-error',message:'WebSocket send failed',data:{error:String(sendErr),wsReadyState:wsRef.current?.readyState},timestamp:Date.now(),runId:'post-fix-v3',hypothesisId:'H-C'})}).catch(()=>{});
          // #endregion
        }
      };

      source.connect(processor);
      processor.connect(micCtx.destination);
      setAgentState("listening");
      console.debug("[GeminiLive] Microphone started (16 kHz PCM)");
    } catch (err: any) {
      console.error("[useGeminiLive] Mic error:", err);
      setError("Microphone access denied or unavailable.");
    }
  }, []);

  // ── Stop mic capture ──────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    try {
      micCtxRef.current?.close();
    } catch (_) {}
    micCtxRef.current = null;
  }, []);

  // ── Start screen sharing ──────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    if (!wsRef.current) return;
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

      let screenFrameCount = 0;
      screenIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN || !video.videoWidth) return;
        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.round(
          (canvas.width / video.videoWidth) * video.videoHeight
        );
        ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const b64 = dataUrl.split(",")[1];
        screenFrameCount++;
        // #region agent log
        if (screenFrameCount <= 3 || screenFrameCount % 30 === 0) {
          fetch('http://127.0.0.1:7540/ingest/c1bede61-ee4c-44ae-8160-6e68f61ed59e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c97d4'},body:JSON.stringify({sessionId:'5c97d4',location:'use-gemini-live.ts:screenShare',message:'Screen frame sent',data:{frameNum:screenFrameCount,width:canvas.width,height:canvas.height,b64Length:b64?.length,wsReadyState:wsRef.current?.readyState},timestamp:Date.now(),hypothesisId:'H-E'})}).catch(()=>{});
        }
        // #endregion
        try {
          wsRef.current?.send(
            JSON.stringify({
              realtimeInput: {
                video: {
                  mimeType: "image/jpeg",
                  data: b64,
                },
              },
            })
          );
        } catch (_) {}
      }, 1000);

      stream.getVideoTracks()[0].addEventListener("ended", () => stopScreenShare());
    } catch (err: any) {
      console.error("[useGeminiLive] Screen share error:", err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop screen sharing ───────────────────────────────────────────────────
  const stopScreenShare = useCallback(() => {
    if (screenIntervalRef.current) {
      clearInterval(screenIntervalRef.current);
      screenIntervalRef.current = null;
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
  }, []);

  // ── Handle incoming WebSocket messages ────────────────────────────────────
  const handleMessage = useCallback(
    async (message: any) => {
      if (message.setupComplete) {
        console.debug("[GeminiLive] Setup complete — starting mic");
        setAgentState("connected");
        await startMic();
        return;
      }

      // Transcription messages are top-level fields, not inside serverContent
      if (message.outputTranscription?.text) {
        appendTranscript("ai", message.outputTranscription.text);
      }

      if (message.inputTranscription?.text) {
        appendTranscript("user", message.inputTranscription.text);
      }

      const sc = message.serverContent;
      if (!sc) return;

      if (sc.interrupted) {
        console.debug("[GeminiLive] Interrupted — stopping audio playback");
        playerRef.current?.interrupt();
        setAgentState("listening");
        return;
      }

      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data && playerRef.current) {
            setAgentState("speaking");
            playerRef.current.play(part.inlineData.data);
          }
        }
      }

      // Also check transcription inside serverContent (some API versions)
      if (sc.outputTranscription?.text) {
        appendTranscript("ai", sc.outputTranscription.text);
      }

      if (sc.inputTranscription?.text) {
        appendTranscript("user", sc.inputTranscription.text);
      }

      if (sc.turnComplete) {
        setAgentState("listening");
      }
    },
    [appendTranscript, startMic]
  );

  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  // ── Ensure AudioContexts are running on any user interaction ──────────────
  // Safety net: browsers may block AudioContext until a gesture even after
  // the initial connect() click (e.g. tab backgrounded then foregrounded).
  useEffect(() => {
    const resumeAll = async () => {
      try {
        if (micCtxRef.current?.state === "suspended") {
          await micCtxRef.current.resume();
          console.debug("[GeminiLive] Mic AudioContext resumed via user gesture");
        }
      } catch (_) {}
      try {
        if (playerRef.current?.state === "suspended") {
          await playerRef.current.resume();
          console.debug("[GeminiLive] Player AudioContext resumed via user gesture");
        }
      } catch (_) {}
    };
    document.addEventListener("click", resumeAll);
    document.addEventListener("keydown", resumeAll);
    return () => {
      document.removeEventListener("click", resumeAll);
      document.removeEventListener("keydown", resumeAll);
    };
  }, []);

  // ── Connect to Live API via ephemeral token ───────────────────────────────
  // IMPORTANT: Call this from a user-gesture handler (button click) so that
  // AudioContext creation is allowed by the browser's autoplay policy.
  const connect = useCallback(async () => {
    const connId = ++connectionIdRef.current;
    setAgentState("connecting");
    setError(null);
    setTranscript([]);

    try {
      console.log("[useGeminiLive] Fetching ephemeral token…");
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Abort if a newer connect() was called while we were fetching
      if (connId !== connectionIdRef.current) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to get ephemeral token");
      }
      const { token } = await res.json();
      console.log("[useGeminiLive] Token received. Connecting WebSocket…");

      // Create PCM player for audio playback (24 kHz)
      if (playerRef.current) playerRef.current.destroy();
      const player = new PCMPlayer();
      await player.resume();
      playerRef.current = player;
      console.debug("[GeminiLive] Player AudioContext state:", player.state);

      const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (connId !== connectionIdRef.current) {
          ws.close();
          return;
        }
        console.debug("[GeminiLive] WebSocket opened — sending setup");
        // #region agent log
        fetch('http://127.0.0.1:7540/ingest/c1bede61-ee4c-44ae-8160-6e68f61ed59e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c97d4'},body:JSON.stringify({sessionId:'5c97d4',location:'use-gemini-live.ts:ws.onopen',message:'WebSocket opened',data:{readyState:ws.readyState,url:ws.url?.substring(0,80)},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
        // #endregion

        const systemInstruction = buildSystemInstruction(sessionConfig);
        const setupMessage = {
          setup: {
            model: `models/${GEMINI_LIVE_MODEL}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Puck",
                  },
                },
                languageCodes: ["en-US"],
              },
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                silenceDurationMs: 2000,
                prefixPaddingMs: 200,
              },
            },
            outputAudioTranscription: {},
          },
        };
        ws.send(JSON.stringify(setupMessage));
        console.debug("[GeminiLive] Setup sent");
        // #region agent log
        fetch('http://127.0.0.1:7540/ingest/c1bede61-ee4c-44ae-8160-6e68f61ed59e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c97d4'},body:JSON.stringify({sessionId:'5c97d4',location:'use-gemini-live.ts:ws.onopen:setup',message:'Setup config sent (v5-no-input-txn)',data:{model:setupMessage.setup.model,realtimeInputConfig:setupMessage.setup.realtimeInputConfig,speechConfig:setupMessage.setup.generationConfig.speechConfig,hasInputTranscription:!!setupMessage.setup.inputAudioTranscription,hasOutputTranscription:!!setupMessage.setup.outputAudioTranscription},timestamp:Date.now(),runId:'post-fix-v5',hypothesisId:'H-I'})}).catch(()=>{});
        // #endregion
      };

      let msgCount = 0;
      ws.onmessage = async (event) => {
        try {
          let data = event.data;
          if (data instanceof Blob) {
            data = await data.text();
          }
          const message = JSON.parse(data);
          msgCount++;
          // #region agent log
          if (message.setupComplete || message.inputTranscription || message.outputTranscription || message.serverContent?.inputTranscription || message.serverContent?.outputTranscription || msgCount <= 3) {
            fetch('http://127.0.0.1:7540/ingest/c1bede61-ee4c-44ae-8160-6e68f61ed59e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c97d4'},body:JSON.stringify({sessionId:'5c97d4',location:'use-gemini-live.ts:ws.onmessage',message:'WS message received',data:{msgNum:msgCount,setupComplete:!!message.setupComplete,hasServerContent:!!message.serverContent,inputTranscription:message.inputTranscription?.text||message.serverContent?.inputTranscription?.text||null,outputTranscription:message.outputTranscription?.text||message.serverContent?.outputTranscription?.text||null,interrupted:message.serverContent?.interrupted,turnComplete:message.serverContent?.turnComplete,keys:Object.keys(message)},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
          }
          // #endregion
          await handleMessageRef.current?.(message);
        } catch (err) {
          console.error("[GeminiLive] Error parsing message:", err);
        }
      };

      ws.onerror = () => {
        if (connId !== connectionIdRef.current) return;
        setError("Connection error — check console for details.");
        setAgentState("disconnected");
      };

      ws.onclose = (e: CloseEvent) => {
        console.debug("[GeminiLive] WebSocket closed:", e.code, e.reason);
        if (connId !== connectionIdRef.current) return;
        setAgentState("disconnected");
      };

      wsRef.current = ws;
    } catch (err: any) {
      if (connId !== connectionIdRef.current) return;
      console.error("[useGeminiLive] connect failed:", err);
      setError(err?.message ?? "Failed to connect");
      setAgentState("disconnected");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionConfig]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    connectionIdRef.current++;
    stopMic();
    stopScreenShare();
    try {
      wsRef.current?.close();
    } catch (_) {}
    wsRef.current = null;
    playerRef.current?.destroy();
    playerRef.current = null;
    setAgentState("disconnected");
  }, [stopMic, stopScreenShare]);

  // ── Toggle mic mute ───────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    setIsMicMuted((prev) => {
      mutedRef.current = !prev;
      return !prev;
    });
  }, []);

  // ── Toggle screen sharing ─────────────────────────────────────────────────
  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // ── Send a text message ───────────────────────────────────────────────────
  const sendText = useCallback(
    (text: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN || !text.trim()) return;
      appendTranscript("user", text);
      wsRef.current.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [{ text }],
              },
            ],
            turnComplete: true,
          },
        })
      );
    },
    [appendTranscript]
  );

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      connectionIdRef.current++;
      stopMic();
      stopScreenShare();
      try {
        wsRef.current?.close();
      } catch (_) {}
      wsRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemInstruction(config: {
  type: string;
  resume?: string;
  jobDescription?: string;
}): string {
  let context = `You are an expert technical interviewer conducting a ${config.type} interview. This entire interview is conducted in ENGLISH only.\n\n`;

  if (config.resume) {
    context += `Here is the candidate's resume/background:\n"""\n${config.resume}\n"""\n\n`;
  }
  
  if (config.jobDescription) {
    context += `Here is the job description they are interviewing for:\n"""\n${config.jobDescription}\n"""\n\n`;
  }

  return `${context}Your responsibilities:
1. Start by warmly greeting the candidate. If you have their resume, you can briefly mention a highlight to break the ice. Ask them to introduce themselves.
2. Ask focused, realistic interview questions relevant to the selected interview type. If a job description was provided, tailor the questions to the specific requirements of the role. If a resume was provided, tie the questions to their past experience where relevant.
3. Actively listen — when the candidate explains something (verbally or on their shared screen), ask insightful follow-up questions. If the candidate shares their screen, comment on what you see and ask relevant follow-ups about their code, design, or work.
4. Keep a professional but friendly tone. Allow natural pauses and interruptions.
5. After each candidate response, briefly acknowledge it and move to the next question or a follow-up.
6. When the candidate asks to end, thank them and close the session warmly.

Important rules:
- LANGUAGE: You MUST speak, respond, and conduct the entire interview EXCLUSIVELY in English (en-US). Even if the candidate speaks in another language, respond only in English and politely ask them to continue in English.
- Speak naturally and conversationally — you will be heard as voice audio.
- Keep individual responses concise (1-3 sentences) unless the question warrants more.
- Do NOT roleplay as the candidate. Only play the interviewer role.
- Do NOT mention that you are an AI unless directly asked.
- If you cannot understand what the candidate said, politely ask them to repeat or clarify.
`;
}
