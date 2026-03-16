import { NextResponse } from 'next/server';
import { getGenAIClient, GEMINI_TEXT_MODEL } from '@/lib/gemini';

const POPULAR_COMPANIES = new Set([
  'google', 'meta', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix',
  'openai', 'anthropic', 'deepmind', 'nvidia', 'tesla', 'spacex',
  'stripe', 'coinbase', 'robinhood', 'palantir', 'snowflake', 'databricks',
  'airbnb', 'uber', 'lyft', 'doordash', 'instacart', 'pinterest',
  'twitter', 'x', 'linkedin', 'salesforce', 'oracle', 'sap', 'ibm',
  'intel', 'amd', 'qualcomm', 'broadcom',
  'shopify', 'square', 'block', 'twilio', 'cloudflare', 'datadog',
  'mongodb', 'elastic', 'redis', 'confluent', 'hashicorp',
  'bytedance', 'tiktok', 'alibaba', 'tencent', 'baidu', 'huawei',
  'goldman sachs', 'goldman', 'jp morgan', 'jpmorgan', 'morgan stanley',
  'blackrock', 'citadel', 'two sigma', 'jane street', 'de shaw', 'd.e. shaw',
  'mckinsey', 'bain', 'bcg', 'deloitte', 'accenture',
  'spotify', 'atlassian', 'zendesk', 'hubspot', 'workday', 'servicenow',
  'adobe', 'autodesk', 'intuit', 'vmware', 'palo alto networks', 'crowdstrike',
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

    const baseDifficulty = sessionConfig?.difficulty ?? 'medium';
    const companyBoosted = isPopularCompany(sessionConfig?.company);
    const difficulty = companyBoosted ? bumpDifficulty(baseDifficulty) : baseDifficulty;
    const difficultyNote = difficulty === 'easy'
      ? 'This is an easy/entry-level interview — only flag genuine misunderstandings as red flags; minor hesitation or incomplete answers are expected and normal.'
      : difficulty === 'hard'
      ? `This is a hard/senior-level interview${companyBoosted ? ` targeting ${sessionConfig.company}, a top-tier company with an extremely high hiring bar` : ''} — partial answers and incomplete solutions are common even for strong candidates; only flag truly concerning patterns, not missing edge cases.`
      : `This is a standard medium-difficulty interview${companyBoosted ? ` (difficulty raised because ${sessionConfig.company} is a highly competitive employer)` : ''} — flag clear knowledge gaps or poor communication, but not minor imprecision.`;

    const prompt = `You are a silent observer watching a live ${sessionConfig?.type ?? 'technical'} interview (difficulty: ${difficulty}). Based on the transcript so far, extract concise structured notes that will help the final evaluator.

Calibration note: ${difficultyNote}

TRANSCRIPT SO FAR:
${transcriptText}

Return a JSON object with this exact schema:
{
  "questionsAsked": [<list of distinct interview questions asked by the interviewer>],
  "keyTopics": [<technical or conceptual topics covered>],
  "observations": "<1–2 sentence observation about candidate performance so far, noting the difficulty level>",
  "redFlags": [<genuinely concerning patterns appropriate to the difficulty level — can be empty array>],
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
