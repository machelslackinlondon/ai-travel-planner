from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

ResortArea = Literal["montego-bay", "negril"]
ResortChoice = Literal["montego-bay", "negril", "help-me-choose"]
Pace = Literal["relaxed", "balanced", "active"]


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TripBrief(ApiModel):
    timingMode: Literal["nights", "dates"]
    nights: int = Field(ge=1, le=21)
    startDate: str | None = Field(default=None, max_length=10)
    endDate: str | None = Field(default=None, max_length=10)
    adults: int = Field(ge=1, le=12)
    children: int = Field(ge=0, le=12)
    resortArea: ResortChoice
    interests: list[Literal["beach", "food", "culture", "nature", "family", "relaxation"]] = Field(
        min_length=1, max_length=3
    )
    pace: Pace
    spendLevel: Literal["value", "mid-range", "premium", "flexible"]
    accommodationStyle: Literal["hotel-resort", "villa-apartment", "guest-house", "no-preference"]
    accessibility: list[
        Literal["step-free", "mobility-support", "visual-support", "hearing-support", "quiet-space"]
    ] = Field(max_length=5)
    note: str = Field(max_length=300)

    @model_validator(mode="after")
    def validate_dates(self) -> "TripBrief":
        if self.timingMode == "dates":
            if not self.startDate or not self.endDate:
                raise ValueError("startDate and endDate are required in dates mode")
            if self.endDate <= self.startDate:
                raise ValueError("endDate must be after startDate")
        return self


class ContentItem(ApiModel):
    id: str = Field(min_length=1)
    type: Literal["destination", "stay", "experience", "information"]
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    resortArea: ResortArea
    interests: list[str]
    pace: Literal["relaxed", "balanced", "active", "any"]
    suitableFor: list[str]
    sourceUrl: HttpUrl
    checkedAt: date
    priceStatus: Literal["confirmed", "estimated", "check-with-provider"]
    priceBand: Literal["free", "value", "mid-range", "premium", "unknown"]
    priceAmount: float | None = Field(default=None, ge=0)
    currency: Literal["JMD", "USD"] | None = None
    imagePath: str = Field(pattern=r"^/images/")
    imageAlt: str = Field(min_length=1)
    published: bool


class Recommendation(ApiModel):
    contentId: str = Field(min_length=1)
    reason: str = Field(min_length=1, max_length=180)


class ItineraryDay(ApiModel):
    day: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=80)
    itemIds: list[str] = Field(max_length=3)


class AiNarrative(ApiModel):
    summary: str = Field(min_length=1, max_length=240)
    recommendations: list[Recommendation] = Field(min_length=1, max_length=9)
    days: list[ItineraryDay] = Field(min_length=1, max_length=21)


class TripPlan(AiNarrative):
    id: str = Field(min_length=1)
    brief: TripBrief
    selectedArea: ResortArea
    generationMode: Literal["ai", "fallback"]
    generatedAt: str
    fallbackMessage: str | None = None


class ProductEvent(ApiModel):
    sessionId: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
    eventName: Literal[
        "planner_started",
        "brief_completed",
        "plan_generated",
        "plan_saved",
        "provider_handoff_opened",
    ]
    properties: dict[str, str | int | bool] = Field(default_factory=dict)


class SearchResponse(ApiModel):
    items: list[ContentItem]
    backend: Literal["catalog", "elasticsearch"]


class ReindexResponse(ApiModel):
    indexed: int
    index: str
