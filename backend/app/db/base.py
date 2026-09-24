from app.db.session import Base

# Importar aqui todos los modelos para que Alembic los detecte

from app.models.sucursal_model import Sucursal
from app.models.supplier_model import Proveedor
from app.models.product_model import Producto
from app.models.employee_model import Empleado
from app.models.customer_model import Cliente
from app.models.user_model import Usuario
from app.models.inventory_model import Inventario
from app.models.purchase_model import Compra, DetalleCompra
from app.models.lot_model import Lote
from app.models.sale_model import Venta, DetalleVenta
from app.models.recipe_model import Receta
from app.models.movement_model import MovimientoInventario
from app.models.document_model import Documento