"""URLs de los PNG sin fondo (backend/app/utils/cutouts.py).

No hay columna en la DB: si existe static/productos/cutout/{id}.png, hay URL.
"""
from pathlib import Path

# backend/app/utils/cutouts.py -> backend/static/productos/cutout
BACKEND_DIR = Path(__file__).resolve().parents[2]
CUTOUT_DIR = BACKEND_DIR / "static" / "productos" / "cutout"
CUTOUT_URL_PREFIX = "/static/productos/cutout"
UPLOADS_URL_PREFIX = "/static/productos/"


def cutout_url(id_producto: int) -> str | None:
    f = CUTOUT_DIR / f"{id_producto}.png"
    if not f.is_file():
        return None
    # ?v=mtime: si regeneras con --force el navegador no se queda con el PNG viejo
    return f"{CUTOUT_URL_PREFIX}/{id_producto}.png?v={int(f.stat().st_mtime)}"


def _png_has_alpha(header: bytes) -> bool:
    if len(header) < 26 or not header.startswith(b"\x89PNG\r\n\x1a\n"):
        return False
    if header[25] in (4, 6):
        return True
    idat = header.find(b"IDAT")
    trns = header.find(b"tRNS")
    return trns != -1 and (idat == -1 or trns < idat)


def alpha_png_url(imagen_url: str | None) -> str | None:
    if not imagen_url or not imagen_url.startswith(UPLOADS_URL_PREFIX):
        return None
    if ".." in imagen_url or not imagen_url.lower().endswith(".png"):
        return None
    f = BACKEND_DIR / imagen_url.lstrip("/")
    if not f.is_file():
        return None
    with f.open("rb") as fh:
        header = fh.read(4096)
    return imagen_url if _png_has_alpha(header) else None