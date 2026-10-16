import { el } from "../util.js";
import { cert, question, certCodes, saveExam, loadExam, clearExam } from "../store.js";
import { blinden } from "../blind.js";
import { grade } from "../grader.js";
import { selectQuestions } from "../selector.js";
import { scenarioEl, stemEl, imagesEl, answerNodes } from "./common.js";

let S = null; // {code, ids, idx, answers:{qid:payload}, flagged:{qid:1}, started, duration, phase}
let _timer = null;

function labeled(text, control) {
  return el("label", { class: "pcard-field" }, [text, control]);
}
function stopTimer() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

export function render(main, params) {
  const code = params.get("cert") || certCodes()[0];
  if (S && S.code === code) return S.phase === "review" ? reviewView(main) : questionView(main);
  const saved = loadExam(code);
  if (saved && Date.now() < saved.started + saved.duration && saved.ids && saved.ids.length) {
    S = saved;
    if (!S.flagged) S.flagged = {};
    return S.phase === "review" ? reviewView(main) : questionView(main);
  }
  return setup(main, code);
}

function setup(main, code) {
  stopTimer();
  const nInput = el("input", { type: "number", value: "40", min: "1", max: "100" });
  const minInput = el("input", { type: "number", value: "45", min: "1", max: "600" });
  const startBtn = el("button", { class: "btn-primary", text: "Empezar simulacro" });
  startBtn.addEventListener("click", () => {
    const n = Math.max(1, Math.min(100, parseInt(nInput.value, 10) || 40));
    const mins = Math.max(1, Math.min(600, parseInt(minInput.value, 10) || 45));
    const ids = selectQuestions(code, { n });
    if (!ids.length) { main.querySelector(".setup-error").textContent = "No hay preguntas."; return; }
    S = { code, ids, idx: 0, answers: {}, flagged: {}, started: Date.now(), duration: mins * 60000, phase: "answer" };
    saveExam(code, S);
    questionView(main);
  });
  main.replaceChildren(
    el("div", { class: "crumbs" }, [el("a", { href: "#/", text: "Inicio" })]),
    el("h1", { class: "page-h1", text: "Simulacro de examen — " + code }),
    el("p", { class: "muted", text: "Cronometrado y sin feedback hasta el final. No cierres la pestaña durante el simulacro." }),
    el("div", { class: "setup-form" }, [labeled("Preguntas", nInput), labeled("Minutos", minInput), startBtn]),
    el("p", { class: "setup-error" })
  );
}

