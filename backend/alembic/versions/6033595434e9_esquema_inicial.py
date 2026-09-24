"""esquema inicial

Revision ID: 6033595434e9
Revises: 
Create Date: 2026-09-24 07:40:04.580856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6033595434e9'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # El esquema inicial ya lo crea init.sql
    pass


def downgrade() -> None:
    pass