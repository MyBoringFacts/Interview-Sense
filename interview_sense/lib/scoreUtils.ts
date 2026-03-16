/**
 * Shared score-colour utilities used across reports, history, and dashboard.
 * Single source of truth for all score thresholds and colour mappings.
 */

export interface ScoreColors {
  text: string;
  bg: string;
  border: string;
  badge: string;
}

export function getScoreColors(score: number): ScoreColors {
  if (score >= 8.5) return {
    text: 'text-green-400',
    bg: 'bg-green-500',
    border: 'border-green-500/30',
    badge: 'bg-green-500/15 text-green-400',
  };
  if (score >= 7) return {
    text: 'text-blue-400',
    bg: 'bg-blue-500',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/15 text-blue-400',
  };
  if (score >= 5.5) return {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500',
    border: 'border-yellow-500/30',
    badge: 'bg-yellow-500/15 text-yellow-400',
  };
  return {
    text: 'text-red-400',
    bg: 'bg-red-500',
    border: 'border-red-500/30',
    badge: 'bg-red-500/15 text-red-400',
  };
}

/** Returns a text label for the score tier. */
export function getScoreLabel(score: number): string {
  if (score >= 8.5) return 'Excellent';
  if (score >= 7) return 'Good';
  if (score >= 5.5) return 'Fair';
  return 'Needs Work';
}

/** Returns Tailwind badge classes for inline score chips (history table, reports list). */
export function getScoreBadgeClasses(score: number): string {
  return getScoreColors(score).badge + ' border border-current/20';
}
