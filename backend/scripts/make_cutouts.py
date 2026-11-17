"""Genera PNG sin fondo de los productos destacados.

Uso (ver comandos de docker compose en el README):
    python scripts/make_cutouts.py          # solo los top vendidos
    python scripts/make_cutouts.py --all    # todo el catálogo
    python scripts/make_cutouts.py --force  # regenerar existentes
La primera vez rembg descarga su modelo (~170 MB).
"""
import argparse
import json
import os
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

API = os.environ.get("API_URL", "http://localhost:8010/api").rstrip("/")
SERVER = API.removesuffix("/api")
OUT = Path(__file__).resolve().parents[1] / "static" / "productos" / "cutout"
HEADERS = {"User-Agent": "Mozilla/5.0"}

MAX_SIDE = 1100  # px del lado mayor; de sobra para el hero y mantiene el PNG liviano
PAD = 0.04  # margen transparente alrededor del producto (4 %)


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS)) as r:
        return r.read()


def pick_image(p: dict) -> str | None:
    for key in ("imagen_url", "url_imagen", "imagen", "image_url", "foto"):
        if p.get(key):
            return p[key]
    return None


def resolve(src: str) -> str:
    if src.startswith("/"):
        return SERVER + src
    # Desde el contenedor, localhost:8010 (puerto del host) no existe
    return src.replace("http://localhost:8010", SERVER)


def polish(png: bytes) -> bytes:
    """Recorta el margen transparente y reduce el tamaño.

    Sin recortar, rembg deja el producto pequeño dentro de un lienzo grande y en el
    hero se ve chico; recortando, el producto llena su caja.
    """
    im = Image.open(BytesIO(png)).convert("RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    pad = int(max(w, h) * PAD)
    canvas = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad))
    canvas.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    out = BytesIO()
    canvas.save(out, "PNG", optimize=True)
    return out.getvalue()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    if args.all:
        items = json.loads(fetch(f"{API}/products?page_size=100"))["items"]
    else:
        items = json.loads(fetch(f"{API}/sales/top-products?limit=8"))

    OUT.mkdir(parents=True, exist_ok=True)
    session = new_session()

    for p in items:
        pid = p["id_producto"]
        target = OUT / f"{pid}.png"
        src = pick_image(p)
        if not src:
            print(f"- {pid}: sin imagen, se omite")
            continue
        if target.exists() and not args.force:
            print(f"- {pid}: ya existe")
            continue
        try:
            cut = remove(fetch(resolve(src)), session=session)
            target.write_bytes(polish(cut))
            print(f"✓ {pid}: {p.get('nombre')} ({target.stat().st_size // 1024} KB)")
        except Exception as exc:  # noqa: BLE001
            print(f"✗ {pid}: {exc}")


if __name__ == "__main__":
    main()