// GymFit — generic renderer. Contains no personal content by design: the
// actual plan (DATA) is decrypted in-browser by lock.js from data.enc.json,
// which is unreadable without the passphrase — including via direct URL
// access, bypassing this UI. This file is safe to be fully public.

function todayIndex() {
  const d = new Date().getDay(); // 0 = Sunday ... 6 = Saturday
  return (d + 6) % 7; // Monday-first
}

function pillarChip(DATA, key) {
  const p = DATA.PILLARS[key];
  return `<span class="chip" style="--chip-color:${p.color}">${p.label}</span>`;
}

function exerciseRow(ex) {
  return `
    <div class="exercise">
      <div class="exercise-head">
        <span class="exercise-name">${ex.name}</span>
        <span class="exercise-volume">${ex.volume}</span>
      </div>
      ${ex.weight ? `<div class="exercise-weight"><span class="weight-badge">${ex.weight}</span></div>` : ""}
      ${ex.desc ? `<p class="exercise-desc">${ex.desc}</p>` : ""}
    </div>`;
}

function exerciseSection(title, items, kind) {
  if (!items || !items.length) return "";
  return `
    <div class="section-block section-${kind || "main"}">
      ${title ? `<h3>${title}</h3>` : ""}
      ${items.map(exerciseRow).join("")}
    </div>`;
}

function dayCard(DATA, day) {
  let body = "";
  if (day.segments) {
    body = day.segments
      .map(
        (seg) => `
        <div class="segment">
          <div class="segment-title">${pillarChip(DATA, seg.pillar)} ${seg.title}</div>
          ${exerciseSection("", seg.main, "main")}
        </div>`
      )
      .join("");
  } else {
    body =
      exerciseSection("Warm-up", day.warmup, "warmup") +
      exerciseSection("Main Work", day.main, "main") +
      exerciseSection("Cooldown", day.cooldown, "cooldown");
  }

  const rec = DATA.RECOVERY.find((r) => r.day.includes(day.day.slice(0, 3)));

  return `
    <section class="day-card" id="day-${day.day}">
      <header class="day-header">
        <div>
          <h2>${day.day}</h2>
          <p class="subtitle">${day.subtitle}</p>
        </div>
        <div class="day-meta">${pillarChip(DATA, day.pillar)}<span class="minutes">${day.minutes} min</span></div>
      </header>
      ${day.intro ? `<p class="day-intro">${day.intro}</p>` : ""}
      ${body}
      ${rec ? recoveryBlock(rec) : ""}
    </section>`;
}

function recoveryBlock(rec) {
  return `
    <div class="section-block section-recovery">
      <h3>Recovery</h3>
      <div class="recovery-line">🔥 ${rec.sauna}</div>
      ${rec.jacuzzi !== "—" ? `<div class="recovery-line">💧 ${rec.jacuzzi}</div>` : ""}
      ${rec.timing !== "—" ? `<div class="recovery-timing">${rec.timing}</div>` : ""}
    </div>`;
}

function renderToday(DATA) {
  const day = DATA.WEEK[todayIndex()];
  const el = document.getElementById("view-today");
  el.innerHTML = `
    <div class="weight-note">
      <strong>How to use the weights</strong>
      <p>Starting anchors calibrated for an experienced 177 lb lifter, not a hard target. Week 1 — if you clear the top of the rep range at ≥2 RPE points under target, add 5–10% next session. If you miss the bottom of the range, drop 10% and rebuild.</p>
    </div>
    ${dayCard(DATA, day)}
  `;
}

function renderWeek(DATA) {
  const el = document.getElementById("view-week");
  el.innerHTML = DATA.WEEK.map((d) => dayCard(DATA, d)).join("");
}

