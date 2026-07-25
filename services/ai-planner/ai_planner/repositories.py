import json
from pathlib import Path
from typing import Any, Protocol

from elasticsearch import AsyncElasticsearch

from .models import SearchDocument, SearchFilters, SearchResult


class DestinationRepository(Protocol):
    async def find_destinations(self, query: str) -> list[SearchDocument]: ...


class HotelRepository(Protocol):
    async def find_hotels(self, destination_id: str) -> list[SearchDocument]: ...


class RestaurantRepository(Protocol):
    async def find_restaurants(self, destination_id: str) -> list[SearchDocument]: ...


class ItineraryRepository(Protocol):
    async def find_itinerary_content(self, destination_id: str) -> list[SearchDocument]: ...


class TravelSearchRepository(Protocol):
    backend: str

    async def search(self, query: str, filters: SearchFilters, limit: int = 18) -> SearchResult: ...
    async def ping(self) -> bool: ...
    async def close(self) -> None: ...


class MockTravelRepository:
    backend = "mock"

    def __init__(self, catalog_path: str) -> None:
        self._items = [SearchDocument.model_validate(item) for item in json.loads(Path(catalog_path).read_text())]

    async def search(self, query: str, filters: SearchFilters, limit: int = 18) -> SearchResult:
        terms = query.lower().split()

        def score(item: SearchDocument) -> tuple[int, float, int]:
            text = " ".join([item.name, item.description, *item.tags, *item.category]).lower()
            matches = sum(term in text for term in terms)
            tag_matches = len(set(filters.tags) & set(item.tags))
            return (matches + tag_matches * 2, item.rating, item.popularity)

        items = [
            item
            for item in self._items
            if (not filters.destination_id or item.destinationId == filters.destination_id)
            and (not filters.region_id or item.regionId == filters.region_id)
            and (not filters.categories or bool(set(filters.categories) & set(item.category + [item.type])))
            and (not filters.tags or bool(set(filters.tags) & set(item.tags)))
            and (not filters.price_level or item.priceLevel == filters.price_level)
        ]
        return SearchResult(items=sorted(items, key=score, reverse=True)[:limit], backend="mock")

    async def find_destinations(self, query: str) -> list[SearchDocument]:
        result = await self.search(query, SearchFilters(categories=["destination"]))
        return result.items

    async def find_hotels(self, destination_id: str) -> list[SearchDocument]:
        return (await self.search("", SearchFilters(destination_id=destination_id, categories=["hotel"]))).items

    async def find_restaurants(self, destination_id: str) -> list[SearchDocument]:
        return (await self.search("", SearchFilters(destination_id=destination_id, categories=["restaurant"]))).items

    async def find_itinerary_content(self, destination_id: str) -> list[SearchDocument]:
        return (await self.search("", SearchFilters(destination_id=destination_id))).items

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        return None


class ElasticsearchTravelRepository:
    backend = "elasticsearch"

    def __init__(self, url: str, index: str, api_key: str | None = None, username: str | None = None, password: str | None = None) -> None:
        options: dict[str, Any] = {"hosts": [url], "request_timeout": 5, "max_retries": 1, "retry_on_timeout": True}
        if api_key:
            options["api_key"] = api_key
        elif username and password:
            options["basic_auth"] = (username, password)
        self._client = AsyncElasticsearch(**options)
        self._index = index

    async def search(self, query: str, filters: SearchFilters, limit: int = 18) -> SearchResult:
        clauses: list[dict[str, Any]] = []
        if filters.destination_id:
            clauses.append({"term": {"destinationId": filters.destination_id}})
        if filters.region_id:
            clauses.append({"term": {"regionId": filters.region_id}})
        if filters.categories:
            clauses.append(
                {
                    "bool": {
                        "should": [
                            {"terms": {"category": filters.categories}},
                            {"terms": {"type": filters.categories}},
                        ],
                        "minimum_should_match": 1,
                    }
                }
            )
        if filters.tags:
            clauses.append({"terms": {"tags": filters.tags}})
        if filters.price_level:
            clauses.append({"term": {"priceLevel": filters.price_level}})
        must = [{"multi_match": {"query": query, "fields": ["name^4", "description^2", "tags^3", "category"]}}] if query.strip() else [{"match_all": {}}]
        response = await self._client.search(index=self._index, size=limit, query={"bool": {"must": must, "filter": clauses}}, sort=["_score", {"popularity": "desc"}, {"rating": "desc"}])
        return SearchResult(items=[SearchDocument.model_validate(hit["_source"]) for hit in response["hits"]["hits"]], backend="elasticsearch")

    async def ping(self) -> bool:
        return bool(await self._client.indices.exists(index=self._index))

    async def close(self) -> None:
        await self._client.close()


class ResilientTravelRepository:
    """Uses Elasticsearch when available and repository-managed mock data otherwise."""

    backend = "elasticsearch"

    def __init__(self, primary: TravelSearchRepository, fallback: TravelSearchRepository) -> None:
        self._primary = primary
        self._fallback = fallback

    async def search(self, query: str, filters: SearchFilters, limit: int = 18) -> SearchResult:
        try:
            result = await self._primary.search(query, filters, limit)
            if result.items:
                return result
        except Exception:  # noqa: BLE001 - an unavailable optional search service must fall back safely.
            return await self._fallback.search(query, filters, limit)
        return await self._fallback.search(query, filters, limit)

    async def ping(self) -> bool:
        try:
            return await self._primary.ping() or await self._fallback.ping()
        except Exception:  # noqa: BLE001 - readiness remains healthy when the fallback repository is usable.
            return await self._fallback.ping()

    async def close(self) -> None:
        await self._primary.close()
        await self._fallback.close()
