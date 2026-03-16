/**
 * Firestore data access layer for InterviewSense.
 * All app data (users, sessions, evaluations) is queried from here.
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
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  notifications: boolean;
  emailAlerts: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  theme: 'light' | 'dark' | 'auto';
}

export interface Session {
  id: string;
  userId: string;
  type: string;
  company?: string;
  role?: string;
  difficulty?: string;
  score?: number;
  durationSeconds?: number;
  questions?: string[];
  transcript?: Array<{ role: 'ai' | 'user'; text: string }>;
  createdAt: string;
  completedAt?: string;
  status: 'in-progress' | 'completed';
}

export interface EvaluationCategory {
  score: number;
  notes: string;
}

export interface Evaluation {
  id: string;
  sessionId: string;
  userId: string;
  createdAt: string;
  overallScore: number;
  summary: string;
  categories: {
    technicalKnowledge: EvaluationCategory;
    communication: EvaluationCategory;
    problemSolving: EvaluationCategory;
    cultureFit: EvaluationCategory;
  };
  strengths: string[];
  improvements: string[];
  highlights: string[];
  recommendedResources: string[];
}

export interface UserStats {
  totalSessions: number;
  avgScore: number | null;
  totalDurationSeconds: number;
  thisMonthCount: number;
  bestCategory: string | null;
}

// ─── User profile helpers ─────────────────────────────────────────────────────

/** Get user profile by UID. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as UserProfile;
  } catch (err) {
    console.error('[getUserProfile]', err);
    return null;
  }
}

/** Create a new user profile. Doc ID = UID. */
export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, 'uid'>
): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid), { uid, ...data });
  } catch (err) {
    console.error('[createUserProfile]', err);
  }
}

/** Update an existing user profile. */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', uid), data as DocumentData);
  } catch (err) {
    console.error('[updateUserProfile]', err);
  }
}

// ─── User settings helpers ────────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
  notifications: true,
  emailAlerts: false,
  difficulty: 'intermediate',
  theme: 'dark',
};

/** Get user settings. Returns defaults if not found. */
export async function getUserSettings(uid: string): Promise<UserSettings> {
  if (!db) return DEFAULT_SETTINGS;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'));
    if (!snap.exists()) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...snap.data() } as UserSettings;
  } catch (err) {
    console.error('[getUserSettings]', err);
    return DEFAULT_SETTINGS;
  }
}

/** Update user settings (merge). */
export async function updateUserSettings(
  uid: string,
  data: Partial<UserSettings>
): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), data, { merge: true });
  } catch (err) {
    console.error('[updateUserSettings]', err);
  }
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/** Fetch the most recent N completed sessions for a user. */
export async function getRecentSessions(userId: string, count = 10): Promise<Session[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
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

/** Fetch all sessions for a user (for the history page). */
export async function getAllSessions(userId: string): Promise<Session[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
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
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = sessions.filter((s) => new Date(s.createdAt) >= startOfMonth);

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
