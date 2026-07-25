from typing import cast

from ai_planner import ApprovedContent
from ai_planner.customisation_models import Weekday

from .models import ContentItem, ResortArea
from .repositories.search import SearchRepository

WEEKDAYS: list[Weekday] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]


def approved_content(item: ContentItem) -> ApprovedContent:
    """Add explicit prototype planning metadata to an approved catalogue record."""
    accessibility = [tag for tag in item.suitableFor if tag in {"step-free", "quiet-space"}]
    return ApprovedContent(
        **item.model_dump(exclude={"imagePath", "imageAlt"}),
        locationLabel="Montego Bay" if item.resortArea == "montego-bay" else "Negril",
        openingDays=WEEKDAYS,
        opensAt="09:00",
        closesAt="17:00",
        expectedVisitMinutes=90 if item.type == "experience" else 60,
        minimumTransitionMinutes=30,
        accessibilityTags=accessibility,
        contentStatus="approved-sample",
    )


def approved_catalogue(items: list[ContentItem]) -> list[ApprovedContent]:
    return [approved_content(item) for item in items if item.published]


class CatalogueCandidateSearch:
    def __init__(self, repository: SearchRepository) -> None:
        self._repository = repository

    async def search_candidates(
        self, query: str, resort_area: str, limit: int, use_semantic: bool
    ) -> tuple[list[ApprovedContent], str]:
        if self._repository.backend != "elasticsearch":
            raise RuntimeError("Connected candidate search requires Elasticsearch")
        items = await self._repository.search(
            query,
            resort_area=cast(ResortArea, resort_area),
            limit=limit,
            semantic=use_semantic,
        )
        backend = "elasticsearch-hybrid" if use_semantic else "elasticsearch-lexical"
        return [approved_content(item) for item in items], backend


class UnavailableCustomisationModel:
    async def run_customisation_agent(self, agent_name: str, payload: dict[str, object]) -> object:
        raise RuntimeError("The configured model provider is unavailable")
