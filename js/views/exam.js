import { el } from "../util.js";
import { cert, question, certCodes, saveExam, loadExam, clearExam } from "../store.js";
import { blinden } from "../blind.js";
import { grade } from "../grader.js";
import { selectQuestions } from "../selector.js";
import { scenarioEl, stemEl, imagesEl, answerNodes } from "./common.js";

let S = null; // {code, ids, idx, answers:{qid:payload}, started, duration}
let _timer = null;

function labeled(text, control) {
  return el("label", { class: "pcard-field" }, [text, control]);
}
function stopTimer() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

export function render(main, params) {
  const code = params.get("cert") || certCodes()[0];
  if (S && S.code === code) return questionView(main);
  const saved = loadExam(code);
  if (saved && Date.now() < saved.started + saved.duration && saved.ids && saved.ids.length) {
    S = saved;
    return questionView(main);
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
    S = { code, ids, idx: 0, answers: {}, started: Date.now(), duration: mins * 60000 };
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

function questionView(main) {
  stopTimer();
  const q = question(S.ids[S.idx]);
  const seq = S.idx + 1, total = S.ids.length;
  const clock = el("span", { class: "exam-clock" });

  const host = el("div");
  const widget = q.widget ? window.StudyWidget.mount(host, blinden(q.widget)) : null;

  function captureAndSave() {
    const isDict = q.question_type === "hotspot" || q.question_type === "drag_drop";
    S.answers[q.id] = widget ? widget.serialize() : (isDict ? {} : []);
    saveExam(S.code, S);
  }

  const last = S.idx >= S.ids.length - 1;
  const prevBtn = S.idx > 0 ? el("button", { class: "btn-secondary", text: "‹ Anterior" }) : null;
  const nextBtn = el("button", { class: "btn-primary", text: last ? "Entregar ✓" : "Siguiente ›" });
  if (prevBtn) prevBtn.addEventListener("click", () => { captureAndSave(); S.idx--; questionView(main); });
  nextBtn.addEventListener("click", () => {
    captureAndSave();
    if (last) return submit(main);
    S.idx++;
    questionView(main);
  });

  main.replaceChildren(
    el("nav", { class: "review-nav" }, [
      el("span", { class: "review-pos" }, [`Pregunta `, el("strong", { text: String(seq) }), ` / ${total}`]),
      clock,
    ]),
    el("section", { class: "card" }, [
      el("div", { class: "study-progress" }, [el("span", { class: "muted", text: q.question_type })]),
      scenarioEl(q), stemEl(q), imagesEl(q), host,
      el("div", { class: "widget-controls" }, [prevBtn, nextBtn]),
    ])
  );

  _timer = setInterval(() => {
    if (!location.hash.startsWith("#/exam")) return stopTimer();
    const remaining = S.started + S.duration - Date.now();
    clock.textContent = "⏱ " + fmt(remaining);
    clock.classList.toggle("exam-clock-low", remaining < 60000);
    if (remaining <= 0) { captureAndSave(); submit(main); }
  }, 500);
  clock.textContent = "⏱ " + fmt(S.started + S.duration - Date.now());
}

function submit(main) {
  stopTimer();
  let correct = 0;
  const rows = S.ids.map((id) => {
    const q = question(id);
    const isDict = q.question_type === "hotspot" || q.question_type === "drag_drop";
    const payload = S.answers[id] != null ? S.answers[id] : (isDict ? {} : []);
    const res = grade(q.question_type, q.options, payload);
    if (res.correct) correct++;
    return { q, res, answered: S.answers[id] != null };
  });
  const total = S.ids.length, code = S.code;
  const pct = Math.round((100 * correct) / total);
  clearExam(code);
  S = null;

  const reviewCards = rows.map(({ q, res }, idx) =>
    el("details", { class: "solution-spoiler" }, [
      el("summary", {}, [
        el("span", { class: "spoiler-title", text: `${idx + 1}. ` + (res.correct ? "✓" : "✗") + ` ${q.question_type}` }),
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
