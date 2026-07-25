import pytest
from ai_planner.customisation_agents import (
    DemoCritic,
    DemoPlanner,
    DemoRetriever,
    DemoTravellerProfiler,
)
from ai_planner.customisation_models import (
    AgentContext,
    ApprovedContent,
    CriticInput,
    CustomisationBrief,
    CustomisationRequest,
    ItineraryDaySnapshot,
    ItinerarySnapshot,
    PlannerInput,
    RecommendationSnapshot,
    RetrieverInput,
    ScheduleItem,
)
from ai_planner.customisation_orchestrator import CustomisationOrchestrator


def content(
    content_id: str,
    *,
    interests: list[str],
    suitable_for: list[str],
    opening_days: list[str] | None = None,
) -> ApprovedContent:
    return ApprovedContent(
        id=content_id,
        type="experience",
        title=f"Sample — {content_id}",
        summary=f"Sample description for {content_id}.",
        resortArea="montego-bay",
        interests=interests,
        pace="balanced",
        suitableFor=suitable_for,
        sourceUrl="https://example.com/sample",
        checkedAt="2026-07-01",
        priceStatus="estimated",
        priceBand="value",
        published=True,
        openingDays=opening_days or ["monday", "tuesday", "wednesday", "thursday", "friday"],
        opensAt="09:00",
        closesAt="17:00",
        expectedVisitMinutes=90,
        minimumTransitionMinutes=30,
        contentStatus="approved-sample",
    )


def itinerary() -> ItinerarySnapshot:
    return ItinerarySnapshot(
        id="trip-1",
        brief=CustomisationBrief(
            timingMode="dates",
            nights=3,
            startDate="2026-07-06",
            endDate="2026-07-09",
            adults=2,
            children=1,
            resortArea="montego-bay",
            interests=["beach", "relaxation"],
            pace="balanced",
            spendLevel="value",
            accommodationStyle="no-preference",
            accessibility=["step-free"],
            note="",
        ),
        selectedArea="montego-bay",
        summary="Original sample trip.",
        recommendations=[
            RecommendationSnapshot(contentId="beach", reason="Original beach idea."),
            RecommendationSnapshot(contentId="culture", reason="Original culture idea."),
        ],
        days=[
            ItineraryDaySnapshot(day=1, title="Beach day", itemIds=["beach"]),
            ItineraryDaySnapshot(day=2, title="Culture day", itemIds=["culture"]),
            ItineraryDaySnapshot(day=3, title="Open day", itemIds=[]),
        ],
        generationMode="fallback",
        generatedAt="2026-07-01T12:00:00Z",
    )


@pytest.fixture
def catalogue() -> list[ApprovedContent]:
    return [
        content("beach", interests=["beach"], suitable_for=["adults", "families"]),
        content("culture", interests=["culture"], suitable_for=["adults"]),
        content("family-food", interests=["family", "food"], suitable_for=["children", "families"]),
        content("food-culture", interests=["food", "culture"], suitable_for=["adults", "families"]),
    ]


@pytest.mark.asyncio
async def test_profiler_sources_explicit_and_inferred_values(catalogue: list[ApprovedContent]) -> None:
    current = itinerary()
    context = AgentContext(traceId="trace", mode="demo", catalogue=catalogue)

    profile = await DemoTravellerProfiler().run(
        CustomisationRequest(
            tripId=current.id,
            originalItinerary=current,
            originalBrief=current.brief,
            requestedChange="Make the trip more family friendly but keep the beach day.",
        ),
        context,
    )

    assert profile.budget.source == "brief"
    assert profile.groupNeeds.value == ["family", "children"]
    assert profile.interests.source == "user"
    assert profile.fixedItemIds == ["beach"]
    assert profile.searchIntent.confidence >= 0.9


@pytest.mark.asyncio
async def test_retriever_ranks_relevant_approved_non_duplicates(catalogue: list[ApprovedContent]) -> None:
    current = itinerary()
    context = AgentContext(traceId="trace", mode="demo", catalogue=catalogue)
    profile = await DemoTravellerProfiler().run(
        CustomisationRequest(
            tripId=current.id,
            originalItinerary=current,
            originalBrief=current.brief,
            requestedChange="Replace one beach day with food and culture.",
        ),
        context,
    )

    result = await DemoRetriever().run(
        RetrieverInput(
            profile=profile,
            requestedChange="Replace one beach day with food and culture.",
            currentItemIds=["beach", "culture"],
        ),
        context,
    )

    assert result.candidates[0].id == "food-culture"
    assert all(candidate.id not in {"beach", "culture"} for candidate in result.candidates)
    assert all(candidate.contentStatus == "approved-sample" for candidate in result.candidates)


@pytest.mark.asyncio
async def test_planner_preserves_fixed_items_and_uses_retrieved_ids(catalogue: list[ApprovedContent]) -> None:
    current = itinerary()
    context = AgentContext(traceId="trace", mode="demo", catalogue=catalogue)
    profile = await DemoTravellerProfiler().run(
        CustomisationRequest(
            tripId=current.id,
            originalItinerary=current,
            originalBrief=current.brief,
            requestedChange="Make the trip family friendly and keep the beach day.",
        ),
        context,
    )
    retrieval = await DemoRetriever().run(
        RetrieverInput(profile=profile, requestedChange="family friendly", currentItemIds=["beach", "culture"]),
        context,
    )

    proposal = await DemoPlanner().run(
        PlannerInput(
            currentItinerary=current,
            profile=profile,
            candidates=retrieval.candidates,
            requestedChange="Make the trip family friendly and keep the beach day.",
        ),
        context,
    )

    proposed_ids = {item_id for day in proposal.itinerary.days for item_id in day.itemIds}
    assert "beach" in proposed_ids
    assert proposed_ids - {"beach", "culture"} <= {candidate.id for candidate in retrieval.candidates}


