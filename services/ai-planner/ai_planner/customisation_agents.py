import re
from collections import Counter
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from typing import Protocol, TypeVar

from .customisation_models import (
    AgentContext,
    ApprovedContent,
    CriticInput,
    CriticResult,
    CustomisationRequest,
    EvidenceValue,
    ItineraryDaySnapshot,
    PlannerInput,
    PlannerOutput,
    RecommendationSnapshot,
    RepairInstruction,
    RetrieverInput,
    RetrieverOutput,
    ScheduleItem,
    TravellerProfile,
    ValidationIssue,
)

InputT_contra = TypeVar("InputT_contra", contravariant=True)
OutputT_co = TypeVar("OutputT_co", covariant=True)


class Agent(Protocol[InputT_contra, OutputT_co]):
    async def run(self, input_value: InputT_contra, context: AgentContext) -> OutputT_co: ...


class TravellerProfilerAgent(Agent[CustomisationRequest, TravellerProfile], Protocol):
    pass


class RetrieverAgent(Agent[RetrieverInput, RetrieverOutput], Protocol):
    pass


class PlannerAgent(Agent[PlannerInput, PlannerOutput], Protocol):
    pass


class CriticAgent(Agent[CriticInput, CriticResult], Protocol):
    pass


WORD_PATTERN = re.compile(r"[a-z0-9]+")
STOP_WORDS = {"a", "and", "but", "day", "for", "it", "make", "more", "one", "the", "this", "trip", "with"}


def words(value: str) -> set[str]:
    return {word for word in WORD_PATTERN.findall(value.lower()) if word not in STOP_WORDS}


def all_item_ids(request: CustomisationRequest) -> list[str]:
    return list(dict.fromkeys(item_id for day in request.originalItinerary.days for item_id in day.itemIds))


def apply_profile_filters(
    candidates: list[ApprovedContent], profile: TravellerProfile
) -> list[ApprovedContent]:
    """Apply supported constraints, retaining unknown-data candidates for Critic warnings."""

    def narrow(predicate: Callable[[ApprovedContent], bool]) -> None:
        nonlocal candidates
        matching = [candidate for candidate in candidates if predicate(candidate)]
        if matching:
            candidates = matching

    group_needs = set(profile.groupNeeds.value) if isinstance(profile.groupNeeds.value, list) else set()
    if {"family", "children"} & group_needs:
        narrow(lambda item: bool({"families", "children", "older-children"} & set(item.suitableFor)))

    accessibility = (
        set(profile.accessibilityNeeds.value)
        if isinstance(profile.accessibilityNeeds.value, list)
        else set()
    )
    if accessibility:
        narrow(lambda item: not item.accessibilityTags or accessibility <= set(item.accessibilityTags))

    budget = str(profile.budget.value)
    if budget == "value":
        narrow(lambda item: item.priceBand in {"free", "value", "unknown"})
    elif budget == "mid-range":
        narrow(lambda item: item.priceBand != "premium")

    dates = profile.dates.value if isinstance(profile.dates.value, list) else []
    if dates:
        try:
            start = date.fromisoformat(dates[0])
            end = date.fromisoformat(dates[-1]) if len(dates) > 1 else start
            trip_weekdays = {
                (start + timedelta(days=offset)).strftime("%A").lower()
                for offset in range(min((end - start).days + 1, 22))
            }
            narrow(lambda item: not item.openingDays or bool(trip_weekdays & set(item.openingDays)))
        except ValueError:
            pass
    return candidates


class DemoTravellerProfiler:
    async def run(self, input_value: CustomisationRequest, context: AgentContext) -> TravellerProfile:
        brief = input_value.originalBrief or input_value.originalItinerary.brief
        request_words = words(input_value.requestedChange)
        requested_interests = [
            interest
            for interest in ("family", "food", "culture", "beach", "nature", "relaxation")
            if interest in request_words or (interest == "relaxation" and "relaxed" in request_words)
        ]
        interests = requested_interests or list(brief.interests)
        group_needs = ["family", "children"] if brief.children > 0 or "family" in request_words else ["adults"]
        pace = "relaxed" if {"relaxed", "slower", "rest"} & request_words else brief.pace
        current_ids = all_item_ids(input_value)
        fixed_ids: list[str] = []
        if "keep" in request_words or "fixed" in request_words:
            for item in context.catalogue:
                identity_words = words(f"{item.id} {item.title}")
                if item.id in current_ids and identity_words & request_words:
                    fixed_ids.append(item.id)
        vague = input_value.requestedChange.strip().lower() in {"change it", "customise it", "make it better"}
        dates = [value for value in (brief.startDate, brief.endDate) if value]
        return TravellerProfile(
            budget=EvidenceValue(value=brief.spendLevel, confidence=1, source="brief"),
            interests=EvidenceValue(
                value=interests,
                confidence=1 if requested_interests else 0.85,
                source="user" if requested_interests else "brief",
            ),
            accessibilityNeeds=EvidenceValue(value=brief.accessibility, confidence=1, source="brief"),
            groupNeeds=EvidenceValue(
                value=group_needs,
                confidence=1,
                source="user" if "family" in request_words else "brief",
            ),
            pace=EvidenceValue(
                value=pace,
                confidence=1 if pace != brief.pace else 0.95,
                source="user" if pace != brief.pace else "brief",
            ),
            destination=EvidenceValue(value=input_value.originalItinerary.selectedArea, confidence=1, source="itinerary"),
            dates=EvidenceValue(value=dates, confidence=1 if dates else 0.6, source="brief"),
            fixedItemIds=fixed_ids,
            flexibleItemIds=[item_id for item_id in current_ids if item_id not in fixed_ids],
            searchIntent=EvidenceValue(value=input_value.requestedChange.strip(), confidence=0.95, source="user"),
            followUpQuestion="What is the single most important change you want to make?" if vague else None,
        )


