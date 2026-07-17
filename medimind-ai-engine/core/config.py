from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str = "mock-key"
    QDRANT_URL: str = "http://localhost:6333"
    INTERNAL_API_SECRET: str = "super-secret-token"
    X_INTERNAL_SECRET: str = "super-secret-token"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
