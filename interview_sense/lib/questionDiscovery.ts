export type QuestionPlanSource =
  | 'company_specific'
  | 'random_leetcode'
  | 'fallback_random'
  | 'system_design'
  | 'behavioral'
  | 'custom';

export interface QuestionPlanQuestion {
  order: number;
  title: string;
  topic_tags: string[];
  difficulty: string;
  leetcode_url: string | null;
  source_hint: string;
  interviewer_notes: string;
}

export interface QuestionPlan {
  source: QuestionPlanSource;
  company: string | null;
  summary: string;
  questions: QuestionPlanQuestion[];
  screen_share_prompt: string | null;
}

export async function discoverQuestions(params: {
  interviewType: string;
  companyName: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  role: string;
  customTopics?: string;
  numQuestions?: number;
}): Promise<QuestionPlan> {
  const res = await fetch('/api/discover-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to discover questions');
  }

  const data = await res.json();
  return data as QuestionPlan;
}

