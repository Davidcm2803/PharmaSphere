from app.db.session import Base

# Importar aqui todos los modelos para que Alembic / create_all los detecte
from app.models.user_model import Usuario  # noqa: F401