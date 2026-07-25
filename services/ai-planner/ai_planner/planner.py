import asyncio
import re
from datetime import UTC, datetime
from typing import Any, Literal, Protocol
from uuid import uuid4

from .models import (
    InterpretedRequest,
    ItineraryActivity,
    LlmNarrative,
    PlannerDay,
    PlannerRequest,
    PlannerResponse,
    SearchDocument,
    SearchFilters,
)
from .repositories import TravelSearchRepository


class StructuredLlmClient(Protocol):
    async def generate_planner_narrative(self, request: str, context: list[dict[str, Any]], days: int) -> Any: ...


DESTINATIONS = {"montego bay": "montego-bay", "negril": "negril", "ocho rios": "ocho-rios", "jamaica": None}
INTERESTS = {"family", "romantic", "food", "beach", "culture", "nature", "active", "relaxation", "luxury"}


def interpret_request(value: str) -> InterpretedRequest:
    text = value.lower()
    destination = next((destination_id for name, destination_id in DESTINATIONS.items() if name in text), None)
    days_match = re.search(r"\b(\d{1,2})[ -]?(?:day|night)s?\b", text)
    days = min(14, max(1, int(days_match.group(1)))) if days_match else 3
    interests = sorted(interest for interest in INTERESTS if interest in text)
    price: Literal["free", "value", "mid-range", "premium"] | None = (
        "premium"
        if any(word in text for word in ("luxury", "premium"))
        else "value"
        if any(word in text for word in ("budget", "value", "cheap"))
        else None
    )
    return InterpretedRequest(destination=destination, days=days, interests=interests, priceLevel=price)


def as_activity(item: SearchDocument) -> ItineraryActivity:
    return ItineraryActivity(id=item.id, name=item.name, type=item.type, description=item.description, rating=item.rating, priceLevel=item.priceLevel)


class AiPlannerService:
    def __init__(self, repository: TravelSearchRepository, llm_client: StructuredLlmClient | None = None, timeout_seconds: float = 5) -> None:
        self._repository = repository
        self._llm = llm_client
        self._timeout_seconds = timeout_seconds

    async def search(self, query: str, filters: SearchFilters, limit: int = 18):
        return await self._repository.search(query, filters, limit)

    async def plan(self, planner_request: PlannerRequest) -> PlannerResponse:
        intent = interpret_request(planner_request.request)
        filters = SearchFilters(destination_id=intent.destination, tags=intent.interests, price_level=intent.priceLevel)
        result = await self._repository.search(planner_request.request, filters)
        if len(result.items) < 4 and (filters.tags or filters.price_level):
            result = await self._repository.search(planner_request.request, SearchFilters(destination_id=intent.destination))
        if not result.items:
            result = await self._repository.search("Jamaica", SearchFilters())
        items = result.items[:18]
        if not items:
            raise ValueError("No travel content is available for planning")

        destination_name = next((item.name for item in items if item.type == "destination"), None) or (intent.destination or "Jamaica").replace("-", " ").title()
        narrative = None
        if self._llm:
            context = [item.model_dump() for item in items]
            try:
                candidate = await asyncio.wait_for(self._llm.generate_planner_narrative(planner_request.request, context, intent.days), timeout=self._timeout_seconds)
                narrative = LlmNarrative.model_validate(candidate)
                if len(narrative.dayTitles) != intent.days:
                    narrative = None
            except Exception:  # noqa: BLE001 - any provider failure must use the deterministic fallback.
                narrative = None

        selectable = [item for item in items if item.type != "destination"] or items
        days = [
            PlannerDay(
                day=index + 1,
                title=narrative.dayTitles[index] if narrative else (f"Discover {destination_name}" if index else f"Arrive and settle into {destination_name}"),
                activities=[as_activity(selectable[(index * 2 + offset) % len(selectable)]) for offset in range(min(2, len(selectable)))],
            )
            for index in range(intent.days)
        ]
        unique_recommendations = list({item.id: item for item in selectable}.values())[:6]
        return PlannerResponse(
            id=str(uuid4()),
            tripName=narrative.tripName if narrative else f"{destination_name} trip",
            duration=f"{intent.days} days",
            summary=narrative.summary if narrative else f"A repository-grounded {intent.days}-day outline using sample content for {destination_name}.",
            estimatedBudget="Indicative only — confirm all prices with providers.",
            interpretedRequest=intent,
            days=days,
            recommendations=[as_activity(item) for item in unique_recommendations],
            sources=[item.id for item in items],
            generationMode="ai" if narrative else "fallback",
            searchBackend=result.backend,
            generatedAt=datetime.now(UTC).isoformat(),
            warnings=["Prototype suggestions use sample content; verify availability, accessibility and prices directly."],
        )