class DemoRetriever:
    async def run(self, input_value: RetrieverInput, context: AgentContext) -> RetrieverOutput:
        query_words = words(input_value.requestedChange)
        interests = set(input_value.profile.interests.value) if isinstance(input_value.profile.interests.value, list) else set()
        group_needs = set(input_value.profile.groupNeeds.value) if isinstance(input_value.profile.groupNeeds.value, list) else set()
        destination = str(input_value.profile.destination.value)
        reconsider = bool({"reconsider", "same", "current"} & query_words)

        def score(item: ApprovedContent) -> tuple[int, int, str]:
            item_words = words(f"{item.title} {item.summary} {' '.join(item.interests)} {' '.join(item.suitableFor)}")
            value = len(query_words & item_words) * 5
            value += len(interests & set(item.interests)) * 4
            value += len(group_needs & set(item.suitableFor)) * 3
            value += 3 if item.resortArea == destination else -10
            return (-value, 0 if item.type == "experience" else 1, item.id)

        candidates = [
            item
            for item in context.catalogue
            if item.published
            and item.contentStatus in {"approved", "approved-sample"}
            and item.type in {"experience", "stay"}
            and item.resortArea == destination
            and (reconsider or item.id not in input_value.currentItemIds)
        ]
        candidates = apply_profile_filters(candidates, input_value.profile)
        return RetrieverOutput(candidates=sorted(candidates, key=score)[:8], backend="memory")


def minutes(value: str) -> int:
    hour, minute = (int(part) for part in value.split(":"))
    return hour * 60 + minute


def clock(value: int) -> str:
    return f"{value // 60:02d}:{value % 60:02d}"


def build_schedule(days: list[ItineraryDaySnapshot], catalogue: dict[str, ApprovedContent]) -> list[ScheduleItem]:
    schedule: list[ScheduleItem] = []
    for day in days:
        cursor = 10 * 60
        for index, content_id in enumerate(day.itemIds):
            item = catalogue.get(content_id)
            transition = 0 if index == 0 else (item.minimumTransitionMinutes if item else 30)
            cursor += transition
            duration = item.expectedVisitMinutes if item and item.expectedVisitMinutes else 90
            schedule.append(
                ScheduleItem(
                    day=day.day,
                    contentId=content_id,
                    startsAt=clock(cursor),
                    endsAt=clock(cursor + duration),
                    transitionMinutes=transition,
                )
            )
            cursor += duration
    return schedule


