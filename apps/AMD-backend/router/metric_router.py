from fastapi import APIRouter
from controller.metric_controller import MetricController

class MetricRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/metrics"
        self.tags = ["Metrics"]

        self.controller = MetricController()

        self.router.get("/benchmarks")(self.controller.get_benchmarks)
        self.router.patch("/benchmarks")(self.controller.update_benchmarks)

        self.router.get("/monthly-values")(self.controller.get_monthly_values)
        self.router.post("/monthly-values")(self.controller.save_monthly_values)
        self.router.patch("/monthly-values")(self.controller.save_monthly_values)

        
        self.router.get("/modo/benchmarking/monthly-index-live")(self.controller.get_modo_energy_monthly_benchmark)
        
