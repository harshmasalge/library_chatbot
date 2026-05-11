from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None
    subject: Optional[str] = None
    collectionname: Optional[str] = None
    main_subject: Optional[str] = None


class JournalItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    journal_id: int
    source_id: Optional[str]
    publication_title: str
    subject_keywords: Optional[str]
    subjectname: Optional[str]
    collectionname: Optional[str]
    main_subject: Optional[str]
    supergroup: Optional[str]
    publisher_name: Optional[str]
    coverage_y: Optional[str]
    active_or_inactive_y: Optional[str]
    title_url: Optional[str]
    asjc_codes_y: Optional[str]


class SearchResponse(BaseModel):
    query: str
    results: List[JournalItem]