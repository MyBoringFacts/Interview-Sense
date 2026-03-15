import { NextResponse } from 'next/server';
import { getGenAIClient, GEMINI_TEXT_MODEL } from '@/lib/gemini';

interface TranscriptEntry {
  role: 'ai' | 'user';
  text: string;
}

/**
 * POST /api/notes
 *
 * Called silently in the background during a live interview session every N turns.
 * Sends the current transcript snapshot to Gemini and returns structured observer notes.
 * These notes are accumulated client-side and passed to /api/evaluate at session end
 * to give the final evaluator richer context.
 */
export async function POST(req: Request) {
  try {
    const { transcript, sessionConfig } = await req.json();

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ notes: null });
    }

    const transcriptText = (transcript as TranscriptEntry[])
      .map((t) => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
      .join('\n');

    const prompt = `You are a silent observer watching a live ${sessionConfig?.type ?? 'technical'} interview. Based on the transcript so far, extract concise structured notes that will help the final evaluator.

TRANSCRIPT SO FAR:
${transcriptText}

Return a JSON object with this exact schema:
{
  "questionsAsked": [<list of distinct interview questions asked by the interviewer>],
  "keyTopics": [<technical or conceptual topics covered>],
  "observations": "<1–2 sentence observation about candidate performance so far>",
  "redFlags": [<any concerning patterns, vague answers, or knowledge gaps — can be empty array>],
  "positives": [<notable strengths, strong answers, or impressive moments — can be empty array>]
}`;

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    if (!response?.text) {
      return NextResponse.json({ notes: null });
    }

    const notes = JSON.parse(response.text);
    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error('[API notes] Error:', error);
    return NextResponse.json({ notes: null });
  }
}
