from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7 # 7 días (10080 min)
    qdrant_url: str = "http://qdrant:6333"

    # Firebase Admin (service account desde variables de entorno)
    firebase_project_id: str = ""
    firebase_client_email: str = ""
    firebase_private_key: str = ""


settings = Settings()