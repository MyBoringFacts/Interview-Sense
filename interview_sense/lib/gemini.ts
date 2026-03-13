import { GoogleGenAI } from '@google/genai';

export const GEMINI_LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

/**
 * Builds a rich system instruction for the Live API session.
 * This is sent to the ephemeral token endpoint so the model stays
 * in character as an AI interviewer throughout the session.
 */
export function createLiveSystemInstruction(config: {
  type: string;
  company?: string;
  role?: string;
}): string {
  const company = config.company ? ` at ${config.company}` : '';
  const role = config.role ? ` for the role of "${config.role}"` : '';
  return `You are an expert technical interviewer conducting a ${config.type} interview${company}${role}.

Your responsibilities:
1. Start by warmly greeting the candidate and introducing yourself briefly.
2. Ask focused, realistic interview questions relevant to the selected type and company.
3. Actively listen — when the candidate explains something (verbally or on their shared screen), ask insightful follow-up questions.
4. Keep a professional but friendly tone. Allow natural pauses and interruptions.
5. After each candidate response, briefly acknowledge it and move to the next question or a follow-up.
6. When the candidate wraps up, thank them and indicate the session is ending.

Important rules:
- Speak naturally and conversationally — you will be heard as voice audio.
- Keep individual responses concise (1-3 sentences) unless the question warrants a longer explanation.
- Do NOT roleplay as the candidate. Only play the interviewer role.
- Do NOT mention that you are an AI unless directly asked.
`;
}

/**
 * Returns the WebSocket URL required to connect to the Gemini Live API.
 * This should be used on the client-side.
 */
export function getGeminiLiveWsUrl(apiKey?: string) {
  // If no key is provided, we assume the user will inject it. 
  // In a real app, you might proxy this or use ephemeral tokens to hide the key from the frontend.
  // We'll use the NEXT_PUBLIC_GEMINI_API_KEY for the Hackathon's simplicity, OR a short-lived token.
  const key = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) {
    console.warn("No Gemini API key found for WebSocket connection.");
    return "";
  }
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`;
}

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

/**
 * The Question Discovery Engine implementation.
 * Performs a zero-shot retrieval to generate an interview sequence.
 */
export async function generateInterviewPlan(role: string, difficulty: string) {
  const ai = getGenAIClient();
  
  const prompt = `
    You are an expert technical recruiter and interviewer.
    Generate a highly realistic interview plan for a candidate applying for the role of "${role}" at a "${difficulty}" level.
    The response MUST be valid JSON matching this schema exactly:
    {
      "role": string,
      "difficulty": string,
      "questions": [
        {
          "topic": string,
          "questionText": string,
          "expectedConcepts": string[]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    if (response?.text) {
      return JSON.parse(response.text);
    }
    throw new Error("Empty response from Question Discovery Engine.");
  } catch (error) {
    console.error("Failed to generate interview plan:", error);
    throw error;
  }
}
