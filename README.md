# IITGN E-Journal Discovery Assistant

A semantic search assistant for the IITGN e-journals portal. Users can discover academic journals using natural language queries like *"AI helping doctors"* or *"materials science journals"* instead of exact keyword searches.

Built entirely with free, open-source technologies — no paid APIs, no cloud services.

## Prerequisites

- **Python 3.11+** — [Download here](https://www.python.org/downloads/)
- **Git** — [Download here](https://git-scm.com/downloads)
- **~4 GB RAM** — needed for loading the embedding model

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/harshmasalge/library_chatbot.git
cd library_chatbot
```

### 2. Create a Virtual Environment

**Windows:**

```bash
python -m venv .venv
.venv\Scripts\activate
```

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs FastAPI, Sentence Transformers, FAISS, SQLAlchemy, and other required packages.

### 4. Build the Search Index (one-time)

```bash
python -m scripts.index_data --input EJournals_database.xlsx --force
```

This step reads the Excel dataset, generates semantic embeddings for every journal, and builds the FAISS vector index. It takes a few minutes on the first run (the model is downloaded automatically).

Three files are created in `data/`:

| File | Description |
|---|---|
| `ejournal.db` | SQLite database with journal metadata |
| `embeddings.faiss` | FAISS vector index for semantic search |
| `index_to_journal.pkl` | Mapping from FAISS positions to journal IDs |

### 5. Start the Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 6. Open the Application

| URL | Description |
|---|---|
| [http://localhost:8000/ui](http://localhost:8000/ui) | Search interface with floating chatbot widget |
| [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger API documentation |
| [http://localhost:8000/health](http://localhost:8000/health) | Health check endpoint |

Try searching for queries like:
- *"AI helping doctors"*
- *"materials science journals"*
- *"computer science journals after 2015"*

## Deploying to a Real Library Website

Transferring this chatbot from the local dummy page to an actual library website is seamless because the `embed.js` script acts as a self-contained, "drop-in" widget.

### 1. Host the Backend Server
Currently, the chatbot runs on `http://localhost:8000`. To make it accessible over the internet, host the FastAPI backend on a public server (e.g., AWS, DigitalOcean, Heroku). 
* Assume your new server URL is `https://api.mylibrarychatbot.com`.

### 2. Add One Line of HTML
Provide the library webmaster with a single line of HTML to add to their website. They should place this right before the closing `</body>` tag on any page where they want the chatbot to appear:

```html
<script src="https://api.mylibrarychatbot.com/static/embed.js"></script>
```

**Why it works automatically:**
* **Auto-detects the API:** The script dynamically detects its own `<script src="...">` URL to know exactly where to send search queries.
* **Self-Contained Styling:** All CSS is injected dynamically by JavaScript. It will not conflict with the library's existing website styles.
* **CORS is handled:** The FastAPI backend is configured to accept Cross-Origin Resource Sharing (CORS), allowing search requests from the library's domain.

## Documentation

- **[CONCEPT.md](CONCEPT.md)** — How the system works: semantic search, embeddings, FAISS, and the widget architecture.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System architecture, project structure, module breakdown, API reference, and local setup instructions.

## Tech Stack

| Component | Technology |
|---|---|
| Backend | FastAPI + Uvicorn |
| Embeddings | Sentence Transformers (`all-MiniLM-L6-v2`) |
| Vector Search | FAISS |
| Database | SQLite + SQLAlchemy |
| Frontend | Vanilla HTML/CSS/JS |
