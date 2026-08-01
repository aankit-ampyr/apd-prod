import type { SelectInputItem } from "../interface";
import {
  AuditLogModules,
  AuditLogScenario,
  Country,
  DigestScope,
  Platform,
  UserRole,
} from "./enums";

export const toastDuration = 5 * 1000; // 5 seconds;
export const otpTimer = 45;
export const otpLifeSpan = 5 * 60; // 5 mins
export const sessionIdleTimeout = 15 * 60 * 1000; // 15 minutes

export const TABLET_SCREEN_BREAKPOINT = 1024;

/**
 * calendar related constants
 */
export const CALENDAR_WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const CALENDAR_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const CALENDAR_MONTHS_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const CALENDAR_YEARS: SelectInputItem[] = Array.from(
  { length: 100 },
  (_, i) => ({
    id: new Date().getFullYear() - 50 + i,
    label: (new Date().getFullYear() - 50 + i).toString(),
  }),
);

export function getEnumKeysByValues<T extends Record<string, any>>(
  enumObj: T,
  values: string | number | (string | number)[],
): string[] {
  const arr = Array.isArray(values) ? values : [values];
  return (
    arr
      .map(
        (value) =>
          Object.entries(enumObj).find(([key, val]) => val === value)?.[0],
      )
      .filter((key): key is string => key !== undefined) || []
  );
}

export const ModuleBadgeColors: Record<AuditLogModules, string> = {
  [AuditLogModules.AUTHENTICATION]: "red",
  [AuditLogModules.ASSET_MANAGEMENT_AMD]: "orange",
  // [AuditLogModules.DIGEST_MANAGEMENT_AMD]: "magenta",
  [AuditLogModules.ORGANIZATION_MANAGEMENT_AMD]: "olive",
  [AuditLogModules.PROJECT_MANAGEMENT_BESS]: "sun",
  [AuditLogModules.USER_MANAGEMENT_BESS]: "blue",
  [AuditLogModules.USER_MANAGEMENT_AMD]: "indigo",
  [AuditLogModules.SETTINGS]: "aqua",
  [AuditLogModules.SIMULATION]: "voilet",
  [AuditLogModules.ASSET_ONBOARDING]: "pink",
  [AuditLogModules.ASSET_ANALYSIS]: "mustard",
  [AuditLogModules.BENCHMARK_ANALYSIS]: "navy",
  [AuditLogModules.INVOICE_ANALYSIS]: "gray",
  // [AuditLogModules.COMMENTS_AMD]: "cyan",
  [AuditLogModules.EXECUTIVE_ANALYSIS]: "green",
};
export const AuditModuleLabel: Record<AuditLogModules, string> = {
  [AuditLogModules.AUTHENTICATION]: "Authentication",
  [AuditLogModules.ASSET_MANAGEMENT_AMD]: "Asset Management",
  // [AuditLogModules.DIGEST_MANAGEMENT_AMD]: "Digests (APD)",
  [AuditLogModules.ORGANIZATION_MANAGEMENT_AMD]: "Organizations (APD)",
  [AuditLogModules.PROJECT_MANAGEMENT_BESS]: "Project Management",
  [AuditLogModules.USER_MANAGEMENT_AMD]: "User Management (APD)",
  [AuditLogModules.USER_MANAGEMENT_BESS]: "User Management (PSP)",
  [AuditLogModules.SETTINGS]: "Settings (APD)",
  [AuditLogModules.EXECUTIVE_ANALYSIS]: "Executive Analysis",
  [AuditLogModules.SIMULATION]: "Simulation",
  [AuditLogModules.ASSET_ONBOARDING]: "Asset Onboarding",
  [AuditLogModules.ASSET_ANALYSIS]: "View Analysis",
  [AuditLogModules.BENCHMARK_ANALYSIS]: "Benchmark Analysis",
  [AuditLogModules.INVOICE_ANALYSIS]: "Invoice Analysis",
  // [AuditLogModules.COMMENTS_AMD]: "Comments",
};

