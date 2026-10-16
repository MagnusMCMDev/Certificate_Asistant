import { el } from "../util.js";
import { cert, question, certCodes } from "../store.js";
import { go } from "../router.js";
import { scenarioEl, stemEl, imagesEl, answerNodes, metaEl } from "./common.js";

let _keyHandler = null;

export function render(main, params) {
  const code = params.get("cert") || certCodes()[0];
  const order = cert(code).review_order;
  const total = order.length;
  let i = parseInt(params.get("i") || "1", 10);
  if (isNaN(i)) i = 1;
  i = Math.max(1, Math.min(total, i));
  const q = question(order[i - 1]);

  const prev = i > 1 ? () => go("review", { cert: code, i: i - 1 }) : null;
  const next = i < total ? () => go("review", { cert: code, i: i + 1 }) : null;

  const navTop = el("nav", { class: "review-nav" }, [
    prev ? el("a", { class: "btn-secondary", href: "#/review?cert=" + code + "&i=" + (i - 1), text: "‹ Anterior" })
         : el("span", { class: "btn-secondary disabled", text: "‹ Anterior" }),
    el("span", { class: "review-pos" }, [
      el("a", { href: "#/", text: code }), " · Pregunta ", el("strong", { text: String(i) }),
      " / " + total, el("span", { class: "muted", text: " · por relevancia de temario ↓" }),
    ]),
    next ? el("a", { class: "btn-primary", href: "#/review?cert=" + code + "&i=" + (i + 1), text: "Siguiente ›" })
         : el("span", { class: "btn-primary disabled", text: "Siguiente ›" }),
  ]);

  const bar = el("div", { class: "review-progress-bar" }, [
    el("span", { style: `width:${((i / total) * 100).toFixed(1)}%` }),
  ]);

  const card = el("section", { class: "card" }, [metaEl(q), scenarioEl(q), stemEl(q), imagesEl(q)]);

  if (q.widget) {
    const wrap = el("section", { class: "card widget-card" });
    const host = el("div");
    const score = el("span", { id: "rv-score" });
    const checkBtn = el("button", { type: "button", class: "btn-primary", text: "Comprobar" });
    const resetBtn = el("button", { type: "button", class: "btn-secondary", text: "Reiniciar" });
    wrap.appendChild(host);
    wrap.appendChild(el("div", { class: "widget-controls" }, [checkBtn, resetBtn, score]));
    window.AnswerWidget.mount(host, q.widget, { checkBtn, resetBtn, scoreEl: score });
    card.appendChild(wrap);
  }

  const spoiler = el("details", { class: "solution-spoiler" }, [
    el("summary", {}, [el("span", { class: "spoiler-title", text: "🔑 Ver respuesta y explicación" })]),
    ...answerNodes(q),
  ]);
  if (!q.widget) spoiler.open = true;
  card.appendChild(spoiler);

  const navBottom = el("nav", { class: "review-nav review-nav-bottom" }, [
    prev ? el("a", { class: "btn-secondary", href: "#/review?cert=" + code + "&i=" + (i - 1), text: "‹ Anterior" })
         : el("span", { class: "btn-secondary disabled", text: "‹ Anterior" }),
    next ? el("a", { class: "btn-primary", href: "#/review?cert=" + code + "&i=" + (i + 1), text: "Siguiente ›" })
         : el("a", { class: "btn-primary", href: "#/", text: "Terminar ✓" }),
  ]);

  main.replaceChildren(navTop, bar, card, navBottom);

  if (_keyHandler) document.removeEventListener("keydown", _keyHandler);
  _keyHandler = (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight" && next) next();
    else if (e.key === "ArrowLeft" && prev) prev();
  };
  document.addEventListener("keydown", _keyHandler);
}
