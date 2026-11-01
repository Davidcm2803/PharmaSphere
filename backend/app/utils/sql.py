def escape_like(text: str) -> str:
    """Escapa %, _ y \\ para usar el texto dentro de un ILIKE."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")