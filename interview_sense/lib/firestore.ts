/**
 * Firestore data access layer for InterviewSense.
 * All app data (sessions, evaluations) is queried from here.
 */
import { db } from './firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  type: string;
  company?: string;
  role?: string;
  score?: number;
  durationSeconds?: number;
  transcript?: Array<{ role: 'ai' | 'user'; text: string }>;
  createdAt: string;
  status: 'in-progress' | 'completed';
}

export interface Evaluation {
  id: string;
  sessionId: string;
  category: string;
  score: number;
  notes: string;
  createdAt: string;
}

export interface UserStats {
  totalSessions: number;
  avgScore: number | null;
  totalDurationSeconds: number;
  thisMonthCount: number;
  bestCategory: string | null;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/** Fetch the most recent N completed sessions. */
export async function getRecentSessions(count = 10): Promise<Session[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'sessions'),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session));
  } catch (err) {
    console.error('[getRecentSessions]', err);
    return [];
  }
}

/** Fetch all sessions (for the history page). */
export async function getAllSessions(): Promise<Session[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session));
  } catch (err) {
    console.error('[getAllSessions]', err);
    return [];
  }
}

/** Fetch a single session by ID. */
export async function getSession(id: string): Promise<Session | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'sessions', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Session;
  } catch (err) {
    console.error('[getSession]', err);
    return null;
  }
}

/** Create a new session document and return its ID. */
export async function createSession(data: Omit<Session, 'id'>): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'sessions'), data);
    return ref.id;
  } catch (err) {
    console.error('[createSession]', err);
    return null;
  }
}

/** Update a session (e.g., mark as completed and store final score). */
export async function updateSession(id: string, data: Partial<Session>): Promise<void> {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'sessions', id), data as DocumentData);
  } catch (err) {
    console.error('[updateSession]', err);
  }
}

/** Delete a session. */
export async function deleteSession(id: string): Promise<void> {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'sessions', id));
  } catch (err) {
    console.error('[deleteSession]', err);
  }
}

// ─── Evaluation helpers ───────────────────────────────────────────────────────

/** Fetch all evaluation events for a session. */
export async function getEvaluationsForSession(sessionId: string): Promise<Evaluation[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'evaluations'),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation));
  } catch (err) {
    console.error('[getEvaluationsForSession]', err);
    return [];
  }
}

// ─── Aggregate stats (computed client-side from Firestore data) ────────────────

export function computeUserStats(sessions: Session[]): UserStats {
  const completed = sessions.filter((s) => s.status === 'completed' && s.score != null);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = sessions.filter((s) => s.createdAt >= startOfMonth);

  const avgScore =
    completed.length > 0
      ? Math.round((completed.reduce((sum, s) => sum + (s.score ?? 0), 0) / completed.length) * 10) / 10
      : null;

  const totalDuration = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

  // Find the interview type with the highest average score
  const byType: Record<string, number[]> = {};
  for (const s of completed) {
    if (!byType[s.type]) byType[s.type] = [];
    byType[s.type].push(s.score!);
  }
  let bestCategory: string | null = null;
  let bestAvg = -1;
  for (const [type, scores] of Object.entries(byType)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestAvg) { bestAvg = avg; bestCategory = type; }
  }

  return {
    totalSessions: sessions.length,
    avgScore,
    totalDurationSeconds: totalDuration,
    thisMonthCount: thisMonth.length,
    bestCategory,
  };
}

/** Format duration in seconds to a human-readable string like "45 min". */
export function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Format an ISO date string to a relative or calendar string. */
export function formatDate(isoString: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
