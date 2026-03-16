import { NextResponse } from 'next/server';
import { getGenAIClient, GEMINI_DISCOVERY_MODEL } from '@/lib/gemini';
import type { QuestionPlan } from '@/lib/questionDiscovery';

const MODEL = `models/${GEMINI_DISCOVERY_MODEL}`;

// ─── Topic randomisation helpers ───────────────────────────────────────────────

const TOPIC_POOLS: Record<'easy' | 'medium' | 'hard', string[]> = {
  easy: [
    'arrays & iteration',
    'string manipulation',
    'hash maps & sets',
    'two pointers',
    'stack & queue',
    'linked list basics',
    'math & number theory',
    'bit manipulation',
    'sorting & searching',
    'simple recursion',
    'prefix sums',
    'counting & frequency',
  ],
  medium: [
    'sliding window',
    'binary search on answer',
    'tree traversal & path problems',
    'BFS / DFS on graphs',
    '1D dynamic programming',
    'prefix sums & difference arrays',
    'interval merging & scheduling',
    'matrix traversal',
    'greedy algorithms',
    'monotonic stack / deque',
    'backtracking',
    'topological sort',
    'heap / priority queue',
    'divide and conquer',
  ],
  hard: [
    '2D dynamic programming',
    'shortest-path algorithms (Dijkstra, Bellman-Ford)',
    'advanced graph theory (SCC, bridges)',
    'trie / suffix structures',
    'segment tree / binary indexed tree',
    'union-find (DSU)',
    'advanced backtracking with pruning',
    'string matching (KMP, Rabin-Karp)',
    'bitmask DP',
    'geometry & sweep line',
    'network flow',
    'offline query processing',
  ],
};

function pickRandomTopics(difficulty: 'easy' | 'medium' | 'hard', count: number): string[] {
  const pool = TOPIC_POOLS[difficulty] ?? TOPIC_POOLS.medium;
  // Fisher-Yates shuffle on a copy
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count + 1, pool.length));
}

// ─── Per-track system prompts ──────────────────────────────────────────────────

const TECHNICAL_SYSTEM_PROMPT = `
You are the Question Discovery Agent for InterviewSense — Technical Round.

You will receive: company_name (string or null), difficulty, role, num_questions,
and (for Case 2 only) required_topics and session_entropy.

CASE 1 — company_name is provided:
Search the web using these queries:
- "{company_name} technical interview questions site:leetcode.com/discuss"
- "{company_name} software engineer interview questions site:glassdoor.com"
- "{company_name} interview experience site:reddit.com/r/cscareerquestions"
- "{company_name} interview questions site:blind.app OR site:levels.fyi"

Extract commonly reported problems, identify specific LeetCode problems by name or
number if mentioned, and note recurring topics.
Only include problems that are FREE (not locked behind LeetCode Premium). If a
reported problem is premium-only, substitute the closest free equivalent instead.

CASE 2 — company_name is null:
Do NOT search. Select {num_questions} LeetCode problems STRICTLY drawn from the
provided required_topics list. Each question MUST cover a DIFFERENT topic from that
list. Do NOT default to the most famous / overused problems (e.g. Two Sum, Valid
Parentheses, Reverse Linked List) unless required_topics explicitly points there.
Prefer LESS-COMMONLY-SEEN problems that still clearly illustrate the topic.
Use session_entropy as a tie-breaker when multiple problems would fit — let it
influence which specific problem number you choose so results vary across sessions.

CRITICAL — FREE PROBLEMS ONLY:
You MUST only select LeetCode problems that are FREE (not locked behind LeetCode
Premium). Never select any problem that requires a Premium subscription to view.
Well-known premium-locked problems to always avoid include (but are not limited to):
- Longest Substring with At Most K Distinct Characters (#159, #340)
- Paint House (#256, #265)
- Read N Characters Given Read4 (#157, #158)
- Moving Average from Data Stream (#346)
- Meeting Rooms (#252, #253)
- Encode/Decode Strings (#271)
- Closest Binary Search Tree Value (#270, #272)
- Count Univalue Subtrees (#250)
- Flip Game (#293, #294)
- Sparse Matrix Multiplication (#311)
If you are uncertain whether a problem is free, choose a different problem that you
know with confidence is publicly accessible without a subscription.

Always return ONLY this JSON shape, no markdown, no extra text:
{
  "source": "company_specific" | "random_leetcode" | "fallback_random",
  "company": string | null,
  "summary": string,
  "questions": [
    {
      "order": number,
      "title": string,
      "topic_tags": string[],
      "difficulty": string,
      "leetcode_url": string | null,
      "source_hint": string,
      "interviewer_notes": string
    }
  ],
  "screen_share_prompt": string
}

screen_share_prompt MUST always be non-null for all technical interviews. Value:
"Please open the LeetCode problem(s) below and share your screen before we begin.
Talk through your approach out loud as you code — I will ask follow-up questions
based on what I see on your screen."

If web search returns no useful results for the company, fall back to Case 2 and
set source to "fallback_random".`;

