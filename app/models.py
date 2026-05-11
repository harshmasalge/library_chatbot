from sqlalchemy import Column, Integer, String, Text

from .database import Base


class Journal(Base):
    __tablename__ = "journals"

    journal_id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String, index=True, nullable=True)
    publication_title = Column(Text, nullable=False)
    subject_keywords = Column(Text, nullable=True)
    subjectname = Column(Text, nullable=True)
    main_subject = Column(Text, nullable=True)
    supergroup = Column(Text, nullable=True)
    publisher_name = Column(Text, nullable=True)
    coverage_y = Column(String, nullable=True)
    active_or_inactive_y = Column(String, nullable=True)
    title_url = Column(Text, nullable=True)
    asjc_codes_y = Column(Text, nullable=True)
    embedding_text = Column(Text, nullable=False)
