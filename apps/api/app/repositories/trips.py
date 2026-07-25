from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Protocol

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.errors import DuplicateKeyError

from ..models import ProductEvent, TripPlan

EventDocuments = list[dict[str, object]]


class TripAlreadyExistsError(Exception):
    pass


class TripRepository(Protocol):
    backend: str

    async def ensure_indexes(self) -> None: ...
    async def list(self, owner_id: str) -> list[TripPlan]: ...
    async def get(self, owner_id: str, trip_id: str) -> TripPlan | None: ...
    async def create(self, owner_id: str, plan: TripPlan) -> TripPlan: ...
    async def save(self, owner_id: str, plan: TripPlan) -> TripPlan: ...
    async def delete(self, owner_id: str, trip_id: str) -> bool: ...
    async def record_event(self, event: ProductEvent) -> None: ...
    async def recent_events(self, limit: int = 50) -> EventDocuments: ...
    async def ping(self) -> bool: ...
    async def close(self) -> None: ...


class InMemoryTripRepository:
    backend = "memory"

    def __init__(self) -> None:
        self._trips: dict[tuple[str, str], tuple[TripPlan, str]] = {}
        self._events: list[dict[str, object]] = []
        self._lock = asyncio.Lock()

    async def ensure_indexes(self) -> None:
        return None

    async def list(self, owner_id: str) -> list[TripPlan]:
        records = [(plan, updated_at) for (owner, _), (plan, updated_at) in self._trips.items() if owner == owner_id]
        return [plan for plan, _ in sorted(records, key=lambda record: record[1], reverse=True)]

    async def get(self, owner_id: str, trip_id: str) -> TripPlan | None:
        record = self._trips.get((owner_id, trip_id))
        return record[0] if record else None

    async def create(self, owner_id: str, plan: TripPlan) -> TripPlan:
        async with self._lock:
            key = (owner_id, plan.id)
            if key in self._trips:
                raise TripAlreadyExistsError(plan.id)
            self._trips[key] = (plan, datetime.now(UTC).isoformat())
        return plan

    async def save(self, owner_id: str, plan: TripPlan) -> TripPlan:
        async with self._lock:
            self._trips[(owner_id, plan.id)] = (plan, datetime.now(UTC).isoformat())
        return plan

    async def delete(self, owner_id: str, trip_id: str) -> bool:
        async with self._lock:
            return self._trips.pop((owner_id, trip_id), None) is not None

    async def record_event(self, event: ProductEvent) -> None:
        self._events.insert(0, {**event.model_dump(), "receivedAt": datetime.now(UTC).isoformat()})
        del self._events[50:]

    async def recent_events(self, limit: int = 50) -> EventDocuments:
        return self._events[:limit]

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        return None


class MongoTripRepository:
    backend = "mongodb"

    def __init__(self, uri: str, database: str) -> None:
        self._client: AsyncMongoClient[dict[str, object]] = AsyncMongoClient(uri, serverSelectionTimeoutMS=3000)
        self._database = self._client[database]
        self._trips = self._database["trips"]
        self._events = self._database["product_events"]

    async def ensure_indexes(self) -> None:
        await self._trips.create_index([("ownerId", ASCENDING), ("plan.id", ASCENDING)], unique=True)
        await self._trips.create_index([("ownerId", ASCENDING), ("updatedAt", DESCENDING)])
        await self._events.create_index("receivedAt", expireAfterSeconds=60 * 60 * 24 * 90)

    async def list(self, owner_id: str) -> list[TripPlan]:
        cursor = self._trips.find({"ownerId": owner_id}, {"plan": 1}).sort("updatedAt", DESCENDING).limit(50)
        documents = await cursor.to_list(length=50)
        return [TripPlan.model_validate(document["plan"]) for document in documents]

    async def get(self, owner_id: str, trip_id: str) -> TripPlan | None:
        document = await self._trips.find_one({"ownerId": owner_id, "plan.id": trip_id}, {"plan": 1})
        return TripPlan.model_validate(document["plan"]) if document else None

    async def create(self, owner_id: str, plan: TripPlan) -> TripPlan:
        now = datetime.now(UTC)
        try:
            await self._trips.insert_one(
                {"ownerId": owner_id, "plan": plan.model_dump(mode="json"), "createdAt": now, "updatedAt": now}
            )
        except DuplicateKeyError as error:
            raise TripAlreadyExistsError(plan.id) from error
        return plan

    async def save(self, owner_id: str, plan: TripPlan) -> TripPlan:
        now = datetime.now(UTC)
        await self._trips.update_one(
            {"ownerId": owner_id, "plan.id": plan.id},
            {
                "$set": {"plan": plan.model_dump(mode="json"), "updatedAt": now},
                "$setOnInsert": {"ownerId": owner_id, "createdAt": now},
            },
            upsert=True,
        )
        return plan

    async def delete(self, owner_id: str, trip_id: str) -> bool:
        result = await self._trips.delete_one({"ownerId": owner_id, "plan.id": trip_id})
        return result.deleted_count == 1

    async def record_event(self, event: ProductEvent) -> None:
        await self._events.insert_one({**event.model_dump(mode="json"), "receivedAt": datetime.now(UTC)})

    async def recent_events(self, limit: int = 50) -> EventDocuments:
        cursor = self._events.find({}, {"_id": 0}).sort("receivedAt", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    async def ping(self) -> bool:
        await self._database.command("ping")
        return True

    async def close(self) -> None:
        await self._client.close()
