from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
from config import DEBUG
from utils.cache_utils import cache

# import all your routes here
from .auth_router import AuthRouter
from .user_router import UserRouter
from .organization_router import OrganizationRouter
from .asset_router import AssetRouter
from .digest_router import DigestRouter
from .audit_router import AuditRouter
from .metric_router import MetricRouter
from .asset_analysis_router import AnalysisRouter
from .invoice_router import PdfInvoiceRouter,InvoiceAnalysisRouter
from .comment_router import CommentRouter
from .notification_router import NotificationRouter
from .socket_router import SocketRouter


class BaseRouter:
    def __init__(self):
        self.router = APIRouter()

        pdf_invoice_router = PdfInvoiceRouter()


        # create routes
        self.routers = [
            UserRouter(),
            OrganizationRouter(),
            AuthRouter(),
            AssetRouter(),
            DigestRouter(),
            AuditRouter(),
            MetricRouter(),
            AnalysisRouter(),
            PdfInvoiceRouter(),
            CommentRouter(),
            NotificationRouter(),
            InvoiceAnalysisRouter(),
            SocketRouter(),
            
        ]

        # register routes
        for router in self.routers:
            self.router.include_router(
                router=router.router, 
                prefix=router.endpoint, 
                tags=getattr(router, "tags", [])
            )
    

def register_routes(app: FastAPI):    
    # index route
    app.get('/')(lambda: JSONResponse({"message": "welcome to Heal backend"}))
    
    if (DEBUG):
        app.get("/cache")(lambda: JSONResponse(cache.all()))
        app.delete("/cache")(lambda: JSONResponse(cache.clear()))
    

    base_route = BaseRouter()
    app.include_router(base_route.router, prefix="/api/v1")

__all__ = ['register_routes']