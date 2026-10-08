from __future__ import annotations

from collections.abc import Callable

_lookup: Callable[[str], list[str]] | None = None


def set_txt_lookup(fn: Callable[[str], list[str]] | None) -> None:
    global _lookup
    _lookup = fn


def lookup_txt(hostname: str) -> list[str]:
    name = f"_vitrio-challenge.{hostname}"
    if _lookup is not None:
        return _lookup(name)
    try:
        import dns.resolver

        answer = dns.resolver.resolve(name, "TXT")
    except Exception:
        return []
    values: list[str] = []
    for record in answer:
        raw = b"".join(getattr(record, "strings", [])).decode("utf-8", errors="replace")
        values.append(raw.strip().strip('"'))
    return values
