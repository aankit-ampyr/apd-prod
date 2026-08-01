from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from config import ENCRYPT, ALLOWED_ORIGINS
from middleware import (
    ClientInfoMiddleware,
    ExceptionHandlerMiddleware,
    ValidationExceptionHandler,
    DecryptionMiddleware,
    AuthMiddleware,
)
from router import register_routes
from context import lifespan

app = FastAPI(lifespan=lifespan)

# encryption middleware
if ENCRYPT:
    app.add_middleware(
        DecryptionMiddleware,
        skip_routes=[
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/auth/public-endpoint",
        ],
    )

# auth middleware - validates Bearer token, sets request.state.user
app.add_middleware(
    AuthMiddleware,
    public_endpoints={
        "/",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/health",
        "/cache",
        "/debug/simulation/export",
        "/api/v1/auth/login/send-otp",
        "/api/v1/auth/login/verify-otp",
        "/api/v1/auth/refresh",
    },
)

# exception handler - catches auth exceptions from inner middleware
app.add_middleware(ExceptionHandlerMiddleware)


# client info middleware
app.add_middleware(ClientInfoMiddleware)

# CORS middleware (outermost wrapper)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, ValidationExceptionHandler)


# Register all routes
register_routes(app)
