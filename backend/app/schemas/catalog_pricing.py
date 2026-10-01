from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Dict, List, Optional
from uuid import UUID


class PackagePriceSchema(BaseModel):
    id: UUID
    package_key: str
    name: str
    category: str
    price: float

    model_config = ConfigDict(from_attributes=True)


class PackagePriceUpsertItem(BaseModel):
    package_key: str
    name: str
    category: str
    price: float


class PackagePricesReplaceSchema(BaseModel):
    prices: List[PackagePriceUpsertItem]


class SecretMenuTierSchema(BaseModel):
    extra_songs: int = Field(alias="extraSongs")
    extra_cost: float = Field(alias="extraCost")
    editing_minutes: int = Field(alias="editingMinutes")

    model_config = ConfigDict(populate_by_name=True)


class SecretMenuPricingSchema(BaseModel):
    id: Optional[UUID] = None
    package_name: str = Field(alias="packageName")
    menu_title: str = Field(alias="menuTitle")
    base_price: float = Field(alias="basePrice")
    extra_song_tiers: List[Dict[str, Any]] = Field(alias="extraSongTiers")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class SecretMenuPricingUpdateSchema(BaseModel):
    package_name: Optional[str] = Field(default=None, alias="packageName")
    menu_title: Optional[str] = Field(default=None, alias="menuTitle")
    base_price: Optional[float] = Field(default=None, alias="basePrice")
    extra_song_tiers: Optional[List[Dict[str, Any]]] = Field(
        default=None, alias="extraSongTiers"
    )

    model_config = ConfigDict(populate_by_name=True)
