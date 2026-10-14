import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials
from firebase_admin.exceptions import FirebaseError

from app.core.config import settings


class InvalidFirebaseToken(Exception):
    pass


class FirebaseNotConfigured(RuntimeError):
    pass


def _init_app() -> None:
    if firebase_admin._apps:
        return

    if not (
        settings.firebase_project_id
        and settings.firebase_client_email
        and settings.firebase_private_key
    ):
        raise FirebaseNotConfigured(
            "Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en el .env"
        )

    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "client_email": settings.firebase_client_email,
            "private_key": settings.firebase_private_key.replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    firebase_admin.initialize_app(cred)


def verify_firebase_token(id_token: str) -> dict:
    _init_app()
    try:
        return fb_auth.verify_id_token(id_token)
    except (ValueError, FirebaseError) as exc:
        raise InvalidFirebaseToken(str(exc)) from exc