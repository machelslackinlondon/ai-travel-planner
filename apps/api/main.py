"""Vercel ASGI entry point for the FastAPI application."""

import sys
from pathlib import Path

workspace_root = Path(__file__).resolve().parents[2]
ai_planner_root = workspace_root / "services" / "ai-planner"
if str(ai_planner_root) not in sys.path:
    sys.path.insert(0, str(ai_planner_root))

from app.main import app as app  # noqa: E402
