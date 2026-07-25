import pytest
from ai_planner import AiPlannerService, MockTravelRepository, PlannerRequest


@pytest.mark.asyncio
async def test_planner_retrieves_mock_content_and_builds_structured_days(tmp_path) -> None:
    catalog = tmp_path / "catalog.json"
    catalog.write_text('[{"id":"negril","type":"destination","name":"Negril","description":"Beach","regionId":"west","destinationId":"negril","tags":["romantic"],"category":["coast"],"popularity":90,"rating":4.8,"priceLevel":"mid-range"},{"id":"sail","type":"activity","name":"Sunset sail","description":"Sailing","regionId":"west","destinationId":"negril","tags":["romantic"],"category":["activity"],"popularity":80,"rating":4.7,"priceLevel":"premium"}]')
    service = AiPlannerService(MockTravelRepository(str(catalog)))

    response = await service.plan(PlannerRequest(request="Plan a 2 day romantic trip to Negril"))

    assert response.interpretedRequest.destination == "negril"
    assert len(response.days) == 2
    assert response.sources
    assert response.generationMode == "fallback"
