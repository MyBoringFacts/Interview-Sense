import { NextResponse } from 'next/server';
import { getGenAIClient, GEMINI_TEXT_MODEL } from '@/lib/gemini';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

interface TranscriptEntry {
  role: 'ai' | 'user';
  text: string;
}

interface BackgroundNote {
  questionsAsked?: string[];
  keyTopics?: string[];
  observations?: string;
  redFlags?: string[];
  positives?: string[];
}

export async function POST(req: Request) {
  console.log('[API CALL] POST /api/evaluate - Request received');
  try {
    const body = await req.json();
    const { sessionId, userId, transcript, sessionConfig, backgroundNotes } = body;

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const transcriptText = (transcript as TranscriptEntry[])
      .map((t) => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
      .join('\n');

    let notesContext = '';
    if (backgroundNotes && (backgroundNotes as BackgroundNote[]).length > 0) {
      const allQuestions = [...new Set((backgroundNotes as BackgroundNote[]).flatMap((n) => n.questionsAsked ?? []))];
      const allTopics = [...new Set((backgroundNotes as BackgroundNote[]).flatMap((n) => n.keyTopics ?? []))];
      const allPositives = [...new Set((backgroundNotes as BackgroundNote[]).flatMap((n) => n.positives ?? []))];
      const allRedFlags = [...new Set((backgroundNotes as BackgroundNote[]).flatMap((n) => n.redFlags ?? []))];
      notesContext = `\n\nSession observer notes (accumulated during interview):\n- Questions asked: ${allQuestions.join('; ') || 'none recorded'}\n- Topics covered: ${allTopics.join(', ') || 'none recorded'}\n- Observed positives: ${allPositives.join('; ') || 'none'}\n- Observed concerns: ${allRedFlags.join('; ') || 'none'}`;
    }

    const prompt = `You are an expert interview coach and talent evaluator. Analyze the following mock interview transcript and provide a thorough, constructive evaluation.

Interview Type: ${sessionConfig?.type ?? 'General'}${sessionConfig?.company ? `\nTarget Company: ${sessionConfig.company}` : ''}${sessionConfig?.role ? `\nTarget Role: ${sessionConfig.role}` : ''}${notesContext}

FULL TRANSCRIPT:
${transcriptText}

Evaluate the candidate's performance and return a JSON object matching this exact schema:
{
  "overallScore": <number 1.0–10.0, one decimal place, be honest and calibrated>,
  "summary": "<2–3 sentence balanced overall assessment>",
  "categories": {
    "technicalKnowledge": {
      "score": <number 1.0–10.0>,
      "notes": "<specific observation about their technical depth, accuracy, and breadth>"
    },
    "communication": {
      "score": <number 1.0–10.0>,
      "notes": "<specific observation about clarity, structure, and articulation>"
    },
    "problemSolving": {
      "score": <number 1.0–10.0>,
      "notes": "<specific observation about their approach, reasoning, and creativity>"
    },
    "cultureFit": {
      "score": <number 1.0–10.0>,
      "notes": "<specific observation about enthusiasm, professionalism, and team orientation>"
    }
  },
  "strengths": [<3–5 specific, evidence-based strengths from their responses>],
  "improvements": [<3–5 specific, actionable areas to improve with concrete suggestions>],
  "highlights": [<2–3 stand-out moments or answers that were particularly impressive or revealing>],
  "recommendedResources": [<2–3 specific topics, books, or practice areas tailored to their gaps>]
}`;

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    if (!response?.text) {
      throw new Error('Empty response from Gemini evaluation');
    }

    const evaluation = JSON.parse(response.text);

    if (!db) throw new Error('Database not initialized');

    const evalRef = await addDoc(collection(db, 'evaluations'), {
      sessionId: sessionId || null,
      userId: userId || null,
      ...evaluation,
      createdAt: new Date().toISOString(),
    });

    if (sessionId) {
      await updateDoc(doc(db, 'sessions', sessionId), {
        score: evaluation.overallScore,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
    }

    console.log('[API CALL] POST /api/evaluate - Success, evaluationId:', evalRef.id);
    return NextResponse.json({ success: true, evaluationId: evalRef.id, evaluation });
  } catch (error: any) {
    console.error('[API CALL] POST /api/evaluate - Error:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to evaluate session' }, { status: 500 });
  }
}
