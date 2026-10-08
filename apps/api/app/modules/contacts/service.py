from __future__ import annotations

CONTACT_TYPES = ("whatsapp", "phone", "instagram", "email", "url")

LABELS = {
    "whatsapp": "WhatsApp",
    "phone": "Telefone",
    "instagram": "Instagram",
    "email": "E-mail",
    "url": "Link",
}


def contact_label(contact_type: str) -> str:
    return LABELS.get(contact_type, "Contato")
