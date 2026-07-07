import { el } from "../util.js";
import { cert, question, certCodes, getState, recordAttempt, historyStats } from "../store.js";
import { blinden } from "../blind.js";
import { grade } from "../grader.js";
import * as sm2 from "../sm2.js";
import { selectQuestions } from "../selector.js";
import { scenarioEl, stemEl, imagesEl, answerNodes } from "./common.js";

let S = null; // {code, ids, idx, correct}

function labeled(text, control) {
  return el("label", { class: "pcard-field" }, [text, control]);
}

export function render(main, params) {
  const code = params.get("cert") || certCodes()[0];
  if (!S || S.code !== code) return setup(main, code);
  return questionView(main);
}

function setup(main, code) {
  const c = cert(code);
  const stats = historyStats(code);
  const nInput = el("input", { type: "number", value: "10", min: "1", max: "100" });
  const typeSel = el("select", {}, [
    el("option", { value: "", text: "Todos los tipos" }),
    ...["single", "multi", "yes_no", "hotspot", "drag_drop", "order_list"].map((t) => el("option", { value: t, text: t })),
  ]);
  const groupSel = el("select", {}, [
    el("option", { value: "", text: "Todos los dominios" }),
    ...(c.groups || []).map((g) => el("option", { value: g, text: g })),
  ]);
  const startBtn = el("button", { class: "btn-primary", text: "Empezar práctica" });
  startBtn.addEventListener("click", () => {
    const n = Math.max(1, Math.min(100, parseInt(nInput.value, 10) || 10));
    const ids = selectQuestions(code, { n, type: typeSel.value || null, group: groupSel.value || null });
    if (!ids.length) {
      main.querySelector(".setup-error").textContent = "No hay preguntas que cumplan los filtros.";
      return;
    }
    S = { code, ids, idx: 0, correct: 0 };
    questionView(main);
  });
  main.replaceChildren(
    el("div", { class: "crumbs" }, [el("a", { href: "#/", text: "Inicio" })]),
    el("h1", { class: "page-h1", text: "Practicar — " + code }),
    el("p", { class: "muted", text: `${stats.seen} vistas · ${stats.due} pendientes de repaso · con feedback + repaso espaciado` }),
    el("div", { class: "setup-form" }, [
      labeled("Nº de preguntas", nInput),
      labeled("Tipo", typeSel),
      labeled("Dominio", groupSel),
      startBtn,
    ]),
    el("p", { class: "setup-error" })
  );
}

function questionView(main) {
  const q = question(S.ids[S.idx]);
  const seq = S.idx + 1, total = S.ids.length;
  const card = el("section", { class: "card" }, [
    el("div", { class: "study-progress" }, [`Pregunta ${seq} / ${total} · `, el("span", { class: "muted", text: q.question_type })]),
    scenarioEl(q), stemEl(q), imagesEl(q),
  ]);
  const host = el("div");
  card.appendChild(host);
  let widget = null;
  if (q.widget) widget = window.StudyWidget.mount(host, blinden(q.widget));

  const answerBtn = el("button", { class: "btn-primary", text: "Responder" });
  const abandon = el("a", { class: "btn-secondary abandon-link", href: "#/", text: "Abandonar", onclick: () => { S = null; } });
  card.appendChild(el("div", { class: "widget-controls" }, [answerBtn, abandon]));
  answerBtn.addEventListener("click", () => {
    const isDict = q.question_type === "hotspot" || q.question_type === "drag_drop";
    const payload = widget ? widget.serialize() : (isDict ? {} : []);
    const res = grade(q.question_type, q.options, payload);
    const next = sm2.grade(getState(S.code, q.id), res.correct);
    recordAttempt(S.code, q.id, res.correct, next);
    if (res.correct) S.correct++;
    feedbackView(main, q, res);
  });
  main.replaceChildren(card);
}

function feedbackView(main, q, res) {
  const last = S.idx >= S.ids.length - 1;
  const btn = el("button", { class: "btn-primary", text: last ? "Ver resultado →" : "Siguiente pregunta →" });
  btn.addEventListener("click", () => {
    if (last) return result(main);
    S.idx++;
    questionView(main);
  });
  main.replaceChildren(
    el("section", { class: "card" }, [
      el("h2", { class: res.correct ? "ok" : "ko", text: res.correct ? "✓ Correcto" : "✗ Incorrecto" }),
      el("p", { class: "feedback", text: res.feedback }),
      ...answerNodes(q),
      btn,
    ])
  );
}

function result(main) {
  const total = S.ids.length, correct = S.correct, code = S.code;
  const pct = Math.round((100 * correct) / total);
  S = null;
  main.replaceChildren(
    el("section", { class: "card" }, [
      el("h1", { class: "page-h1", text: "Práctica terminada" }),
      el("p", { class: "score-line", text: `${correct} / ${total} correctas (${pct}%)` }),
      el("p", { class: "muted", text: "Tu repaso espaciado se ha actualizado en este navegador." }),
      el("div", { class: "widget-controls" }, [
        el("a", { class: "btn-primary", href: "#/practice?cert=" + code, text: "Otra ronda" }),
        el("a", { class: "btn-secondary", href: "#/", text: "Inicio" }),
      ]),
    ])
  );
}
