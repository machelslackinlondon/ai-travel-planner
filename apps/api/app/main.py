import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated, Any, Literal, cast
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .ai import AiClient, VercelGatewayClient
from .catalog import build_fallback_narrative, create_plan, load_catalog, score_content, validate_narrative
from .config import Settings, get_settings
from .models import ContentItem, ProductEvent, ReindexResponse, SearchResponse, TripBrief, TripPlan
from .repositories.search import CatalogSearchRepository, ElasticsearchRepository, SearchRepository
from .repositories.trips import (
    InMemoryTripRepository,
    MongoTripRepository,
    TripAlreadyExistsError,
    TripRepository,
)


class HourlyLimiter:
    def __init__(self) -> None:
        self._entries: dict[str, tuple[float, int]] = {}

    def allow(self, key: str, limit: int) -> bool:
        if limit <= 0:
            return False
        now = asyncio.get_running_loop().time()
        started, count = self._entries.get(key, (now, 0))
        if now - started >= 3600:
            started, count = now, 0
        if count >= limit:
            return False
        self._entries[key] = (started, count + 1)
        return True


class DailyLimiter:
    def __init__(self) -> None:
        self._day = ""
        self._count = 0

    def allow(self, limit: int) -> bool:
        today = datetime.now(UTC).date().isoformat()
        if today != self._day:
            self._day, self._count = today, 0
        if self._count >= limit:
            return False
        self._count += 1
        return True


def session_owner(x_session_id: Annotated[str, Header()]) -> str:
    try:
        return str(UUID(x_session_id))
    except ValueError as error:
        raise HTTPException(status_code=400, detail="A valid x-session-id header is required") from error


def sanitise_event(event: ProductEvent) -> ProductEvent:
    allowed_properties = {
        "planner_started": {"entryPage"},
        "brief_completed": {"resortArea", "tripLengthBand", "interestCount", "pace"},
        "plan_generated": {"generationMode", "itemCount"},
        "plan_saved": {"saveMode"},
        "provider_handoff_opened": {"contentType", "providerDomain"},
    }
    allowed_values: dict[str, set[str]] = {
        "entryPage": {"planner"},
        "resortArea": {"montego-bay", "negril", "help-me-choose"},
        "tripLengthBand": {"1-3", "4-7", "8+"},
        "pace": {"relaxed", "balanced", "active"},
        "generationMode": {"ai", "fallback"},
        "saveMode": {"connected", "demo-local"},
        "contentType": {"stay", "experience"},
        "providerDomain": {"example.com", "visitjamaica.com", "www.visitjamaica.com"},
    }

    def valid(key: str, value: str | int | bool) -> bool:
        if key == "interestCount":
            return isinstance(value, int) and not isinstance(value, bool) and 1 <= value <= 3
        if key == "itemCount":
            return isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 9
        return str(value) in allowed_values.get(key, set())

    allowed = allowed_properties[event.eventName]
    safe_properties = {key: value for key, value in event.properties.items() if key in allowed and valid(key, value)}
    return event.model_copy(update={"properties": safe_properties})


