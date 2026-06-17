from python_common.exceptions import *


class SimulationNotFound(Exception):
    def __init__(self, message: str = "Simulation not found"):
        self.message = message
        super().__init__(self.message)
