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

const POPULAR_COMPANIES = new Set([
  // Big Tech / FAANG
  'google', 'meta', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix',
  // Other top-tier tech
  'openai', 'anthropic', 'deepmind', 'nvidia', 'tesla', 'spacex',
  'stripe', 'coinbase', 'robinhood', 'palantir', 'snowflake', 'databricks',
  'airbnb', 'uber', 'lyft', 'doordash', 'instacart', 'pinterest',
  'twitter', 'x', 'linkedin', 'salesforce', 'oracle', 'sap', 'ibm',
  'intel', 'amd', 'qualcomm', 'broadcom',
  'shopify', 'square', 'block', 'twilio', 'cloudflare', 'datadog',
  'mongodb', 'elastic', 'redis', 'confluent', 'hashicorp',
  'bytedance', 'tiktok', 'alibaba', 'tencent', 'baidu', 'huawei',
  // Finance & consulting
  'goldman sachs', 'goldman', 'jp morgan', 'jpmorgan', 'morgan stanley',
  'blackrock', 'citadel', 'two sigma', 'jane street', 'de shaw', 'd.e. shaw',
  'mckinsey', 'bain', 'bcg', 'deloitte', 'accenture',
  // Other well-known
  'spotify', 'atlassian', 'zendesk', 'hubspot', 'workday', 'servicenow',
  'adobe', 'autodesk', 'intuit', 'vmware', 'palo alto networks', 'crowdstrike', 'agoda',
]);

function isPopularCompany(company: string | undefined): boolean {
  if (!company) return false;
  const normalized = company.toLowerCase().trim();
  for (const name of POPULAR_COMPANIES) {
    if (normalized.includes(name)) return true;
  }
  return false;
}

function bumpDifficulty(difficulty: string): string {
  if (difficulty === 'easy') return 'medium';
  if (difficulty === 'medium') return 'hard';
  return 'hard';
}

