import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_LIVE_MODEL } from '@/lib/gemini';

/**
 * POST /api/live-token
 *
 * Mints a short-lived ephemeral token on the server (using GEMINI_API_KEY)
 * and returns it to the client. The client uses token.name instead of the
 * real API key so the secret never leaves the server.
 *
 * The client sends the setup message (model, config, system instruction)
 * after the WebSocket connection is established — NOT baked into the token.
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
    const client = new GoogleGenAI({ apiKey });

    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now.getTime() + 2 * 60 * 1000).toISOString();

    const token = await (client as any).authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
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
