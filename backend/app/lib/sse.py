"""SSE helpers for Vercel Fluid / serverless.

Long-lived streams hold provisioned memory until maxDuration (Hobby: 300s).
Close earlier so the function exits cleanly; the browser reconnects.
"""

from __future__ import annotations

# Keepalive comment interval (seconds) while waiting for events.
SSE_KEEPALIVE_SECONDS = 25.0

# Soft-close before Vercel’s 300s kill. Client live-stream reconnects.
SSE_MAX_LIFETIME_SECONDS = 240.0
