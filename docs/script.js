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

// --- Backend URL ---
const BACKEND_URL = "https://promptoria-ly2b.onrender.com";

// ----------------------------
// Generate optimized prompt
// ----------------------------
if (button) {
  button.addEventListener("click", async () => {
    if (!goalInput) return;

    const goal = goalInput.value.trim();
    if (!goal) {
      if (output) output.textContent = "⚠️ Please enter your goal first.";
      return;
    }

    const payload = {
      goal,
      platform: platformSelect?.value || "",
      tone: toneSelect?.value || "",
      style: styleSelect?.value || "",
      context: contextSelect?.value || ""
    };

    if (output) output.textContent = "✨ Optimizing your prompt...";

    try {
      const res = await fetch(`${BACKEND_URL}/api/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (output) output.textContent = data.optimizedPrompt || "⚠️ Error optimizing prompt.";
      if (saveBtn) saveBtn.style.display = "inline-block";
    } catch (err) {
      console.error(err);
      if (output) output.textContent = "❌ Server error. Make sure the backend is running.";
    }
  });
}

// ----------------------------
// Save / load prompt library
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
    platform: platformSelect?.value || "",
    tone: toneSelect?.value || "",
    style: styleSelect?.value || "",
    timestamp: new Date().toISOString()
  };
  library.push(newPrompt);
  localStorage.setItem("promptLibrary", JSON.stringify(library));
  renderLibrary();
}

function reusePrompt(index) {
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  if (!library[index]) return;
  goalInput.value = library[index].prompt;
}

function deletePrompt(index) {
  const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
  library.splice(index, 1);
  localStorage.setItem("promptLibrary", JSON.stringify(library));
  renderLibrary();
}

if (saveBtn) saveBtn.addEventListener("click", savePrompt);

// ----------------------------
// Simple search filter
// ----------------------------
const searchBox = $("#searchBox") || $("#searchPrompts");
if (searchBox && promptList) {
  searchBox.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const library = JSON.parse(localStorage.getItem("promptLibrary")) || [];
    const results = library.filter(item => (item.prompt || "").toLowerCase().includes(q));
    promptList.innerHTML = "";
    if (!results.length) promptList.innerHTML = "<p style='opacity:.7'>No matches.</p>";
    results.forEach((item) => {
      const d = document.createElement("div");
      d.className = "prompt-card";
      d.innerHTML = `<pre style="white-space:pre-wrap;">${escapeHtml(item.prompt)}</pre>`;
      promptList.appendChild(d);
    });
  });
}

// ----------------------------
// Utilities
// ----------------------------
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Initialize library on load
window.addEventListener("load", renderLibrary);
