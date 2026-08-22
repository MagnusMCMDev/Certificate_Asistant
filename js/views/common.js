import { el } from "../util.js";

export function scenarioEl(q) {
  if (!q.scenario) return null;
  const kids = [el("summary", { text: "Caso de estudio: " + (q.scenario.title || "") })];
  (q.scenario.sections || []).forEach((s) => {
    if (s.header) kids.push(el("h4", { text: s.header }));
    if (s.body_html) kids.push(el("div", { class: "scenario-text", html: s.body_html }));
  });
  const d = el("details", { class: "scenario" }, kids);
  d.open = true;
  return d;
}

export function stemEl(q) {
  return el("div", { class: "stem", html: q.stem_html });
}

export function imagesEl(q) {
  if (!q.images || !q.images.length) return null;
  return el(
    "div",
    { class: "q-images" },
    q.images.map((img) =>
      el("figure", { class: "q-image" }, [
        el("img", { src: img.src, alt: img.caption || "" }),
        img.caption ? el("figcaption", { text: img.caption }) : null,
      ])
    )
  );
}

export function correctOptionsList(q) {
  return el(
    "ul",
    { class: "ref-options" },
    q.options.map((o) =>
      el("li", { class: o.is_correct ? "is-correct" : "" }, [
        el("span", { class: "opt-mark", text: o.is_correct ? "✓" : "" }),
        el("span", { class: "opt-label", text: o.label }),
        el("span", { class: "opt-text", text: o.text }),
      ])
    )
  );
}

export function answerNodes(q) {
  const nodes = [];
  if (q.doubtful)
    nodes.push(el("p", { class: "doubt-note", text: "⚠ Respuesta DUDOSA: verificada contra la documentación oficial, que no la arbitra de forma concluyente. La respuesta mostrada es la de la fuente original — contrástala antes de darla por buena." }));
  nodes.push(correctOptionsList(q));
  if (q.explanation) {
    const e = el("div", { class: "ref-expl-inline" }, [el("p", { text: q.explanation })]);
    if (q.references_url)
      e.appendChild(
        el("p", { class: "ref-link" }, [
          el("a", { href: q.references_url, target: "_blank", rel: "noopener", text: q.references_url }),
        ])
      );
    nodes.push(e);
  }
  if (q.verdict)
    nodes.push(
      el("p", { class: "muted verify-line", text: `Verificación (${q.verdict}): ${(q.evidence || "").slice(0, 400)}` })
    );
  return nodes;
}

export function metaEl(q) {
  const kids = [el("span", { class: "muted", text: q.question_type })];
  if (q.doubtful)
    kids.push(el("span", { class: "doubt-badge", title: "La documentación oficial no arbitra esta respuesta; procede de la fuente original.", text: "⚠ Respuesta dudosa" }));
  if (q.syl && q.syl.relevance != null)
    kids.push(el("span", { class: "rel-badge rel-" + q.syl.relevance, text: "Temario " + q.syl.relevance + "/9" }));
  if (q.syl && q.syl.best_subskill)
    kids.push(el("span", { class: "syl-topic", title: q.syl.best_group || "", text: "▸ " + q.syl.best_subskill }));
  return el("div", { class: "study-progress" }, kids);
}
