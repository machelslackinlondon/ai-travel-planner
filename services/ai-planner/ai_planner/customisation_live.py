from dataclasses import dataclass
from typing import Any, Protocol

from pydantic import Field

from .customisation_agents import (
    CriticAgent,
    DemoCritic,
    DemoPlanner,
    DemoTravellerProfiler,
    PlannerAgent,
    RetrieverAgent,
    TravellerProfilerAgent,
    apply_profile_filters,
)
from .customisation_models import (
    AgentContext,
    ApprovedContent,
    CriticInput,
    CriticResult,
    CustomisationModel,
    CustomisationRequest,
    EvidenceValue,
    PlannerInput,
    PlannerOutput,
    RetrieverInput,
    RetrieverOutput,
    TravellerProfile,
)


class CustomisationModelPort(Protocol):
    async def run_customisation_agent(self, agent_name: str, payload: dict[str, Any]) -> Any: ...


class CandidateSearchPort(Protocol):
    async def search_candidates(
        self, query: str, resort_area: str, limit: int, use_semantic: bool
    ) -> tuple[list[ApprovedContent], str]: ...


class LiveProfileOverrides(CustomisationModel):
    interests: list[str] = Field(max_length=5)
    pace: str
    fixedItemIds: list[str] = Field(max_length=9)
    searchIntent: str = Field(min_length=3, max_length=300)
    confidence: float = Field(ge=0, le=1)


class LivePlanSelection(CustomisationModel):
    preferredCandidateIds: list[str] = Field(max_length=8)
    explanationById: dict[str, str]


class LiveTravellerProfiler:
    def __init__(self, model: CustomisationModelPort) -> None:
        self._model = model
        self._demo = DemoTravellerProfiler()

    async def run(self, input_value: CustomisationRequest, context: AgentContext) -> TravellerProfile:
        baseline = await self._demo.run(input_value, context)
        response = await self._model.run_customisation_agent(
            "traveller-profiler",
            {
                "requestedChange": input_value.requestedChange,
                "brief": input_value.originalBrief.model_dump() if input_value.originalBrief else None,
                "currentItemIds": [item_id for day in input_value.originalItinerary.days for item_id in day.itemIds],
                "baseline": baseline.model_dump(),
            },
        )
        overrides = LiveProfileOverrides.model_validate(response)
        allowed_ids = {item_id for day in input_value.originalItinerary.days for item_id in day.itemIds}
        return baseline.model_copy(
            update={
                "interests": EvidenceValue(
                    value=overrides.interests,
                    confidence=overrides.confidence,
                    source="user" if overrides.confidence >= 0.9 else "itinerary",
                ),
                "pace": EvidenceValue(
                    value=overrides.pace,
                    confidence=overrides.confidence,
                    source="user" if overrides.confidence >= 0.9 else "itinerary",
                ),
                "fixedItemIds": [item_id for item_id in overrides.fixedItemIds if item_id in allowed_ids],
                "searchIntent": EvidenceValue(
                    value=overrides.searchIntent,
                    confidence=overrides.confidence,
                    source="user",
                ),
            }
        )


class LiveRetriever:
    def __init__(self, search: CandidateSearchPort, semantic_enabled: bool) -> None:
        self._search = search
        self._semantic_enabled = semantic_enabled

    async def run(self, input_value: RetrieverInput, context: AgentContext) -> RetrieverOutput:
        candidates, backend = await self._search.search_candidates(
            query=str(input_value.profile.searchIntent.value),
            resort_area=str(input_value.profile.destination.value),
            limit=12,
            use_semantic=self._semantic_enabled,
        )
        reconsider = "reconsider" in input_value.requestedChange.lower()
        filtered = [
            candidate
            for candidate in candidates
            if candidate.published
            and candidate.contentStatus in {"approved", "approved-sample"}
            and (reconsider or candidate.id not in input_value.currentItemIds)
        ]
        filtered = apply_profile_filters(filtered, input_value.profile)
        return RetrieverOutput(
            candidates=filtered[:8],
            backend="elasticsearch-hybrid" if backend == "elasticsearch-hybrid" else "elasticsearch-lexical",
            fallbackUsed=False,
        )