class DemoPlanner:
    async def run(self, input_value: PlannerInput, context: AgentContext) -> PlannerOutput:
        catalogue = {item.id: item for item in context.catalogue}
        if input_value.repairPass == 1 and input_value.repairItinerary:
            max_items = {"relaxed": 1, "balanced": 2, "active": 3}.get(str(input_value.profile.pace.value), 2)
            seen: set[str] = set()
            repaired_days: list[ItineraryDaySnapshot] = []
            for day in input_value.repairItinerary.days:
                unique: list[str] = []
                for item_id in day.itemIds:
                    if item_id in seen or item_id not in catalogue or len(unique) >= max_items:
                        continue
                    unique.append(item_id)
                    seen.add(item_id)
                repaired_days.append(day.model_copy(update={"itemIds": unique}))
            repaired = input_value.repairItinerary.model_copy(update={"days": repaired_days})
            return PlannerOutput(
                itinerary=repaired,
                schedule=build_schedule(repaired_days, catalogue),
                changeReasons={instruction.contentId or instruction.code: instruction.message for instruction in input_value.repairInstructions},
            )

        current = input_value.currentItinerary
        request_words = words(input_value.requestedChange)
        fixed = set(input_value.profile.fixedItemIds)
        days = [day.model_copy(deep=True) for day in current.days]
        reasons: dict[str, str] = {}
        removed: set[str] = set()
        added: set[str] = set()

        def replace_first(predicate: Callable[[ApprovedContent], bool], replacements: list[ApprovedContent]) -> bool:
            for day_index, day in enumerate(days):
                for item_index, item_id in enumerate(day.itemIds):
                    item = catalogue.get(item_id)
                    if item_id not in fixed and item and predicate(item) and replacements:
                        replacement = replacements[0]
                        next_ids = list(day.itemIds)
                        next_ids[item_index] = replacement.id
                        days[day_index] = day.model_copy(update={"itemIds": next_ids})
                        removed.add(item_id)
                        added.add(replacement.id)
                        reasons[replacement.id] = f"Added to better match: {input_value.requestedChange[:120]}"
                        return True
            return False

        available = [candidate for candidate in input_value.candidates if candidate.id not in fixed]
        if "relaxed" in request_words or {"reduce", "travel"} <= request_words:
            for day_index in range(len(days) - 1, -1, -1):
                removable = [item_id for item_id in days[day_index].itemIds if item_id not in fixed]
                if removable:
                    removed_id = removable[-1]
                    days[day_index] = days[day_index].model_copy(
                        update={"itemIds": [item_id for item_id in days[day_index].itemIds if item_id != removed_id]}
                    )
                    removed.add(removed_id)
                    reasons[removed_id] = "Removed to create more rest and unplanned time."
                    break
        elif "family" in request_words:
            family = [item for item in available if {"family", "families", "children"} & set(item.suitableFor + item.interests)]
            replace_first(lambda item: not ({"families", "children"} & set(item.suitableFor)), family)
        elif "food" in request_words or "culture" in request_words:
            matching = [item for item in available if set(item.interests) & {"food", "culture"}]
            replace_first(lambda item: "beach" in item.interests, matching)
        elif available:
            replace_first(lambda item: item.type == "experience", available)

        if "invalid" in request_words and days:
            invalid_id = next(iter(days[0].itemIds), available[0].id if available else current.recommendations[0].contentId)
            days[0] = days[0].model_copy(update={"itemIds": [invalid_id, invalid_id, invalid_id]})

        proposed_ids = {item_id for day in days for item_id in day.itemIds}
        recommendations = [
            recommendation
            for recommendation in current.recommendations
            if recommendation.contentId not in removed or recommendation.contentId in proposed_ids
        ]
        known_recommendations = {recommendation.contentId for recommendation in recommendations}
        for content_id in added:
            if content_id not in known_recommendations:
                recommendations.append(
                    RecommendationSnapshot(contentId=content_id, reason=reasons[content_id][:180])
                )
        proposed = current.model_copy(
            update={
                "summary": f"Customised from your original plan: {input_value.requestedChange[:170]}",
                "recommendations": recommendations[:9],
                "days": days,
                "generationMode": "fallback" if context.mode == "demo" else "ai",
                "fallbackMessage": "Customised with deterministic demo agents." if context.mode == "demo" else None,
            }
        )
        schedule = build_schedule(days, catalogue)
        if "invalid" in request_words and schedule:
            schedule = [
                item.model_copy(update={"startsAt": "08:00", "endsAt": "09:30", "transitionMinutes": 0})
                for item in schedule
            ]
        return PlannerOutput(itinerary=proposed, schedule=schedule, changeReasons=reasons)


def itinerary_weekday(brief_start: str | None, day_number: int) -> str | None:
    if not brief_start:
        return None
    try:
        return (date.fromisoformat(brief_start) + timedelta(days=day_number - 1)).strftime("%A").lower()
    except ValueError:
        return None


