from uuid import NAMESPACE_URL, uuid5

from .customisation_agents import (
    CriticAgent,
    DemoCritic,
    DemoPlanner,
    DemoRetriever,
    DemoTravellerProfiler,
    PlannerAgent,
    RetrieverAgent,
    TravellerProfilerAgent,
)
from .customisation_live import (
    CandidateSearchPort,
    CustomisationModelPort,
    FallbackState,
    LiveCritic,
    LivePlanner,
    LiveRetriever,
    LiveTravellerProfiler,
    ResilientCritic,
    ResilientPlanner,
    ResilientRetriever,
    ResilientTravellerProfiler,
)
from .customisation_models import (
    AgentContext,
    AgentMode,
    ApprovedContent,
    ComparisonChange,
    CriticInput,
    CustomisationRequest,
    CustomisationWorkflowResult,
    PlannerInput,
    ResultMode,
    RetrieverInput,
)


class CustomisationOrchestrator:
    def __init__(
        self,
        *,
        context: AgentContext,
        profiler: TravellerProfilerAgent,
        retriever: RetrieverAgent,
        planner: PlannerAgent,
        critic: CriticAgent,
        fallback_state: FallbackState | None = None,
    ) -> None:
        self._context = context
        self._profiler = profiler
        self._retriever = retriever
        self._planner = planner
        self._critic = critic
        self._fallback_state = fallback_state

    @classmethod
    def demo(
        cls, catalogue: list[ApprovedContent], diagnostics_enabled: bool = False
    ) -> "CustomisationOrchestrator":
        return cls(
            context=AgentContext(
                traceId="pending",
                mode="demo",
                catalogue=catalogue,
                diagnosticsEnabled=diagnostics_enabled,
            ),
            profiler=DemoTravellerProfiler(),
            retriever=DemoRetriever(),
            planner=DemoPlanner(),
            critic=DemoCritic(),
        )

    @classmethod
    def connected(
        cls,
        *,
        mode: AgentMode,
        catalogue: list[ApprovedContent],
        model: CustomisationModelPort,
        search: CandidateSearchPort,
        semantic_enabled: bool,
        diagnostics_enabled: bool = False,
    ) -> "CustomisationOrchestrator":
        if mode not in {"live", "hybrid"}:
            raise ValueError("Connected customisation mode must be live or hybrid")
        state = FallbackState()
        demo_profiler, demo_retriever = DemoTravellerProfiler(), DemoRetriever()
        demo_planner, demo_critic = DemoPlanner(), DemoCritic()
        return cls(
            context=AgentContext(
                traceId="pending",
                mode=mode,
                catalogue=catalogue,
                diagnosticsEnabled=diagnostics_enabled,
            ),
            profiler=ResilientTravellerProfiler(LiveTravellerProfiler(model), demo_profiler, state),
            retriever=ResilientRetriever(LiveRetriever(search, semantic_enabled), demo_retriever, state),
            planner=ResilientPlanner(LivePlanner(model), demo_planner, state),
            critic=ResilientCritic(LiveCritic(model), demo_critic, state),
            fallback_state=state,
        )

    async def run(self, request: CustomisationRequest) -> CustomisationWorkflowResult:
        trace_id = str(uuid5(NAMESPACE_URL, f"{request.tripId}:{request.requestedChange.strip().lower()}"))
        draft_id = str(uuid5(NAMESPACE_URL, f"draft:{trace_id}"))
        context = self._context.model_copy(update={"traceId": trace_id})
        if self._fallback_state:
            self._fallback_state.used = False
        profile = await self._profiler.run(request, context)
        result_mode: ResultMode = "demo" if context.mode == "demo" else "live"
        if context.mode == "hybrid":
            result_mode = "hybrid-fallback" if self._fallback_state and self._fallback_state.used else "hybrid-live"
        elif context.mode == "live" and self._fallback_state and self._fallback_state.used:
            result_mode = "live-fallback"
        if profile.followUpQuestion:
            return CustomisationWorkflowResult(
                draftId=draft_id,
                traceId=trace_id,
                status="needs-input",
                resultMode=result_mode,
                originalItinerary=request.originalItinerary,
                profile=profile,
                followUpQuestion=profile.followUpQuestion,
            )

        current_ids = list(
            dict.fromkeys(item_id for day in request.originalItinerary.days for item_id in day.itemIds)
        )
        retrieval = await self._retriever.run(
            RetrieverInput(
                profile=profile,
                requestedChange=request.requestedChange,
                currentItemIds=current_ids,
            ),
            context,
        )
        fallback_used = retrieval.fallbackUsed or bool(self._fallback_state and self._fallback_state.used)
        if context.mode == "hybrid":
            result_mode = "hybrid-fallback" if fallback_used else "hybrid-live"
        elif context.mode == "live" and fallback_used:
            result_mode = "live-fallback"
        requested_change = request.requestedChange.lower()
        can_remove_without_candidates = "relax" in requested_change or "reduce" in requested_change
        if not retrieval.candidates and not can_remove_without_candidates:
            return CustomisationWorkflowResult(
                draftId=draft_id,
                traceId=trace_id,
                status="no-results",
                resultMode=result_mode,
                originalItinerary=request.originalItinerary,
                profile=profile,
                fallbackUsed=fallback_used,
            )

        proposal = await self._planner.run(
            PlannerInput(
                currentItinerary=request.originalItinerary,
                profile=profile,
                candidates=retrieval.candidates,
                requestedChange=request.requestedChange,
            ),
            context,
        )
        critic = await self._critic.run(
            CriticInput(
                originalItinerary=request.originalItinerary,
                proposedItinerary=proposal.itinerary,
                profile=profile,
                approvedCandidateIds=[item.id for item in context.catalogue],
                schedule=proposal.schedule,
            ),
            context,
        )
        repair_count = 0
        if not critic.valid:
            repair_count = 1
            proposal = await self._planner.run(
                PlannerInput(
                    currentItinerary=request.originalItinerary,
                    profile=profile,
                    candidates=retrieval.candidates,
                    requestedChange=request.requestedChange,
                    repairInstructions=critic.suggestedRepairs,
                    repairPass=1,
                    repairItinerary=proposal.itinerary,
                ),
                context,
            )
            critic = await self._critic.run(
                CriticInput(
                    originalItinerary=request.originalItinerary,
                    proposedItinerary=proposal.itinerary,
                    profile=profile,
                    approvedCandidateIds=[item.id for item in context.catalogue],
                    schedule=proposal.schedule,
                ),
                context,
            )

        fallback_used = fallback_used or bool(self._fallback_state and self._fallback_state.used)
        if context.mode == "hybrid":
            result_mode = "hybrid-fallback" if fallback_used else "hybrid-live"
        elif context.mode == "live" and fallback_used:
            result_mode = "live-fallback"

        changes = compare_itineraries(request.originalItinerary, proposal.itinerary, context.catalogue, proposal.changeReasons)
        return CustomisationWorkflowResult(
            draftId=draft_id,
            traceId=trace_id,
            status="valid" if critic.valid else "invalid",
            resultMode=result_mode,
            originalItinerary=request.originalItinerary,
            proposedItinerary=proposal.itinerary,
            profile=profile,
            changes=changes,
            critic=critic,
            repairCount=repair_count,
            fallbackUsed=fallback_used,
        )


