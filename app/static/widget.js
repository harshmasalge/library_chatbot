class JournalSearchWidget {
  constructor(config = {}) {
    this.apiBaseUrl = config.apiBaseUrl || "http://localhost:8000";
    this.container = config.container || document.body;
    this.isOpen = false;
    this.currentQuery = "";
    this.currentResults = [];
    this.init();
  }

  init() {
    this.createWidgetHTML();
    this.attachEventListeners();
  }

  createWidgetHTML() {
    const widgetHTML = `
      <div class="widget-container">
        <button class="widget-toggle" aria-label="Toggle search widget">
          🔍
        </button>
        <div class="widget-panel">
          <div class="widget-header">
            <h3>E-Journal Search</h3>
            <button class="widget-close" aria-label="Close widget">✕</button>
          </div>
          <div class="widget-body">
            <div class="search-container">
              <div class="header">
                <h1>E-Journal Discovery</h1>
                <p>Discover relevant journals using natural language search.</p>
              </div>
              <form class="search-form" id="widgetSearchForm">
                <div class="search-input-group">
                  <input
                    type="text"
                    class="search-input"
                    id="widgetQueryInput"
                    placeholder="e.g., 'AI helping doctors', 'materials science journals after 2015'"
                    required
                  />
                  <button type="submit" class="search-button" id="widgetSearchBtn">Search</button>
                </div>
                <div class="filters">
                  <div class="filter-group">
                    <label for="widgetSubject">Subject (optional)</label>
                    <input type="text" id="widgetSubject" placeholder="e.g. Computer Science" />
                  </div>
                  <div class="filter-group">
                    <label for="widgetActive">Status (optional)</label>
                    <select id="widgetActive">
                      <option value="">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label for="widgetYearMin">Year Min (optional)</label>
                    <input type="number" id="widgetYearMin" placeholder="e.g. 2015" />
                  </div>
                  <div class="filter-group">
                    <label for="widgetYearMax">Year Max (optional)</label>
                    <input type="number" id="widgetYearMax" placeholder="e.g. 2026" />
                  </div>
                </div>
              </form>
              <div class="results" id="widgetResults" style="display: none">
                <div class="results-header">
                  <h2>Search Results</h2>
                  <span class="result-count" id="widgetResultCount"></span>
                </div>
                <div id="widgetResultsList"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const widgetDiv = document.createElement("div");
    widgetDiv.innerHTML = widgetHTML;
    this.container.appendChild(widgetDiv);

    this.elements = {
      toggle: widgetDiv.querySelector(".widget-toggle"),
      panel: widgetDiv.querySelector(".widget-panel"),
      close: widgetDiv.querySelector(".widget-close"),
      form: widgetDiv.querySelector("#widgetSearchForm"),
      query: widgetDiv.querySelector("#widgetQueryInput"),
      subject: widgetDiv.querySelector("#widgetSubject"),
      active: widgetDiv.querySelector("#widgetActive"),
      yearMin: widgetDiv.querySelector("#widgetYearMin"),
      yearMax: widgetDiv.querySelector("#widgetYearMax"),
      searchBtn: widgetDiv.querySelector("#widgetSearchBtn"),
      results: widgetDiv.querySelector("#widgetResults"),
      resultsList: widgetDiv.querySelector("#widgetResultsList"),
      resultCount: widgetDiv.querySelector("#widgetResultCount"),
    };
  }

  attachEventListeners() {
    console.log("Attaching event listeners to widget elements");
    console.log("Toggle button:", this.elements.toggle);
    console.log("Panel:", this.elements.panel);

    if (!this.elements.toggle) {
      console.error("Toggle button not found!");
      return;
    }

    this.elements.toggle.addEventListener("click", () => {
      console.log("Toggle clicked! Panel will be", this.isOpen ? "closed" : "open");
      this.togglePanel();
    });

    this.elements.close.addEventListener("click", () => {
      console.log("Close clicked!");
      this.togglePanel();
    });

    this.elements.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.search();
    });
  }

  togglePanel() {
    this.isOpen = !this.isOpen;
    this.elements.panel.classList.toggle("open");
    if (this.isOpen) {
      this.elements.query.focus();
    }
  }

  async search() {
    const query = this.elements.query.value.trim();
    if (!query) return;

    this.currentQuery = query;
    this.elements.results.style.display = 'block';
    this.elements.resultsList.innerHTML = '<div class="loading">Searching...</div>';
    this.elements.resultCount.textContent = '';

    const subject = this.elements.subject.value.trim() || null;
    const active = this.elements.active.value || null;
    const yearMinValue = this.elements.yearMin.value.trim();
    const yearMaxValue = this.elements.yearMax.value.trim();

    try {
      const response = await fetch(`${this.apiBaseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          top_k: 5,
          subject,
          active,
          year_min: yearMinValue ? parseInt(yearMinValue, 10) : null,
          year_max: yearMaxValue ? parseInt(yearMaxValue, 10) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      this.currentResults = data.results;
      this.renderResults();
    } catch (error) {
      this.elements.resultsList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  }

  renderResults() {
    if (this.currentResults.length === 0) {
      this.elements.resultsList.innerHTML = '<div class="no-results">No journals found. Try a different query.</div>';
      this.elements.resultCount.textContent = '0 results';
      this.elements.results.style.display = 'block';
      return;
    }

    const html = this.currentResults
      .map(
        (journal) => `
      <div class="journal-item">
        <div class="journal-title">
          ${journal.title_url ? `<a href="${this.escapeHtml(journal.title_url)}" target="_blank">${this.escapeHtml(journal.publication_title)}</a>` : this.escapeHtml(journal.publication_title)}
        </div>
        <div class="journal-meta">
          ${journal.publisher_name ? `<div class="meta-item"><span class="meta-label">Publisher</span><span class="meta-value">${this.escapeHtml(journal.publisher_name)}</span></div>` : ""}
          ${journal.subjectname ? `<div class="meta-item"><span class="meta-label">Subject</span><span class="meta-value">${this.escapeHtml(journal.subjectname)}</span></div>` : ""}
          ${journal.main_subject ? `<div class="meta-item"><span class="meta-label">Main Subject</span><span class="meta-value">${this.escapeHtml(journal.main_subject)}</span></div>` : ""}
          ${journal.coverage_y ? `<div class="meta-item"><span class="meta-label">Coverage</span><span class="meta-value">${this.escapeHtml(journal.coverage_y)}</span></div>` : ""}
          ${journal.active_or_inactive_y ? `<div class="meta-item"><span class="meta-label">Status</span><span class="meta-value">${this.escapeHtml(journal.active_or_inactive_y)}</span></div>` : ""}
        </div>
      </div>
    `
      )
      .join("");

    this.elements.resultsList.innerHTML = html;
    this.elements.resultCount.textContent = `${this.currentResults.length} result${this.currentResults.length === 1 ? "" : "s"}`;
    this.elements.results.style.display = 'block';
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }
}

// Initialize widget if script is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.JournalSearchWidget = JournalSearchWidget;
  });
} else {
  window.JournalSearchWidget = JournalSearchWidget;
}
