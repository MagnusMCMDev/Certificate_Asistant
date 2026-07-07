import { shuffle } from "./util.js";
import { cert, question, getHistory } from "./store.js";

function passesFilters(q, f) {
  if (f.type && q.question_type !== f.type) return false;
  if (f.group && !(q.syl && q.syl.best_group === f.group)) return false;
  if (f.topic && !(q.topic || "").toLowerCase().includes(f.topic.toLowerCase())) return false;
  return true;
}

export function selectQuestions(code, filters) {
  const f = filters || {};
  const n = f.n || 10;
  const now = Date.now();
  const hist = getHistory(code);
  const ids = cert(code).review_order.filter((id) => passesFilters(question(id), f));

  const due = [], fresh = [], stale = [];
  for (const id of ids) {
    const h = hist[id];
    if (!h) { fresh.push(id); continue; }
    const d = h.next_due_at ? Date.parse(h.next_due_at) : 0;
    if (!d || d <= now) due.push(id);
    else stale.push(id);
  }
  shuffle(due);
  if (f.onlyDue) return shuffle(due).slice(0, n);

  const shuffledDue = shuffle(due);
  const selected = shuffledDue.slice(0, n);
  if (selected.length >= n) return selected;

  selected.push(...shuffle(fresh).slice(0, n - selected.length));
  if (selected.length >= n) return selected;

  stale.sort((a, b) => (Date.parse(hist[a].last_seen_at || 0)) - (Date.parse(hist[b].last_seen_at || 0)));
  selected.push(...stale.slice(0, n - selected.length));
  return selected.slice(0, n);
}
