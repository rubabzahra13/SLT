"""AIP-158 list response envelopes."""

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ListResponse(BaseModel, Generic[T]):
    """Generic list envelope — prefer resource-named subclasses for OpenAPI."""

    model_config = ConfigDict(populate_by_name=True)

    items: List[T] = Field(default_factory=list)
    next_page_token: Optional[str] = None
