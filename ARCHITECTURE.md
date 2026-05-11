# Architecture

This document covers the system architecture, project structure, data flow, and instructions for running the application locally.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│                                                              │
│   ┌──────────────────────┐    ┌───────────────────────────┐  │
│   │  Standalone Page     │    │  Embeddable Widget        │  │
│   │  /ui (index.html     │    │  embed.js — drop into     │  │
│   │   + widget.js)       │    │  any external webpage     │  │
│   └──────────┬───────────┘    └─────────────┬─────────────┘  │
│              │           CORS enabled        │               │
└──────────────┼───────────────────────────────┼───────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (app/)                     │
│                                                              │
│   POST /search ──── Semantic search + metadata filtering     │
│   GET  /journal/:id  Single journal lookup                   │
│   GET  /ui ───────── Serve standalone frontend               │
│   GET  /health ───── Service health check                    │
│                                                              │
│   ┌─────────────────────────────────────────────────┐        │
│   │         SemanticSearchEngine (search.py)         │        │
│   │                                                  │        │
│   │  1. Encode query → 384-dim vector               │        │
│   │  2. FAISS top-K nearest neighbor search          │        │
│   │  3. Map positions → journal IDs                  │        │
│   │  4. SQLite fetch + filter                        │        │
│   │  5. Return ordered results                       │        │
│   └──────────┬──────────────────────┬────────────────┘        │
│              │                      │                         │
│        ┌─────▼──────┐       ┌───────▼──────┐                 │
│        │   FAISS    │       │   SQLite     │                 │
│        │   Index    │       │   Database   │                 │
│        │            │       │              │                 │
│        │ embeddings │       │ ejournal.db  │                 │
│        │ .faiss     │       │ (metadata)   │                 │
│        └────────────┘       └──────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
library_chatbot/
│
├── app/                          # FastAPI application package
│   ├── __init__.py               # Exports the FastAPI app instance
│   ├── main.py                   # App setup, routes, middleware, startup
│   ├── config.py                 # Environment-driven configuration
│   ├── database.py               # SQLAlchemy engine + session factory
│   ├── models.py                 # Journal ORM model (SQLAlchemy)
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── search.py                 # SemanticSearchEngine (FAISS + model)
│   ├── utils.py                  # Text normalization + embedding text builder
│   └── static/                   # Frontend assets (served at /static)
│       ├── index.html            # Standalone search page
│       ├── widget.js             # JournalSearchWidget class
│       ├── embed.js              # Self-contained embeddable widget
│       └── styles.css            # All styles for standalone page + widget
│
├── scripts/                      # Offline tooling
│   └── index_data.py             # Build SQLite DB + FAISS index from Excel
│
├── data/                         # Generated data (not checked into git)
│   ├── ejournal.db               # SQLite database with journal metadata
│   ├── embeddings.faiss          # FAISS vector index
│   └── index_to_journal.pkl      # FAISS position → journal ID mapping
│
├── EJournals_database.xlsx       # Source dataset (Excel)
├── requirements.txt              # Python dependencies
└── .env.example                  # Environment variable template
```

---

## Module Breakdown

### `app/config.py`

Loads all configuration from environment variables with sensible defaults:

| Variable | Default | Purpose |
|---|---|---|
| `DATA_DIR` | `./data` | Directory for database and index files |
| `DATABASE_URL` | `sqlite:///./data/ejournal.db` | SQLAlchemy connection string |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Sentence Transformer model name |
| `FAISS_INDEX_PATH` | `./data/embeddings.faiss` | Path to the FAISS index file |
| `MAPPING_PATH` | `./data/index_to_journal.pkl` | Path to the ID mapping pickle |
| `TOP_K_DEFAULT` | `10` | Default number of results to return |

### `app/models.py`

Defines the `Journal` SQLAlchemy model mapping to the `journals` table:

