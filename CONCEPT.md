# How It Works — Concept Guide

This document explains the core ideas behind the IITGN E-Journal Discovery Assistant: what problem it solves, the approach it takes, and how each piece fits together.

---

## The Problem

The IITGN library provides access to thousands of electronic journals across every academic discipline. Finding the right journal traditionally requires exact keyword searches — a user must already know the precise title, subject code, or publisher name. This fails when a researcher has a vague intent like *"AI helping doctors"* or *"recent materials science journals"*.

## The Solution — Semantic Search

Instead of matching keywords character-by-character, this system understands the **meaning** behind a query. It uses a technique called **semantic similarity search** that works in three stages:

1. **Encode** every journal's metadata into a numerical fingerprint (an *embedding vector*).
2. **Encode** the user's natural-language query into the same kind of vector.
3. **Compare** the query vector against all journal vectors and return the closest matches.

Because the vectors capture meaning rather than exact words, a query like *"machine learning for healthcare"* will surface journals about medical AI, clinical informatics, and health data science — even if those exact words never appear in the journal title.

---

## Key Concepts

### 1. Embedding Text

Each journal has multiple metadata fields — title, subject keywords, main subject, supergroup, publisher, etc. During indexing, these fields are combined into a single **embedding text** string:

```
publication_title | subject_keywords | subjectname | main_subject | supergroup | publisher_name
```

For example, a journal might produce:

```
nature medicine | clinical medicine, immunology | medicine | health sciences | life sciences | springer nature
```

This combined string is what gets converted into a vector. Joining multiple fields gives the embedding model richer context about each journal.

### 2. Sentence Transformer Model

The system uses **`all-MiniLM-L6-v2`**, a lightweight model from the Sentence Transformers library. This model:

- Runs entirely **locally** — no API calls, no cloud services, no cost.
- Converts any text into a **384-dimensional vector**.
- Is trained to place semantically similar texts close together in vector space.

When the user searches for *"robotics journals"*, the model produces a vector that sits near vectors for journals about automation, mechatronics, and control systems — because those concepts are semantically related.

### 3. FAISS Vector Index

[FAISS](https://github.com/facebookresearch/faiss) (Facebook AI Similarity Search) is a library purpose-built for fast nearest-neighbor lookups over large sets of vectors. The system uses a **Flat Inner Product** index (`IndexFlatIP`), which:

- Stores all journal vectors in a single flat index file (`embeddings.faiss`).
- Performs an **exact** nearest-neighbor search using cosine similarity (vectors are L2-normalized before indexing, so inner product equals cosine similarity).
- Returns the top-K most similar journals in milliseconds, even across tens of thousands of entries.

### 4. Metadata Filtering

Semantic search alone finds conceptually relevant journals, but users often want to narrow results further — for example, only active journals, or only journals in Computer Science. The system applies **post-retrieval SQL filters** on the metadata stored in SQLite:

- **Subject filter** — matches against the `subjectname` column (case-insensitive partial match).
- **Status filter** — filters by active/inactive status.

The flow is: FAISS returns the top-K candidate IDs → SQLite fetches those rows and applies any active filters → results are returned in the original similarity-ranked order.

### 5. ID Mapping

FAISS stores vectors by sequential integer position (0, 1, 2, …), but journals in the database have their own primary key IDs. A **pickle mapping file** (`index_to_journal.pkl`) bridges the two: position `i` in the FAISS index corresponds to `journal_ids[i]` in the database. This mapping is built once during indexing and loaded into memory at startup.

---

## Two-Phase Workflow

### Phase A — Offline Indexing (run once)

```
Excel Dataset
    ↓
Read rows, normalize text, combine fields
    ↓
Insert metadata into SQLite (ejournal.db)
    ↓
Generate 384-dim embedding for each journal (all-MiniLM-L6-v2)
    ↓
L2-normalize vectors
    ↓
Build FAISS IndexFlatIP and save to disk (embeddings.faiss)
    ↓
Save journal ID → FAISS position mapping (index_to_journal.pkl)
```

This is done by running `scripts/index_data.py`. It only needs to be re-run when the journal dataset changes.

### Phase B — Online Search (every user query)

```
User types: "AI helping doctors"
    ↓
Frontend sends POST /search { query, filters }
    ↓
Backend encodes query into 384-dim vector (same model)
    ↓
FAISS finds top-K nearest journal vectors
    ↓
Map FAISS positions → journal database IDs
    ↓
SQLite fetches journal metadata + applies filters
    ↓
Return ordered results as JSON
    ↓
Frontend renders journal cards
```

---

## The Frontend — Widget Architecture

The frontend is designed around a key constraint: **the same search widget must work both as a standalone page and as an embeddable component on external sites** (specifically the IITGN library portal).

### Standalone Page (`index.html` + `widget.js`)

The standalone page (`/ui`) loads `widget.js`, which creates a `JournalSearchWidget` class. This class:

- Injects the widget HTML (search form, filters, results container) into the page.
- Binds event listeners for toggle, close, and search submit.
- On search, sends a `POST /search` request to the FastAPI backend.
- Renders results as styled journal cards with title, publisher, subject, coverage, and status.

The widget appears as a **slide-in panel** from the right side of the screen, triggered by a floating button or the hero "Open Chatbot" button.

### Embeddable Widget (`embed.js`)

For embedding on external sites, `embed.js` is a self-contained script that:

- Auto-detects the API URL from its own `<script src>` attribute.
- Injects all necessary CSS directly (no external stylesheet dependency).
- Creates a floating search button + popup panel.
- Handles search and result rendering independently.

To embed on any site, only a single `<script>` tag is needed:

```html
<script src="https://your-domain.com/static/embed.js"></script>
```

No other files, stylesheets, or configuration required.

---

## Technology Choices and Rationale

| Component | Technology | Why |
|---|---|---|
| Backend framework | FastAPI | Async-ready, auto-generates API docs, lightweight |
| Embeddings | Sentence Transformers (`all-MiniLM-L6-v2`) | Free, local, fast, good quality for short texts |
| Vector search | FAISS (`IndexFlatIP`) | Exact cosine search, no approximation errors, fast for this dataset size |
| Metadata storage | SQLite via SQLAlchemy | Zero-config, file-based, easily upgradeable to PostgreSQL |
| Frontend | Vanilla HTML/CSS/JS | No build step, no framework overhead, trivially embeddable |
| Serialization | Pydantic v2 | Type-safe request/response validation with `model_validate` |

All technologies are **free and open-source**. No paid APIs, no cloud vector databases, no external inference services.

---

## Limitations and Trade-offs

- **No conversational memory** — each search is independent. The system is a discovery tool, not a chatbot with dialogue history.
- **No hybrid ranking** — the current implementation relies purely on semantic similarity from FAISS. There is no additional boosting for exact title matches, keyword overlap, or active-journal preference (though the architecture supports adding these).
- **Flat index** — FAISS uses a brute-force flat index. This is fine for datasets up to ~100K journals but would need an approximate index (e.g., `IndexIVFFlat`) for millions of entries.
- **No incremental updates** — adding new journals requires re-running the full indexing script. The FAISS index and SQLite database are rebuilt from scratch.
