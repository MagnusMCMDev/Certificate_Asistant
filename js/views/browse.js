import { el } from "../util.js";
import { cert, question, certCodes } from "../store.js";
import { scenarioEl, stemEl, imagesEl, answerNodes, metaEl } from "./common.js";

export function render(main, params) {
  const code = params.get("cert") || certCodes()[0];
  const topic = params.get("topic");
  const c = cert(code);

  if (!topic) {
    const entries = Object.entries(c.topics).sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
    );
    const grid = el(
      "div",
      { class: "topic-grid" },
      entries.map(([t, ids]) =>
        el("a", { class: "topic-card", href: "#/browse?cert=" + code + "&topic=" + encodeURIComponent(t) }, [
          el("span", { class: "topic-name", text: t }),
          el("span", { class: "topic-n", text: String(ids.length) }),
        ])
      )
    );
    main.replaceChildren(
      el("div", { class: "crumbs" }, [el("a", { href: "#/", text: "Inicio" })]),
      el("h1", { class: "page-h1", text: "Explorar por tema — " + code }),
      el("p", { class: "muted", text: entries.length + " temas · respuesta revelada" }),
      grid
    );
    return;
  }

  const ids = c.topics[topic] || [];
  const cards = ids.map((id) => {
    const q = question(id);
    return el("article", { class: "card" }, [metaEl(q), scenarioEl(q), stemEl(q), imagesEl(q), ...answerNodes(q)]);
  });
  main.replaceChildren(
    el("div", { class: "crumbs" }, [
      el("a", { href: "#/", text: "Inicio" }), " · ",
      el("a", { href: "#/browse?cert=" + code, text: "Temas" }),
    ]),
    el("h1", { class: "page-h1", text: topic }),
    el("p", { class: "muted", text: ids.length + " pregunta(s) · " + code }),
    ...cards
  );
}
