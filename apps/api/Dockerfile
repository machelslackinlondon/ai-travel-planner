FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CATALOG_PATH=/workspace/libs/catalog/seed/items.json \
    PORT=8080

WORKDIR /workspace

COPY apps/api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --requirement /tmp/requirements.txt

COPY apps/api/app ./app
COPY libs/catalog ./libs/catalog

RUN addgroup --system api && adduser --system --ingroup api api \
    && chown -R api:api /workspace
USER api

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers"]
