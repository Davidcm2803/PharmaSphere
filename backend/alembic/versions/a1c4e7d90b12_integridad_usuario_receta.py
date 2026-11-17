"""integridad usuario y receta

Revision ID: a1c4e7d90b12
Revises: 6033595434e9
"""
from alembic import op

revision = "a1c4e7d90b12"
down_revision = "6033595434e9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("idx_usuario_cliente", table_name="usuario")
    op.drop_index("idx_usuario_empleado", table_name="usuario")
    op.create_unique_constraint("uq_usuario_id_cliente", "usuario", ["id_cliente"])
    op.create_unique_constraint("uq_usuario_id_empleado", "usuario", ["id_empleado"])
    op.create_check_constraint(
        "ck_receta_vigencia", "receta", "vigencia_hasta IS NULL OR vigencia_hasta >= fecha"
    )


def downgrade() -> None:
    op.drop_constraint("ck_receta_vigencia", "receta", type_="check")
    op.drop_constraint("uq_usuario_id_empleado", "usuario", type_="unique")
    op.drop_constraint("uq_usuario_id_cliente", "usuario", type_="unique")
    op.create_index("idx_usuario_empleado", "usuario", ["id_empleado"])
    op.create_index("idx_usuario_cliente", "usuario", ["id_cliente"])