// =========================
// SCRIPT.JS - Frontend for Promptoria
// =========================

// --- Helper: safe query ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// --- Elements ---
const goalInput      = $("#goal");
const platformSelect = $("#platform");
const toneSelect     = $("#tone");
const styleSelect    = $("#style");
const contextSelect  = $("#context");
const output         = $("#output");
const button         = $("#generate");
const saveBtn        = $("#savePromptBtn");
const promptList     = $("#promptList");
const sidebar        = $(".sidebar-overlay");
const toggleBtn      = $(".sidebar-toggle");
const navButtons     = $$("button[data-section]");
const sections       = {};

// --- Build sections object ---
navButtons.forEach(btn => {
  const id = btn.dataset.section;
  if (id) {
    const sec = document.getElementById(id);
    if (sec) sections[id] = sec;
  }
});

// --- Backend URL ---
const BACKEND_URL = "https://promptoria-ly2b.onrender.com";

// ----------------------------
// Sidebar toggle & mobile support
// ----------------------------
if (sidebar && toggleBtn) {
  const BACKDROP_ZINDEX = 999;

  // Create backdrop for mobile
  let backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  document.body.appendChild(backdrop);

  const setSidebarPosition = (active) => {
    if (window.innerWidth < 900) {
      // Mobile overlay mode
      sidebar.classList.toggle("active", active);
      backdrop.classList.toggle("active", active);
      toggleBtn.style.left = active ? (sidebar.getBoundingClientRect().width + 20) + "px" : "20px";
    } else {
      // Desktop: shift main content
      sidebar.classList.toggle("active", active);
      document.querySelector(".main-content").style.marginLeft = active ? "240px" : "0";
      toggleBtn.style.left = active ? "260px" : "20px";
    }
  };

  // Toggle button click
  toggleBtn.addEventListener("click", () => {
    const active = !sidebar.classList.contains("active");
    setSidebarPosition(active);
  });

  // Close sidebar by clicking backdrop (mobile only)
  backdrop.addEventListener("click", () => setSidebarPosition(false));

  // Optional: swipe gestures (mobile only)
  let startX = 0;
  let isDragging = false;

  document.addEventListener("touchstart", e => {
    if (window.innerWidth >= 900) return;
    startX = e.touches[0].clientX;
    isDragging = startX < 30; // start from left edge
  });

  document.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - startX;
    if (delta > 50) setSidebarPosition(true);
    if (delta < -50) setSidebarPosition(false);
  });

  document.addEventListener("touchend", () => { isDragging = false; });
}


// --- Navigation ---
const setActiveSection = (id) => {
  navButtons.forEach(b => b.dataset.section === id ? b.classList.add("active") : b.classList.remove("active"));
  Object.keys(sections).forEach(k => sections[k].classList.toggle("active", k === id));
};

const firstBtn = navButtons.find(b => b.classList.contains("active")) || navButtons[0];
if (firstBtn && firstBtn.dataset.section) setActiveSection(firstBtn.dataset.section);

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.section;
    if (!id) return;
    setActiveSection(id);
    if (sidebar && window.innerWidth < 900) {
      sidebar.classList.remove("active");
      toggleBtn.style.left = "20px";
    }
  });
});

