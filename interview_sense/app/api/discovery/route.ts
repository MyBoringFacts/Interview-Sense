import { NextResponse } from 'next/server';
import { generateInterviewPlan } from '@/lib/gemini';

export async function POST(req: Request) {
  console.log('[API CALL] POST /api/discovery - Request received');
  try {
    const body = await req.json();
    const { role, difficulty } = body;

    if (!role || !difficulty) {
      return NextResponse.json({ error: "Missing role or difficulty" }, { status: 400 });
    }

    // Call the Gemini-powered discovery engine
    const interviewPlan = await generateInterviewPlan(role, difficulty);

    return NextResponse.json({ 
      success: true, 
      plan: interviewPlan 
    });

  } catch (error: any) {
    console.error("Discovery API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to generate interview plan" 
    }, { status: 500 });
  }
}
