import re
from typing import Any, Dict


def normalize_text(text: Any) -> str:
    if text is None:
        return ""
    value = str(text).strip()
    value = re.sub(r"\s+", " ", value)
    return value.lower()


def build_embedding_text(row: Dict[str, Any]) -> str:
    parts = [
        normalize_text(row.get("publication_title")),
        normalize_text(row.get("Subject Keywords")),
        normalize_text(row.get("subjectname")),
        normalize_text(row.get("Main Subject")),
        normalize_text(row.get("Supergroup")),
        normalize_text(row.get("publisher_name")),
    ]
    return " | ".join([part for part in parts if part])
