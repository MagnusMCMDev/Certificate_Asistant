export const QUALITY_CORRECT = 5;
export const QUALITY_WRONG = 2;

export function updateEasiness(ef, quality) {
  const newEf = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(1.3, newEf);
}

export function nextInterval(consecutiveCorrect, easinessFactor, prevInterval) {
  if (consecutiveCorrect <= 0) return 0;
  if (consecutiveCorrect === 1) return 1;
  if (consecutiveCorrect === 2) return 6;
  return Math.max(1, Math.round(prevInterval * easinessFactor));
}

export function grade(state, isCorrect, now) {
  now = now || new Date();
  const quality = isCorrect ? QUALITY_CORRECT : QUALITY_WRONG;
  const n = isCorrect ? (state.consecutive_correct || 0) + 1 : 0;
  const ef = updateEasiness(state.easiness_factor != null ? state.easiness_factor : 2.5, quality);
  const interval = nextInterval(n, ef, state.interval_days || 0);
  const due = new Date(now.getTime() + interval * 86400000);
  return {
    easiness_factor: ef,
    consecutive_correct: n,
    interval_days: interval,
    next_due_at: due.toISOString(),
  };
}
