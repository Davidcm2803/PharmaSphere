"""caso escalado y documento publico

Revision ID: f3a8b2c91d04
Revises: a1c4e7d90b12
Create Date: 2026-11-16 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3a8b2c91d04"
down_revision: Union[str, None] = "a1c4e7d90b12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documento",
        sa.Column("publico", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "caso_escalado",
        sa.Column("id_caso", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "id_usuario", sa.Integer(), sa.ForeignKey("usuario.id_usuario"), nullable=False
        ),
        sa.Column("nivel", sa.String(20), nullable=False),
        sa.Column("motivo", sa.String(200), nullable=False),
        sa.Column("mensaje_usuario", sa.Text(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="abierto"),
        sa.Column(
            "id_empleado_atiende",
            sa.Integer(),
            sa.ForeignKey("empleado.id_empleado"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "nivel IN ('moderado','grave','emergencia')", name="ck_caso_nivel"
        ),
        sa.CheckConstraint(
            "estado IN ('abierto','atendido','cerrado')", name="ck_caso_estado"
        ),
    )
    op.create_index("idx_caso_usuario", "caso_escalado", ["id_usuario"])
    op.create_index("idx_caso_estado", "caso_escalado", ["estado"])


def downgrade() -> None:
    op.drop_index("idx_caso_estado", table_name="caso_escalado")
    op.drop_index("idx_caso_usuario", table_name="caso_escalado")
    op.drop_table("caso_escalado")
    op.drop_column("documento", "publico")