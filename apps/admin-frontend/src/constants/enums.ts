export * from '@lazarus/react-common/constants/enums';

export enum ResourceType {
  User = 1,
  Project,
  Simulation,
  SizingSimulationJob,
  LoadProfile,
  SolarProfile,
  BESSContainerConfig,
  DGConfig,
  DispatchRule,
  SimulationJob,
}

export enum ActionType {
  Created = 1,
  Updated,
  Deleted,
  Started,
  Stopped,
  Completed,
  Failed,
  Cancelled,
}
