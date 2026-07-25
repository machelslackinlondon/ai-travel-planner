from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

AgentMode = Literal["live", "demo", "hybrid"]
ResultMode = Literal["demo", "live", "hybrid-live", "hybrid-fallback", "live-fallback"]
Weekday = Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


class CustomisationModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CustomisationBrief(CustomisationModel):
    timingMode: Literal["nights", "dates"]
    nights: int = Field(ge=1, le=21)
    startDate: str | None = None
    endDate: str | None = None
    adults: int = Field(ge=1, le=12)
    children: int = Field(ge=0, le=12)
    resortArea: Literal["montego-bay", "negril", "help-me-choose"]
    interests: list[str] = Field(min_length=1, max_length=3)
    pace: Literal["relaxed", "balanced", "active"]
    spendLevel: Literal["value", "mid-range", "premium", "flexible"]
    accommodationStyle: str
    accessibility: list[str] = Field(default_factory=list, max_length=5)
    note: str = Field(default="", max_length=300)


class RecommendationSnapshot(CustomisationModel):
    contentId: str
    reason: str = Field(min_length=1, max_length=180)


class ItineraryDaySnapshot(CustomisationModel):
    day: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=80)
    itemIds: list[str] = Field(max_length=3)


class ItinerarySnapshot(CustomisationModel):
    id: str
    brief: CustomisationBrief
    selectedArea: Literal["montego-bay", "negril"]
    summary: str = Field(min_length=1, max_length=240)
    recommendations: list[RecommendationSnapshot] = Field(min_length=1, max_length=9)
    days: list[ItineraryDaySnapshot] = Field(min_length=1, max_length=21)
    generationMode: Literal["ai", "fallback"]
    generatedAt: str
    fallbackMessage: str | None = None


class ApprovedContent(CustomisationModel):
    id: str
    type: Literal["destination", "stay", "experience", "information"]
    title: str
    summary: str
    resortArea: Literal["montego-bay", "negril"]
    interests: list[str]
    pace: Literal["relaxed", "balanced", "active", "any"]
    suitableFor: list[str]
    sourceUrl: HttpUrl
    checkedAt: date
    priceStatus: Literal["confirmed", "estimated", "check-with-provider"]
    priceBand: Literal["free", "value", "mid-range", "premium", "unknown"]
    priceAmount: float | None = Field(default=None, ge=0)
    currency: Literal["JMD", "USD"] | None = None
    published: bool
    locationLabel: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    openingDays: list[Weekday] = Field(default_factory=list)
    opensAt: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    closesAt: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    expectedVisitMinutes: int | None = Field(default=None, ge=15, le=720)
    minimumTransitionMinutes: int = Field(default=30, ge=0, le=240)
    accessibilityTags: list[str] = Field(default_factory=list)
    contentStatus: Literal["approved", "approved-sample"]


class AgentContext(CustomisationModel):
    traceId: str
    mode: AgentMode
    catalogue: list[ApprovedContent]
    diagnosticsEnabled: bool = False


class EvidenceValue(CustomisationModel):
    value: str | bool | int | list[str] | None
    confidence: float = Field(ge=0, le=1)
    source: Literal["user", "brief", "itinerary", "default"]


class TravellerProfile(CustomisationModel):
    budget: EvidenceValue
    interests: EvidenceValue
    accessibilityNeeds: EvidenceValue
    groupNeeds: EvidenceValue
    pace: EvidenceValue
    destination: EvidenceValue
    dates: EvidenceValue
    fixedItemIds: list[str]
    flexibleItemIds: list[str]
    searchIntent: EvidenceValue
    followUpQuestion: str | None = None


class CustomisationRequest(CustomisationModel):
    tripId: str
    originalItinerary: ItinerarySnapshot
    originalBrief: CustomisationBrief | None = None
    requestedChange: str = Field(min_length=3, max_length=500)


class RetrieverInput(CustomisationModel):
    profile: TravellerProfile
    requestedChange: str
    currentItemIds: list[str]


class RetrieverOutput(CustomisationModel):
    candidates: list[ApprovedContent] = Field(max_length=12)
    backend: Literal["memory", "elasticsearch-lexical", "elasticsearch-hybrid"]
    fallbackUsed: bool = False


class RepairInstruction(CustomisationModel):
    code: str
    message: str
    contentId: str | None = None
    day: int | None = None


class ScheduleItem(CustomisationModel):
    day: int
    contentId: str
    startsAt: str = Field(pattern=r"^\d{2}:\d{2}$")
    endsAt: str = Field(pattern=r"^\d{2}:\d{2}$")
    transitionMinutes: int = Field(ge=0, le=240)


class PlannerInput(CustomisationModel):
    currentItinerary: ItinerarySnapshot
    profile: TravellerProfile
    candidates: list[ApprovedContent]
    requestedChange: str
    repairInstructions: list[RepairInstruction] = Field(default_factory=list)
    repairPass: int = Field(default=0, ge=0, le=1)
    repairItinerary: ItinerarySnapshot | None = None


class PlannerOutput(CustomisationModel):
    itinerary: ItinerarySnapshot
    schedule: list[ScheduleItem]
    changeReasons: dict[str, str]


class ValidationIssue(CustomisationModel):
    code: str
    message: str
    severity: Literal["error", "warning"]
    day: int | None = None
    contentId: str | None = None


class CriticInput(CustomisationModel):
    originalItinerary: ItinerarySnapshot
    proposedItinerary: ItinerarySnapshot
    profile: TravellerProfile
    approvedCandidateIds: list[str]
    schedule: list[ScheduleItem]


class CriticResult(CustomisationModel):
    valid: bool
    errors: list[ValidationIssue]
    warnings: list[ValidationIssue]
    suggestedRepairs: list[RepairInstruction]


class ComparisonChange(CustomisationModel):
    type: Literal["added", "removed", "moved"]
    contentId: str
    title: str
    fromDay: int | None = None
    toDay: int | None = None
    reason: str


class CustomisationWorkflowResult(CustomisationModel):
    draftId: str
    traceId: str
    status: Literal["valid", "invalid", "needs-input", "no-results"]
    resultMode: ResultMode
    originalItinerary: ItinerarySnapshot
    proposedItinerary: ItinerarySnapshot | None = None
    profile: TravellerProfile
    changes: list[ComparisonChange] = Field(default_factory=list)
    critic: CriticResult | None = None
    repairCount: int = Field(default=0, ge=0, le=1)
    followUpQuestion: str | None = None
    fallbackUsed: bool = False
