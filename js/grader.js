const SEPARATORS = [" -> ", "->", " → ", "→"];

function splitStatementValue(text) {
  text = (text || "").trim();
  for (const sep of SEPARATORS) {
    const i = text.indexOf(sep);
    if (i !== -1) return [text.slice(0, i).trim(), text.slice(i + sep.length).trim()];
  }
  return [text, null];
}

function labelParse(label) {
  const s = String(label);
  const parts = s.split(".");
  const ints = [];
  for (const p of parts) {
    if (!/^[+-]?\d+$/.test(p.trim())) return { g: 1, s };
    ints.push(parseInt(p, 10));
  }
  return { g: 0, v: ints };
}
function labelCmp(a, b) {
  const ka = labelParse(a), kb = labelParse(b);
  if (ka.g !== kb.g) return ka.g - kb.g;
  if (ka.g === 0) {
    const len = Math.max(ka.v.length, kb.v.length);
    for (let i = 0; i < len; i++) {
      const x = ka.v[i] ?? -Infinity, y = kb.v[i] ?? -Infinity;
      if (x !== y) return x - y;
    }
    return 0;
  }
  return ka.s < kb.s ? -1 : ka.s > kb.s ? 1 : 0;
}

function correctLabels(options) {
  return options.filter((o) => o.is_correct).map((o) => o.label);
}

function arrEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function grade(questionType, options, payload) {
  const qt = questionType;

  if (qt === "order_list") {
    const textToLabel = {};
    options.forEach((o) => { textToLabel[(o.text || "").trim()] = o.label; });
    const userLabels = (payload || []).map((t) => textToLabel[(t || "").trim()] ?? null);
    const expected = correctLabels(options).slice().sort(labelCmp);
    return { correct: arrEq(userLabels, expected), feedback: "Orden correcto: " + expected.join(",") };
  }

  if (qt === "drag_drop") {
    const hasSep = options.some((o) => splitStatementValue(o.text)[1] !== null);
    const nCorr = options.filter((o) => o.is_correct).length;
    if (!hasSep && nCorr > 0 && nCorr < options.length) {
      const answers = new Set(options.filter((o) => o.is_correct).map((o) => (o.text || "").trim()));
      const placed = new Set((payload || []).map((t) => (t || "").trim()).filter(Boolean));
      return {
        correct: setEq(placed, answers),
        feedback: "Acciones correctas: " + [...answers].sort().join("; "),
      };
    }
  }

  if (qt === "hotspot" || qt === "drag_drop") {
    const correctMap = {};
    options.forEach((o) => {
      if (o.is_correct) {
        const [stmt, val] = splitStatementValue(o.text);
        if (val !== null) correctMap[stmt] = val;
      }
    });
    const picks = payload || {};
    const keys = Object.keys(correctMap);
    const ok = keys.length > 0 && keys.every((s) => picks[s] === correctMap[s]);
    const fb = keys.map((s) => `${s} -> ${correctMap[s]}`).join("; ") || "(sin respuesta registrada)";
    return { correct: ok, feedback: fb };
  }

  const chosen = new Set(payload || []);
  const correct = new Set(correctLabels(options));
  return { correct: setEq(chosen, correct), feedback: "Correctas: " + [...correct].join(",") };
}
