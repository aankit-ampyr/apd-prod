from fastapi import FastAPI, APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from config import DEBUG
from python_common.utils import cache
from db.dependencies import get_bess_db
from services.run_sizing_sim_service import RunSizingSimulationService

# import all your routes here
from .user_router import UserRouter
from .project_router import ProjectRouter
from .auth_router import AuthRouter
from .audit_router import AuditRouter
from .simulation_router import SimulationRouter
from .solar_profile_router import SolarProfileRouter
from .socket_router import SockerRouter


class BaseRouter:
    def __init__(self):
        self.router = APIRouter()

        # create routes
        self.routers = [
            UserRouter(),
            ProjectRouter(),
            AuthRouter(),
            AuditRouter(),
            SimulationRouter(),
            SolarProfileRouter(),
            SockerRouter(),
        ]

        # register routes
        for router in self.routers:
            self.router.include_router(
                router=router.router,
                prefix=router.endpoint,
                tags=getattr(router, "tags", []),
            )


def register_routes(app: FastAPI):
    # index route
    app.get("/")(lambda: JSONResponse({"message": "welcome to Heal backend"}))

    if DEBUG:

        @app.get("/cache")
        async def get_cache():
            data = await cache.all()
            return JSONResponse(content=data)

        @app.delete("/cache")
        async def clear_cache():
            await cache.clear()
            return JSONResponse(content={"message": "cache cleared"})

        @app.get("/debug/simulation/export/{simulation_id}")
        async def export_debug_csv(
            simulation_id: int,
            bess_db: AsyncSession = Depends(get_bess_db),
            service: RunSizingSimulationService = Depends(RunSizingSimulationService),
        ):
            return await service.export_simulation_debug(
                simulation_id=simulation_id, bess_db=bess_db
            )

    base_route = BaseRouter()
    app.include_router(base_route.router, prefix="/api/v1")


__all__ = ["register_routes"]
