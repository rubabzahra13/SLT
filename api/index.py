"""Legacy single-function entrypoint.

Production on Vercel now uses Services (`backend` → `app.main:app` via vercel.json).
This file remains for local `vercel dev` experiments against /api/index only.
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app  # noqa: E402
