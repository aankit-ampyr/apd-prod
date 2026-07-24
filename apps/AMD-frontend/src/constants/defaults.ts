import type {SelectInputItem, AssetMarket} from '@/interface';
import {
  APDAuditLogModules,
  AssetBatteryCycleCalculationMethod,
  AssetFileType,
  AssetStatus,
  AssetType,
  DigestFrequency,
  DigestScope,
  InvoiceType,
} from './enums';
import {AuditModuleLabel, ModuleBadgeColors} from '@lazarus/react-common/constants';
export {PLATFORM_LABELS} from '@lazarus/react-common/constants';

/**
 * isolated constants
 */
export const resetOtpTimer = 45;
export const NA = 'N/A';
export const autoLogoutErrorCodes: any = [
  'E-10011', // user not authorized
  'E-10012', // user session expired
  'E-10027', // user not found or deleted
  'E-10110', // token expired
];

export const STATUS_OPTIONS: SelectInputItem[] = [
  {id: 1, label: 'Active'},
  {id: 2, label: 'Inactive'},
];

export const DIGEST_SCOPE: SelectInputItem[] = [
  {id: DigestScope['Per Asset'], label: 'Per Asset'},
  {id: DigestScope['Per Organization'], label: 'Per Organization'},
  {id: DigestScope['Portfolio-wide'], label: 'Portfolio-wide'},
];

export const DIGEST_FREQUENCY: SelectInputItem[] = [
  {id: DigestFrequency.Daily, label: 'Daily'},
  {id: DigestFrequency.Weekly, label: 'Weekly'},
  {id: DigestFrequency.Monthly, label: 'Monthly'},
];

export const ASSET_TYPE_OPTIONS: SelectInputItem[] = [
  {id: AssetType.Solar, label: 'Solar'},
  {id: AssetType.BESS, label: 'BESS'},
  {id: AssetType['Solar + BESS'], label: 'Solar + BESS'},
];

// ===============================
// Enums Labels
// ===============================
export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  [AssetStatus.Active]: 'Active',
  [AssetStatus.AnalysisReady]: 'Analysis Ready',
  [AssetStatus.Draft]: 'Draft',
  [AssetStatus.Inactive]: 'Inactive',
  [AssetStatus.PendingApproval]: 'Pending Approval',
};
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.Solar]: 'Solar',
  [AssetType.BESS]: 'BESS',
  [AssetType['Solar + BESS']]: 'Solar + BESS',
};

export const AssetFileLabel: Record<AssetFileType, string> = {
  [AssetFileType.AggregatorReport]: 'Aggregator',
  [AssetFileType.IAR]: 'IAR',
  [AssetFileType.MergedDataset]: 'Merged',
  [AssetFileType.ScadaReport]: 'SCADA',
  [AssetFileType.OptimizedDataset]: 'Optimized',
  [AssetFileType.SolarDataset]: 'Solar Dataset',
};

export const AuditLogModuleLabels: Record<APDAuditLogModules, string> = {
  [APDAuditLogModules.AUTHENTICATION]: AuditModuleLabel[APDAuditLogModules.AUTHENTICATION],
  [APDAuditLogModules.USER_MANAGEMENT]: 'Users',
  [APDAuditLogModules.ASSET_MANAGEMENT_AMD]: 'Asset Management',
  [APDAuditLogModules.DIGEST_MANAGEMENT_AMD]: 'Digest Management',
  [APDAuditLogModules.ORGANIZATION_MANAGEMENT_AMD]: 'Organization Management',
  [APDAuditLogModules.BENCHMARK_CONFIGURATION]: AuditModuleLabel[APDAuditLogModules.BENCHMARK_CONFIGURATION],
  [APDAuditLogModules.MONTHLY_VALUE_MANAGEMENT_AMD]: 'Monthly Values',
  [APDAuditLogModules.ASSET_ONBOARDING]: AuditModuleLabel[APDAuditLogModules.ASSET_ONBOARDING],
  [APDAuditLogModules.ASSET_ANALYSIS]: AuditModuleLabel[APDAuditLogModules.ASSET_ANALYSIS],
  [APDAuditLogModules.BENCHMARK_ANALYSIS]: AuditModuleLabel[APDAuditLogModules.BENCHMARK_ANALYSIS],
  [APDAuditLogModules.FILE_HISTORY]: AuditModuleLabel[APDAuditLogModules.FILE_HISTORY],
  [APDAuditLogModules.INVOICE]: AuditModuleLabel[APDAuditLogModules.INVOICE],
};

