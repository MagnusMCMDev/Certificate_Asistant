import { shuffle } from "./util.js";

export function blinden(widget) {
  if (!widget) return null;
  const w = JSON.parse(JSON.stringify(widget));
  switch (w.kind) {
    case "choice":
      (w.options || []).forEach((o) => { delete o.correct; });
      break;
    case "hotspot":
      (w.rows || []).forEach((r) => { delete r.answer; });
      break;
    case "fill_blank":
      (w.segments || []).forEach((s) => { if (s.type === "blank") delete s.answer; });
      break;
    case "dragdrop":
      (w.targets || []).forEach((t) => { delete t.value; });
      break;
    case "dragdrop_select":
      w.items = shuffle((w.items || []).map((it) => ({ text: it.text })));
      break;
    case "order": {
      const nSlots = (w.items || []).length;
      const pool = (w.items || []).map((it) => it.text).concat(w.distractors || []);
      w.items = shuffle(pool).map((t) => ({ text: t }));
      w.slots = nSlots;
      delete w.distractors;
      break;
    }
  }
  return w;
}
