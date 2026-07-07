(function () {
  "use strict";

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.startsWith("data-") || k === "draggable" || k === "type" || k === "name" || k === "value")
          node.setAttribute(k, attrs[k]);
        else node[k] = attrs[k];
      }
    }
    (children || []).forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function clearMarks(root) {
    root.querySelectorAll(".aw-correct,.aw-wrong,.aw-missed").forEach((n) =>
      n.classList.remove("aw-correct", "aw-wrong", "aw-missed")
    );
    root.querySelectorAll(".aw-reveal").forEach((n) => n.remove());
  }

  function setScore(scoreEl, n, total) {
    if (scoreEl) scoreEl.textContent = total ? `${n} / ${total} correctas` : "";
  }

  function renderChoice(root, data, ctx) {
    const list = el("div", { class: "aw-choices" });
    data.options.forEach((o, i) => {
      const id = "aw-opt-" + i;
      const input = el("input", {
        type: data.multi ? "checkbox" : "radio",
        name: "aw-choice",
        id: id,
        value: String(i),
      });
      const label = el("label", { class: "aw-choice", for: id }, [
        input,
        el("span", { class: "aw-choice-label", text: o.label }),
        el("span", { class: "aw-choice-text", text: o.text }),
      ]);
      label.dataset.correct = o.correct ? "1" : "0";
      list.appendChild(label);
    });
    root.appendChild(list);

    root._check = function () {
      let correct = 0;
      const labels = list.querySelectorAll(".aw-choice");
      labels.forEach((lab) => {
        const input = lab.querySelector("input");
        const isCorrect = lab.dataset.correct === "1";
        if (input.checked && isCorrect) {
          lab.classList.add("aw-correct");
          correct++;
        } else if (input.checked && !isCorrect) {
          lab.classList.add("aw-wrong");
        } else if (!input.checked && isCorrect) {
          lab.classList.add("aw-missed");
        }
      });
      const total = data.options.filter((o) => o.correct).length;
      setScore(ctx.scoreEl, correct, total);
    };
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

  function renderHotspot(root, data, ctx) {
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
          const id = "aw-hs-" + i + "-" + val;
          return el("td", { class: "aw-pick-col" }, [
            el("label", { class: "aw-radio", for: id }, [
              el("input", { type: "radio", name: "aw-hs-" + i, id: id, value: val }),
            ]),
          ]);
        };
        table.appendChild(
          el("tr", {}, [el("td", { class: "aw-stmt", text: row.statement }), mk(cols[0]), mk(cols[1])])
        );
      });
      root.appendChild(
        el("div", { class: "aw-answer-area" }, [
          el("div", { class: "aw-area-label", text: "Answer Area" }),
          table,
        ])
      );
      root._check = function () {
        let correct = 0;
        const trs = table.querySelectorAll("tr");
        data.rows.forEach((row, i) => {
          const tr = trs[i + 1]; // skip header row
          const checked = tr.querySelector("input:checked");
          const picked = checked ? checked.value : null;
          if (row.answer != null && picked === row.answer) {
            tr.classList.add("aw-correct");
            correct++;
          } else {
            tr.classList.add("aw-wrong");
            if (row.answer != null)
              tr.querySelector(".aw-stmt").appendChild(
                el("span", { class: "aw-reveal", text: " ✓ " + row.answer })
              );
          }
        });
        setScore(ctx.scoreEl, correct, data.rows.length);
      };
      return;
    }

    data.rows.forEach((row, i) => {
      const sel = el("select", { class: "aw-select", "data-row": String(i) });
      sel.appendChild(el("option", { value: "", text: "— elegir —" }));
      (row.choices || []).forEach((v) => sel.appendChild(el("option", { value: v, text: v })));
      const tr = el("tr", {}, [
        el("td", { class: "aw-stmt", text: row.statement }),
        el("td", { class: "aw-pick" }, [sel]),
      ]);
      table.appendChild(tr);
    });
    root.appendChild(
      el("div", { class: "aw-answer-area" }, [
        el("div", { class: "aw-area-label", text: "Answer Area" }),
        table,
      ])
    );

    root._check = function () {
      let correct = 0;
      table.querySelectorAll("tr").forEach((tr, i) => {
        const sel = tr.querySelector("select");
        const expected = data.rows[i].answer;
        const cell = tr.querySelector(".aw-pick");
        if (expected != null && sel.value === expected) {
          cell.classList.add("aw-correct");
          correct++;
        } else {
          cell.classList.add("aw-wrong");
          if (expected != null)
            cell.appendChild(el("span", { class: "aw-reveal", text: " ✓ " + expected }));
        }
      });
      setScore(ctx.scoreEl, correct, data.rows.length);
    };
  }

  function renderFillBlank(root, data, ctx) {
    const wrap = el("div", { class: "aw-fillblank" });
    data.segments.forEach((seg) => {
      if (seg.type === "text") {
        wrap.appendChild(el("span", { class: "fb-text", text: seg.text }));
      } else {
        const sel = el("select", { class: "aw-select fb-select", "data-key": String(seg.key) });
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
    root._check = function () {
      let correct = 0,
        total = 0;
      wrap.querySelectorAll("select").forEach((sel) => {
        const seg = data.segments.find((s) => s.type === "blank" && String(s.key) === sel.dataset.key);
        if (!seg || seg.answer == null) return;
        total++;
        if (sel.value === seg.answer) {
          sel.classList.add("aw-correct");
          correct++;
        } else {
          sel.classList.add("aw-wrong");
          sel.insertAdjacentElement("afterend", el("span", { class: "aw-reveal", text: " ✓ " + seg.answer }));
        }
      });
      setScore(ctx.scoreEl, correct, total);
    };
  }

  function renderDragDrop(root, data, ctx) {
    let picked = null; // click-to-place fallback

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
    data.targets.forEach((t, i) => {
      const slot = el("div", { class: "aw-slot", "data-row": String(i) });
      slot.dataset.expected = t.value == null ? "" : t.value;
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
      targets.appendChild(slot);
    });

    root.appendChild(el("div", { class: "aw-dd-help", text: "Arrastra cada valor a su hueco (o pulsa un valor y luego el hueco). Un valor puede reutilizarse." }));
    root.appendChild(
      el("div", { class: "aw-dd-grid" }, [
        el("div", { class: "aw-answer-area aw-dd-options" }, [
          el("div", { class: "aw-area-label", text: "Options" }),
          pool,
        ]),
        el("div", { class: "aw-answer-area aw-dd-answers" }, [
          el("div", { class: "aw-area-label", text: "Answer Area" }),
          targets,
        ]),
      ])
    );

    root._check = function () {
      let correct = 0;
      targets.querySelectorAll(".aw-slot").forEach((slot) => {
        const drop = slot.querySelector(".aw-drop");
        const expected = slot.dataset.expected;
        const assigned = drop.dataset.assigned || "";
        if (expected && assigned === expected) {
          drop.classList.add("aw-correct");
          correct++;
        } else {
          drop.classList.add("aw-wrong");
          if (expected) drop.appendChild(el("span", { class: "aw-reveal", text: " ✓ " + expected }));
        }
      });
      setScore(ctx.scoreEl, correct, data.targets.length);
    };
  }

  function renderOrder(root, data, ctx) {
    let dragging = null, picked = null;
    const posText = {};
    data.items.forEach((it) => { posText[it.pos] = it.text; });

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
    const poolItems = data.items.concat((data.distractors || []).map((t) => ({ text: t })));
    poolItems.sort(() => Math.random() - 0.5).forEach((it) => pool.appendChild(makeTile(it)));

    const targets = el("div", { class: "aw-targets" });
    const slots = [];
    function refresh() { slots.forEach((d) => d.classList.toggle("aw-filled", !!d.querySelector(".aw-chip"))); }
    function moveTile(tile, destDrop) {
      if (destDrop) {
        const occ = destDrop.querySelector(".aw-chip");
        if (occ && occ !== tile) pool.appendChild(occ);
        destDrop.appendChild(tile);
      } else {
        pool.appendChild(tile);
      }
      refresh();
    }
    data.items.forEach((_, i) => {
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

    const hasDistractors = (data.distractors || []).length > 0;
    root.appendChild(el("div", { class: "aw-dd-help", text: hasDistractors
      ? "Elige y arrastra solo las acciones correctas a su posición (o pulsa acción y luego posición). Sobran algunas (distractores)."
      : "Arrastra cada acción a su posición (o pulsa una acción y luego la posición). Cada acción se usa una vez." }));
    root.appendChild(el("div", { class: "aw-dd-grid" }, [
      el("div", { class: "aw-answer-area aw-dd-options" }, [el("div", { class: "aw-area-label", text: "Actions" }), pool]),
      el("div", { class: "aw-answer-area aw-dd-answers" }, [el("div", { class: "aw-area-label", text: "Answer area" }), targets]),
    ]));

    root._check = function () {
      let correct = 0;
      slots.forEach((drop, i) => {
        const tile = drop.querySelector(".aw-chip");
        if (tile && tile._item.pos === i) { drop.classList.add("aw-correct"); correct++; }
        else {
          drop.classList.add("aw-wrong");
          drop.appendChild(el("span", { class: "aw-reveal", text: " ✓ " + (posText[i] || "") }));
        }
      });
      setScore(ctx.scoreEl, correct, data.items.length);
    };
  }

  function renderDragSelect(root, data, ctx) {
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
    data.items.slice().sort(() => Math.random() - 0.5).forEach((it) => pool.appendChild(makeTile(it)));

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

    root._check = function () {
      let correct = 0;
      slots.forEach((drop) => {
        const tile = drop.querySelector(".aw-chip");
        if (tile && tile._item.correct) { drop.classList.add("aw-correct"); correct++; }
        else { drop.classList.add("aw-wrong"); }
      });
      const answers = data.items.filter((it) => it.correct).map((it) => it.text);
      root.appendChild(el("div", { class: "aw-reveal", text: "✓ Correctas: " + answers.join("; ") }));
      setScore(ctx.scoreEl, correct, nSlots);
    };
  }

  const RENDERERS = {
    choice: renderChoice,
    hotspot: renderHotspot,
    fill_blank: renderFillBlank,
    dragdrop: renderDragDrop,
    dragdrop_select: renderDragSelect,
    order: renderOrder,
  };

  function mount(rootEl, data, opts) {
    opts = opts || {};
    const ctx = { scoreEl: opts.scoreEl || null };
    const fn = data && RENDERERS[data.kind];
    if (!rootEl || !fn) return null;
    function renderBody() {
      rootEl.innerHTML = "";
      fn(rootEl, data, ctx);
    }
    renderBody();
    const api = {
      check() { clearMarks(rootEl); if (rootEl._check) rootEl._check(); },
      reset() { clearMarks(rootEl); setScore(ctx.scoreEl, 0, 0); renderBody(); },
    };
    if (opts.checkBtn) opts.checkBtn.addEventListener("click", api.check);
    if (opts.resetBtn) opts.resetBtn.addEventListener("click", api.reset);
    return api;
  }

  window.AnswerWidget = { mount };

  function autoInit() {
    const dataEl = document.getElementById("widget-data");
    const root = document.getElementById("answer-widget");
    if (!dataEl || !root) return;
    let data;
    try {
      data = JSON.parse(dataEl.textContent);
    } catch (e) {
      return;
    }
    mount(root, data, {
      checkBtn: document.getElementById("widget-check"),
      resetBtn: document.getElementById("widget-reset"),
      scoreEl: document.getElementById("widget-score"),
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoInit);
  else autoInit();
})();
