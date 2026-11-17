"""vista v_inventario_lotes (inventario vs lotes, proximo vencimiento, descuadre)

Revision ID: d5b8f3a21c69
Revises: b7d2c4e91f35
"""
from alembic import op

revision = "d5b8f3a21c69"
down_revision = "b7d2c4e91f35"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE VIEW v_inventario_lotes AS
        SELECT
            i.id_inventario,
            i.id_producto,
            i.id_sucursal,
            i.cantidad                                              AS cantidad_inventario,
            COALESCE(SUM(l.cantidad), 0)::int                       AS cantidad_lotes,
            COUNT(l.id_lote) FILTER (WHERE l.cantidad > 0)::int     AS lotes_con_stock,
            MIN(l.fecha_vencimiento) FILTER (WHERE l.cantidad > 0)  AS proximo_vencimiento,
            (i.cantidad <> COALESCE(SUM(l.cantidad), 0))            AS descuadre
        FROM inventario i
        LEFT JOIN lote l
               ON l.id_producto = i.id_producto
              AND l.id_sucursal = i.id_sucursal
        GROUP BY i.id_inventario, i.id_producto, i.id_sucursal, i.cantidad
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_inventario_lotes")
