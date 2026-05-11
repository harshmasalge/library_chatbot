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
                    <label for="widgetCollectionName">Collection (optional)</label>
                    <select id="widgetCollectionName">
                      <option value="">All Collections</option>
                      <option value="AAAS- Science">AAAS- Science</option>
                      <option value="ACM Digital Library">ACM Digital Library</option>
                      <option value="American Chemical Society Journals">American Chemical Society Journals</option>
                      <option value="American Institute of Aeronautics and Astronautics (AIAA) Journals">American Institute of Aeronautics and Astronautics (AIAA) Journals</option>
                      <option value="American Institute of Physics Journals">American Institute of Physics Journals</option>
                      <option value="American Mathematical Society Journals">American Mathematical Society Journals</option>
                      <option value="American Meteorological Society">American Meteorological Society</option>
                      <option value="American Physical Society - ALL">American Physical Society - ALL</option>
                      <option value="American Society for Microbiology Journals">American Society for Microbiology Journals</option>
                      <option value="Annual Reviews Journals">Annual Reviews Journals</option>
                      <option value="ASCE Journals Online">ASCE Journals Online</option>
                      <option value="ASME Journals Online">ASME Journals Online</option>
                      <option value="Bentham Science Journals">Bentham Science Journals</option>
                      <option value="BMJ Journals">BMJ Journals</option>
                      <option value="Cambridge University Press Journals">Cambridge University Press Journals</option>
                      <option value="Canadian Science Publishing">Canadian Science Publishing</option>
                      <option value="Cold Spring Harbor Laboratory Press Journals">Cold Spring Harbor Laboratory Press Journals</option>
                      <option value="Duke University Press">Duke University Press</option>
                      <option value="Elsevier ScienceDirect Journals">Elsevier ScienceDirect Journals</option>
                      <option value="Emerald Publishing Journals">Emerald Publishing Journals</option>
                      <option value="GeoScience World + GeoRef (GSW)">GeoScience World + GeoRef (GSW)</option>
                      <option value="ICE Publishing Journals">ICE Publishing Journals</option>
                      <option value="IEEE Journals">IEEE Journals</option>
                      <option value="Inderscience Enterprises Ltd.">Inderscience Enterprises Ltd.</option>
                      <option value="IndianJournals.com">IndianJournals.com</option>
                      <option value="Institute of Physics Journals">Institute of Physics Journals</option>
                      <option value="JSTOR">JSTOR</option>
                      <option value="Lippincott Williams & Wilkins (Wolters Kluwer) Journals">Lippincott Williams & Wilkins (Wolters Kluwer) Journals</option>
                      <option value="MITCogNet">MITCogNet</option>
                      <option value="National Academy of Sciences">National Academy of Sciences</option>
                      <option value="now publishers">now publishers</option>
                      <option value="Oxford University Press Journals">Oxford University Press Journals</option>
                      <option value="Project Euclid Prime">Project Euclid Prime</option>
                      <option value="Project Muse">Project Muse</option>
                      <option value="Royal Society of Chemistry (RSC) Journals">Royal Society of Chemistry (RSC) Journals</option>
                      <option value="Sage Publishing Journals">Sage Publishing Journals</option>
                      <option value="SIAM">SIAM</option>
                      <option value="SPIE Digital Library">SPIE Digital Library</option>
                      <option value="Springer Nature Journals">Springer Nature Journals</option>
                      <option value="Taylor and Francis Journals">Taylor and Francis Journals</option>
                      <option value="Techno Press">Techno Press</option>
                      <option value="Thieme Journals">Thieme Journals</option>
                      <option value="University of Chicago Press">University of Chicago Press</option>
                      <option value="Wiley Journals">Wiley Journals</option>
                      <option value="World Scientific Publishing Journals">World Scientific Publishing Journals</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label for="widgetMainSubject">Main Subject (optional)</label>
                    <input type="text" id="widgetMainSubject" placeholder="e.g. Life Sciences" />
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
      collectionName: widgetDiv.querySelector("#widgetCollectionName"),
      mainSubject: widgetDiv.querySelector("#widgetMainSubject"),
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
    const collectionname = this.elements.collectionName.value || null;
    const main_subject = this.elements.mainSubject.value.trim() || null;

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
          collectionname,
          main_subject,
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
          ${journal.collectionname ? `<div class="meta-item"><span class="meta-label">Collection</span><span class="meta-value">${this.escapeHtml(journal.collectionname)}</span></div>` : ""}
          ${journal.subjectname ? `<div class="meta-item"><span class="meta-label">Subject</span><span class="meta-value">${this.escapeHtml(journal.subjectname)}</span></div>` : ""}
          ${journal.main_subject ? `<div class="meta-item"><span class="meta-label">Main Subject</span><span class="meta-value">${this.escapeHtml(journal.main_subject)}</span></div>` : ""}
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
