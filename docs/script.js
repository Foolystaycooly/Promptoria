// =========================
// SCRIPT.JS - Full version
// =========================

// --- Helper: safe query ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// --- Elements (core) ---
const goalInput     = $("#goal");
const platformSelect= $("#platform");
const toneSelect    = $("#tone");
const styleSelect   = $("#style");
const contextSelect = $("#context");
const output        = $("#output");
const button        = $("#generate");
const saveBtn       = $("#savePromptBtn");      // may be null if not in HTML
const promptList    = $("#promptList");         // must exist for library to work

// --- Sidebar & UI ---
const sidebar       = $(".sidebar-overlay") || $("#sidebar") || null;
const toggleBtn     = $("#sidebarToggle");
const sidebarLogo   = $("#sidebarLogo");

// find nav buttons (support different markup possibilities)
let navButtons = $$(".sidebar-btn");
if (!navButtons.length) {
  navButtons = $$(".nav-tabs .tab");
}
if (!navButtons.length) {
  // fallback: any button with data-section attribute
  navButtons = $$("button[data-section]");
}

// Find sections by ids referenced in data-section attributes
const sections = {};
navButtons.forEach(btn => {
  const id = btn.dataset.section;
  if (id) {
    const sec = document.getElementById(id);
    if (sec) sections[id] = sec;
  }
});

// --- Defensive checks ---
if (!button) console.warn("Warning: #generate button not found.");
if (!output)  console.warn("Warning: #output element not found.");
if (!promptList) console.warn("Warning: #promptList element not found. Library will not render.");
if (!toggleBtn) console.warn("Warning: #sidebarToggle not found. Sidebar toggle disabled.");
if (!sidebar) console.warn("Warning: sidebar element (.sidebar-overlay or #sidebar) not found.");
if (!sidebarLogo) console.warn("Warning: #sidebarLogo not found. Logo wave disabled.");

// ----------------------------
// Sidebar toggle & toggle button position
// ----------------------------
if (toggleBtn && sidebar) {
  // ensure toggle button is above everything
  toggleBtn.style.zIndex = 1200;

  // click toggles class and moves toggle button to edge
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");

    // move toggle button so it visually sits outside sidebar when open
    if (sidebar.classList.contains("active")) {
      // match sidebar width + small gap
      const sidebarWidth = sidebar.getBoundingClientRect().width || 240;
      toggleBtn.style.left = (sidebarWidth + 20) + "px";
      toggleBtn.setAttribute("aria-expanded", "true");
    } else {
      toggleBtn.style.left = "20px";
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  // close sidebar when clicking outside (optional, subtle)
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains("active")) {
      sidebar.classList.remove("active");
      toggleBtn.style.left = "20px";
    }
  });
}

// ----------------------------
// Logo: build wave letters (vertical float)
// ----------------------------
if (sidebarLogo) {
  const logoText = "Promptoria"; // your name
  sidebarLogo.innerHTML = "";    // clear existing

  [...logoText].forEach((ch, i) => {
    const span = document.createElement("span");
    span.textContent = ch;
    span.style.display = "inline-block";
    span.style.animation = "floatWave 1.6s ease-in-out infinite";
    span.style.animationDelay = `${i * 0.08}s`;
    // subtle letter spacing so wave reads nicely
    span.style.marginRight = "1px";
    sidebarLogo.appendChild(span);
  });
}

// ----------------------------
// Sidebar navigation: show/hide sections
// ----------------------------
if (navButtons.length && Object.keys(sections).length) {
  // helper to set active
  const setActiveSection = (id) => {
    // activate button
    navButtons.forEach(b => {
      if (b.dataset.section === id) b.classList.add("active");
      else b.classList.remove("active");
    });
    // show section
    Object.keys(sections).forEach(k => sections[k].classList.toggle("active", k === id));
  };

  // initialize: show first nav's section if none active
  const firstBtn = navButtons.find(b => b.classList.contains("active")) || navButtons[0];
  if (firstBtn && firstBtn.dataset.section) setActiveSection(firstBtn.dataset.section);

  // click handlers
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.section;
      if (!id) return;
      setActiveSection(id);
      // close sidebar on small screens for better UX
      if (sidebar && window.innerWidth < 900) {
        sidebar.classList.remove("active");
        if (toggleBtn) toggleBtn.style.left = "20px";
      }
    });
  });
}

