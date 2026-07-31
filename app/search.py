import pickle  # nosec B403 - Safe usage; only loading internally generated models
from typing import Dict, List, Optional

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import EMBEDDING_MODEL, FAISS_INDEX_PATH, MAPPING_PATH, TOP_K_DEFAULT
from .database import SessionLocal
from .models import Journal
from .utils import normalize_text


class SemanticSearchEngine:
    def __init__(self):
        self.model = SentenceTransformer(EMBEDDING_MODEL)
        self.index = None
        self.id_map: List[int] = []

    def load(self) -> None:
        if not FAISS_INDEX_PATH.exists():
            raise FileNotFoundError(f"FAISS index not found at {FAISS_INDEX_PATH}")

        self.index = faiss.read_index(str(FAISS_INDEX_PATH))
        with open(MAPPING_PATH, "rb") as mapping_file:
            self.id_map = pickle.load(mapping_file)  # nosec B301 - File is generated internally by index_data.py

    def embed(self, text: str) -> np.ndarray:
        normalized_query = normalize_text(text)
        vector = self.model.encode([normalized_query], convert_to_numpy=True, show_progress_bar=False)
        vector = vector.astype("float32")
        faiss.normalize_L2(vector)
        return vector

    def _apply_filters(self, query, filters: Dict[str, Optional[str]]) -> None:
        if filters.get("subject"):
            query = query.filter(Journal.subjectname.ilike(f"%{filters['subject']}%"))
        if filters.get("collectionname"):
            query = query.filter(Journal.collectionname.ilike(f"%{filters['collectionname']}%"))
        if filters.get("main_subject"):
            query = query.filter(Journal.main_subject.ilike(f"%{filters['main_subject']}%"))
        return query

    def search(self, text: str, top_k: Optional[int] = None, filters: Optional[Dict[str, Optional[str]]] = None) -> List[Journal]:
        if self.index is None:
            raise RuntimeError("Search engine is not initialized")

        top_k = top_k or TOP_K_DEFAULT
        embeddings = self.embed(text)
        distances, indices = self.index.search(embeddings, top_k)
        journal_ids = [self.id_map[index] for index in indices[0] if index != -1]

        with SessionLocal() as session:
            query = session.query(Journal).filter(Journal.journal_id.in_(journal_ids))
            if filters:
                query = self._apply_filters(query, filters)
            journals = query.all()

        journal_by_id = {journal.journal_id: journal for journal in journals}
        ordered_results = [journal_by_id[journal_id] for journal_id in journal_ids if journal_id in journal_by_id]
        return ordered_results
