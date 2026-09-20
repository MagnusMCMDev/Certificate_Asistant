import { shuffle } from "./util.js";
import { cert, question, getHistory } from "./store.js";

const VARIANT_SIMILARITY = 0.55;
const MIN_TOKENS_TO_COMPARE = 12;

function passesFilters(q, f) {
  if (f.type && q.question_type !== f.type) return false;
  if (f.group && !(q.syl && q.syl.best_group === f.group)) return false;
  if (f.topic && !(q.topic || "").toLowerCase().includes(f.topic.toLowerCase())) return false;
  return true;
}

function jaccard(a, b) {
  if (!a || !b || !a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function tokenSet(id) {
  const q = question(id);
  return new Set((q && q.vtok) || []);
}

function pickDistinct(candidates, n, picked, chosen) {
  const seen = new Set(picked);
  for (const id of candidates) {
    if (picked.length >= n) break;
    if (seen.has(id)) continue;
    const toks = tokenSet(id);
    if (toks.size >= MIN_TOKENS_TO_COMPARE) {
      let clash = false;
      for (const other of chosen) {
        if (other.size >= MIN_TOKENS_TO_COMPARE && jaccard(toks, other) >= VARIANT_SIMILARITY) {
          clash = true;
          break;
        }
      }
      if (clash) continue;
    }
    picked.push(id);
    chosen.push(toks);
    seen.add(id);
  }
  return picked;
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

  const selected = [], chosen = [];
  if (f.onlyDue) return pickDistinct(shuffle(due), n, selected, chosen);

  pickDistinct(shuffle(due), n, selected, chosen);
  if (selected.length >= n) return selected;

  pickDistinct(shuffle(fresh), n, selected, chosen);
  if (selected.length >= n) return selected;

  stale.sort((a, b) => (Date.parse(hist[a].last_seen_at || 0)) - (Date.parse(hist[b].last_seen_at || 0)));
  return pickDistinct(stale, n, selected, chosen).slice(0, n);
}
