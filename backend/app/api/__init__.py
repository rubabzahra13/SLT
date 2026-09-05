from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.producers import router as producers_router
from app.api.orders import router as orders_router
from app.api.mtd import router as mtd_router
from app.api.discount_codes import router as discount_codes_router
from app.api.pricing import router as pricing_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(producers_router, prefix="/api", tags=["producers"])
api_router.include_router(orders_router, prefix="/api", tags=["orders"])
api_router.include_router(mtd_router, prefix="/api", tags=["mtd"])
api_router.include_router(discount_codes_router, prefix="/api", tags=["discount_codes"])
api_router.include_router(pricing_router, prefix="/api", tags=["pricing"])
