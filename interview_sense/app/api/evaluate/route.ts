import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  console.log('[API CALL] POST /api/evaluate - Request received');
  try {
    if (!db) throw new Error("Database not initialized");
    const body = await req.json();
    const { sessionId, evaluationEvent } = body;

    const evalRef = await addDoc(collection(db, "evaluations"), {
      sessionId,
      event: evaluationEvent,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      evaluationId: evalRef.id 
    });

  } catch (error: any) {
    console.error("Evaluation API Error:", error);
    return NextResponse.json({ 
      error: "Failed to log evaluation" 
    }, { status: 500 });
  }
}
