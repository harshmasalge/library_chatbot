from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import TOP_K_DEFAULT
from .database import Base, engine
from .models import Journal
from .schemas import JournalItem, SearchRequest, SearchResponse
from .search import SemanticSearchEngine

app = FastAPI(
    title="IITGN E-Journal Discovery Assistant",
    description="A lightweight semantic search backend for journal discovery.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

search_engine: SemanticSearchEngine | None = None


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    global search_engine
    search_engine = SemanticSearchEngine()
    try:
        search_engine.load()
    except FileNotFoundError as exc:
        raise RuntimeError(
            "Search index is not initialized. Run scripts/index_data.py first."
        ) from exc


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/")
def root() -> dict:
    return {"message": "IITGN E-Journal Discovery Assistant", "docs": "/docs", "health": "/health"}


@app.post("/search", response_model=SearchResponse)
def search_journals(request: SearchRequest) -> SearchResponse:
    if search_engine is None:
        raise HTTPException(status_code=503, detail="Search engine is not ready")

    filters = {
        "subject": request.subject,
        "collectionname": request.collectionname,
        "main_subject": request.main_subject,
    }
    results = search_engine.search(request.query, top_k=request.top_k or TOP_K_DEFAULT, filters=filters)

    return SearchResponse(
        query=request.query,
        results=[JournalItem.model_validate(journal) for journal in results],
    )


@app.get("/journal/{journal_id}", response_model=JournalItem)
def get_journal(journal_id: int) -> JournalItem:
    from .database import SessionLocal

    with SessionLocal() as session:
        journal = session.query(Journal).get(journal_id)
        if not journal:
            raise HTTPException(status_code=404, detail="Journal not found")
        return JournalItem.model_validate(journal)


@app.get("/ui")
def serve_ui() -> FileResponse:
    ui_file = Path(__file__).parent / "static" / "index.html"
    if not ui_file.exists():
        raise HTTPException(status_code=404, detail="UI file not found")
    return FileResponse(str(ui_file), media_type="text/html")
