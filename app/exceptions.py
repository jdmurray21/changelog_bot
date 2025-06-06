from typing import List, Dict, Optional

class ChangelogError(Exception):
    def __init__(
        self,
        error_type: str,
        message: str,
        invalid_shas: Optional[List[str]] = None,
        missing_shas: Optional[List[str]] = None,
        details: Optional[Dict] = None,
        repository: Optional[str] = None
    ):
        self.error_type = error_type
        self.message = message
        self.invalid_shas = invalid_shas or []
        self.missing_shas = missing_shas or []
        self.details = details or {}
        self.repository = repository
        
    def to_dict(self) -> Dict:
        return {
            "error": self.error_type,
            "message": self.message,
            "invalid_shas": self.invalid_shas,
            "missing_shas": self.missing_shas,
            "repository": self.repository,
            "details": self.details
        }