const SYSTEM_DESIGN_SYSTEM_PROMPT = `
You are the Question Discovery Agent for InterviewSense — System Design Round.

You will receive: difficulty, role, num_questions.

Select {num_questions} realistic system design problems appropriate for the difficulty
and role. Vary the domain: distributed systems, storage, streaming, APIs, etc.

Easy: URL Shortener, Pastebin, Rate Limiter
Medium: Twitter Feed, Ride-Sharing (Uber), Chat System, Web Crawler
Hard: YouTube/Netflix, Google Search, Distributed Cache, Global Payment System

Always return ONLY this JSON shape, no markdown, no extra text:
{
  "source": "system_design",
  "company": null,
  "summary": string,
  "questions": [
    {
      "order": number,
      "title": string,
      "topic_tags": string[],
      "difficulty": string,
      "leetcode_url": null,
      "source_hint": "system_design",
      "interviewer_notes": string
    }
  ],
  "screen_share_prompt": string
}

screen_share_prompt MUST always be:
"Please share your screen before we begin. Use a whiteboard tool (Excalidraw, draw.io, or your preferred diagramming app) to sketch your architecture as we go — I will observe and ask follow-up questions based on what I see."`;

const BEHAVIORAL_SYSTEM_PROMPT = `
You are the Question Discovery Agent for InterviewSense — Behavioral Round.

You will receive: difficulty, role, num_questions.

Select {num_questions} behavioral interview questions focused on:
- Conflict resolution and difficult coworker situations
- Cross-functional collaboration and stakeholder management
- Problem-solving methodology under ambiguity or pressure
- Leadership, ownership, and bias for action
- Growth mindset: feedback, failure, and lessons learned

Each question should target a distinct competency. All questions use the STAR method
(Situation, Task, Action, Result) as the expected answer framework.

Easy: Clear, common situations (missed deadline, learning from a mistake)
Medium: Complex team dynamics, competing priorities, influencing without authority
Hard: Org-wide impact, high-stakes decisions, conflicting business goals

Always return ONLY this JSON shape, no markdown, no extra text:
{
  "source": "behavioral",
  "company": null,
  "summary": string,
  "questions": [
    {
      "order": number,
      "title": string,
      "topic_tags": string[],
      "difficulty": string,
      "leetcode_url": null,
      "source_hint": "behavioral",
      "interviewer_notes": string
    }
  ],
  "screen_share_prompt": null
}`;

const CUSTOM_SYSTEM_PROMPT = `
You are the Question Discovery Agent for InterviewSense — Custom Interview.

You will receive: difficulty, role, num_questions, and custom_topics (a free-text
description of what the candidate wants to practice).

Based on the custom_topics, generate {num_questions} targeted interview questions.
The questions may span coding challenges, system design concepts, or behavioral
scenarios — whatever best fits the described topics. Use LeetCode links where
applicable, otherwise set leetcode_url to null.

Always return ONLY this JSON shape, no markdown, no extra text:
{
  "source": "custom",
  "company": null,
  "summary": string,
  "questions": [
    {
      "order": number,
      "title": string,
      "topic_tags": string[],
      "difficulty": string,
      "leetcode_url": string | null,
      "source_hint": string,
      "interviewer_notes": string
    }
  ],
  "screen_share_prompt": string | null
}

Set screen_share_prompt to a relevant prompt if any coding or design question warrants
screen sharing, otherwise null.`;

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  console.log('[API CALL] POST /api/discover-questions - Request received');

  try {
    const body = await req.json();
    const {
      interviewType = 'technical',
      companyName,
      difficulty,
      role,
      customTopics,
      numQuestions = 3,
    }: {
      interviewType?: string;
      companyName?: string | null;
      difficulty: 'easy' | 'medium' | 'hard';
      role: string;
      customTopics?: string;
      numQuestions?: number;
    } = body;

    if (!difficulty || !role) {
      return NextResponse.json(
        { error: 'Missing difficulty or role' },
        { status: 400 },
      );
    }

    const ai = getGenAIClient();

    let systemPrompt: string;
    let useGoogleSearch = false;

    switch (interviewType) {
      case 'system-design':
        systemPrompt = SYSTEM_DESIGN_SYSTEM_PROMPT;
        break;
      case 'behavioral':
        systemPrompt = BEHAVIORAL_SYSTEM_PROMPT;
        break;
      case 'custom':
        systemPrompt = CUSTOM_SYSTEM_PROMPT;
        break;
      default:
        systemPrompt = TECHNICAL_SYSTEM_PROMPT;
        useGoogleSearch = true;
    }

    const promptLines = [
      `company_name: ${companyName ?? 'null'}`,
      `difficulty: ${difficulty}`,
      `role: ${role}`,
      `num_questions: ${numQuestions}`,
    ];
    if (interviewType === 'custom' && customTopics) {
      promptLines.push(`custom_topics: ${customTopics}`);
    }
    // For random technical questions (no company), inject shuffled topics and a
    // session-unique entropy value so the model picks different problems each time.
    if (interviewType === 'technical' && !companyName) {
      const topics = pickRandomTopics(difficulty as 'easy' | 'medium' | 'hard', numQuestions);
      promptLines.push(`required_topics: ${topics.join(', ')}`);
      promptLines.push(`session_entropy: ${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    }

    const request: any = {
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: promptLines.join('\n') },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    };

    if (useGoogleSearch) {
      request.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent(request);

    if (!response?.text) {
      throw new Error('Empty response from Gemini Question Discovery');
    }

    let plan: QuestionPlan;
    try {
      plan = JSON.parse(response.text) as QuestionPlan;
    } catch (err) {
      console.error('[API discover-questions] JSON parse error:', err, 'raw:', response.text);
      return NextResponse.json(
        { error: 'Failed to parse question plan from Gemini response' },
        { status: 500 },
      );
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error('[API discover-questions] Error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to discover questions' },
      { status: 500 },
    );
  }
}
