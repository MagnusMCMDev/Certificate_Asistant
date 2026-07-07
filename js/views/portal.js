import { el } from "../util.js";
import { certs, cert, certCodes } from "../store.js";

export function render(main, params) {
  const codes = certCodes();
  const code = params.get("cert") && codes.includes(params.get("cert")) ? params.get("cert") : codes[0];
  const c = cert(code);
  const all = certs();

  const tabs = codes.length > 1
    ? el("div", { class: "cert-tabs" }, codes.map((cc) =>
        el("a", { class: "cert-tab" + (cc === code ? " active" : ""), href: "#/?cert=" + cc }, [
          cc, el("span", { class: "cert-tab-n", text: String(all[cc].n_verified) }),
        ])))
    : null;

  const linkCard = (cls, icon, title, desc, btnCls, btnText, href) =>
    el("a", { class: "pcard " + cls, href }, [
      el("div", { class: "pcard-icon", text: icon }),
      el("h2", { text: title }),
      el("p", { text: desc }),
      el("span", { class: "big-btn " + btnCls, text: btnText }),
    ]);

  const nTopics = Object.keys(c.topics).length;

  main.replaceChildren(
    el("section", { class: "hero" }, [
      el("h1", { text: "¿Listo para estudiar?" }),
      el("p", { class: "hero-sub" }, [
        "Estudia con ", el("strong", { text: c.n_verified + " preguntas" }),
        " verificadas contra la documentación oficial.",
      ]),
    ]),
    tabs,
    el("p", { class: "cert-summary" }, [
      el("strong", { text: c.code }), " — " + (c.name || ""), " · ",
      el("strong", { text: String(c.n_verified) }), " preguntas · ",
      el("strong", { text: String(nTopics) }), " temas",
    ]),
    el("div", { class: "portal-group" }, [
      el("h2", { class: "portal-group-title", text: "Estudiar las preguntas" }),
      el("div", { class: "portal-cards portal-cards-2" }, [
        linkCard("pcard-review", "🎯", "Repaso guiado",
          "Recorre todas las preguntas una a una, ordenadas por relevancia de temario, con su respuesta y explicación.",
          "big-btn-review", "Repasar las " + c.n_verified + " preguntas →", "#/review?cert=" + code),
        linkCard("pcard-browse", "📚", "Explorar por tema",
          "Revisa las preguntas con su respuesta y explicación, agrupadas por tema.",
          "big-btn-browse", "Ver los " + nTopics + " temas →", "#/browse?cert=" + code),
      ]),
    ]),
    el("div", { class: "portal-group" }, [
      el("h2", { class: "portal-group-title", text: "Practicar el examen" }),
      el("div", { class: "portal-cards portal-cards-2" }, [
        linkCard("pcard-practice", "📝", "Practicar",
          "Una pregunta cada vez, con feedback inmediato, explicación y repaso espaciado.",
          "big-btn-practice", "Empezar práctica →", "#/practice?cert=" + code),
        linkCard("pcard-exam", "⏱️", "Simulacro de examen",
          "Cronometrado y sin feedback hasta el final, como el examen real. Nota al terminar.",
          "big-btn-exam", "Empezar simulacro →", "#/exam?cert=" + code),
      ]),
    ])
  );
}
