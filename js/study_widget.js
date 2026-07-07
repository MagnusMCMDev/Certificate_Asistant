(function () {
  "use strict";

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.startsWith("data-") || k === "draggable" || k === "type" || k === "name" || k === "value" || k === "for")
          node.setAttribute(k, attrs[k]);
        else node[k] = attrs[k];
      }
    }
    (children || []).forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function renderChoice(root, data) {
    const list = el("div", { class: "aw-choices" });
    data.options.forEach((o, i) => {
      const id = "sw-opt-" + i;
      const input = el("input", {
        type: data.multi ? "checkbox" : "radio",
        name: "sw-choice",
        id: id,
        value: o.label,
      });
      list.appendChild(
        el("label", { class: "aw-choice", for: id }, [
          input,
          el("span", { class: "aw-choice-label", text: o.label }),
          el("span", { class: "aw-choice-text", text: o.text }),
        ])
      );
    });
    root.appendChild(list);
    root._serialize = () =>
      Array.from(list.querySelectorAll("input")).filter((i) => i.checked).map((i) => i.value);
  }

  function binaryCols(choices) {
    if (!choices || choices.length !== 2) return null;
    const low = choices.map((c) => String(c).trim().toLowerCase());
    if (low.includes("yes") && low.includes("no"))
      return [choices[low.indexOf("yes")], choices[low.indexOf("no")]];
    if (low.includes("true") && low.includes("false"))
      return [choices[low.indexOf("true")], choices[low.indexOf("false")]];
    return null;
  }
  function allBinaryRows(rows) {
    if (!rows || !rows.length) return null;
    const c0 = binaryCols(rows[0].choices);
    if (!c0) return null;
    const ok = rows.every((r) => {
      const c = binaryCols(r.choices);
      return c && c[0].toLowerCase() === c0[0].toLowerCase() && c[1].toLowerCase() === c0[1].toLowerCase();
    });
    return ok ? c0 : null;
  }

  function renderHotspot(root, data) {
    const cols = allBinaryRows(data.rows);
    const table = el("table", { class: "aw-hotspot" + (cols ? " aw-hs-binary" : "") });

    if (cols) {
      table.appendChild(
        el("tr", { class: "aw-hs-head" }, [
          el("td", { class: "aw-stmt", text: "Statements" }),
          el("td", { class: "aw-pick-col", text: cols[0] }),
          el("td", { class: "aw-pick-col", text: cols[1] }),
        ])
      );
      data.rows.forEach((row, i) => {
        const mk = (val) => {
          const id = "sw-hs-" + i + "-" + val;
          return el("td", { class: "aw-pick-col" }, [
            el("label", { class: "aw-radio", for: id }, [
              el("input", { type: "radio", name: "sw-hs-" + i, id: id, value: val }),
            ]),
          ]);
        };
        const tr = el("tr", {}, [el("td", { class: "aw-stmt", text: row.statement }), mk(cols[0]), mk(cols[1])]);
        tr.dataset.stmt = row.statement;
        table.appendChild(tr);
      });
      root.appendChild(
        el("div", { class: "aw-answer-area" }, [
          el("div", { class: "aw-area-label", text: "Answer Area" }),
          table,
        ])
      );
      root._serialize = () => {
        const out = {};
        table.querySelectorAll("tr").forEach((tr) => {
          if (!tr.dataset.stmt) return;
          const checked = tr.querySelector("input:checked");
          out[tr.dataset.stmt] = checked ? checked.value : "";
        });
        return out;
      };
      return;
    }

    data.rows.forEach((row) => {
      const sel = el("select", { class: "aw-select" });
      sel.dataset.stmt = row.statement;
      sel.appendChild(el("option", { value: "", text: "— elegir —" }));
      (row.choices || []).forEach((v) => sel.appendChild(el("option", { value: v, text: v })));
      table.appendChild(
        el("tr", {}, [el("td", { class: "aw-stmt", text: row.statement }), el("td", {}, [sel])])
      );
    });
    root.appendChild(
      el("div", { class: "aw-answer-area" }, [
        el("div", { class: "aw-area-label", text: "Answer Area" }),
        table,
      ])
    );
    root._serialize = () => {
      const out = {};
      table.querySelectorAll("select").forEach((s) => {
        out[s.dataset.stmt] = s.value;
      });
      return out;
    };
  }

  function renderFillBlank(root, data) {
    const wrap = el("div", { class: "aw-fillblank" });
    data.segments.forEach((seg) => {
      if (seg.type === "text") {
        wrap.appendChild(el("span", { class: "fb-text", text: seg.text }));
      } else {
        const sel = el("select", { class: "aw-select fb-select" });
        sel.dataset.key = String(seg.key);
        sel.appendChild(el("option", { value: "", text: "▾" }));
        (seg.choices || []).forEach((v) => sel.appendChild(el("option", { value: v, text: v })));
        wrap.appendChild(sel);
      }
    });
    root.appendChild(
      el("div", { class: "aw-answer-area" }, [
        el("div", { class: "aw-area-label", text: "Answer Area" }),
        wrap,
      ])
    );
    root._serialize = () => {
      const out = {};
      wrap.querySelectorAll("select").forEach((s) => {
        out[s.dataset.key] = s.value;
      });
      return out;
    };
  }

  function renderDragDrop(root, data) {
    let picked = null;
    const pool = el("div", { class: "aw-pool" });
    data.chips.forEach((chip) => {
      const c = el("div", { class: "aw-chip", draggable: "true", text: chip });
      c.dataset.value = chip;
      c.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", chip));
      c.addEventListener("click", () => {
        if (picked) picked.classList.remove("aw-picked");
        picked = picked === c ? null : c;
        if (picked) picked.classList.add("aw-picked");
      });
      pool.appendChild(c);
    });
    const targets = el("div", { class: "aw-targets" });
    data.targets.forEach((t) => {
      const slot = el("div", { class: "aw-slot" });
      slot.dataset.stmt = t.statement;
      const drop = el("div", { class: "aw-drop", text: "soltar aquí" });
      function assign(val) {
        drop.textContent = val;
        drop.dataset.assigned = val;
        drop.classList.add("aw-filled");
      }
      drop.addEventListener("dragover", (e) => e.preventDefault());
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        assign(e.dataTransfer.getData("text/plain"));
      });
      drop.addEventListener("click", () => {
        if (picked) {
          assign(picked.dataset.value);
          picked.classList.remove("aw-picked");
          picked = null;
        } else if (drop.dataset.assigned) {
          drop.textContent = "soltar aquí";
          delete drop.dataset.assigned;
          drop.classList.remove("aw-filled");
        }
      });
      slot.appendChild(el("div", { class: "aw-stmt", text: t.statement }));
      slot.appendChild(drop);
      slot._drop = drop;
      targets.appendChild(slot);
    });
    root.appendChild(el("div", { class: "aw-dd-help", text: "Arrastra cada valor a su hueco (o pulsa un valor y luego el hueco)." }));
    root.appendChild(
      el("div", { class: "aw-dd-grid" }, [
        el("div", { class: "aw-answer-area aw-dd-options" }, [el("div", { class: "aw-area-label", text: "Options" }), pool]),
        el("div", { class: "aw-answer-area aw-dd-answers" }, [el("div", { class: "aw-area-label", text: "Answer Area" }), targets]),
      ])
    );
    root._serialize = () => {
      const out = {};
      targets.querySelectorAll(".aw-slot").forEach((slot) => {
        out[slot.dataset.stmt] = slot._drop.dataset.assigned || "";
      });
      return out;
    };
  }

  function renderOrder(root, data) {
    let dragging = null, picked = null;
    const pool = el("div", { class: "aw-pool" });
    function makeTile(it) {
      const c = el("div", { class: "aw-chip", draggable: "true", text: it.text });
      c._item = it;
      c.addEventListener("dragstart", () => { dragging = c; });
      c.addEventListener("click", () => {
        if (picked) picked.classList.remove("aw-picked");
        picked = picked === c ? null : c;
        if (picked) picked.classList.add("aw-picked");
      });
      return c;
    }
    data.items.forEach((it) => pool.appendChild(makeTile(it)));

    const targets = el("div", { class: "aw-targets" });
    const slots = [];
    function refresh() { slots.forEach((d) => d.classList.toggle("aw-filled", !!d.querySelector(".aw-chip"))); }
    function moveTile(tile, destDrop) {
      if (destDrop) {
        const occ = destDrop.querySelector(".aw-chip");
        if (occ && occ !== tile) pool.appendChild(occ);
        destDrop.appendChild(tile);
      } else { pool.appendChild(tile); }
      refresh();
    }
    const nSlots = data.slots != null ? data.slots : data.items.length;
    Array.from({ length: nSlots }).forEach((_, i) => {
      const slot = el("div", { class: "aw-slot" });
      const drop = el("div", { class: "aw-drop aw-order-drop" }, [el("span", { class: "aw-ph", text: "soltar aquí" })]);
      drop.addEventListener("dragover", (e) => e.preventDefault());
      drop.addEventListener("drop", (e) => { e.preventDefault(); if (dragging) { moveTile(dragging, drop); dragging = null; } });
      drop.addEventListener("click", () => {
        if (picked) { picked.classList.remove("aw-picked"); moveTile(picked, drop); picked = null; }
        else { const occ = drop.querySelector(".aw-chip"); if (occ) moveTile(occ, null); }
      });
      slot.appendChild(el("div", { class: "aw-order-num", text: String(i + 1) }));
      slot.appendChild(drop);
      slots.push(drop);
      targets.appendChild(slot);
    });

    root.appendChild(el("div", { class: "aw-dd-help", text: data.items.length > nSlots
      ? "Elige y arrastra solo las acciones correctas a su posición (o pulsa acción y luego posición). Sobran algunas (distractores)."
      : "Arrastra cada acción a su posición (o pulsa una acción y luego la posición). Cada acción se usa una vez." }));
    root.appendChild(el("div", { class: "aw-dd-grid" }, [
      el("div", { class: "aw-answer-area aw-dd-options" }, [el("div", { class: "aw-area-label", text: "Actions" }), pool]),
      el("div", { class: "aw-answer-area aw-dd-answers" }, [el("div", { class: "aw-area-label", text: "Answer area" }), targets]),
    ]));

    root._serialize = () => slots.map((drop) => { const t = drop.querySelector(".aw-chip"); return t ? t._item.text : ""; });
  }

  function renderDragSelect(root, data) {
    let dragging = null, picked = null;
    const pool = el("div", { class: "aw-pool" });
    function makeTile(it) {
      const c = el("div", { class: "aw-chip", draggable: "true", text: it.text });
      c._item = it;
      c.addEventListener("dragstart", () => { dragging = c; });
      c.addEventListener("click", () => {
        if (picked) picked.classList.remove("aw-picked");
        picked = picked === c ? null : c;
        if (picked) picked.classList.add("aw-picked");
      });
      return c;
    }
    data.items.forEach((it) => pool.appendChild(makeTile(it)));

    const targets = el("div", { class: "aw-targets" });
    const slots = [];
    function refresh() { slots.forEach((d) => d.classList.toggle("aw-filled", !!d.querySelector(".aw-chip"))); }
    function moveTile(tile, destDrop) {
      if (destDrop) { const occ = destDrop.querySelector(".aw-chip"); if (occ && occ !== tile) pool.appendChild(occ); destDrop.appendChild(tile); }
      else { pool.appendChild(tile); }
      refresh();
    }
    const nSlots = data.slots != null ? data.slots : data.items.length;
    Array.from({ length: nSlots }).forEach(() => {
      const slot = el("div", { class: "aw-slot" });
      const drop = el("div", { class: "aw-drop aw-order-drop" }, [el("span", { class: "aw-ph", text: "Action" })]);
      drop.addEventListener("dragover", (e) => e.preventDefault());
      drop.addEventListener("drop", (e) => { e.preventDefault(); if (dragging) { moveTile(dragging, drop); dragging = null; } });
      drop.addEventListener("click", () => {
        if (picked) { picked.classList.remove("aw-picked"); moveTile(picked, drop); picked = null; }
        else { const occ = drop.querySelector(".aw-chip"); if (occ) moveTile(occ, null); }
      });
      slot.appendChild(drop);
      slots.push(drop);
      targets.appendChild(slot);
    });

    root.appendChild(el("div", { class: "aw-dd-help", text: "Arrastra las acciones correctas al área de respuesta (el orden NO importa). Sobran algunas (distractores)." }));
    root.appendChild(el("div", { class: "aw-dd-grid" }, [
      el("div", { class: "aw-answer-area aw-dd-options" }, [el("div", { class: "aw-area-label", text: "Actions" }), pool]),
      el("div", { class: "aw-answer-area aw-dd-answers" }, [el("div", { class: "aw-area-label", text: "Answer area" }), targets]),
    ]));

    root._serialize = () => slots.map((drop) => { const t = drop.querySelector(".aw-chip"); return t ? t._item.text : ""; }).filter(Boolean);
  }

  const RENDERERS = {
    choice: renderChoice,
    hotspot: renderHotspot,
    fill_blank: renderFillBlank,
    dragdrop: renderDragDrop,
    dragdrop_select: renderDragSelect,
    order: renderOrder,
  };

  function mount(rootEl, data) {
    const fn = data && RENDERERS[data.kind];
    if (!rootEl || !fn) return null;
    rootEl.innerHTML = "";
    fn(rootEl, data);
    return { serialize: () => (rootEl._serialize ? rootEl._serialize() : null) };
  }

  window.StudyWidget = { mount };

  function autoInit() {
    const dataEl = document.getElementById("study-data");
    const root = document.getElementById("study-widget");
    const form = document.getElementById("study-form");
    const answerInput = document.getElementById("study-answer");
    if (!dataEl || !root || !form || !answerInput) return;
    let data;
    try {
      data = JSON.parse(dataEl.textContent);
    } catch (e) {
      return;
    }
    const w = mount(root, data);
    if (!w) return;
    form.addEventListener("submit", () => {
      answerInput.value = JSON.stringify(w.serialize());
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoInit);
  else autoInit();
})();