def create_app(
    settings: Settings | None = None,
    trip_repository: TripRepository | None = None,
    search_repository: SearchRepository | None = None,
    ai_client: AiClient | None = None,
) -> FastAPI:
    active_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        catalog = load_catalog(active_settings.catalog_path)
        trips: TripRepository = trip_repository or (
            MongoTripRepository(active_settings.mongodb_uri, active_settings.mongodb_database)
            if active_settings.mongodb_uri
            else InMemoryTripRepository()
        )
        if search_repository:
            search = search_repository
        elif active_settings.elasticsearch_url:
            search = cast(
                SearchRepository,
                ElasticsearchRepository(
                active_settings.elasticsearch_url,
                active_settings.elasticsearch_index,
                active_settings.elasticsearch_api_key,
                active_settings.elasticsearch_username,
                active_settings.elasticsearch_password,
                ),
            )
        else:
            search = cast(SearchRepository, CatalogSearchRepository(catalog))
        gateway: AiClient | None = ai_client or (
            VercelGatewayClient(
                active_settings.ai_gateway_api_key,
                active_settings.ai_model,
                active_settings.ai_timeout_ms / 1000,
            )
            if active_settings.ai_enabled and active_settings.ai_gateway_api_key
            else None
        )
        await trips.ensure_indexes()
        if active_settings.elasticsearch_auto_index:
            await search.index_catalog(catalog)
        application.state.catalog = catalog
        application.state.trips = trips
        application.state.search = search
        application.state.ai = gateway
        application.state.ai_sessions = HourlyLimiter()
        application.state.ai_daily = DailyLimiter()
        application.state.event_sessions = HourlyLimiter()
        yield
        await trips.close()
        await search.close()
        if gateway:
            await gateway.close()

    application = FastAPI(
        title="Visit Jamaica Trip Planner API",
        version="0.2.0",
        docs_url="/docs" if active_settings.environment != "production" else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Session-Id", "X-Admin-Key"],
    )

    @application.middleware("http")
    async def request_size_limit(request: Request, call_next: Any) -> Response:
        limits = {"/api/plan": 12_000, "/api/events": 3_000}
        limit = limits.get(request.url.path, 100_000)
        if request.method in {"POST", "PUT"}:
            declared = int(request.headers.get("content-length", "0") or "0")
            if declared > limit:
                return JSONResponse(status_code=413, content={"detail": "Request body is too large"})
            body = await request.body()
            if len(body) > limit:
                return JSONResponse(status_code=413, content={"detail": "Request body is too large"})
        response: Response = await call_next(request)
        return response

    @application.middleware("http")
    async def security_headers(request: Request, call_next: Any) -> Response:
        response: Response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    @application.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {"service": "visit-jamaica-api", "status": "ok"}

    @application.get("/health/live")
    async def live() -> dict[str, str]:
        return {"status": "ok"}

    @application.get("/health/ready")
    async def ready(request: Request) -> dict[str, Any]:
        dependencies: dict[str, str] = {}
        healthy = True
        for name, repository in (("database", request.app.state.trips), ("search", request.app.state.search)):
            try:
                dependencies[name] = repository.backend if await repository.ping() else "unavailable"
            except Exception:
                dependencies[name] = "unavailable"
                healthy = False
        if not healthy:
            raise HTTPException(status_code=503, detail={"status": "unavailable", "dependencies": dependencies})
        return {"status": "ok", "dependencies": dependencies}

    @application.post("/api/plan", response_model=TripPlan)
    async def plan(brief: TripBrief, request: Request, owner_id: str = Depends(session_owner)) -> TripPlan:
        catalog: list[ContentItem] = request.app.state.catalog
        narrative = None
        gateway: AiClient | None = request.app.state.ai
        if (
            active_settings.ai_enabled
            and gateway
            and request.app.state.ai_sessions.allow(owner_id, active_settings.ai_max_session_calls_per_hour)
        ):
            shortlist = score_content(catalog, brief)[:9]
            allowed_ids = {item.id for item in shortlist}
            for _ in range(2):
                if not request.app.state.ai_daily.allow(active_settings.ai_max_daily_calls):
                    break
                try:
                    payload = await asyncio.wait_for(
                        gateway.generate(brief, shortlist), timeout=active_settings.ai_timeout_ms / 1000
                    )
                    narrative = validate_narrative(payload, allowed_ids, brief.nights)
                    break
                except Exception:
                    continue
        generation_mode: Literal["ai", "fallback"] = "ai" if narrative else "fallback"
        return create_plan(brief, narrative or build_fallback_narrative(catalog, brief), generation_mode)

    @application.post("/api/events", status_code=status.HTTP_202_ACCEPTED)
    async def record_event(event: ProductEvent, request: Request) -> dict[str, bool]:
        event = sanitise_event(event)
        if not request.app.state.event_sessions.allow(
            event.sessionId, active_settings.event_max_session_calls_per_hour
        ):
            raise HTTPException(status_code=429, detail="Event limit reached")
        await request.app.state.trips.record_event(event)
        return {"accepted": True}

    @application.get("/api/dev/events")
    async def recent_events(request: Request) -> list[dict[str, object]]:
        if not active_settings.demo_mode:
            raise HTTPException(status_code=404, detail="Not found")
        return await request.app.state.trips.recent_events()

    @application.get("/api/trips", response_model=list[TripPlan])
    async def list_trips(request: Request, owner_id: str = Depends(session_owner)) -> list[TripPlan]:
        return await request.app.state.trips.list(owner_id)

    @application.post("/api/trips", response_model=TripPlan, status_code=status.HTTP_201_CREATED)
    async def create_trip(plan: TripPlan, request: Request, owner_id: str = Depends(session_owner)) -> TripPlan:
        try:
            return await request.app.state.trips.create(owner_id, plan)
        except TripAlreadyExistsError as error:
            raise HTTPException(status_code=409, detail="Trip already exists") from error

    @application.get("/api/trips/{trip_id}", response_model=TripPlan)
    async def get_trip(trip_id: str, request: Request, owner_id: str = Depends(session_owner)) -> TripPlan:
        saved = await request.app.state.trips.get(owner_id, trip_id)
        if not saved:
            raise HTTPException(status_code=404, detail="Trip not found")
        return saved

    @application.put("/api/trips/{trip_id}", response_model=TripPlan)
    async def save_trip(
        trip_id: str, plan: TripPlan, request: Request, owner_id: str = Depends(session_owner)
    ) -> TripPlan:
        if trip_id != plan.id:
            raise HTTPException(status_code=400, detail="Path and plan IDs must match")
        return await request.app.state.trips.save(owner_id, plan)

    @application.delete("/api/trips/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_trip(trip_id: str, request: Request, owner_id: str = Depends(session_owner)) -> Response:
        deleted = await request.app.state.trips.delete(owner_id, trip_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Trip not found")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @application.get("/api/search", response_model=SearchResponse)
    async def search(
        request: Request,
        q: Annotated[str, Query(max_length=100)] = "",
        resort_area: Annotated[str | None, Query(pattern=r"^(montego-bay|negril)$")] = None,
        content_type: Annotated[str | None, Query(pattern=r"^(destination|stay|experience|information)$")] = None,
        limit: Annotated[int, Query(ge=1, le=50)] = 20,
    ) -> SearchResponse:
        repository: SearchRepository = request.app.state.search
        return SearchResponse(
            items=await repository.search(q, resort_area=resort_area, content_type=content_type, limit=limit),
            backend=cast(Literal["catalog", "elasticsearch"], repository.backend),
        )

    @application.post("/api/search/reindex", response_model=ReindexResponse)
    async def reindex(request: Request, x_admin_key: Annotated[str | None, Header()] = None) -> ReindexResponse:
        if not active_settings.search_admin_key or x_admin_key != active_settings.search_admin_key:
            raise HTTPException(status_code=403, detail="A valid search admin key is required")
        repository: SearchRepository = request.app.state.search
        indexed = await repository.index_catalog(request.app.state.catalog)
        return ReindexResponse(indexed=indexed, index=repository.index_name)

    return application


app = create_app()