class LivePlanner:
    def __init__(self, model: CustomisationModelPort) -> None:
        self._model = model
        self._demo = DemoPlanner()

    async def run(self, input_value: PlannerInput, context: AgentContext) -> PlannerOutput:
        if input_value.repairPass:
            return await self._demo.run(input_value, context)
        response = await self._model.run_customisation_agent(
            "itinerary-planner",
            {
                "requestedChange": input_value.requestedChange,
                "profile": input_value.profile.model_dump(),
                "currentItinerary": input_value.currentItinerary.model_dump(),
                "candidates": [candidate.model_dump(mode="json") for candidate in input_value.candidates],
            },
        )
        selection = LivePlanSelection.model_validate(response)
        by_id = {candidate.id: candidate for candidate in input_value.candidates}
        preferred = [by_id[item_id] for item_id in selection.preferredCandidateIds if item_id in by_id]
        remaining = [candidate for candidate in input_value.candidates if candidate.id not in selection.preferredCandidateIds]
        proposal = await self._demo.run(
            input_value.model_copy(update={"candidates": [*preferred, *remaining]}),
            context,
        )
        return proposal


class LiveCritic:
    def __init__(self, model: CustomisationModelPort) -> None:
        self._model = model
        self._demo = DemoCritic()

    async def run(self, input_value: CriticInput, context: AgentContext) -> CriticResult:
        deterministic = await self._demo.run(input_value, context)
        if not deterministic.valid:
            return deterministic
        response = await self._model.run_customisation_agent(
            "itinerary-critic",
            {
                "profile": input_value.profile.model_dump(),
                "proposal": input_value.proposedItinerary.model_dump(),
                "schedule": [item.model_dump() for item in input_value.schedule],
                "deterministicChecks": deterministic.model_dump(),
            },
        )
        model_result = CriticResult.model_validate(response)
        errors = [*deterministic.errors, *model_result.errors]
        return CriticResult(
            valid=not errors,
            errors=errors,
            warnings=[*deterministic.warnings, *model_result.warnings],
            suggestedRepairs=[*deterministic.suggestedRepairs, *model_result.suggestedRepairs],
        )


@dataclass
class FallbackState:
    used: bool = False


class ResilientTravellerProfiler:
    def __init__(self, primary: TravellerProfilerAgent, fallback: TravellerProfilerAgent, state: FallbackState) -> None:
        self._primary, self._fallback, self._state = primary, fallback, state

    async def run(self, input_value: CustomisationRequest, context: AgentContext) -> TravellerProfile:
        try:
            return await self._primary.run(input_value, context)
        except Exception:  # noqa: BLE001 - hybrid mode must continue with its deterministic adapter.
            self._state.used = True
            return await self._fallback.run(input_value, context)


class ResilientRetriever:
    def __init__(self, primary: RetrieverAgent, fallback: RetrieverAgent, state: FallbackState) -> None:
        self._primary, self._fallback, self._state = primary, fallback, state

    async def run(self, input_value: RetrieverInput, context: AgentContext) -> RetrieverOutput:
        try:
            return await self._primary.run(input_value, context)
        except Exception:  # noqa: BLE001 - an unavailable search service must not dead-end the journey.
            self._state.used = True
            result = await self._fallback.run(input_value, context)
            return result.model_copy(update={"fallbackUsed": True})


class ResilientPlanner:
    def __init__(self, primary: PlannerAgent, fallback: PlannerAgent, state: FallbackState) -> None:
        self._primary, self._fallback, self._state = primary, fallback, state

    async def run(self, input_value: PlannerInput, context: AgentContext) -> PlannerOutput:
        try:
            return await self._primary.run(input_value, context)
        except Exception:  # noqa: BLE001 - invalid or unavailable model output uses the deterministic planner.
            self._state.used = True
            return await self._fallback.run(input_value, context)


class ResilientCritic:
    def __init__(self, primary: CriticAgent, fallback: CriticAgent, state: FallbackState) -> None:
        self._primary, self._fallback, self._state = primary, fallback, state

    async def run(self, input_value: CriticInput, context: AgentContext) -> CriticResult:
        try:
            return await self._primary.run(input_value, context)
        except Exception:  # noqa: BLE001 - safety validation must continue without the model provider.
            self._state.used = True
            return await self._fallback.run(input_value, context)
