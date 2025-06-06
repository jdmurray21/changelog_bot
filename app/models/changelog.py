from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ChangelogEntry(Base):
    __tablename__ = "changelog_entries"

    id = Column(Integer, primary_key=True, index=True)
    repository = Column(String, index=True)
    version = Column(String, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    changes = Column(Text)
    author = Column(String)
    status = Column(String)  # "draft", "published", "archived"

    def __repr__(self):
        return f"<ChangelogEntry {self.version} for {self.repository}>"
