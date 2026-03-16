import { GoogleGenAI } from '@google/genai';

/** Gemini Live (voice/audio) model — used by the WebSocket session. */
export const GEMINI_LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

/** Gemini text model — used by server-side API routes (evaluate, notes). */
export const GEMINI_TEXT_MODEL = "gemini-3-flash-preview";

/** Gemini model used by the Question Discovery Agent (supports Google Search grounding). */
export const GEMINI_DISCOVERY_MODEL = "gemini-3-flash-preview";

/**
 * Returns a configured server-side GenAI client instance.
 * MUST only be called in Node.js environments (Next.js server components / API routes).
 */
export function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({ apiKey });
}
