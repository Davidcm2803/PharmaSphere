# backend/app/core/triage_rules.py
import re

# Cada entrada: (patron, motivo). Se evalua en orden; EMERGENCIA antes que GRAVE.
_EMERGENCIA = [
    (r"\bno (puedo|puede) respirar\b", "dificultad respiratoria"),
    (r"\bdolor (fuerte |intenso )?en el pecho\b", "posible evento cardiaco"),
    (r"\b(perdida|perdió|pierde) (el conocimiento|la conciencia)\b|\bse desmay", "pérdida de conciencia"),
    (r"\bconvulsion", "convulsión"),
    (r"\b(quiero|voy a|me quiero) (matar|morir|suicidar)", "riesgo de suicidio"),
    (r"\bsangrado (abundante|que no para|incontrolable)\b", "hemorragia"),
    (r"\bsobredosis\b|\bme tom[eé] (todas|muchas) (las )?pastillas\b", "posible sobredosis"),
    (r"\breaccion alergica (severa|grave)\b|\banafilax", "anafilaxia"),
    (r"\bno (reacciona|responde|despierta)\b", "pérdida de respuesta"),
]

_GRAVE = [
    (r"\bfiebre (alta|muy alta) (en|al|a mi)? ?(bebe|bebé|niño|niña|recien nacido)\b", "fiebre alta en menor"),
    (r"\bvomito con sangre\b|\bvomita sangre\b", "vómito con sangre"),
    (r"\breaccion alergica\b", "posible reacción alérgica"),
    (r"\bdolor (muy )?fuerte\b.*\b(dias|días)\b", "dolor intenso prolongado"),
    (r"\bembarazada\b.*\b(puedo tomar|me tomo|me tome)\b", "medicación durante embarazo"),
    (r"\bquiero dejar de tomar\b.*\b(pastillas|medicamento|tratamiento)\b", "suspensión de tratamiento"),
    (r"\bme siento (muy )?mal\b.*\b(dias|días|semana)\b", "malestar prolongado"),
]


def _match(texto: str, reglas) -> str | None:
    t = texto.lower()
    for patron, motivo in reglas:
        if re.search(patron, t):
            return motivo
    return None


def clasificar_regla(texto: str) -> tuple[str, str] | None:
    """Devuelve (nivel, motivo) si matchea una regla dura, o None si no hay match."""
    motivo = _match(texto, _EMERGENCIA)
    if motivo:
        return "emergencia", motivo
    motivo = _match(texto, _GRAVE)
    if motivo:
        return "grave", motivo
    return None