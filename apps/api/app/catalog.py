import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from .models import AiNarrative, ContentItem, ItineraryDay, Recommendation, ResortArea, TripBrief, TripPlan

SPEND_RANKS = {"value": 1, "mid-range": 2, "premium": 3, "flexible": 0}
BAND_RANKS = {"free": 1, "value": 1, "mid-range": 2, "premium": 3, "unknown": 0}


def load_catalog(path: str) -> list[ContentItem]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    return [ContentItem.model_validate(item) for item in payload]


def choose_area(brief: TripBrief) -> ResortArea:
    if brief.resortArea != "help-me-choose":
        return brief.resortArea
    negril_signals = sum(interest in {"beach", "relaxation", "nature"} for interest in brief.interests)
    return "negril" if negril_signals >= 2 else "montego-bay"


def score_content(items: list[ContentItem], brief: TripBrief) -> list[ContentItem]:
    selected_area = choose_area(brief)
    target_spend = SPEND_RANKS[brief.spendLevel]
    has_children = brief.children > 0
    style_words = {
        "hotel-resort": ["hotel", "resort"],
        "villa-apartment": ["villa", "apartment"],
        "guest-house": ["guest house", "guest rooms"],
        "no-preference": [],
    }

    def score(item: ContentItem) -> tuple[int, str]:
        value = 20 if item.resortArea == selected_area else -10
        value += sum(interest in brief.interests for interest in item.interests) * 8
        if item.pace in {brief.pace, "any"}:
            value += 4
        if has_children and ({"children", "families"} & set(item.suitableFor)):
            value += 5
        if not has_children and "adults" in item.suitableFor:
            value += 2
        if target_spend == 0 or BAND_RANKS[item.priceBand] == target_spend or item.priceBand == "free":
            value += 4
        if target_spend and BAND_RANKS[item.priceBand] > target_spend:
            value -= 3
        if item.type == "stay" and any(word in item.title.lower() for word in style_words[brief.accommodationStyle]):
            value += 7
        return (-value, item.id)

    candidates = [item for item in items if item.published and item.type in {"stay", "experience"}]
    return sorted(candidates, key=score)


def reason_for(item: ContentItem, brief: TripBrief) -> str:
    matches = [interest for interest in item.interests if interest in brief.interests]
    if matches:
        return f"Fits your {' and '.join(matches[:2])} priorities and {brief.pace} pace."
    if item.type == "stay":
        return f"A {item.priceBand} sample stay in the selected resort area."
    return "Adds variety while keeping the outline centred on your selected resort area."


def build_fallback_narrative(items: list[ContentItem], brief: TripBrief) -> AiNarrative:
    ranked = score_content(items, brief)
    stay = next((item for item in ranked if item.type == "stay"), None)
    experiences = [item for item in ranked if item.type == "experience"][: min(6, max(3, brief.nights))]
    chosen = ([stay] if stay else []) + experiences
    selected_area = choose_area(brief)
    area = "Montego Bay" if selected_area == "montego-bay" else "Negril"
    interests = " and ".join(brief.interests[:2])
    days = []
    for index in range(brief.nights):
        experience = experiences[index % len(experiences)] if experiences else None
        title = (
            f"Arrive and settle into {area}"
            if index == 0
            else "A lighter final day"
            if index == brief.nights - 1
            else f"Explore {area}"
        )
        days.append(ItineraryDay(day=index + 1, title=title, itemIds=[experience.id] if experience else []))
    return AiNarrative(
        summary=f"A {brief.pace} {brief.nights}-night outline centred on {area}, with more {interests}.",
        recommendations=[Recommendation(contentId=item.id, reason=reason_for(item, brief)) for item in chosen],
        days=days,
    )


def validate_narrative(payload: Any, allowed_ids: set[str], nights: int) -> AiNarrative:
    narrative = AiNarrative.model_validate(payload)
    if len(narrative.days) != nights:
        raise ValueError("AI returned the wrong number of days")
    ids = [item.contentId for item in narrative.recommendations]
    ids.extend(item_id for day in narrative.days for item_id in day.itemIds)
    if any(item_id not in allowed_ids for item_id in ids):
        raise ValueError("AI returned an unknown content ID")
    return narrative


def create_plan(
    brief: TripBrief, narrative: AiNarrative, generation_mode: Literal["ai", "fallback"]
) -> TripPlan:
    return TripPlan(
        **narrative.model_dump(),
        id=str(uuid4()),
        brief=brief,
        selectedArea=choose_area(brief),
        generationMode=generation_mode,
        generatedAt=datetime.now(UTC).isoformat(),
        fallbackMessage=(
            "We built this plan from your preferences. Personalised wording is temporarily unavailable."
            if generation_mode == "fallback"
            else None
        ),
    )
