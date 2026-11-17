"""lote: cantidad_inicial e indice de vencimiento por sucursal

Revision ID: b7d2c4e91f35
Revises: f3a8b2c91d04
"""
import sqlalchemy as sa
from alembic import op

revision = "b7d2c4e91f35"
down_revision = "f3a8b2c91d04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lote",
        sa.Column("cantidad_inicial", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute("UPDATE lote SET cantidad_inicial = cantidad")
    op.create_check_constraint("ck_lote_cantidad_inicial", "lote", "cantidad_inicial >= 0")
    op.create_index(
        "idx_lote_sucursal_vencimiento", "lote", ["id_sucursal", "fecha_vencimiento"]
    )


def downgrade() -> None:
    op.drop_index("idx_lote_sucursal_vencimiento", table_name="lote")
    op.drop_constraint("ck_lote_cantidad_inicial", "lote", type_="check")
    op.drop_column("lote", "cantidad_inicial")
