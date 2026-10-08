from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_yaml() -> dict:
    candidates = []
    env_path = os.environ.get("VITRIO_CONFIG")
    if env_path:
        candidates.append(Path(env_path))
    candidates.append(Path("/app/config/vitrio.yaml"))
    here = Path(__file__).resolve()
    if len(here.parents) > 4:
        candidates.append(here.parents[4] / "config" / "vitrio.yaml")
    for path in candidates:
        if path.is_file():
            with path.open(encoding="utf-8") as handle:
                data = yaml.safe_load(handle) or {}
            return data if isinstance(data, dict) else {}
    return {}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://vitrio:vitrio@localhost:5432/vitrio"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-only-change-me"
    storage_secret: str = "dev-storage"
    revalidate_secret: str = "dev-revalidate"
    integrations_key: str = "dev-integrations-key"
    base_domain: str = "localhost"
    storage_path: str = "storage"
    site_internal_url: str = "http://site:3000"
    cookie_secure: bool = False
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    demo_owner_email: str = "owner@example.com"
    demo_owner_password: str = "Vitrio.demo"
    demo_owner_name: str = "Maria Demo"
    upload_max_bytes: int = 8_000_000
    image_max_edge: int = 1600
    image_thumb_edge: int = 480
    login_per_minute: int = 10
    search_per_minute: int = 60
    upload_per_minute: int = 30
    feature_analytics: bool = False
    feature_coupons: bool = False
    feature_seo_audit: bool = False
    feature_ads: bool = True


@lru_cache
def get_settings() -> Settings:
    yaml_data = _load_yaml()
    storage = yaml_data.get("storage") or {}
    rate = yaml_data.get("rate_limit") or {}
    features = yaml_data.get("features") or {}
    overrides: dict = {}
    for flag in ("analytics", "coupons", "seo_audit", "ads"):
        if flag in features:
            overrides[f"feature_{flag}"] = bool(features[flag])
    if "max_bytes" in storage:
        overrides["upload_max_bytes"] = int(storage["max_bytes"])
    if "max_edge" in storage:
        overrides["image_max_edge"] = int(storage["max_edge"])
    if "thumb_edge" in storage:
        overrides["image_thumb_edge"] = int(storage["thumb_edge"])
    if "login_per_minute" in rate:
        overrides["login_per_minute"] = int(rate["login_per_minute"])
    if "search_per_minute" in rate:
        overrides["search_per_minute"] = int(rate["search_per_minute"])
    if "upload_per_minute" in rate:
        overrides["upload_per_minute"] = int(rate["upload_per_minute"])
    return Settings(**overrides)
