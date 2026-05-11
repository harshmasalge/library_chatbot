import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'ejournal.db'}")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
FAISS_INDEX_PATH = Path(os.getenv("FAISS_INDEX_PATH", DATA_DIR / "embeddings.faiss"))
MAPPING_PATH = Path(os.getenv("MAPPING_PATH", DATA_DIR / "index_to_journal.pkl"))
TOP_K_DEFAULT = int(os.getenv("TOP_K_DEFAULT", "10"))
