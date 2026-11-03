from app.schemas.purchase_schema import LoteOut


class LoteVencimientoOut(LoteOut):
    nombre_producto: str
    dias_para_vencer: int  # negativo si ya venció