// ----------------------------
// Prompt generator (existing)
// ----------------------------
if (button) {
  button.addEventListener("click", async () => {
    if (!goalInput) return;
    const goal = goalInput.value.trim();
    if (!goal) { if (output) output.textContent = "⚠️ Please enter your goal first."; return; }

    const payload = {
      goal,
      platform: platformSelect ? platformSelect.value : "",
      tone: toneSelect ? toneSelect.value : "",
      style: styleSelect ? styleSelect.value : "",
      context: contextSelect ? contextSelect.value : ""
    };

    if (output) output.textContent = "✨ Optimizing your prompt...";

    try {
      const res = await fetch("http://localhost:3000/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (output) output.textContent = data.optimizedPrompt || "⚠️ Error optimizing prompt.";
      if (saveBtn) saveBtn.style.display = "inline-block";
    } catch (err) {
      if (output) output.textContent = "❌ Server error. Make sure it's running.";
      console.error(err);
    }
  });
}

// ----------------------------
// Library: save / load / reuse / delete
// ----------------------------
function renderLibrary() {
  if (!promptList) return;
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  promptList.innerHTML = "";

  if (!library.length) {
    promptList.innerHTML = "<p style='opacity:.7'>No prompts saved yet.</p>";
    return;
  }

  library.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "prompt-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:0.95rem">${item.platform || "—"}</strong>
        <small style="opacity:.7">${new Date(item.timestamp).toLocaleString()}</small>
      </div>
      <pre style="margin:10px 0 12px; white-space:pre-wrap;">${escapeHtml(item.prompt || "")}</pre>
      <div style="display:flex;gap:8px;">
        <button class="use-btn" data-idx="${idx}">Use</button>
        <button class="del-btn" data-idx="${idx}">Delete</button>
      </div>
    `;
    promptList.appendChild(card);
  });

  // attach handlers (delegation alternative)
  $$(".use-btn").forEach(b => b.addEventListener("click", (e) => {
    const i = Number(e.currentTarget.dataset.idx);
    reusePrompt(i);
  }));
  $$(".del-btn").forEach(b => b.addEventListener("click", (e) => {
    const i = Number(e.currentTarget.dataset.idx);
    deletePrompt(i);
  }));
}

function savePrompt() {
  if (!output) return;
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  const newPrompt = {
    prompt: output.textContent || "",
    platform: platformSelect ? platformSelect.value : "",
    tone: toneSelect ? toneSelect.value : "",
    style: styleSelect ? styleSelect.value : "",
    timestamp: new Date().toISOString()
  };
  library.push(newPrompt);
  localStorage.setItem("promptLibrary", JSON.stringify(library));
  renderLibrary();
}

function reusePrompt(index) {
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  if (!library[index]) return;
  if (goalInput) goalInput.value = library[index].prompt;
  // switch to generator section if available
  const genBtn = navButtons.find(b => b.dataset.section === "generator" || b.dataset.section === "generator-section");
  if (genBtn) genBtn.click();
}

function deletePrompt(index) {
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  library.splice(index, 1);
  localStorage.setItem("promptLibrary", JSON.stringify(library));
  renderLibrary();
}

// Attach save click
if (saveBtn) saveBtn.addEventListener("click", savePrompt);

// ----------------------------
// Simple Search Filter (searches prompt body)
 // ----------------------------
const searchBox = $("#searchBox") || $("#searchPrompts");
if (searchBox && promptList) {
  searchBox.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const lib = JSON.parse(localStorage.getItem("promptLibrary")) || [];
    const results = lib.filter(item => (item.prompt || "").toLowerCase().includes(q));
    // render results temporarily
    promptList.innerHTML = "";
    if (!results.length) { promptList.innerHTML = "<p style='opacity:.7'>No matches.</p>"; return; }
    results.forEach((item, idx) => {
      const d = document.createElement("div");
      d.className = "prompt-card";
      d.innerHTML = `<pre style="white-space:pre-wrap;">${escapeHtml(item.prompt)}</pre>`;
      promptList.appendChild(d);
    });
  });
}

// ----------------------------
// Utilities & init
// ----------------------------
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

window.addEventListener("load", () => {
  renderLibrary();
  // if sections exist, ensure at least one visible
  if (Object.keys(sections).length && !Object.values(sections).some(s => s.classList.contains("active"))) {
    // activate first section key
    const first = Object.keys(sections)[0];
    if (first) {
      const btn = navButtons.find(b => b.dataset.section === first);
      if (btn) btn.classList.add("active");
      sections[first].classList.add("active");
    }
  }
});