export const AuditActionLabel: Record<AuditLogScenario, string> = {
  [AuditLogScenario.OTP_SENT]: "OTP Sent",
  [AuditLogScenario.OTP_VERIFY_FAILED]: "OTP Verification Failed",
  [AuditLogScenario.OTP_VERIFY_SUCCESS]: "OTP Verification Successful",
  [AuditLogScenario.LOGIN_SUCCESS]: "Login Successful",
  [AuditLogScenario.LOGIN_FAILED]: "Login Failed",
  [AuditLogScenario.UNAUTHORIZED_ATTEMPT]: "Unauthorized Attempt",
  [AuditLogScenario.SESSION_STARTED]: "Session Started",
  [AuditLogScenario.SESSION_IDLE_TIMEOUT]: "Session Idle Timeout",
  [AuditLogScenario.SESSION_ABS_TIMEOUT]: "Session Timeout",
  [AuditLogScenario.LOGOUT]: "Logout",
  [AuditLogScenario.ORG_ASSIGNED]: "Organization Assigned",
  [AuditLogScenario.ORG_REASSIGNED]: "Organization Reassigned",
  [AuditLogScenario.ORG_CREATED]: "Organization Created",
  [AuditLogScenario.ORG_EDITED]: "Organization Edited",
  [AuditLogScenario.ORG_INACTIVATED]: "Organization Deactivated",
  [AuditLogScenario.ORG_ENABLED]: "Organization Enabled",
  [AuditLogScenario.ORG_UPDATED]: "Organization Updated",
  [AuditLogScenario.ASSET_REASSIGNED]: "Asset Reassigned",
  // [AuditLogScenario.DIGEST_CREATED]: "Digest Created",
  // [AuditLogScenario.DIGEST_UPDATED]: "Digest Updated",
  // [AuditLogScenario.DIGEST_ACTIVATED]: "Digest Activated",
  // [AuditLogScenario.DIGEST_DEACTIVATED]: "Digest Deactivated",
  // [AuditLogScenario.RECIPIENTS_UPDATED]: "Recipients Updated",
  [AuditLogScenario.PROJECT_REASSIGNED]: "Project Reassigned",
  [AuditLogScenario.PROJECT_VIEWED]: "Project Viewed",
  [AuditLogScenario.PROJECT_CREATED]: "Project Created",
  [AuditLogScenario.PROJECT_EDITED]: "Project Edited",
  [AuditLogScenario.PROJECT_DELETED]: "Project Deleted",
  [AuditLogScenario.PROJECT_RESTORED]: "Project Restored",
  [AuditLogScenario.PROJECT_ARCHIVED]: "Project Archived",
  [AuditLogScenario.PROJECT_UNARCHIVED]: "Project Unarchived",
  [AuditLogScenario.ASSET_ONBOARDED]: "Asset Onboarded",
  [AuditLogScenario.ASSET_UPDATED]: "Asset Updated",
  [AuditLogScenario.ASSET_OPTIMIZATION_UPDATED]: "Asset Optimization Updated",
  [AuditLogScenario.SCADA_REPORT_UPLOADED]: "SCADA Report Uploaded",
  [AuditLogScenario.SCADA_REPORT_REMOVED]: "SCADA Report Removed",
  [AuditLogScenario.DATASET_MERGED]: "Dataset Merged",
  [AuditLogScenario.AGGREGATOR_REPORT_REMOVED]: "Aggregator Report Removed",
  [AuditLogScenario.USER_DEACTIVATED]: "User Deactivated",
  [AuditLogScenario.BENCHMARK_CONFIGURATION_UPDATED]:
    "Benchmark Configuration Updated",
  [AuditLogScenario.INTERNAL_APPRAISAL_REPORT_REMOVED]:
    "Internal Appraisal Report Removed",
  [AuditLogScenario.MONTHLY_METRIC_CREATED]: "Monthly Metric Created",
  [AuditLogScenario.MONTHLY_METRIC_UPDATED]: "Monthly Metric Updated",
  [AuditLogScenario.MONTHLY_METRIC_CLEARED]: "Monthly Metric Cleared",
  [AuditLogScenario.SIMULATION_CREATED]: "Simulation Created",
  [AuditLogScenario.SIMULATION_DELETED]: "Simulation Deleted",
  [AuditLogScenario.SIMULATION_EDITED]: "Simulation Updated",
  [AuditLogScenario.SIZING_SIMULATION_RAN]: "Sizing Simulation Run",
  [AuditLogScenario.SIZING_SIMULATION_RERAN]: "Sizing Simulation Re-Run",
  [AuditLogScenario.SIZING_SIMULATION_STOPED]: "Sizing Simulation Stopped",
  [AuditLogScenario.SIZING_SIMULATION_RESULT_VIEWED]:
    "Sizing Simulation Result Viewed",
  [AuditLogScenario.VIEWED_ASSET_BASIC_INFORMATION]:
    "Viewed Asset Basic Information",
  [AuditLogScenario.OPTIMIZATION_PARAMETERS_CONFIRMED]:
    "Optimization Parameters Confirmed",
  [AuditLogScenario.AGGREGATOR_FILE_UPLOADED]: "Aggregator File Uploaded",
  [AuditLogScenario.AGGREGATOR_FILE_REPLACED]: "Aggregator File Replaced",
  [AuditLogScenario.SCADA_FILE_REPLACED]: "SCADA File Replaced",
  [AuditLogScenario.OPTIMIZED_DATASET_GENERATED]: "Optimized Dataset Generated",
  [AuditLogScenario.MERGED_DATASET_DOWNLOADED]: "Merged Dataset Downloaded",
  [AuditLogScenario.OPTIMIZED_DATASET_DOWNLOADED]:
    "Optimized Dataset Downloaded",
  [AuditLogScenario.VIEWED_ASSET_ANALYSIS]: "Viewed Asset Analysis",
  [AuditLogScenario.IAR_FILE_UPLOADED]: "IAR File Uploaded",
  [AuditLogScenario.IAR_FILE_REPLACED]: "IAR File Replaced",
  [AuditLogScenario.VIEWED_BENCHMARK_ANALYSIS]: "Viewed Benchmark Analysis",
  [AuditLogScenario.ASSET_SUBMITTED_FOR_APPROVAL]:
    "Asset Submitted For Approval",
  [AuditLogScenario.VIEWED_PENDING_APPROVAL_ASSET]:
    "Viewed Pending Approval Asset",
  [AuditLogScenario.VIEWED_ACTIVE_ASSET]: "Viewed Active Asset",
  [AuditLogScenario.MONTHLY_AGGREGATOR_FILE_UPLOADED]:
    "Monthly Aggregator File Uploaded",
  [AuditLogScenario.MONTHLY_SCADA_FILE_UPLOADED]: "Monthly SCADA File Uploaded",
  [AuditLogScenario.MONTHLY_AGGREGATOR_FILE_REPLACED]:
    "Monthly Aggregator File Replaced",
  [AuditLogScenario.MONTHLY_SCADA_FILE_REPLACED]: "Monthly SCADA File Replaced",
  [AuditLogScenario.UPDATED_IAR_FILE]: "Updated IAR File",
  [AuditLogScenario.DOWNLOADED_AGGREGATOR_FILE]: "Downloaded Aggregator File",
  [AuditLogScenario.DOWNLOADED_SCADA_FILE]: "Downloaded SCADA File",
  [AuditLogScenario.DOWNLOADED_IAR_FILE]: "Downloaded IAR File",
  [AuditLogScenario.VIEWED_ASSET_APPROVAL_DETAILS]:
    "Viewed Asset Approval Details",
  [AuditLogScenario.ASSET_APPROVED]: "Asset Approved",
  [AuditLogScenario.ASSET_DISABLED]: "Asset Disabled",
  [AuditLogScenario.ASSET_ENABLED]: "Asset Enabled",
  [AuditLogScenario.INVOICE_UPLOADED]: "Invoice Uploaded",
  [AuditLogScenario.INVOICE_DELETED]: "Invoice Deleted",
  [AuditLogScenario.SETTELMENT_FILE_UPLOADED]: "Settlement File Uploaded",
  [AuditLogScenario.SETTELMENT_FILE_DELETED]: "Settlement File Deleted",
  [AuditLogScenario.CUSTOM_CONF_EDITED]: "Custom Configuration Updated",
  [AuditLogScenario.CUSTOM_CONF_SIMULATION_RUN]: "Custom Configuration Run",
  [AuditLogScenario.CUSTOM_CONF_SIMULATION_RERUN]:
    "Custom Configuration Re-Run",
  [AuditLogScenario.CUSTOM_CONF_RESULT_VIEWED]:
    "Custom Configuration Result Viewed",
  [AuditLogScenario.CUSTOM_CONF_HOURLY_EXPORTED]:
    "Custom Configuration Hourly Data Exported",
  [AuditLogScenario.CUSTOM_CONF_MONTHLY_EXPORTED]:
    "Custom Configuration Monthly Data Exported",
  [AuditLogScenario.MULTI_YEAR_CONF_EDITED]: "Multi Year Configuration Updated",
  [AuditLogScenario.MULTI_YEAR_SIMULATION_RUN]: "Multi Year Configuration Run",
  [AuditLogScenario.MULTI_YEAR_SIMULATION_RERUN]:
    "Multi Year Configuration Re-Run",
  [AuditLogScenario.MULTI_YEAR_SIMULATION_STOP]:
    "Multi Year Configuration Stopped",
  [AuditLogScenario.MULTI_YEAR_RESULT_VIEWED]:
    "Multi Year Configuration Result Viewed",
  [AuditLogScenario.MULTI_YEAR_RESULT_EXPORTED]:
    "Multi Year Configuration Result Exported",
  [AuditLogScenario.GREEN_ENERGY_CONF_EDITED]:
    "Green Energy Configuration Updated",
  [AuditLogScenario.GREEN_ENERGY_SIMULATION_RUN]:
    "Green Energy Configuration Run",
  [AuditLogScenario.GREEN_ENERGY_SIMULATION_RERUN]:
    "Green Energy Configuration Re-Run",
  [AuditLogScenario.GREEN_ENERGY_SIMULATION_STOP]:
    "Green Energy Configuration Stopped",
  [AuditLogScenario.GREEN_ENERGY_RESULT_VIEWED]:
    "Green Energy Configuration Result Viewed",
  [AuditLogScenario.GREEN_ENERGY_RESULT_EXPORTED]:
    "Green Energy Configuration Result Exported",
  [AuditLogScenario.INVOICE_FILE_DOWNLOADED]: "Invoice File Downloaded",
  [AuditLogScenario.SETTLEMENT_FILE_DOWNLOADED]: "Settle File Downloaded",
  [AuditLogScenario.INVOICE_ANALYSIS_VIEWED]: "Invoice Analysis Viewed",
  [AuditLogScenario.INVOICE_PREVIEW_DOWNLOADED]: "Invoice Preview Downloaded",
  [AuditLogScenario.INVOICE_ANALYSIS_DATA_DOWNLOADED]:
    "Invoice Analysis Data Downloaded",

  [AuditLogScenario.CUSTOM_CONF_CREATED]: "Custom Configuration Created",
  [AuditLogScenario.MULTI_YEAR_CONF_CREATED]:
    "Multi Year Configuration Created",
  [AuditLogScenario.GREEN_ENERGY_CONF_CREATED]:
    "Green Energy Configuration Created",
  [AuditLogScenario.SOLAR_PROFILE_CREATED]: "Solar Profile Created",
  [AuditLogScenario.SOLAR_PROFILE_UPDATED]: "Solar Profile Updated",
  [AuditLogScenario.SIZING_SIMULATION_RESULT_EXPORTED]:
    "Sizing Simulation Result Exported",
  [AuditLogScenario.DETAILED_GREEN_ENERGY_CONF_CREATED]:
    "Detailed Green Configuration Created",
  [AuditLogScenario.DETAILED_GREEN_ENERGY_CONF_UPDATED]:
    "Detailed Green Configuration Updated",
  [AuditLogScenario.DETAILED_GREEN_ENERGY_SIMULATION_RUN]:
    "Detailed Green Simulation Run",
  [AuditLogScenario.DETAILED_GREEN_ENERGY_SIMULATION_RERUN]:
    "Detailed Green Simulation Re-Run",
  [AuditLogScenario.DETAILED_GREEN_ENERGY_MONTHLY_EXPORTED]:
    "Detailed Green Energy Monthly Result Exported",
  [AuditLogScenario.DETAILED_GREEN_ENERGY_HOURLY_EXPORTED]:
    "Detailed Green Energy Hourly Result Exported",
  [AuditLogScenario.SUMMARY_STATEMENT_UPLOADED]: "Summary Statement Uploaded",
  [AuditLogScenario.SUMMARY_STATEMENT_DOWNLOADED]:
    "Summary Statement Downloaded",
  [AuditLogScenario.SUMMARY_STATEMENT_DELETED]: "Summary Statement Deleted",
  [AuditLogScenario.ADDED_COMMENT]: "Added Comment",
  [AuditLogScenario.UPDATED_COMMENT]: "Updated Comment",
  [AuditLogScenario.REMOVED_COMMENT]: "Removed Comment",
  [AuditLogScenario.REPLIED_TO_COMMENT]: "Added Reply",
  [AuditLogScenario.VIEWED_EXECUTIVE_ANALYSIS]: "Viewed Executive Analysis",
};

