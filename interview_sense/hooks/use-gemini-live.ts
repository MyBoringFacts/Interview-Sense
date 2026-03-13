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
  company?: string;
  role?: string;
}

// ─── Audio playback helpers ───────────────────────────────────────────────────

/** Decode a base64 string into an ArrayBuffer. */
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

/**
 * Play raw 16-bit little-endian PCM audio at 24 kHz (Gemini's output format).
 * Returns a promise that resolves when playback finishes.
 */
async function playPcm24k(
  audioCtx: AudioContext,
  rawB64: string
): Promise<void> {
  const raw = base64ToArrayBuffer(rawB64);
  const int16 = new Int16Array(raw);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

  const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
  audioBuffer.copyToChannel(float32, 0);

  return new Promise((resolve) => {
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.onended = () => resolve();
    source.start();
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeminiLive(sessionConfig: SessionConfig) {
  const [agentState, setAgentState] = useState<AgentState>("disconnected");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  // Audio context for playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  // MediaStream for mic input
  const micStreamRef = useRef<MediaStream | null>(null);
  // ScriptProcessor node
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  // Screen capture stream
  const screenStreamRef = useRef<MediaStream | null>(null);
  // Frame capture interval
  const screenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mute flag ref (accessed inside audio callback)
  const mutedRef = useRef(false);

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

  const startMic = useCallback(async () => {
    if (!wsRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but universally supported and easy to use
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (mutedRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        // Convert Float32 → Int16 little-endian
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        }
        // Base64 encode
        const bytes = new Uint8Array(int16.buffer);
        let binary = "";
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        const b64 = btoa(binary);
        try {
          wsRef.current?.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: b64,
              }]
            }
          }));
        } catch (_) {
          // websocket may have closed; ignore
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination); // must connect to avoid silence in Chrome
      setAgentState("listening");
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
  }, []);

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

      // Send one frame per second (Live API max: 1 fps for video)
      screenIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN || !video.videoWidth) return;
        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.min(
          video.videoHeight,
          Math.round((canvas.width / video.videoWidth) * video.videoHeight)
        );
        ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const b64 = dataUrl.split(",")[1];
        try {
          wsRef.current?.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "image/jpeg",
                data: b64,
              }]
            }
          }));
        } catch (_) {}
      }, 1000);

      // Stop sharing if user closes the browser prompt
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

  // ── Connect to Live API via ephemeral token ───────────────────────────────
  const connect = useCallback(async () => {
    setAgentState("connecting");
    setError(null);
    setTranscript([]);

    try {
      // 1. Fetch ephemeral token from our secure server route
      console.log("[useGeminiLive] Fetching ephemeral token from /api/live-token...");
      const systemInstruction = buildSystemInstruction(sessionConfig);
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[useGeminiLive] Ephemeral token fetch failed:", body.error);
        throw new Error(body.error ?? "Failed to get ephemeral token");
      }
      const { token } = await res.json();
      console.log("[useGeminiLive] Ephemeral token received. Connecting to Gemini Live API...");

      // 2. Create AudioContext for playback (must be created on user gesture)
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }

      // 3. Connect using the ephemeral token via WebSocket
      const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
      const ws = new WebSocket(WS_URL);

      ws.onopen = async () => {
        console.debug("[GeminiLive] Connection opened");
        
        // Send initial configuration
        const setupMessage = {
          setup: {
            model: `models/${GEMINI_LIVE_MODEL}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          }
        };
        ws.send(JSON.stringify(setupMessage));
        
        setAgentState("connected");
        // 4. Start mic immediately after connecting
        await startMic();
      };

      ws.onmessage = async (event) => {
        try {
          let data = event.data;
          if (data instanceof Blob) {
            data = await data.text();
          }
          const message = JSON.parse(data);
          await handleMessage(message);
        } catch (err) {
          console.error("[GeminiLive] Error parsing message:", err);
        }
      };

      ws.onerror = (e: any) => {
        console.error("[GeminiLive] WebSocket Error:", e);
        setError(`Connection Error: See console for details`);
        setAgentState("disconnected");
      };

      ws.onclose = (e: any) => {
        console.debug("[GeminiLive] Closed:", e?.reason);
        setAgentState("disconnected");
      };

      wsRef.current = ws;

    } catch (err: any) {
      console.error("[useGeminiLive] connect failed:", err);
      setError(err?.message ?? "Failed to connect");
      setAgentState("disconnected");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionConfig, startMic]);

  const handleMessage = useCallback(
    async (message: any) => {
      // Setup complete response
      if (message.setupComplete) {
        console.debug("[GeminiLive] Setup complete.");
        return;
      }

      const sc = message.serverContent;
      if (!sc) return;

      // AI audio output
      if (sc.modelTurn?.parts) {
        setAgentState("speaking");
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data && audioCtxRef.current) {
            await playPcm24k(audioCtxRef.current, part.inlineData.data);
          }
        }
      }

      // AI audio transcription (outputTranscription)
      if (sc.outputTranscription?.text) {
        appendTranscript("ai", sc.outputTranscription.text);
      }

      // User audio transcription (inputTranscription)
      if (sc.inputTranscription?.text) {
        appendTranscript("user", sc.inputTranscription.text);
      }

      if (sc.turnComplete) {
        setAgentState("listening");
      }
    },
    [appendTranscript]
  );

  const disconnect = useCallback(() => {
    stopMic();
    stopScreenShare();
    try {
      wsRef.current?.close();
    } catch (_) {}
    wsRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
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
      wsRef.current.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: "user",
            parts: [{ text }]
          }],
          turnComplete: true
        }
      }));
    },
    [appendTranscript]
  );

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      disconnect();
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
  company?: string;
  role?: string;
}): string {
  const company = config.company ? ` at ${config.company}` : "";
  const role = config.role ? ` for the role of "${config.role}"` : "";
  return `You are an expert technical interviewer conducting a ${config.type} interview${company}${role}.

Your responsibilities:
1. Start by warmly greeting the candidate and asking them to introduce themselves.
2. Ask focused, realistic interview questions relevant to the selected type and company.
3. Actively listen — when the candidate explains something (verbally or on their shared screen), ask insightful follow-up questions.
4. Keep a professional but friendly tone. Allow natural pauses and interruptions.
5. After each candidate response, briefly acknowledge it and move to the next question or a follow-up.
6. When the candidate asks to end, thank them and close the session warmly.

Important rules:
- Speak naturally and conversationally — you will be heard as voice audio.
- Keep individual responses concise (1-3 sentences) unless the question warrants more.
- Do NOT roleplay as the candidate. Only play the interviewer role.
- Do NOT mention that you are an AI unless directly asked.
`;
}
