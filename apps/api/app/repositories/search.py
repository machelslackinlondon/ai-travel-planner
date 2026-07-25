from typing import Any, Literal, Protocol

from elasticsearch import AsyncElasticsearch

from ..models import ContentItem


class SearchRepository(Protocol):
    backend: str
    index_name: str

    async def ensure_index(self) -> None: ...
    async def index_catalog(self, items: list[ContentItem]) -> int: ...
    async def search(
        self,
        query: str,
        resort_area: str | None = None,
        content_type: str | None = None,
        limit: int = 20,
        semantic: bool = False,
    ) -> list[ContentItem]: ...
    async def ping(self) -> bool: ...
    async def close(self) -> None: ...


class CatalogSearchRepository:
    backend: Literal["catalog"] = "catalog"
    index_name = "in-memory-catalog"

    def __init__(self, items: list[ContentItem]) -> None:
        self._items = items

    async def ensure_index(self) -> None:
        return None

    async def index_catalog(self, items: list[ContentItem]) -> int:
        self._items = items
        return len(items)

    async def search(
        self,
        query: str,
        resort_area: str | None = None,
        content_type: str | None = None,
        limit: int = 20,
        semantic: bool = False,
    ) -> list[ContentItem]:
        terms = query.lower().split()

        def matches(item: ContentItem) -> bool:
            haystack = " ".join([item.title, item.summary, *item.interests]).lower()
            return (
                all(term in haystack for term in terms)
                and (not resort_area or item.resortArea == resort_area)
                and (not content_type or item.type == content_type)
                and item.published
            )

        return [item for item in self._items if matches(item)][:limit]

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        return None


class ElasticsearchRepository:
    backend: Literal["elasticsearch"] = "elasticsearch"

    def __init__(
        self,
        url: str,
        index_name: str,
        api_key: str | None = None,
        username: str | None = None,
        password: str | None = None,
        semantic_field: str | None = None,
    ) -> None:
        options: dict[str, Any] = {
            "hosts": [url],
            "request_timeout": 5,
            "max_retries": 2,
            "retry_on_timeout": True,
            "http_compress": True,
        }
        if api_key:
            options["api_key"] = api_key
        elif username and password:
            options["basic_auth"] = (username, password)
        self._client = AsyncElasticsearch(**options)
        if semantic_field and (
            not semantic_field[0].islower() or not semantic_field.replace("_", "").isalnum()
        ):
            raise ValueError("The semantic field must use lowercase letters, numbers, and underscores")
        self.index_name = index_name
        if semantic_field and semantic_field in ContentItem.model_fields:
            raise ValueError("The semantic field must not replace a catalogue field")
        self.semantic_field = semantic_field

    async def ensure_index(self) -> None:
        if await self._client.indices.exists(index=self.index_name):
            return
        properties: dict[str, Any] = {
            "id": {"type": "keyword"},
            "type": {"type": "keyword"},
            "title": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
            "summary": {"type": "text"},
            "resortArea": {"type": "keyword"},
            "interests": {"type": "keyword"},
            "pace": {"type": "keyword"},
            "suitableFor": {"type": "keyword"},
            "sourceUrl": {"type": "keyword", "index": False},
            "checkedAt": {"type": "date"},
            "priceStatus": {"type": "keyword"},
            "priceBand": {"type": "keyword"},
            "priceAmount": {"type": "float"},
            "currency": {"type": "keyword"},
            "imagePath": {"type": "keyword", "index": False},
            "imageAlt": {"type": "text", "index": False},
            "published": {"type": "boolean"},
        }
        if self.semantic_field:
            properties[self.semantic_field] = {"type": "semantic_text"}
        await self._client.indices.create(
            index=self.index_name,
            mappings={
                "dynamic": "strict",
                "properties": properties,
            },
        )

    async def index_catalog(self, items: list[ContentItem]) -> int:
        await self.ensure_index()
        operations: list[dict[str, object]] = []
        for item in items:
            document = item.model_dump(mode="json", exclude_none=True)
            if self.semantic_field:
                document[self.semantic_field] = " ".join([item.title, item.summary, *item.interests])
            operations.extend(
                [
                    {"index": {"_index": self.index_name, "_id": item.id}},
                    document,
                ]
            )
        if operations:
            await self._client.bulk(operations=operations, refresh=True)
        return len(items)

    async def search(
        self,
        query: str,
        resort_area: str | None = None,
        content_type: str | None = None,
        limit: int = 20,
        semantic: bool = False,
    ) -> list[ContentItem]:
        filters: list[dict[str, object]] = [{"term": {"published": True}}]
        if resort_area:
            filters.append({"term": {"resortArea": resort_area}})
        if content_type:
            filters.append({"term": {"type": content_type}})
        must = (
            [{"multi_match": {"query": query, "fields": ["title^3", "summary^2", "interests"]}}]
            if query.strip()
            else [{"match_all": {}}]
        )
        lexical_query = {"bool": {"must": must, "filter": filters}}
        if semantic and query.strip() and self.semantic_field:
            response = await self._client.search(
                index=self.index_name,
                size=limit,
                retriever={
                    "rrf": {
                        "retrievers": [
                            {"standard": {"query": lexical_query}},
                            {
                                "standard": {
                                    "query": {
                                        "bool": {
                                            "must": [{"match": {self.semantic_field: query}}],
                                            "filter": filters,
                                        }
                                    }
                                }
                            },
                        ]
                    }
                },
            )
        else:
            response = await self._client.search(index=self.index_name, size=limit, query=lexical_query)
        items: list[ContentItem] = []
        for hit in response["hits"]["hits"]:
            source = dict(hit["_source"])
            if self.semantic_field:
                source.pop(self.semantic_field, None)
            items.append(ContentItem.model_validate(source))
        return items

    async def ping(self) -> bool:
        return bool(await self._client.ping())

    async def close(self) -> None:
        await self._client.close()
