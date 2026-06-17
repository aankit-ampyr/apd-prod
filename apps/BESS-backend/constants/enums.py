from enum import Enum, IntEnum
from python_common.constants.enums import AuditLogModules, AuditLogScenario, BaseEnum  # type: ignore


class UserRole(IntEnum):
    ANALYST = 1
    ADMIN = 2
    MANAGEMENT = 3
    SUPER_ADMIN = 4
    VIEWER = 5


class Platform(IntEnum):
    AMD = 1
    BESS = 2


class Order(Enum):
    ASCENDING = "asc"
    DESCENDING = "desc"


class ProjectStatus(IntEnum):
    ACTIVE = 1
    INACTIVE = 2
    ARCHIVED = 3
    DELETED = 4


class LoadPattern(IntEnum):
    CONSTANT_LOAD = 1
    DAY_ONLY_LOAD = 2
    NIGHT_ONLY_LOAD = 3
    SEASONAL_LOAD = 4
    CUSTOM_WINDOW_LOAD = 5


class BESSContainerSize(IntEnum):
    SIZE_5MWH_0_5C = 1
    SIZE_5MWH_0_25C = 2


class SimulationSetupProgress(IntEnum):
    INITIALIZED = 0
    LOAD_PROFILE = 1
    SOLAR_PROFILE = 2
    BESS_CONTAINER_CONFIG = 3
    DG_CONFIGURATION = 4
    DISPATCH_RULES = 5
    BESS_DG_CONFIG = 6
    RUN_SIZING_SIMULATION = 7
    CUSTOM_CONFIGURATION = 8
    RUN_CUSTOM_CONFIG_SIMULATION = 9
    MULTI_YEAR_PROJECTION_CONFIG = 10
    RUN_MULTI_YEAR_PROJECTION = 11
    GREEN_ENERGY_CONFIG = 12


class DGRunScheduleMode(IntEnum):
    DISABLED = 0
    ANYTIME = 1
    DAY_ONLY = 2
    NIGHT_ONLY = 3
    CUSTOM_BLACKOUT = 4


class DGTriggerType(IntEnum):
    SOLAR_BATTERY_DEFICIT = 1
    SOC_THRESHOLD = 2
    PREEMPTIVE_NIGHT = 3


class LoadServingPriority(IntEnum):
    BESS_FIRST = 1
    DG_FIRST = 2


class SizingStrategy(IntEnum):
    YEAR_1 = 1
    YEAR_10 = 2
    YEAR_20 = 3


class SimulationStatus(IntEnum):
    COMPLETED = 1
    FAILED = 2
    IN_PROGRESS = 3


class ResourceType(BaseEnum):
    USER = 1
    PROJECT = 2
    SIMULATION = 3
    SIZING_SIMULATION_JOB = 4
    LOAD_PROFILE = 5
    SOLAR_PROFILE = 6
    BESS_CONTAINER_CONFIG = 7
    DG_CONFIG = 8
    DISPATCH_RULE = 9
    SIMULATION_JOB = 10
    MULTI_YEAR_SIMULATION = 11


class ActionType(BaseEnum):
    CREATED = 1
    UPDATED = 2
    DELETED = 3
    STARTED = 4
    STOPPED = 5
    COMPLETED = 6
    FAILED = 7
    CANCELLED = 8


class SimulationJobStatus(IntEnum):
    INITIATED = 0
    IN_PROGRESS = 1
    COMPLETED = 2
    FAILED = 3
    OUTDATED = 4
    TERMINATED = 5


class SimulationLogStep(Enum):
    SYSTEM_SETUP = "SYSTEM SETUP"
    DISPATCH_RULE = "DISPATCH RULE"
    SIZING_CONFIGURATION = "SIZING CONFIGURATION"
    CUSTOM_CONFIGURATION = "CUSTOM CONFIGURATION"


class BessState(IntEnum):
    IDLE = 0
    CHARGING = 1
    DISCHARGING = 2


class Month(IntEnum):
    JAN = 1
    FEB = 2
    MAR = 3
    APR = 4
    MAY = 5
    JUN = 6
    JUL = 7
    AUG = 8
    SEP = 9
    OCT = 10
    NOV = 11
    DEC = 12


class PSPAuditLogScenario(BaseEnum):
    PROJECT_REASSIGNED = AuditLogScenario.PROJECT_REASSIGNED.value
    PROJECT_VIEWED = AuditLogScenario.PROJECT_VIEWED.value
    PROJECT_CREATED = AuditLogScenario.PROJECT_CREATED.value
    PROJECT_EDITED = AuditLogScenario.PROJECT_EDITED.value
    PROJECT_DELETED = AuditLogScenario.PROJECT_DELETED.value
    PROJECT_RESTORED = AuditLogScenario.PROJECT_RESTORED.value
    PROJECT_ARCHIVED = AuditLogScenario.PROJECT_ARCHIVED.value
    PROJECT_UNARCHIVED = AuditLogScenario.PROJECT_UNARCHIVED.value
    SIMULATION_CREATED = AuditLogScenario.SIMULATION_CREATED.value
    SIMULATION_DELETED = AuditLogScenario.SIMULATION_DELETED.value
    SIMULATION_EDITED = AuditLogScenario.SIMULATION_EDITED.value
    SIZING_SIMULATION_RAN = AuditLogScenario.SIZING_SIMULATION_RAN.value
    SIZING_SIMULATION_RERAN = AuditLogScenario.SIZING_SIMULATION_RERAN.value
    SIZING_SIMULATION_STOPED = AuditLogScenario.SIZING_SIMULATION_STOPED.value
    SIZING_SIMULATION_RESULT_VIEWED = (
        AuditLogScenario.SIZING_SIMULATION_RESULT_VIEWED.value
    )


class PSPAuditLogModules(BaseEnum):
    AUTHENTICATION = AuditLogModules.AUTHENTICATION.value
    PROJECT_MANAGEMENT_BESS = AuditLogModules.PROJECT_MANAGEMENT_BESS.value
    SIMULATION = AuditLogModules.SIMULATION.value
