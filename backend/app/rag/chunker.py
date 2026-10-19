import re


# corta un parrafo gigante en pedazos de tamaño fijo con solapamiento
def _partir_largo(texto: str, size: int, overlap: int) -> list[str]:
    paso = max(size - overlap, 1)
    pedazos = (texto[i : i + size].strip() for i in range(0, len(texto), paso))
    return [p for p in pedazos if p]


# junta parrafos hasta llegar a size; si uno solo es mas largo se parte
def dividir_texto(texto: str, size: int = 800, overlap: int = 120) -> list[str]:
    texto = texto.replace("\r\n", "\n")
    parrafos = [re.sub(r"[ \t]+", " ", p).strip() for p in re.split(r"\n\s*\n", texto)]
    parrafos = [p for p in parrafos if p]

    chunks: list[str] = []
    actual = ""
    for parrafo in parrafos:
        if len(parrafo) > size:
            if actual:
                chunks.append(actual)
                actual = ""
            chunks.extend(_partir_largo(parrafo, size, overlap))
            continue
        if actual and len(actual) + 2 + len(parrafo) > size:
            chunks.append(actual)
            # la cola del fragmento anterior se repite para no perder contexto
            cola = actual[-overlap:] if overlap else ""
            cola = cola.split(" ", 1)[-1] if " " in cola else cola
            actual = f"{cola}\n\n{parrafo}".strip()
        else:
            actual = f"{actual}\n\n{parrafo}" if actual else parrafo
    if actual:
        chunks.append(actual)
    return chunks