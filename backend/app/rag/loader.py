import io
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PyPdfError

EXTENSIONES = {".txt", ".md", ".pdf"}


class ContenidoInvalidoError(ValueError):
    pass


def extension_valida(nombre: str | None) -> bool:
    return Path(nombre or "").suffix.lower() in EXTENSIONES


def _leer_texto(datos: bytes) -> str:
    try:
        return datos.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ContenidoInvalidoError("El archivo de texto debe estar en UTF-8") from exc


def _leer_pdf(datos: bytes) -> str:
    try:
        lector = PdfReader(io.BytesIO(datos))
        cifrado = lector.is_encrypted
    except PyPdfError as exc:
        raise ContenidoInvalidoError("No se pudo leer el PDF") from exc
    if cifrado:
        raise ContenidoInvalidoError("El PDF está protegido con contraseña")
    try:
        return "\n\n".join((pagina.extract_text() or "") for pagina in lector.pages)
    except PyPdfError as exc:
        raise ContenidoInvalidoError("No se pudo extraer el texto del PDF") from exc


# devuelve el texto plano de un txt, md o pdf
def extraer_texto(nombre_archivo: str | None, datos: bytes) -> str:
    if not extension_valida(nombre_archivo):
        raise ContenidoInvalidoError("Formato no soportado: usa .txt, .md o .pdf")
    if Path(nombre_archivo).suffix.lower() == ".pdf":
        texto = _leer_pdf(datos)
    else:
        texto = _leer_texto(datos)
    # postgres no acepta el caracter nulo en columnas text
    texto = texto.replace("\x00", "").strip()
    if not texto:
        raise ContenidoInvalidoError(
            "El archivo no tiene texto (un PDF escaneado necesita OCR)"
        )
    return texto


# convierte un producto en texto para indexarlo. NO incluye costo, precio ni stock
def producto_a_texto(producto) -> str:
    lineas = [f"Producto: {producto.nombre}"]
    if producto.categoria:
        lineas.append(f"Categoría: {producto.categoria}")
    if producto.descripcion:
        lineas.append(f"Descripción: {producto.descripcion}")
    lineas.append(f"Requiere receta: {'sí' if producto.requiere_receta else 'no'}")
    return "\n".join(lineas)