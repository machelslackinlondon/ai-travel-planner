from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlannerRequest(StrictModel):
    request: str = Field(min_length=3, max_length=500)


class SearchFilters(StrictModel):
    destination_id: str | None = None
    region_id: str | None = None
    categories: list[str] = Field(default_factory=list, max_length=8)
    tags: list[str] = Field(default_factory=list, max_length=8)
    price_level: Literal["free", "value", "mid-range", "premium"] | None = None


class SearchDocument(StrictModel):
    id: str
    type: Literal["destination", "attraction", "hotel", "restaurant", "activity", "event"]
    name: str
    description: str
    regionId: str
    destinationId: str
    tags: list[str]
    category: list[str]
    popularity: int = Field(ge=0, le=100)
    rating: float = Field(ge=0, le=5)
    priceLevel: Literal["free", "value", "mid-range", "premium"]


class SearchResult(StrictModel):
    items: list[SearchDocument]
    backend: Literal["mock", "elasticsearch"]


class InterpretedRequest(StrictModel):
    destination: str | None
    days: int = Field(ge=1, le=14)
    interests: list[str]
    priceLevel: Literal["free", "value", "mid-range", "premium"] | None


class ItineraryActivity(StrictModel):
    id: str
    name: str
    type: str
    description: str
    rating: float
    priceLevel: str


class PlannerDay(StrictModel):
    day: int
    title: str
    activities: list[ItineraryActivity]


class PlannerResponse(StrictModel):
    id: str
    tripName: str
    duration: str
    summary: str
    estimatedBudget: str
    interpretedRequest: InterpretedRequest
    days: list[PlannerDay]
    recommendations: list[ItineraryActivity]
    sources: list[str]
    generationMode: Literal["ai", "fallback"]
    searchBackend: Literal["mock", "elasticsearch"]
    generatedAt: str
    warnings: list[str]


class LlmNarrative(StrictModel):
    tripName: str = Field(min_length=1, max_length=80)
    summary: str = Field(min_length=1, max_length=300)
    dayTitles: list[str] = Field(min_length=1, max_length=14)
