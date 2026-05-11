/*!
 * IITGN E-Journal Search Widget Embed
 * Drop this single <script> tag into any webpage to embed the floating search widget
 * Usage: <script src="https://your-domain.com/static/embed.js"></script>
 */

(function () {
  // Detect API base URL from script source
  const scripts = document.getElementsByTagName("script");
  let apiBaseUrl = "http://localhost:8000";

  for (const script of scripts) {
    if (script.src.includes("embed.js")) {
      apiBaseUrl = script.src.split("/static/")[0];
      break;
    }
  }

  // Inject CSS
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --primary-color: #1f2937;
      --accent-color: #3b82f6;
      --text-light: #f3f4f6;
      --border-color: #e5e7eb;
      --shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }

    .ejournal-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 9999;
    }

    .ejournal-widget-toggle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--accent-color);
      border: none;
      cursor: pointer;
      color: white;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ejournal-widget-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
    }

    .ejournal-widget-panel {
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 380px;
      max-height: 600px;
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow);
      display: none;
      flex-direction: column;
      opacity: 0;
      transform: scale(0.9) translateY(10px);
      transition: all 0.3s;
    }

    .ejournal-widget-panel.open {
      display: flex;
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    .ejournal-widget-header {
      background: var(--primary-color);
      color: white;
      padding: 16px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ejournal-widget-header h3 {
      font-size: 1rem;
      margin: 0;
    }

    .ejournal-widget-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 20px;
    }

    .ejournal-widget-body {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
    }

    .ejournal-widget-search {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .ejournal-widget-search input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .ejournal-widget-search button {
      padding: 8px 16px;
      background: var(--accent-color);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .ejournal-widget-results {
      max-height: 400px;
      overflow-y: auto;
    }

    .ejournal-widget-result-item {
      padding: 12px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background 0.2s;
    }

    .ejournal-widget-result-item:hover {
      background: #f3f4f6;
    }

    .ejournal-widget-result-title {
      font-weight: 600;
      color: var(--accent-color);
      font-size: 0.9rem;
      margin-bottom: 4px;
    }

    .ejournal-widget-result-meta {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .ejournal-widget-loading {
      padding: 20px;
      text-align: center;
      color: #6b7280;
    }

    .ejournal-widget-error {
      padding: 12px;
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    @media (max-width: 480px) {
      .ejournal-widget-panel {
        width: calc(100vw - 40px);
        max-width: 380px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create widget HTML
  function createWidget() {
    const widgetHTML = `
      <div class="ejournal-widget-container">
        <button class="ejournal-widget-toggle" aria-label="Toggle e-journal search">
          🔍
        </button>
        <div class="ejournal-widget-panel">
          <div class="ejournal-widget-header">
            <h3>E-Journal Search</h3>
            <button class="ejournal-widget-close" aria-label="Close">✕</button>
          </div>
          <div class="ejournal-widget-body">
            <div class="ejournal-widget-search">
              <input 
                type="text" 
                placeholder="Search journals..." 
                class="ejournal-query"
                aria-label="Search query"
              />
              <button class="ejournal-search-btn">Search</button>
            </div>
            <div class="ejournal-widget-results"></div>
          </div>
        </div>
      </div>
    `;

    const widgetDiv = document.createElement("div");
    widgetDiv.innerHTML = widgetHTML;
    document.body.appendChild(widgetDiv);

    const elements = {
      toggle: document.querySelector(".ejournal-widget-toggle"),
      panel: document.querySelector(".ejournal-widget-panel"),
      close: document.querySelector(".ejournal-widget-close"),
      query: document.querySelector(".ejournal-query"),
      searchBtn: document.querySelector(".ejournal-search-btn"),
      results: document.querySelector(".ejournal-widget-results"),
    };

    // Event listeners
    elements.toggle.addEventListener("click", togglePanel);
    elements.close.addEventListener("click", togglePanel);
    elements.searchBtn.addEventListener("click", performSearch);
    elements.query.addEventListener("keydown", (e) => {
      if (e.key === "Enter") performSearch();
    });

    let isOpen = false;
    function togglePanel() {
      isOpen = !isOpen;
      elements.panel.classList.toggle("open");
      if (isOpen) {
        elements.query.focus();
      }
    }

    async function performSearch() {
      const query = elements.query.value.trim();
      if (!query) return;

      elements.results.innerHTML = '<div class="ejournal-widget-loading">Searching...</div>';

      try {
        const response = await fetch(`${apiBaseUrl}/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            top_k: 5,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        renderResults(data.results);
      } catch (error) {
        elements.results.innerHTML = `<div class="ejournal-widget-error">Error: ${escapeHtml(error.message)}</div>`;
      }
    }

    function renderResults(results) {
      if (results.length === 0) {
        elements.results.innerHTML = '<div class="ejournal-widget-loading">No results found.</div>';
        return;
      }

      const html = results
        .map(
          (journal) => `
        <div class="ejournal-widget-result-item">
          <div class="ejournal-widget-result-title">${escapeHtml(journal.publication_title)}</div>
          ${journal.publisher_name ? `<div class="ejournal-widget-result-meta">Publisher: ${escapeHtml(journal.publisher_name)}</div>` : ""}
          ${journal.subjectname ? `<div class="ejournal-widget-result-meta">Subject: ${escapeHtml(journal.subjectname)}</div>` : ""}
          ${journal.title_url ? `<a href="${escapeHtml(journal.title_url)}" target="_blank" style="font-size: 0.8rem; color: #3b82f6;">Visit →</a>` : ""}
        </div>
      `
        )
        .join("");

      elements.results.innerHTML = html;
    }

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text || "";
      return div.innerHTML;
    }
  }

  // Initialize widget when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