def compare_itineraries(
    original,
    proposed,
    catalogue: list[ApprovedContent],
    reasons: dict[str, str],
) -> list[ComparisonChange]:
    titles = {item.id: item.title for item in catalogue}
    original_days = {item_id: day.day for day in original.days for item_id in day.itemIds}
    proposed_days = {item_id: day.day for day in proposed.days for item_id in day.itemIds}
    changes: list[ComparisonChange] = []
    for content_id in sorted(original_days.keys() - proposed_days.keys()):
        changes.append(
            ComparisonChange(
                type="removed",
                contentId=content_id,
                title=titles.get(content_id, content_id),
                fromDay=original_days[content_id],
                reason=reasons.get(content_id, "Removed to match the requested change."),
            )
        )
    for content_id in sorted(proposed_days.keys() - original_days.keys()):
        changes.append(
            ComparisonChange(
                type="added",
                contentId=content_id,
                title=titles.get(content_id, content_id),
                toDay=proposed_days[content_id],
                reason=reasons.get(content_id, "Added to match the requested change."),
            )
        )
    for content_id in sorted(original_days.keys() & proposed_days.keys()):
        if original_days[content_id] != proposed_days[content_id]:
            changes.append(
                ComparisonChange(
                    type="moved",
                    contentId=content_id,
                    title=titles.get(content_id, content_id),
                    fromDay=original_days[content_id],
                    toDay=proposed_days[content_id],
                    reason=reasons.get(content_id, "Moved to improve the day-by-day flow."),
                )
            )
    return changes
