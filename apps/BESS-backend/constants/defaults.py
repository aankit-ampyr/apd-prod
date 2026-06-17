JWT_ALGORITHM = "HS256"

# Default access/refresh token expiry in seconds
JWT_EXPIRY = 60 * 60  # 1 hour

# Ephemeral WebSocket token expiry in seconds
EPHEMERAL_WS_TOKEN_EXPIRY = 60  # 1 minute

# Static solar profile mapping for testing
# Maps source_id to CSV filename in the inputs/ directory
STATIC_SOLAR_PROFILES = {
    1: "Burton Solar Profile 1.csv",
    2: "Solar Profile 1.csv",
}

# Directory for static test input files (relative to BESS-backend root)
STATIC_INPUTS_DIR = "inputs"

SIMULATION_UPDATES_CHANEL = "simulaton_progress_update"

SIZING_STRATEGY = (1, 10, 20)
