from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Changelog Generator"
    API_V1_STR: str = "/api/v1"
    
    # Anthropic
    ANTHROPIC_API_KEY: str
    MAX_TOKENS_PER_REQUEST: int = 10000
    MAX_CHANGES_PER_FILE: int = 5
    
    # GitHub
    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GITHUB_TOKEN: str
    
    # Database
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./changelog.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Logging
    LOG_LEVEL: str = "DEBUG"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