class DemoCritic:
    async def run(self, input_value: CriticInput, context: AgentContext) -> CriticResult:
        catalogue = {item.id: item for item in context.catalogue}
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []
        repairs: list[RepairInstruction] = []
        original_ids = {item_id for day in input_value.originalItinerary.days for item_id in day.itemIds}
        proposed_ids = [item_id for day in input_value.proposedItinerary.days for item_id in day.itemIds]
        proposed_set = set(proposed_ids)
        allowed = set(input_value.approvedCandidateIds) | original_ids

        for item_id in input_value.profile.fixedItemIds:
            if item_id not in proposed_set:
                errors.append(ValidationIssue(code="fixed-item-changed", message="A fixed item was removed.", severity="error", contentId=item_id))
                repairs.append(RepairInstruction(code="restore-fixed-item", message="Restore the fixed item.", contentId=item_id))
        for item_id in proposed_set - allowed:
            errors.append(ValidationIssue(code="unknown-content-id", message="The proposal used an unapproved content ID.", severity="error", contentId=item_id))
            repairs.append(RepairInstruction(code="remove-unknown-id", message="Remove the unapproved item.", contentId=item_id))
        for item_id, count in Counter(proposed_ids).items():
            if count > 1:
                errors.append(ValidationIssue(code="duplicate-place", message="The same place appears more than once.", severity="error", contentId=item_id))
                repairs.append(RepairInstruction(code="remove-duplicate", message="Keep only one occurrence.", contentId=item_id))

        max_items = {"relaxed": 1, "balanced": 2, "active": 3}.get(str(input_value.profile.pace.value), 2)
        for day in input_value.proposedItinerary.days:
            if len(day.itemIds) > max_items:
                errors.append(ValidationIssue(code="unrealistic-density", message="This day is too full for the selected pace.", severity="error", day=day.day))
                repairs.append(RepairInstruction(code="reduce-density", message="Reduce this day's activity count.", day=day.day))

        by_day: dict[int, list[ScheduleItem]] = {}
        for scheduled in input_value.schedule:
            by_day.setdefault(scheduled.day, []).append(scheduled)
            item = catalogue.get(scheduled.contentId)
            if not item:
                continue
            weekday = itinerary_weekday(input_value.proposedItinerary.brief.startDate, scheduled.day)
            if weekday and item.openingDays and weekday not in item.openingDays:
                errors.append(ValidationIssue(code="closed-attraction", message="An item is closed on the planned day.", severity="error", day=scheduled.day, contentId=item.id))
                repairs.append(RepairInstruction(code="move-to-open-day", message="Move this item to an open day.", day=scheduled.day, contentId=item.id))
            if (item.opensAt and minutes(scheduled.startsAt) < minutes(item.opensAt)) or (
                item.closesAt and minutes(scheduled.endsAt) > minutes(item.closesAt)
            ):
                errors.append(ValidationIssue(code="outside-opening-hours", message="An item is scheduled outside its sample opening hours.", severity="error", day=scheduled.day, contentId=item.id))
                repairs.append(RepairInstruction(code="adjust-time", message="Schedule this item within opening hours.", day=scheduled.day, contentId=item.id))
            if not item.openingDays or not item.opensAt or not item.closesAt:
                warnings.append(ValidationIssue(code="confirm-opening-time", message="This experience's opening time should be confirmed with the provider.", severity="warning", day=scheduled.day, contentId=item.id))
            if (datetime.now(UTC).date() - item.checkedAt).days > 180:
                warnings.append(
                    ValidationIssue(
                        code="confirm-content-freshness",
                        message="This item's source information is more than six months old and should be reconfirmed.",
                        severity="warning",
                        day=scheduled.day,
                        contentId=item.id,
                    )
                )
            if input_value.proposedItinerary.brief.children > 0 and not ({"children", "families"} & set(item.suitableFor)):
                warnings.append(ValidationIssue(code="confirm-family-suitability", message="Confirm this item's suitability for children.", severity="warning", day=scheduled.day, contentId=item.id))
            if input_value.proposedItinerary.brief.accessibility and not set(input_value.proposedItinerary.brief.accessibility) <= set(item.accessibilityTags):
                warnings.append(ValidationIssue(code="confirm-accessibility", message="Confirm accessibility arrangements directly with the provider.", severity="warning", day=scheduled.day, contentId=item.id))
            if input_value.proposedItinerary.brief.spendLevel == "value" and item.priceBand == "premium":
                warnings.append(ValidationIssue(code="budget-conflict", message="This premium item may not fit the selected value budget.", severity="warning", day=scheduled.day, contentId=item.id))

        for day_number, scheduled_items in by_day.items():
            ordered = sorted(scheduled_items, key=lambda item: minutes(item.startsAt))
            for index, scheduled in enumerate(ordered[1:], start=1):
                previous = ordered[index - 1]
                if minutes(scheduled.startsAt) < minutes(previous.endsAt):
                    errors.append(ValidationIssue(code="overlapping-activities", message="Two activities overlap.", severity="error", day=day_number, contentId=scheduled.contentId))
                    repairs.append(RepairInstruction(code="remove-overlap", message="Separate or remove overlapping activities.", day=day_number, contentId=scheduled.contentId))
                item = catalogue.get(scheduled.contentId)
                required = item.minimumTransitionMinutes if item else 30
                if scheduled.transitionMinutes < required:
                    errors.append(ValidationIssue(code="insufficient-transition", message="There is not enough transition time.", severity="error", day=day_number, contentId=scheduled.contentId))
                    repairs.append(RepairInstruction(code="add-transition", message="Add realistic transition time.", day=day_number, contentId=scheduled.contentId))

        return CriticResult(valid=not errors, errors=errors, warnings=warnings, suggestedRepairs=repairs)