export const APDAuditLogModuleColors: Record<APDAuditLogModules, string> = {
  [APDAuditLogModules.AUTHENTICATION]: ModuleBadgeColors[APDAuditLogModules.AUTHENTICATION],
  [APDAuditLogModules.USER_MANAGEMENT]: ModuleBadgeColors[APDAuditLogModules.USER_MANAGEMENT],
  [APDAuditLogModules.ASSET_MANAGEMENT_AMD]: ModuleBadgeColors[APDAuditLogModules.ASSET_MANAGEMENT_AMD],
  [APDAuditLogModules.DIGEST_MANAGEMENT_AMD]: ModuleBadgeColors[APDAuditLogModules.DIGEST_MANAGEMENT_AMD],
  [APDAuditLogModules.ORGANIZATION_MANAGEMENT_AMD]: ModuleBadgeColors[APDAuditLogModules.ORGANIZATION_MANAGEMENT_AMD],
  [APDAuditLogModules.BENCHMARK_CONFIGURATION]: ModuleBadgeColors[APDAuditLogModules.BENCHMARK_CONFIGURATION],
  [APDAuditLogModules.MONTHLY_VALUE_MANAGEMENT_AMD]: ModuleBadgeColors[APDAuditLogModules.MONTHLY_VALUE_MANAGEMENT_AMD],
  [APDAuditLogModules.ASSET_ONBOARDING]: ModuleBadgeColors[APDAuditLogModules.ASSET_ONBOARDING],
  [APDAuditLogModules.ASSET_ANALYSIS]: ModuleBadgeColors[APDAuditLogModules.ASSET_ANALYSIS],
  [APDAuditLogModules.BENCHMARK_ANALYSIS]: ModuleBadgeColors[APDAuditLogModules.BENCHMARK_ANALYSIS],
  [APDAuditLogModules.FILE_HISTORY]: ModuleBadgeColors[APDAuditLogModules.FILE_HISTORY],
  [APDAuditLogModules.INVOICE]: ModuleBadgeColors[APDAuditLogModules.INVOICE],
};

export const InvoiceTypeLabels: Record<InvoiceType, string> = {
  [InvoiceType.HartreePV]: 'Hartree PV',
  [InvoiceType.HartreeBESS]: 'Hartree BESS',
  [InvoiceType.EMR]: 'EMR',
  [InvoiceType.GridBeyond]: 'GridBeyond',
  [InvoiceType.HartreeBESSPower]: 'Hartree BESS Power',
  [InvoiceType.HartreeAuxiliary]: 'Hartree Auxiliary',
  [InvoiceType.HartreeSolarPower]: 'Hartree Solar Power',
  [InvoiceType.HartreeOther]: 'Hartree Other',
};

export const BatteryCycleCalculationMethodLabels: Record<
  AssetBatteryCycleCalculationMethod,
  {
    label: string;
    fullLabel: string;
    formulaLabel: string;
    formulaCodeName: string;
  }
> = {
  [AssetBatteryCycleCalculationMethod.DISCHARGE_BASED]: {
    label: 'Discharge Only',
    fullLabel: 'Discharge-only',
    formulaLabel: 'Discharge Energy / Battery Capacity',
    formulaCodeName: 'A',
  },
  [AssetBatteryCycleCalculationMethod.FULL_EQUIVALENT]: {
    label: 'Full Equivalent',
    fullLabel: 'Full Equivalent (Industry Std.)',
    formulaLabel: '(Discharge + Charge) / 2 / Capacity',
    formulaCodeName: 'B',
  },
  [AssetBatteryCycleCalculationMethod.THROUGHPUT_BASED]: {
    label: 'Throughput',
    fullLabel: 'Throughput-based',
    formulaLabel: '(Discharge Energy + Charge Energy) / (2 x Battery Capacity)',
    formulaCodeName: 'C',
  },
};

export const AssetMarketLabels: Record<AssetMarket, string> = {
  actual: 'Actual',
  epex_daily: 'EPEX Daily',
  epex_efa: 'EPEX EFA',
  multi: 'Optimized',
};

export const AssetMarketFullLabels: Record<AssetMarket, string> = {
  actual: 'Actual Operation',
  epex_daily: 'EPEX-Only (Daily)',
  epex_efa: 'EPEX-Only (EFA)',
  multi: 'Optimized',
};

// ===============================
// Enum -> Badge variants
// ===============================
export const AssetStatusBadgeVariant: Record<AssetStatus, string> = {
  [AssetStatus.Active]: 'green',
  [AssetStatus.Inactive]: 'navy',
  [AssetStatus.Draft]: 'blue',
  [AssetStatus.AnalysisReady]: 'red',
  [AssetStatus.PendingApproval]: 'orange',
};

export const AssetFileBadgeVariants: Record<AssetFileType, string> = {
  [AssetFileType.AggregatorReport]: 'orange',
  [AssetFileType.IAR]: 'voilet',
  [AssetFileType.MergedDataset]: 'green',
  [AssetFileType.ScadaReport]: 'blue',
  [AssetFileType.OptimizedDataset]: 'navy',
  [AssetFileType.SolarDataset]: 'green',
};

export const InvoiceTypeBadgeVariants: Record<
  InvoiceType,
  string 
> = {
  [InvoiceType.HartreePV]: 'link',
  [InvoiceType.HartreeBESS]: 'green',
  [InvoiceType.EMR]: 'voilet',
  [InvoiceType.GridBeyond]: 'yellow',
  [InvoiceType.HartreeBESSPower]: 'aqua',
  [InvoiceType.HartreeAuxiliary]: 'pink',
  [InvoiceType.HartreeSolarPower]: 'sun',
  [InvoiceType.HartreeOther]: 'gray',
};