| Column | Type | Description |
|---|---|---|
| `journal_id` | Integer (PK) | Auto-incremented primary key |
| `source_id` | String | Original ID from the dataset |
| `publication_title` | Text | Journal title |
| `subject_keywords` | Text | Subject keyword tags |
| `subjectname` | Text | Subject area name |
| `main_subject` | Text | Primary subject classification |
| `supergroup` | Text | High-level subject group |
| `publisher_name` | Text | Publisher |
| `coverage_y` | String | Coverage year range |
| `active_or_inactive_y` | String | Active/inactive status |
| `title_url` | Text | URL to the journal |
| `asjc_codes_y` | String | ASJC classification codes |
| `embedding_text` | Text | Combined text used for embedding |

### `app/schemas.py`

Pydantic models for API validation:

- **`SearchRequest`** — accepts `query` (required), plus optional `top_k`, `subject`, `active`, `year_min`, `year_max`.
- **`JournalItem`** — serializes a Journal ORM object to JSON (uses `model_config = ConfigDict(from_attributes=True)`).
- **`SearchResponse`** — wraps the query echo and a list of `JournalItem` results.

### `app/search.py` — `SemanticSearchEngine`

The core search class with these methods:

| Method | Description |
|---|---|
| `load()` | Reads the FAISS index and ID mapping from disk into memory |
| `embed(text)` | Normalizes text → encodes with Sentence Transformer → L2-normalizes the vector |
| `search(text, top_k, filters)` | Full search pipeline: embed → FAISS lookup → ID mapping → SQL fetch + filter → ordered results |
| `_apply_filters(query, filters)` | Appends `ilike` clauses to the SQLAlchemy query for subject and status |

### `app/utils.py`

Two utility functions:

- **`normalize_text(text)`** — strips whitespace, collapses multiple spaces, lowercases.
- **`build_embedding_text(row)`** — joins title, keywords, subject, main subject, supergroup, and publisher with `" | "` separators. Used during indexing.

### `app/main.py`

FastAPI application with:

- **Startup event** — creates DB tables, initializes and loads the `SemanticSearchEngine`.
- **CORS middleware** — allows all origins (required for cross-domain embedding).
- **Static file mount** — serves `/static` directory.
- **Routes**:
  - `GET /` — API info.
  - `GET /health` — health check.
  - `POST /search` — main search endpoint.
  - `GET /journal/{id}` — single journal lookup.
  - `GET /ui` — serves the standalone HTML page.

### `scripts/index_data.py`

Offline script that builds the entire search infrastructure from the Excel dataset:

1. Reads the `.xlsx` file with pandas.
2. Creates/recreates the SQLite database.
3. Normalizes each row and builds `Journal` ORM records.
4. Inserts all records into SQLite.
5. Generates 384-dim embeddings for each journal's combined text.
6. L2-normalizes vectors and builds a FAISS `IndexFlatIP` index.
7. Saves the FAISS index and the journal-ID-to-position mapping to disk.

---

## Data Flow

### Indexing (offline, one-time)

```
EJournals_database.xlsx
        │
        ▼
  pandas.read_excel()
        │
        ▼
  For each row:
    normalize_text() on each field
    build_embedding_text() → combined string
    Create Journal ORM object
        │
        ▼
  session.add_all(records) → SQLite (ejournal.db)
        │
        ▼
  SentenceTransformer.encode(all embedding texts)
        │
        ▼
  faiss.normalize_L2(vectors)
        │
        ▼
  faiss.IndexFlatIP(dim=384).add(vectors)
        │
        ▼
  Save: embeddings.faiss + index_to_journal.pkl
```

### Search (online, per request)

```
POST /search { "query": "...", "subject": "...", "active": "..." }
        │
        ▼
  normalize_text(query)
        │
        ▼
  SentenceTransformer.encode([query]) → 384-dim vector
        │
        ▼
  faiss.normalize_L2(vector)
        │
        ▼
  index.search(vector, top_k) → distances, positions
        │
        ▼
  Map positions → journal_ids via id_map[]
        │
        ▼
  SELECT * FROM journals WHERE journal_id IN (...)
    + optional: WHERE subjectname ILIKE '%...%'
    + optional: WHERE active_or_inactive_y ILIKE '%...%'
        │
        ▼
  Re-order SQL results to match FAISS ranking
        │
        ▼
  Return SearchResponse JSON
```

---

## API Reference

### `POST /search`

Perform a semantic search over the journal index.

**Request body** (JSON):

