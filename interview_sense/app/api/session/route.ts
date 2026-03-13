import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  console.log('[API CALL] POST /api/session - Request received');
  try {
    if (!db) throw new Error("Database not initialized");
    const body = await req.json();
    const { role, difficulty, questions } = body;

    const sessionRef = await addDoc(collection(db, "sessions"), {
      role,
      difficulty,
      questions: questions || [],
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      sessionId: sessionRef.id 
    });

  } catch (error: any) {
    console.error("[API CALL] POST /api/session - Error:", error);
    return NextResponse.json({ 
      error: "Failed to create session" 
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  console.log('[API CALL] GET /api/session - Request received');
  try {
    if (!db) throw new Error("Database not initialized");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: "No session ID provided" }, { status: 400 });

    const sessionRef = doc(db, "sessions", id);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      return NextResponse.json({ success: true, session: sessionSnap.data() });
    } else {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  } catch(error: any) {
     console.error("[API CALL] GET /api/session - Error:", error);
     return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
