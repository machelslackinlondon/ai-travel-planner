import json
from typing import Any, Protocol

import httpx

from .models import ContentItem, TripBrief


class AiClient(Protocol):
    async def generate(self, brief: TripBrief, shortlist: list[ContentItem]) -> Any: ...
    async def generate_planner_narrative(self, request: str, context: list[dict[str, Any]], days: int) -> Any: ...
    async def run_customisation_agent(self, agent_name: str, payload: dict[str, Any]) -> Any: ...
    async def close(self) -> None: ...


class VercelGatewayClient:
    def __init__(self, api_key: str, model: str, timeout_seconds: float) -> None:
        self._model = model
        self._client = httpx.AsyncClient(
            base_url="https://ai-gateway.vercel.sh/v1",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout_seconds,
        )

    async def generate(self, brief: TripBrief, shortlist: list[ContentItem]) -> Any:
        instruction = (
            "Organise the supplied Jamaica shortlist. Return only JSON with summary, recommendations, and days. "
            "Never invent or change IDs, prices, URLs, availability, hours, ratings, safety claims, accessibility, "
            "provider rules, or other facts. Keep reasons under 180 characters and summary under 240 characters. "
            f"Include exactly {brief.nights} days."
        )
        payload = {
            "tripBrief": brief.model_dump(mode="json"),
            "shortlist": [
                item.model_dump(
                    mode="json",
                    include={
                        "id",
                        "type",
                        "title",
                        "summary",
                        "resortArea",
                        "interests",
                        "pace",
                        "suitableFor",
                        "priceStatus",
                        "priceBand",
                    },
                )
                for item in shortlist
            ],
        }
        response = await self._client.post(
            "/chat/completions",
            json={
                "model": self._model,
                "messages": [
                    {"role": "system", "content": instruction},
                    {"role": "user", "content": json.dumps(payload)},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_tokens": 650,
                "stream": False,
            },
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)

    async def close(self) -> None:
        await self._client.aclose()

    async def generate_planner_narrative(self, request: str, context: list[dict[str, Any]], days: int) -> Any:
        instruction = (
            "Create concise itinerary wording using only the supplied repository records. Return only JSON with "
            "tripName, summary and dayTitles. Never introduce places, facts, prices, availability or claims that "
            f"are not in the context. Return exactly {days} dayTitles."
        )
        response = await self._client.post(
            "/chat/completions",
            json={
                "model": self._model,
                "messages": [
                    {"role": "system", "content": instruction},
                    {"role": "user", "content": json.dumps({"request": request, "context": context})},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_tokens": 500,
                "stream": False,
            },
        )
        response.raise_for_status()
        return json.loads(response.json()["choices"][0]["message"]["content"])

    async def run_customisation_agent(self, agent_name: str, payload: dict[str, Any]) -> Any:
        instructions = {
            "traveller-profiler": (
                "Infer only preferences supported by the request and supplied brief. Return JSON with interests, "
                "pace, fixedItemIds, searchIntent and confidence. Use only supplied item IDs."
            ),
            "itinerary-planner": (
                "Select only supplied candidate IDs to improve the current itinerary. Return JSON with "
                "preferredCandidateIds and explanationById. Do not add travel facts or flights."
            ),
            "itinerary-critic": (
                "Review the supplied grounded proposal after deterministic validation. Return JSON matching "
                "valid, errors, warnings and suggestedRepairs. Do not invent provider facts."
            ),
        }
        if agent_name not in instructions:
            raise ValueError("Unknown customisation agent")
        response = await self._client.post(
            "/chat/completions",
            json={
                "model": self._model,
                "messages": [
                    {"role": "system", "content": instructions[agent_name]},
                    {"role": "user", "content": json.dumps(payload)},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
                "max_tokens": 700,
                "stream": False,
            },
        )
        response.raise_for_status()
        return json.loads(response.json()["choices"][0]["message"]["content"])
