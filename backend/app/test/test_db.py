from sqlalchemy import create_engine, inspect

from app.core.config import settings
from app.db.base import Base


def test_modelos_cargados():
    assert len(Base.metadata.tables) == 15


def test_tablas_existen_en_la_base():
    engine = create_engine(settings.database_url)
    tablas_en_bd = set(inspect(engine).get_table_names())
    assert set(Base.metadata.tables) <= tablas_en_bd