```json
{
  "query": "machine learning for healthcare",
  "top_k": 5,
  "subject": "Computer Science",
  "active": "active"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | ✅ | Natural language search query |
| `top_k` | integer | — | Number of results (default: 10) |
| `subject` | string | — | Filter by subject name (partial match) |
| `active` | string | — | Filter by status (`"active"` / `"inactive"`) |
| `year_min` | integer | — | Reserved for future use |
| `year_max` | integer | — | Reserved for future use |

**Response** (JSON):

```json
{
  "query": "machine learning for healthcare",
  "results": [
    {
      "journal_id": 42,
      "source_id": "12345",
      "publication_title": "journal of medical ai",
      "subject_keywords": "machine learning, healthcare",
      "subjectname": "medicine",
      "main_subject": "health sciences",
      "supergroup": "life sciences",
      "publisher_name": "elsevier",
      "coverage_y": "2010-2026",
      "active_or_inactive_y": "active",
      "title_url": "https://example.com/journal",
      "asjc_codes_y": "2700"
    }
  ]
}
```

### `GET /journal/{journal_id}`

Fetch a single journal by its database ID.

**Response**: A single `JournalItem` object (same schema as above).

### `GET /health`

Returns `{ "status": "ok" }`.

### `GET /ui`

Serves the standalone HTML search page.

---

## Frontend Architecture

### Standalone Page (`/ui`)

- **`index.html`** — minimal hero page with a call-to-action button.
- **`widget.js`** — `JournalSearchWidget` class that creates the full search UI:
  - Slide-in panel from the right edge of the screen.
  - Search input + filters (subject, status, year range).
  - Result cards with title (linked), publisher, subject, coverage, status.
  - Toggle via floating 🔍 button or the hero "Open Chatbot" button.
- **`styles.css`** — all styling for the hero page, widget panel, search form, result cards, and responsive breakpoints.

### Embeddable Widget

- **`embed.js`** — fully self-contained IIFE that:
  - Auto-detects the API base URL from its own script `src`.
  - Injects all CSS inline (no external stylesheet needed).
  - Creates a floating button + popup search panel.
  - Handles search, rendering, and error states independently.

**Usage on any external page:**

```html
<script src="https://your-domain.com/static/embed.js"></script>
```

---

## Running Locally

### Prerequisites

- Python 3.11 or newer
- pip

### 1. Clone and Set Up the Environment

```bash
git clone <repository-url>
cd library_chatbot

# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables (optional)

Copy the example and adjust if needed:

```bash
cp .env.example .env
```

The defaults work out of the box for local development — no changes needed unless you want to customize paths or the embedding model.

### 3. Build the Search Index

This reads the Excel dataset, populates the SQLite database, generates embeddings, and builds the FAISS index:

```bash
python scripts/index_data.py --input EJournals_database.xlsx --force
```

| Flag | Purpose |
|---|---|
| `--input` | Path to the Excel dataset (default: `EJournals_database.xlsx`) |
| `--force` | Drop and rebuild the database from scratch |
| `--batch-size` | Embedding batch size (default: 128) |

This produces three files in `data/`:
- `ejournal.db` — SQLite database
- `embeddings.faiss` — FAISS vector index
- `index_to_journal.pkl` — ID mapping

### 4. Start the Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The server will:
1. Create database tables (if not already present).
2. Load the FAISS index and ID mapping into memory.
3. Load the Sentence Transformer model.
4. Start accepting requests.

### 5. Use the Application

| URL | Description |
|---|---|
| `http://localhost:8000/ui` | Standalone search page with floating widget |
| `http://localhost:8000/docs` | Interactive Swagger API documentation |
| `http://localhost:8000/health` | Health check |

### 6. Test with curl

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "computer science journals", "top_k": 5}'
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | Web framework and API routing |
| `uvicorn[standard]` | ASGI server to run FastAPI |
| `sentence-transformers` | Local text embedding model |
| `faiss-cpu` | Vector similarity search |
| `sqlalchemy` | ORM for SQLite/PostgreSQL |
| `pydantic` | Request/response validation |
| `python-dotenv` | Load `.env` configuration files |
| `pandas` | Read Excel dataset during indexing |
| `openpyxl` | Excel file engine for pandas |