export const DigestScopeBadgeColors: Record<DigestScope, string> = {
  [DigestScope["Per Asset"]]: "blue",
  [DigestScope["Per Organization"]]: "indigo",
  [DigestScope["Portfolio-wide"]]: "orange",
};

export const CountryLabel: Record<Country, string> = {
  [Country.AFGHANISTAN]: "Afghanistan",
  [Country.ALBANIA]: "Albania",
  [Country.ALGERIA]: "Algeria",
  [Country.ANDORRA]: "Andorra",
  [Country.ANGOLA]: "Angola",
  [Country.ANTIGUA_AND_BARBUDA]: "Antigua and Barbuda",
  [Country.ARGENTINA]: "Argentina",
  [Country.ARMENIA]: "Armenia",
  [Country.AUSTRALIA]: "Australia",
  [Country.AUSTRIA]: "Austria",
  [Country.AZERBAIJAN]: "Azerbaijan",
  [Country.BAHAMAS]: "Bahamas",
  [Country.BAHRAIN]: "Bahrain",
  [Country.BANGLADESH]: "Bangladesh",
  [Country.BARBADOS]: "Barbados",
  [Country.BELARUS]: "Belarus",
  [Country.BELGIUM]: "Belgium",
  [Country.BELIZE]: "Belize",
  [Country.BENIN]: "Benin",
  [Country.BHUTAN]: "Bhutan",
  [Country.BOLIVIA]: "Bolivia",
  [Country.BOSNIA_AND_HERZEGOVINA]: "Bosnia and Herzegovina",
  [Country.BOTSWANA]: "Botswana",
  [Country.BRAZIL]: "Brazil",
  [Country.BRUNEI]: "Brunei",
  [Country.BULGARIA]: "Bulgaria",
  [Country.BURKINA_FASO]: "Burkina Faso",
  [Country.BURUNDI]: "Burundi",
  [Country.CABO_VERDE]: "Cabo Verde",
  [Country.CAMBODIA]: "Cambodia",
  [Country.CAMEROON]: "Cameroon",
  [Country.CANADA]: "Canada",
  [Country.CENTRAL_AFRICAN_REPUBLIC]: "Central African Republic",
  [Country.CHAD]: "Chad",
  [Country.CHILE]: "Chile",
  [Country.CHINA]: "China",
  [Country.COLOMBIA]: "Colombia",
  [Country.COMOROS]: "Comoros",
  [Country.CONGO_DEMOCRATIC_REPUBLIC]: "Congo Democratic Republic",
  [Country.CONGO_REPUBLIC]: "Congo Republic",
  [Country.COSTA_RICA]: "Costa Rica",
  [Country.CROATIA]: "Croatia",
  [Country.CUBA]: "Cuba",
  [Country.CYPRUS]: "Cyprus",
  [Country.CZECH_REPUBLIC]: "Czech Republic",
  [Country.DENMARK]: "Denmark",
  [Country.DJIBOUTI]: "Djibouti",
  [Country.DOMINICA]: "Dominica",
  [Country.DOMINICAN_REPUBLIC]: "Dominican Republic",
  [Country.ECUADOR]: "Ecuador",
  [Country.EGYPT]: "Egypt",
  [Country.EL_SALVADOR]: "El Salvador",
  [Country.EQUATORIAL_GUINEA]: "Equatorial Guinea",
  [Country.ERITREA]: "Eritrea",
  [Country.ESTONIA]: "Estonia",
  [Country.ESWATINI]: "Eswatini",
  [Country.ETHIOPIA]: "Ethiopia",
  [Country.FIJI]: "Fiji",
  [Country.FINLAND]: "Finland",
  [Country.FRANCE]: "France",
  [Country.GABON]: "Gabon",
  [Country.GAMBIA]: "Gambia",
  [Country.GEORGIA]: "Georgia",
  [Country.GERMANY]: "Germany",
  [Country.GHANA]: "Ghana",
  [Country.GREECE]: "Greece",
  [Country.GRENADA]: "Grenada",
  [Country.GUATEMALA]: "Guatemala",
  [Country.GUINEA]: "Guinea",
  [Country.GUINEA_BISSAU]: "Guinea Bissau",
  [Country.GUYANA]: "Guyana",
  [Country.HAITI]: "Haiti",
  [Country.HONDURAS]: "Honduras",
  [Country.HUNGARY]: "Hungary",
  [Country.ICELAND]: "Iceland",
  [Country.INDIA]: "India",
  [Country.INDONESIA]: "Indonesia",
  [Country.IRAN]: "Iran",
  [Country.IRAQ]: "Iraq",
  [Country.IRELAND]: "Ireland",
  [Country.ISRAEL]: "Israel",
  [Country.ITALY]: "Italy",
  [Country.JAMAICA]: "Jamaica",
  [Country.JAPAN]: "Japan",
  [Country.JORDAN]: "Jordan",
  [Country.KAZAKHSTAN]: "Kazakhstan",
  [Country.KENYA]: "Kenya",
  [Country.KIRIBATI]: "Kiribati",
  [Country.KOREA_NORTH]: "Korea North",
  [Country.KOREA_SOUTH]: "Korea South",
  [Country.KUWAIT]: "Kuwait",
  [Country.KYRGYZSTAN]: "Kyrgyzstan",
  [Country.LAOS]: "Laos",
  [Country.LATVIA]: "Latvia",
  [Country.LEBANON]: "Lebanon",
  [Country.LESOTHO]: "Lesotho",
  [Country.LIBERIA]: "Liberia",
  [Country.LIBYA]: "Libya",
  [Country.LIECHTENSTEIN]: "Liechtenstein",
  [Country.LITHUANIA]: "Lithuania",
  [Country.LUXEMBOURG]: "Luxembourg",
  [Country.MADAGASCAR]: "Madagascar",
  [Country.MALAWI]: "Malawi",
  [Country.MALAYSIA]: "Malaysia",
  [Country.MALDIVES]: "Maldives",
  [Country.MALI]: "Mali",
  [Country.MALTA]: "Malta",
  [Country.MARSHALL_ISLANDS]: "Marshall Islands",
  [Country.MAURITANIA]: "Mauritania",
  [Country.MAURITIUS]: "Mauritius",
  [Country.MEXICO]: "Mexico",
  [Country.MICRONESIA]: "Micronesia",
  [Country.MOLDOVA]: "Moldova",
  [Country.MONACO]: "Monaco",
  [Country.MONGOLIA]: "Mongolia",
  [Country.MONTENEGRO]: "Montenegro",
  [Country.MOROCCO]: "Morocco",
  [Country.MOZAMBIQUE]: "Mozambique",
  [Country.MYANMAR]: "Myanmar",
  [Country.NAMIBIA]: "Namibia",
  [Country.NAURU]: "Nauru",
  [Country.NEPAL]: "Nepal",
  [Country.NETHERLANDS]: "Netherlands",
  [Country.NEW_ZEALAND]: "New Zealand",
  [Country.NICARAGUA]: "Nicaragua",
  [Country.NIGER]: "Niger",
  [Country.NIGERIA]: "Nigeria",
  [Country.NORTH_MACEDONIA]: "North Macedonia",
  [Country.NORWAY]: "Norway",
  [Country.OMAN]: "Oman",
  [Country.PAKISTAN]: "Pakistan",
  [Country.PALAU]: "Palau",
  [Country.PANAMA]: "Panama",
  [Country.PAPUA_NEW_GUINEA]: "Papua New Guinea",
  [Country.PARAGUAY]: "Paraguay",
  [Country.PERU]: "Peru",
  [Country.PHILIPPINES]: "Philippines",
  [Country.POLAND]: "Poland",
  [Country.PORTUGAL]: "Portugal",
  [Country.QATAR]: "Qatar",
  [Country.ROMANIA]: "Romania",
  [Country.RUSSIA]: "Russia",
  [Country.RWANDA]: "Rwanda",
  [Country.SAINT_KITTS_AND_NEVIS]: "Saint Kitts and Nevis",
  [Country.SAINT_LUCIA]: "Saint Lucia",
  [Country.SAINT_VINCENT_AND_THE_GRENADINES]:
    "Saint Vincent and the Grenadines",
  [Country.SAMOA]: "Samoa",
  [Country.SAN_MARINO]: "San Marino",
  [Country.SAO_TOME_AND_PRINCIPE]: "Sao Tome and Principe",
  [Country.SAUDI_ARABIA]: "Saudi Arabia",
  [Country.SENEGAL]: "Senegal",
  [Country.SERBIA]: "Serbia",
  [Country.SEYCHELLES]: "Seychelles",
  [Country.SIERRA_LEONE]: "Sierra Leone",
  [Country.SINGAPORE]: "Singapore",
  [Country.SLOVAKIA]: "Slovakia",
  [Country.SLOVENIA]: "Slovenia",
  [Country.SOLOMON_ISLANDS]: "Solomon Islands",
  [Country.SOMALIA]: "Somalia",
  [Country.SOUTH_AFRICA]: "South Africa",
  [Country.SOUTH_SUDAN]: "South Sudan",
  [Country.SPAIN]: "Spain",
  [Country.SRI_LANKA]: "Sri Lanka",
  [Country.SUDAN]: "Sudan",
  [Country.SURINAME]: "Suriname",
  [Country.SWEDEN]: "Sweden",
  [Country.SWITZERLAND]: "Switzerland",
  [Country.SYRIA]: "Syria",
  [Country.TAIWAN]: "Taiwan",
  [Country.TAJIKISTAN]: "Tajikistan",
  [Country.TANZANIA]: "Tanzania",
  [Country.THAILAND]: "Thailand",
  [Country.TIMOR_LESTE]: "Timor Leste",
  [Country.TOGO]: "Togo",
  [Country.TONGA]: "Tonga",
  [Country.TRINIDAD_AND_TOBAGO]: "Trinidad and Tobago",
  [Country.TUNISIA]: "Tunisia",
  [Country.TURKEY]: "Turkey",
  [Country.TURKMENISTAN]: "Turkmenistan",
  [Country.TUVALU]: "Tuvalu",
  [Country.UGANDA]: "Uganda",
  [Country.UKRAINE]: "Ukraine",
  [Country.UNITED_ARAB_EMIRATES]: "United Arab Emirates",
  [Country.UNITED_KINGDOM]: "United Kingdom",
  [Country.UNITED_STATES]: "United States",
  [Country.URUGUAY]: "Uruguay",
  [Country.UZBEKISTAN]: "Uzbekistan",
  [Country.VANUATU]: "Vanuatu",
  [Country.VATICAN_CITY]: "Vatican City",
  [Country.VENEZUELA]: "Venezuela",
  [Country.VIETNAM]: "Vietnam",
  [Country.YEMEN]: "Yemen",
  [Country.ZAMBIA]: "Zambia",
  [Country.ZIMBABWE]: "Zimbabwe",
};

export const PLATFORM_LABELS: Record<number, string> = {
  [Platform.APD]: "APD",
  [Platform.PSP]: "PSP",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: "Admin",
  [UserRole.Analyst]: "Analyst",
  [UserRole.Management]: "Management",
  [UserRole.Viewer]: "Viewer",
  [UserRole.SuperAdmin]: "Super Admin",
};
// Admin, Analyst, Management & Viewer roles only
export const BESS_USER_ROLES: SelectInputItem[] = [
  UserRole.Admin,
  UserRole.Analyst,
  UserRole.Management,
  UserRole.Viewer,
].map((role) => ({
  id: role,
  label: USER_ROLE_LABELS[role],
}));

// Admin, Analyst, Management roles only
export const AMD_USER_ROLES: SelectInputItem[] = [
  UserRole.Admin,
  UserRole.Analyst,
  UserRole.Management,
].map((role) => ({
  id: role,
  label: USER_ROLE_LABELS[role],
}));