function fmt(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function startClock(main, clock) {
  const tick = () => {
    if (!location.hash.startsWith("#/exam")) return stopTimer();
    const remaining = S.started + S.duration - Date.now();
    clock.textContent = "⏱ " + fmt(remaining);
    clock.classList.toggle("exam-clock-low", remaining < 60000);
    if (remaining <= 0) submit(main);
  };
  _timer = setInterval(tick, 500);
  clock.textContent = "⏱ " + fmt(S.started + S.duration - Date.now());
}

function isDictType(q) {
  return q.question_type === "hotspot" || q.question_type === "drag_drop";
}

function answered(id) {
  return S.answers[id] != null;
}

function readable(payload) {
  if (payload == null) return "";
  if (Array.isArray(payload)) return payload.filter((v) => String(v).trim()).join(", ");
  if (typeof payload === "object")
    return Object.keys(payload)
      .filter((k) => String(payload[k]).trim())
      .map((k) => k + " → " + payload[k])
      .join(" · ");
  return String(payload);
}

function shortStem(q) {
  const txt = (q.stem_html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return txt.length > 160 ? txt.slice(0, 160) + "…" : txt;
}

function questionView(main) {
  stopTimer();
  S.phase = "answer";
  const q = question(S.ids[S.idx]);
  const seq = S.idx + 1, total = S.ids.length;
  const clock = el("span", { class: "exam-clock" });

  const host = el("div");
  const widget = q.widget ? window.StudyWidget.mount(host, blinden(q.widget)) : null;
  if (widget && answered(q.id)) widget.restore(S.answers[q.id]);

  const flagBox = el("input", { type: "checkbox" });
  flagBox.checked = !!S.flagged[q.id];
  const flagLabel = el("label", { class: "exam-flag" }, [
    flagBox,
    el("span", { text: "🚩 Marcar como dudosa" }),
    el("span", { class: "muted", text: "— la verás resaltada en la revisión final" }),
  ]);

  function captureAndSave() {
    S.answers[q.id] = widget ? widget.serialize() : (isDictType(q) ? {} : []);
    if (flagBox.checked) S.flagged[q.id] = 1;
    else delete S.flagged[q.id];
    saveExam(S.code, S);
  }

  const last = S.idx >= S.ids.length - 1;
  const prevBtn = S.idx > 0 ? el("button", { class: "btn-secondary", text: "‹ Anterior" }) : null;
  const nextBtn = el("button", { class: "btn-primary", text: last ? "Revisar respuestas ✓" : "Siguiente ›" });
  const reviewBtn = el("button", { class: "btn-secondary", text: "Ir a la revisión" });
  if (prevBtn) prevBtn.addEventListener("click", () => { captureAndSave(); S.idx--; questionView(main); });
  nextBtn.addEventListener("click", () => {
    captureAndSave();
    if (last) return reviewView(main);
    S.idx++;
    questionView(main);
  });
  reviewBtn.addEventListener("click", () => { captureAndSave(); reviewView(main); });

  main.replaceChildren(
    el("nav", { class: "review-nav" }, [
      el("span", { class: "review-pos" }, [`Pregunta `, el("strong", { text: String(seq) }), ` / ${total}`]),
      clock,
    ]),
    el("section", { class: "card" }, [
      el("div", { class: "study-progress" }, [el("span", { class: "muted", text: q.question_type })]),
      scenarioEl(q), stemEl(q), imagesEl(q), host, flagLabel,
      el("div", { class: "widget-controls" }, [prevBtn, nextBtn, reviewBtn]),
    ])
  );
  startClock(main, clock);
}

function reviewView(main) {
  stopTimer();
  S.phase = "review";
  saveExam(S.code, S);
  const clock = el("span", { class: "exam-clock" });
  const nFlagged = S.ids.filter((id) => S.flagged[id]).length;
  const nBlank = S.ids.filter((id) => !answered(id)).length;

  const rows = S.ids.map((id, i) => {
    const q = question(id);
    const flagBtn = el("button", { class: "btn-flag", text: S.flagged[id] ? "🚩" : "🏳" });
    flagBtn.title = S.flagged[id] ? "Quitar la marca" : "Marcar como dudosa";
    flagBtn.addEventListener("click", () => {
      if (S.flagged[id]) delete S.flagged[id];
      else S.flagged[id] = 1;
      saveExam(S.code, S);
      reviewView(main);
    });
    const goBtn = el("button", { class: "btn-secondary btn-sm", text: "Revisar →" });
    goBtn.addEventListener("click", () => { S.idx = i; questionView(main); });
    const tr = el("tr", { class: (S.flagged[id] ? "row-flag " : "") + (answered(id) ? "" : "row-blank") }, [
      el("td", { text: String(i + 1) }),
      el("td", {}, [
        el("div", { class: "er-stem", text: shortStem(q) }),
        el("div", { class: "muted er-type", text: q.question_type }),
      ]),
      el("td", {}, [
        answered(id)
          ? el("span", { class: "er-answer", text: readable(S.answers[id]) || "(en blanco)" })
          : el("span", { class: "er-pending", text: "Sin responder" }),
      ]),
      el("td", { class: "er-flagcell" }, [flagBtn]),
      el("td", {}, [goBtn]),
    ]);
    return tr;
  });

  const finishBtn = el("button", { class: "big-btn big-btn-exam", text: "Finalizar examen y ver resultado" });
  finishBtn.addEventListener("click", () => {
    if (confirm("¿Finalizar el examen y ver el resultado? No podrás cambiar respuestas después.")) submit(main);
  });
  const actions = [];
  if (nBlank) {
    const contBtn = el("a", { class: "big-btn big-btn-practice", text: `Seguir respondiendo (${nBlank})` });
    contBtn.addEventListener("click", () => {
      const first = S.ids.findIndex((id) => !answered(id));
      S.idx = first < 0 ? 0 : first;
      questionView(main);
    });
    actions.push(contBtn);
  }
  actions.push(finishBtn);

  main.replaceChildren(
    el("nav", { class: "review-nav" }, [
      el("span", { class: "review-pos" }, [`Revisión · ${S.ids.length} preguntas`]),
      clock,
    ]),
    el("section", { class: "card" }, [
      el("h1", { class: "page-h1", text: "Antes de finalizar" }),
      el("p", { class: "muted", text: "Vuelve a cualquier pregunta para ver o cambiar tu respuesta. Las marcadas como dudosas aparecen resaltadas. La nota no se calcula hasta que pulses «Finalizar examen»." }),
      el("div", { class: "exam-review-summary" }, [
        el("span", { class: "pill pill-flag", text: `🚩 Dudosas: ${nFlagged}` }),
        el("span", { class: "pill" + (nBlank ? " pill-blank" : ""), text: `Sin responder: ${nBlank}` }),
      ]),
      el("table", { class: "report exam-review" }, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", { text: "#" }), el("th", { text: "Pregunta" }), el("th", { text: "Tu respuesta" }),
            el("th", { text: "Dudosa" }), el("th", {}),
          ]),
        ]),
        el("tbody", {}, rows),
      ]),
      el("div", { class: "report-actions" }, actions),
    ])
  );
  startClock(main, clock);
}