@pytest.mark.asyncio
async def test_critic_catches_schedule_and_content_conflicts(catalogue: list[ApprovedContent]) -> None:
    original = itinerary()
    invalid = original.model_copy(
        update={
            "days": [
                ItineraryDaySnapshot(day=1, title="Too much", itemIds=["beach", "beach", "family-food"]),
                *original.days[1:],
            ]
        }
    )
    context = AgentContext(traceId="trace", mode="demo", catalogue=catalogue)

    result = await DemoCritic().run(
        CriticInput(
            originalItinerary=original,
            proposedItinerary=invalid,
            profile=(
                await DemoTravellerProfiler().run(
                    CustomisationRequest(
                        tripId=original.id,
                        originalItinerary=original,
                        originalBrief=original.brief,
                        requestedChange="invalid fixture",
                    ),
                    context,
                )
            ),
            approvedCandidateIds=[item.id for item in catalogue],
            schedule=[
                ScheduleItem(day=1, contentId="beach", startsAt="08:00", endsAt="09:30", transitionMinutes=0),
                ScheduleItem(day=1, contentId="beach", startsAt="09:00", endsAt="10:30", transitionMinutes=0),
                ScheduleItem(day=1, contentId="family-food", startsAt="10:30", endsAt="12:00", transitionMinutes=0),
            ],
        ),
        context,
    )

    codes = {issue.code for issue in result.errors}
    assert {"duplicate-place", "outside-opening-hours", "overlapping-activities", "insufficient-transition"} <= codes
    assert result.valid is False


@pytest.mark.asyncio
async def test_orchestrator_runs_one_repair_and_is_deterministic(catalogue: list[ApprovedContent]) -> None:
    original = itinerary()
    orchestrator = CustomisationOrchestrator.demo(catalogue)
    request = CustomisationRequest(
        tripId=original.id,
        originalItinerary=original,
        originalBrief=original.brief,
        requestedChange="Demonstrate the invalid fixture and repair it.",
    )

    first = await orchestrator.run(request)
    second = await orchestrator.run(request)

    assert first.status == "valid"
    assert first.repairCount == 1
    assert first.critic.valid is True
    assert first.proposedItinerary == second.proposedItinerary
    assert first.changes == second.changes


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "requested_change",
    [
        "Make the trip more family friendly.",
        "Reduce travel time and make the pace more relaxed.",
        "Replace one beach day with food and culture.",
    ],
)
async def test_demo_requests_produce_deterministic_changes(
    catalogue: list[ApprovedContent], requested_change: str
) -> None:
    original = itinerary()
    orchestrator = CustomisationOrchestrator.demo(catalogue)
    request = CustomisationRequest(
        tripId=original.id,
        originalItinerary=original,
        originalBrief=original.brief,
        requestedChange=requested_change,
    )

    first = await orchestrator.run(request)
    second = await orchestrator.run(request)

    assert first.status == "valid"
    assert first.changes
    assert first.proposedItinerary == second.proposedItinerary


class UnavailableModel:
    async def run_customisation_agent(self, agent_name: str, payload: dict[str, object]) -> object:
        raise RuntimeError("model unavailable")


class UnavailableSearch:
    async def search_candidates(
        self, query: str, resort_area: str, limit: int, use_semantic: bool
    ) -> tuple[list[ApprovedContent], str]:
        raise RuntimeError("search unavailable")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("mode", "expected_result_mode"),
    [("live", "live-fallback"), ("hybrid", "hybrid-fallback")],
)
async def test_connected_modes_fall_back_without_dead_ending(
    catalogue: list[ApprovedContent], mode: str, expected_result_mode: str
) -> None:
    original = itinerary()
    orchestrator = CustomisationOrchestrator.connected(
        mode=mode,
        catalogue=catalogue,
        model=UnavailableModel(),
        search=UnavailableSearch(),
        semantic_enabled=True,
    )

    result = await orchestrator.run(
        CustomisationRequest(
            tripId=original.id,
            originalItinerary=original,
            originalBrief=original.brief,
            requestedChange="Add more food and culture experiences.",
        )
    )

    assert result.status == "valid"
    assert result.fallbackUsed is True
    assert result.resultMode == expected_result_mode
    assert result.proposedItinerary is not None


@pytest.mark.asyncio
async def test_orchestrator_executes_agents_in_required_order(catalogue: list[ApprovedContent]) -> None:
    calls: list[str] = []

    class RecordingProfiler(DemoTravellerProfiler):
        async def run(self, input_value, context):
            calls.append("profiler")
            return await super().run(input_value, context)

    class RecordingRetriever(DemoRetriever):
        async def run(self, input_value, context):
            calls.append("retriever")
            return await super().run(input_value, context)

    class RecordingPlanner(DemoPlanner):
        async def run(self, input_value, context):
            calls.append("planner")
            return await super().run(input_value, context)

    class RecordingCritic(DemoCritic):
        async def run(self, input_value, context):
            calls.append("critic")
            return await super().run(input_value, context)

    original = itinerary()
    orchestrator = CustomisationOrchestrator(
        context=AgentContext(traceId="pending", mode="demo", catalogue=catalogue),
        profiler=RecordingProfiler(),
        retriever=RecordingRetriever(),
        planner=RecordingPlanner(),
        critic=RecordingCritic(),
    )
    await orchestrator.run(
        CustomisationRequest(
            tripId=original.id,
            originalItinerary=original,
            originalBrief=original.brief,
            requestedChange="Add more food and culture experiences.",
        )
    )

    assert calls == ["profiler", "retriever", "planner", "critic"]