function buildDifficultyContext(difficulty: string): string {
  // ─── Scoring philosophy ────────────────────────────────────────────────────
  // Scores here are NOT hire/no-hire signals. They are calibrated progress
  // markers — designed to give candidates an honest picture of where they
  // stand relative to a realistic bar so they can track improvement over time.
  // A 7 should feel earned, not automatic. Grade inflation defeats the purpose.
  // ──────────────────────────────────────────────────────────────────────────

  switch (difficulty) {
    case 'easy':
      return `
SCORING CALIBRATION — Easy difficulty (entry-level / warm-up questions):
- Benchmark: a junior candidate with 0–2 years of experience or a recent graduate.
- The healthy score range for this tier is 5.5–7.5. A 7.5 means the candidate
  answered correctly, clearly, and showed some genuine depth. It should not be
  the default for simply showing up with the right answer.
- Award 8.0–9.0 only when the candidate demonstrated noticeably more depth,
  structure, or edge-case awareness than the question required.
- Reserve 9.5–10.0 for answers that go meaningfully beyond entry-level expectations.
- Scores below 5.5 reflect surface-level answers with notable gaps.
- Scores below 4.0 reflect fundamental misunderstandings or very poor communication.
- The 8.0–9.0 gap: an 8 means the answer was genuinely impressive for this tier,
  a 9 means it would stand out even at the next difficulty level. Default to 8 if unsure.
- Tone: encouraging and specific. Frame improvements as concrete next learning
  steps, not failures. Make the score feel fair, not generous.`;

    case 'hard':
      return `
SCORING CALIBRATION — Hard difficulty (senior / FAANG-level questions):
- Benchmark: a strong mid-level to senior candidate targeting a top-tier company.
- Very few candidates fully answer hard questions — an incomplete answer is the
  norm, not an automatic deduction. Do not penalise for incompleteness alone.
- The healthy score range for this tier is 5.5–7.0 for solid-but-incomplete
  answers that demonstrate strong reasoning and good problem decomposition.
- Award 7.5–8.5 for answers that cover most of the key surface area with depth,
  structured thinking, and meaningful edge-case awareness.
- Reserve 9.0+ for genuinely comprehensive answers with no significant gaps —
  this should be rare (fewer than 5% of attempts on hard questions).
- Scores below 5.0 reflect notably weak understanding relative to the question's
  expectations. Scores below 3.5 should be rare.
- The 8.0–9.0 gap: an 8 means "strong reasoning, covers most ground well",
  a 9 means "this answer would be flagged as exceptional in a real loop".
  Default to 8 if unsure.
- Do NOT treat "didn't arrive at the optimal solution" as a heavy deduction —
  approach, reasoning, and decomposition matter more than the final answer.
- Acknowledge the question difficulty in the summary and frame gaps as stretch
  goals, not failures.`;

    case 'medium':
    default:
      return `
SCORING CALIBRATION — Medium difficulty (standard industry questions):
- Benchmark: a competent candidate with 2–5 years of relevant experience.
- The healthy score range for this tier is 6.0–7.5. A 7.5 should feel genuinely
  earned — not the default for a correct answer with no notable depth.
- Award 7.5–8.5 for answers that are correct AND demonstrate clear structure,
  edge-case awareness, or genuine depth beyond the obvious talking points.
- Reserve 9.0+ for answers that would stand out in a real interview loop —
  comprehensive, precise, and showing clear mastery. This should be uncommon.
- Scores below 5.5 reflect meaningful knowledge gaps or communication issues
  beyond just an imperfect or incomplete answer.
- Scores below 4.5 reflect significant gaps or poor structure — be honest but fair.
- The 8.0–9.0 gap: an 8 means "strong candidate, clearly prepared and capable",
  a 9 means "this answer was markedly better than most at this level". Default
  to 8 if unsure.
- Balance encouragement with directness. Specific, honest feedback is more
  valuable to a candidate tracking progress than a padded score.`;
  }
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

    const baseDifficulty = sessionConfig?.difficulty ?? 'medium';
    const companyBoosted = isPopularCompany(sessionConfig?.company);
    const difficulty = companyBoosted ? bumpDifficulty(baseDifficulty) : baseDifficulty;
    const difficultyContext = buildDifficultyContext(difficulty);

    const companyNote = companyBoosted
      ? `\nNote: The target company (${sessionConfig.company}) sets a notably higher bar than the industry average. Scoring difficulty has been raised one level (${baseDifficulty} → ${difficulty}). Calibrate scores against what a strong candidate would need to demonstrate at this company specifically.`
      : '';

    const prompt = `You are an expert interview coach evaluating a mock interview. Your goal is to give the candidate an honest, accurate picture of their current performance so they can track progress over time and know exactly what to improve.

Interview Type: ${sessionConfig?.type ?? 'General'}${sessionConfig?.company ? `\nTarget Company: ${sessionConfig.company}` : ''}${sessionConfig?.role ? `\nTarget Role: ${sessionConfig.role}` : ''}
Difficulty Level: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}${companyNote}
${difficultyContext}${notesContext}

GRAMMAR & FLUENCY NOTE:
Do NOT penalise the candidate for spelling mistakes, grammatical errors, typos,
or non-native English. This is a spoken/typed mock interview, not a writing test.
Evaluate only the quality of their ideas, reasoning, technical knowledge,
communication clarity, and problem-solving approach. If they express a correct
concept with imperfect grammar, treat it as a correct answer.

FULL TRANSCRIPT:
${transcriptText}

Evaluate the candidate's performance and return a JSON object matching this exact schema:
{
  "overallScore": <number 1.0–10.0, one decimal place, calibrated to the difficulty level as described above>,
  "summary": "<2–3 sentence honest overall assessment. Acknowledge the difficulty level and give the candidate a clear sense of where they stand and what their single biggest focus area should be.>",
  "categories": {
    "technicalKnowledge": {
      "score": <number 1.0–10.0>,
      "notes": "<specific observation about their technical depth, accuracy, and breadth — cite actual answers where possible>"
    },
    "communication": {
      "score": <number 1.0–10.0>,
      "notes": "<specific observation about clarity, structure, and how well they articulated their thinking — ignore grammar and spelling>"
    },
    "problemSolving": {
      "score": <number 1.0–10.0>,
      "notes": "<specific observation about their approach, decomposition, reasoning, and creativity>"
    },
    "cultureFit": {
      "score": <number 1.0–10.0>,
      "notes": "<specific observation about enthusiasm, professionalism, and team orientation>"
    }
  },
  "strengths": [<3–5 specific, evidence-based strengths drawn directly from their responses>],
  "improvements": [<3–5 specific, actionable improvement areas with concrete suggestions on how to address each one>],
  "highlights": [<2–3 stand-out moments or answers that were particularly impressive or revealing>],
  "recommendedResources": [<2–3 specific topics, books, courses, or practice areas tailored to their actual gaps>]
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