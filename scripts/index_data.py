import argparse
import pickle
from pathlib import Path

import faiss
import pandas as pd
from sentence_transformers import SentenceTransformer

from app.config import DATA_DIR, EMBEDDING_MODEL, FAISS_INDEX_PATH, MAPPING_PATH
from app.database import Base, engine, SessionLocal
from app.models import Journal
from app.utils import build_embedding_text, normalize_text


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build SQLite metadata and FAISS embedding index from the journal dataset.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("EJournals_database.xlsx"),
        help="Path to the Excel dataset file.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild the database and index from scratch.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=128,
        help="Batch size for embeddings.",
    )
    return parser.parse_args()


def load_dataset(path: Path) -> pd.DataFrame:
    return pd.read_excel(path, engine="openpyxl")


def create_database(force: bool = False) -> None:
    if force and Path(DATA_DIR / "ejournal.db").exists():
        Path(DATA_DIR / "ejournal.db").unlink()
    Base.metadata.create_all(bind=engine)


def build_records(df: pd.DataFrame) -> list[Journal]:
    records = []
    for _, row in df.iterrows():
        embedding_text = build_embedding_text(row)
        if not embedding_text:
            continue
        journal = Journal(
            source_id=normalize_text(row.get("id")),
            publication_title=normalize_text(row.get("publication_title")) or "",
            subject_keywords=normalize_text(row.get("Subject Keywords")),
            subjectname=normalize_text(row.get("subjectname")),
            main_subject=normalize_text(row.get("Main Subject")),
            supergroup=normalize_text(row.get("Supergroup")),
            publisher_name=normalize_text(row.get("publisher_name")),
            coverage_y=normalize_text(row.get("coverage_y")),
            active_or_inactive_y=normalize_text(row.get("active or inactive_y")),
            title_url=normalize_text(row.get("title_url")),
            asjc_codes_y=normalize_text(row.get("asjc codes_y")),
            embedding_text=embedding_text,
        )
        records.append(journal)
    return records


def build_embeddings(model: SentenceTransformer, texts: list[str], batch_size: int) -> list[float]:
    embeddings = model.encode(texts, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=True)
    embeddings = embeddings.astype("float32")
    faiss.normalize_L2(embeddings)
    return embeddings


def build_faiss_index(embeddings) -> faiss.Index:
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    return index


def main() -> None:
    args = parse_args()
    if not args.input.exists():
        raise FileNotFoundError(f"Input file not found: {args.input}")

    df = load_dataset(args.input)
    create_database(force=args.force)
    records = build_records(df)

    with SessionLocal() as session:
        session.add_all(records)
        session.commit()
        journal_ids = [record.journal_id for record in records]

    if not journal_ids:
        raise RuntimeError("No records were inserted into the journal database.")

    model = SentenceTransformer(EMBEDDING_MODEL)
    texts = [record.embedding_text for record in records]
    embeddings = build_embeddings(model, texts, batch_size=args.batch_size)
    index = build_faiss_index(embeddings)

    FAISS_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(FAISS_INDEX_PATH))
    with open(MAPPING_PATH, "wb") as mapping_file:
        pickle.dump(journal_ids, mapping_file)

    print(f"Saved FAISS index to {FAISS_INDEX_PATH}")
    print(f"Saved index mapping to {MAPPING_PATH}")
    print("Indexing completed successfully.")


if __name__ == "__main__":
    main()
