from app.core import triage_rules


def clasificar(pregunta: str, historial: list) -> tuple[str, str]:
    """
    (nivel, motivo). nivel en: leve | moderado | grave | emergencia.
    Reglas duras primero (deterministico, el LLM no puede evadirlas).
    Si no matchea ninguna, se asume leve/moderado y se deja la conversación
    normal al LLM, que igual tiene la herramienta escalar_a_encargado disponible
    si el usuario insiste en que quiere hablar con alguien.
    """
    resultado = triage_rules.clasificar_regla(pregunta)
    if resultado:
        return resultado

    # revisa tambien los ultimos mensajes del usuario por si la gravedad
    # se reveló en un turno anterior y el actual es solo "si" o una aclaración corta
    for m in reversed(historial[-4:]):
        if m.rol != "user":
            continue
        resultado = triage_rules.clasificar_regla(m.contenido)
        if resultado:
            return resultado

    return "leve", ""