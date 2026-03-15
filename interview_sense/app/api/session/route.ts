import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  console.log('[API CALL] POST /api/session - Request received');
  try {
    if (!db) throw new Error("Database not initialized");
    const body = await req.json();
    const { userId, type, company, role, difficulty, questions } = body;

    const sessionRef = await addDoc(collection(db, "sessions"), {
      userId: userId || null,
      type: type || 'general',
      company: company || null,
      role: role || null,
      difficulty: difficulty || null,
      questions: questions || [],
      status: 'in-progress',
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
      return NextResponse.json({ success: true, session: { id: sessionSnap.id, ...sessionSnap.data() } });
    } else {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  } catch(error: any) {
     console.error("[API CALL] GET /api/session - Error:", error);
     return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  console.log('[API CALL] PATCH /api/session - Request received');
  try {
    if (!db) throw new Error("Database not initialized");
    const body = await req.json();
    const { sessionId, ...updates } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    await updateDoc(doc(db, "sessions", sessionId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API CALL] PATCH /api/session - Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
