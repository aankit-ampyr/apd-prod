/**
 * User Enums
 *  @ User - Regular user who is using the application
 *  @ Analyst - People who do alaysis
 *  @ Admin - Admins
 */
export * from '@lazarus/react-common/constants/enums';
export enum UserStatus {
  Inactive = 0,
  Active = 1,
}

export enum ProjectStatus {
  Active = 1,
  Inactive = 2,
  Archived = 3,
  Deleted = 4,
}

export enum LoadProfilePattern {
  'Constant(24/7)' = 1,
  'Day Only',
  'Night Only',
  'Seasonal Pattern',
  'Custom Window'
}

export enum SolarProfileSourceType {
  'Burton Solar Profile' = 1,
  'Solar Profile',
}

export enum SolarProfileSourceFileType {
  'Static File' = 1,
  'Uploaded CSV File' = 2,
}

export enum BessContainerTypes {
  "5 MWh / 2.5 MW (2-hour, 0.5C)" = 1,
  "5 MWh / 1.25 MW (4-hour, 0.25C)"
}

export enum DGRunScheduleMode {
  Disabled = 0,
  Anytime,
  DayOnly,
  NightOnly,
  CustomBlackout
}

export enum DGDriggerType {
  'Battery + Solar deficiency' = 1,
  'Battery SOC threshold',
  'Pre-emptive night charge'
}

export enum LoadServingPriority {
  'BESS First (Solar → BESS → DG)' = 1,
  'DG First (Solar → DG → BESS)'
}

export enum SimulationStatus {
  Completed = 1,
  Failed,
  "In Progress"
}

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
  SimulationJob
}

export enum ActionType {
  Created = 1,
  Updated,
  Deleted,
  Started,
  Stopped,
  Completed,
  Failed,
  Cancelled
}

export enum SimulationProgressStatus {
  Running = 1,
  Completed,
  Failed
}

export enum MultiYearSizingStrategy {
  'Year 1 BOL' = 1,
  'Year 10 EOL',
  'Year 20 EOL',
}

export enum SimulationSetupProgress { 
  Initialized = 0,
  'Load Profile',
  'Solar Profile',
  'BESS Container Config',
  'DG Configuration',
  'Dispatch Rules',
  'BESS & DG Config',
  'Run Sizing Simulation',
  'Custom Configuration',
  'Run Custom Config Simulation',
  'Multi-Year Projection Config',
  'Run Multi-Year Projection'
}