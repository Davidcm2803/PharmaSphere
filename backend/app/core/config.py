from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7 # 7 días (10080 min)
    qdrant_url: str = "http://qdrant:6333"

    # modelo de embeddings (se cambia por el ganador de la comparacion)
    embedding_model: str = "intfloat/multilingual-e5-small"

    # RAG si se cambias el modelo cambia la dimension, hay que recrear la coleccion
    rag_coleccion: str = "pharmasphere_docs"
    rag_chunk_size: int = 800        # caracteres maximos por fragmento
    rag_chunk_overlap: int = 120     # caracteres que se repiten entre fragmentos
    rag_max_upload_mb: int = 5       # tamaño maximo de un archivo subido
    
    # Copilot (LLM)
    llm_api_key: str = ""
    llm_model: str = "openai/gpt-oss-20b"
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_timeout_seg: int = 40
    copilot_max_rondas: int = 4      # max de rondas de preguntas
    copilot_max_historial: int = 6   # mensajes anteriores que se reenvian al modelo para contexto
    copilot_accion_ttl_seg: int = 300   # vida del token de confirmación
    copilot_max_ingreso: int = 10000    # max de unidades por ingreso

    # Firebase Admin (service account desde variables de entorno)
    firebase_project_id: str = ""
    firebase_client_email: str = ""
    firebase_private_key: str = ""


settings = Settings()