function groceryGroup(group, extraClass) {
  return `
    <div class="grocery-group ${extraClass}">
      <div class="grocery-group-title">
        <span>${group.label}</span>
        <span class="grocery-group-hint">${group.hint}</span>
      </div>
      ${group.items
        .map(
          (i) => `
        <div class="grocery-item">
          <span class="grocery-item-name">${i.name}${i.note ? ` <span class="grocery-item-note">— ${i.note}</span>` : ""}</span>
          <span class="grocery-item-qty">${i.qty}</span>
        </div>`
        )
        .join("")}
    </div>`;
}

function renderNutrition(DATA) {
  const el = document.getElementById("view-nutrition");
  el.innerHTML = `
    <div class="section-block">
      <h3>Daily Targets</h3>
      <p class="section-intro">${DATA.NUTRITION_INTRO}</p>
      ${DATA.NUTRITION_TARGETS.map(
        (t) => `<div class="target-row"><div class="target-label">${t.label}</div><div class="target-detail">${t.detail}</div></div>`
      ).join("")}
    </div>
    <div class="section-block">
      <h3>7-Day Totals</h3>
      ${DATA.NUTRITION_DAYS.map(
        (d) => `
        <div class="nutri-row">
          <span class="nutri-day">${d.day}</span>
          <div class="nutri-detail">
            <div class="nutri-meals">${d.meals}</div>
            <div class="nutri-macros">${d.kcal} kcal · ${d.p}P · ${d.c}C · ${d.f}F · ${d.fib} fib</div>
          </div>
        </div>`
      ).join("")}
    </div>
    <div class="section-block">
      <h3>Menus — How to Cook Each Block</h3>
      ${DATA.MEAL_BLOCKS.map(
        (m) => `
        <div class="meal-block">
          <div class="meal-name">${m.name}</div>
          <div class="meal-detail">${m.detail} · <em>${m.freq}</em></div>
          <ol class="meal-steps">${m.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
          <div class="meal-macros">${m.kcal} kcal · ${m.p}g P · ${m.c}g C · ${m.f}g F · ${m.fib}g fiber</div>
        </div>`
      ).join("")}
    </div>
    <div class="section-block">
      <h3>Grocery List — Biweekly</h3>
      <p class="grocery-note">Computed for two full weeks of the plan as written. Snacks (S1/S2) assume a rough 4:3 split across the week — shift the cottage cheese/almonds vs. banana/whey quantities if you lean the other way.</p>
      ${groceryGroup(DATA.GROCERY_PANTRY, "grocery-pantry")}
      ${groceryGroup(DATA.GROCERY_FRESH, "grocery-fresh")}
    </div>
  `;
}

function renderRecovery(DATA) {
  const el = document.getElementById("view-recovery");
  el.innerHTML = `
    <div class="section-block">
      <h3>Weekly Protocol</h3>
      ${DATA.RECOVERY.map(
        (r) => `
        <div class="recovery-row">
          <div class="recovery-day">${r.day}</div>
          <div class="recovery-name">${r.name}</div>
          ${r.timing !== "—" ? `<div class="recovery-timing">${r.timing}</div>` : ""}
          <div class="recovery-line">🔥 ${r.sauna}</div>
          ${r.jacuzzi !== "—" ? `<div class="recovery-line">💧 ${r.jacuzzi}</div>` : ""}
          ${r.why ? `<p class="recovery-why">${r.why}</p>` : ""}
        </div>`
      ).join("")}
    </div>
    <div class="section-block">
      <h3>Non-Negotiables</h3>
      ${DATA.RECOVERY_RULES.map((r) => `<div class="rule">${r}</div>`).join("")}
    </div>
  `;
}

function showTab(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${name}`).classList.add("active");
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  const indicator = document.querySelector(".tab-indicator");
  const activeTab = document.querySelector(`.tab[data-tab="${name}"]`);
  if (indicator && activeTab) {
    indicator.style.width = `${activeTab.offsetWidth}px`;
    indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function mountApp(DATA) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => showTab(tab.dataset.tab));
  });

  renderToday(DATA);
  renderWeek(DATA);
  renderNutrition(DATA);
  renderRecovery(DATA);
  showTab("today");

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}