// --- Generate optimized prompt ---
if (button) {
  button.addEventListener("click", async () => {
    if (!goalInput) return;
    const goal = goalInput.value.trim();
    if (!goal) { output.textContent = "⚠️ Please enter your goal first."; return; }

    const payload = {
      goal,
      platform: platformSelect?.value || "",
      tone: toneSelect?.value || "",
      style: styleSelect?.value || "",
      context: contextSelect?.value || ""
    };

    output.textContent = "✨ Optimizing your prompt...";

    try {
      const res = await fetch(`${BACKEND_URL}/api/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      output.textContent = data.optimizedPrompt || "⚠️ Error optimizing prompt.";
      if (saveBtn) saveBtn.style.display = "inline-block";
    } catch (err) {
      console.error(err);
      output.textContent = "❌ Server error. Make sure the backend is running.";
    }
  });
}

// --- Prompt library ---
function renderLibrary() {
  if (!promptList) return;
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  promptList.innerHTML = library.length ? "" : "<p style='opacity:.7'>No prompts saved yet.</p>";

  library.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "prompt-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:0.95rem">${item.platform || "—"}</strong>
        <small style="opacity:.7">${new Date(item.timestamp).toLocaleString()}</small>
      </div>
      <pre style="margin:10px 0 12px; white-space:pre-wrap;">${escapeHtml(item.prompt)}</pre>
      <div style="display:flex;gap:8px;">
        <button class="use-btn" data-idx="${idx}">Use</button>
        <button class="del-btn" data-idx="${idx}">Delete</button>
      </div>
    `;
    promptList.appendChild(card);
  });

  $$(".use-btn").forEach(b => b.addEventListener("click", e => reusePrompt(Number(e.currentTarget.dataset.idx))));
  $$(".del-btn").forEach(b => b.addEventListener("click", e => deletePrompt(Number(e.currentTarget.dataset.idx))));
}

function savePrompt() {
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  library.push({
    prompt: output.textContent || "",
    platform: platformSelect?.value || "",
    tone: toneSelect?.value || "",
    style: styleSelect?.value || "",
    timestamp: new Date().toISOString()
  });
  localStorage.setItem("promptLibrary", JSON.stringify(library));
  renderLibrary();
}

function reusePrompt(idx) {
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  if (!library[idx]) return;
  goalInput.value = library[idx].prompt;
}

function deletePrompt(idx) {
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  library.splice(idx, 1);
  localStorage.setItem("promptLibrary", JSON.stringify(library));
  renderLibrary();
}

if (saveBtn) saveBtn.addEventListener("click", savePrompt);

// --- Search Filter ---
const searchBox = $("#searchBox") || $("#searchPrompts");
if (searchBox && promptList) {
  searchBox.addEventListener("input", e => {
    const q = e.target.value.toLowerCase().trim();
    const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
    const results = library.filter(item => (item.prompt || "").toLowerCase().includes(q));
    promptList.innerHTML = results.length ? "" : "<p style='opacity:.7'>No matches.</p>";
    results.forEach(item => {
      const d = document.createElement("div");
      d.className = "prompt-card";
      d.innerHTML = `<pre style="white-space:pre-wrap;">${escapeHtml(item.prompt)}</pre>`;
      promptList.appendChild(d);
    });
  });
}

// --- Mobile swipe / overlay ---
let startX = 0;
let isDragging = false;

// Create backdrop
let backdrop = document.createElement("div");
backdrop.className = "sidebar-backdrop";
document.body.appendChild(backdrop);

// Swipe gestures for mobile
document.addEventListener("touchstart", e => {
  if (window.innerWidth >= 900) return; // only mobile
  startX = e.touches[0].clientX;
  isDragging = startX < 30; // start drag from very left edge
});

document.addEventListener("touchmove", e => {
  if (!isDragging) return;
  const touchX = e.touches[0].clientX;
  const delta = touchX - startX;

  if (delta > 50) { // swipe right to open
    sidebar.classList.add("active");
    backdrop.classList.add("active");
    toggleBtn.style.left = "calc(200px + 20px)";
  }
  if (delta < -50) { // swipe left to close
    sidebar.classList.remove("active");
    backdrop.classList.remove("active");
    toggleBtn.style.left = "20px";
  }
});

document.addEventListener("touchend", () => {
  isDragging = false;
});

// Backdrop click closes sidebar
backdrop.addEventListener("click", () => {
  sidebar.classList.remove("active");
  backdrop.classList.remove("active");
  toggleBtn.style.left = "20px";
});


// --- Utilities ---
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Init ---
window.addEventListener("load", renderLibrary);
