import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_LIVE_MODEL } from '@/lib/gemini';

/**
 * POST /api/live-token
 * Body: { systemInstruction: string }
 *
 * Mints a short-lived ephemeral token on the server (using GEMINI_API_KEY)
 * and returns it to the client. The client uses token.name instead of the
 * real API key so the secret never leaves the server.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
 */
export async function POST(req: Request) {
  console.log('[API CALL] POST /api/live-token - Request received');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[API CALL] POST /api/live-token - Failed: GEMINI_API_KEY is not configured');
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const systemInstruction: string = body.systemInstruction ?? 'You are a helpful AI interviewer.';

    const client = new GoogleGenAI({ apiKey });

    // Token expires in 30 minutes; good for one full interview session
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await (client as any).authTokens.create({
      config: {
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: ['AUDIO'],
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    console.log('[API CALL] POST /api/live-token - Success, ephemeral token minted');
    return NextResponse.json({ token: token.name });
  } catch (error: any) {
    console.error('[API CALL] POST /api/live-token - Error creating ephemeral token:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create ephemeral token' },
      { status: 500 }
    );
  }
}
