let _content = null;

export function setContent(c) { _content = c; }
export function content() { return _content; }
export function certs() { return _content ? _content.certs : {}; }
export function certCodes() { return Object.keys(certs()); }
export function cert(code) { return _content.certs[code]; }
export function question(id) { return _content.questions[String(id)]; }

const histKey = (code) => `ca:hist:v1:${code}`;

export function getHistory(code) {
  try { return JSON.parse(localStorage.getItem(histKey(code)) || "{}"); }
  catch (e) { return {}; }
}
function saveHistory(code, h) {
  localStorage.setItem(histKey(code), JSON.stringify(h));
}
export function getState(code, qid) {
  const row = getHistory(code)[qid];
  return row || { easiness_factor: 2.5, consecutive_correct: 0, interval_days: 0 };
}
export function recordAttempt(code, qid, isCorrect, sm2next) {
  const h = getHistory(code);
  const prev = h[qid] || { n_attempts: 0, n_correct: 0, last_correct_at: null };
  const now = new Date().toISOString();
  h[qid] = {
    ...sm2next,
    n_attempts: (prev.n_attempts || 0) + 1,
    n_correct: (prev.n_correct || 0) + (isCorrect ? 1 : 0),
    last_seen_at: now,
    last_correct_at: isCorrect ? now : (prev.last_correct_at || null),
  };
  saveHistory(code, h);
}
export function resetHistory(code) {
  localStorage.removeItem(histKey(code));
}
export function historyStats(code) {
  const h = getHistory(code);
  const now = Date.now();
  let seen = 0, due = 0;
  for (const qid in h) {
    seen++;
    const d = h[qid].next_due_at ? Date.parse(h[qid].next_due_at) : 0;
    if (!d || d <= now) due++;
  }
  return { seen, due };
}

const examKey = (code) => `ca:exam:v1:${code}`;
export function saveExam(code, state) { sessionStorage.setItem(examKey(code), JSON.stringify(state)); }
export function loadExam(code) {
  try { return JSON.parse(sessionStorage.getItem(examKey(code)) || "null"); }
  catch (e) { return null; }
}
export function clearExam(code) { sessionStorage.removeItem(examKey(code)); }
