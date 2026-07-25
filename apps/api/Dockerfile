FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace:/workspace/services/ai-planner \
    CATALOG_PATH=/workspace/libs/catalog/seed/items.json \
    TRAVEL_CATALOG_PATH=/workspace/mock-data/generated/search-documents.json \
    PORT=8080

WORKDIR /workspace

COPY apps/api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --requirement /tmp/requirements.txt

COPY apps/api/app ./app
COPY libs/catalog ./libs/catalog
COPY services/ai-planner ./services/ai-planner
COPY mock-data/generated ./mock-data/generated

RUN addgroup --system api && adduser --system --ingroup api api \
    && chown -R api:api /workspace
USER api

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers"]