function submit(main) {
  stopTimer();
  let correct = 0;
  const flagged = S.flagged || {};
  const rows = S.ids.map((id) => {
    const q = question(id);
    const payload = S.answers[id] != null ? S.answers[id] : (isDictType(q) ? {} : []);
    const res = grade(q.question_type, q.options, payload);
    if (res.correct) correct++;
    return { q, res, answered: S.answers[id] != null, flagged: !!flagged[id] };
  });
  const total = S.ids.length, code = S.code;
  const pct = Math.round((100 * correct) / total);
  clearExam(code);
  S = null;

  const reviewCards = rows.map(({ q, res, flagged: wasFlagged }, idx) =>
    el("details", { class: "solution-spoiler" + (wasFlagged ? " spoiler-flagged" : "") }, [
      el("summary", {}, [
        el("span", { class: "spoiler-title", text: `${idx + 1}. ` + (res.correct ? "✓" : "✗") + (wasFlagged ? " 🚩" : "") + ` ${q.question_type}` }),
      ]),
      stemEl(q), ...answerNodes(q),
    ])
  );
  main.replaceChildren(
    el("section", { class: "card" }, [
      el("h1", { class: "page-h1", text: "Resultado del simulacro" }),
      el("p", { class: "score-line " + (pct >= 70 ? "ok" : "ko"), text: `${correct} / ${total} correctas — ${pct}%` }),
      el("p", { class: "muted", text: pct >= 70 ? "Aprobado (≥70%)." : "Por debajo del 70%." }),
      el("div", { class: "widget-controls" }, [
        el("a", { class: "btn-primary", href: "#/exam?cert=" + code, text: "Otro simulacro" }),
        el("a", { class: "btn-secondary", href: "#/", text: "Inicio" }),
      ]),
    ]),
    el("h2", { class: "page-h1", text: "Repaso de respuestas" }),
    ...reviewCards
  );
}
