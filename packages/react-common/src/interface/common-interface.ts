import type { IconName } from "../assets/icons";
import { AuditLogModules, AuditLogScenario, Platform, UserRole } from "../constants";
export type SortType = "asc" | "desc" | null;

interface DataTableColumnWidth {
  minWidth: string; // Required - e.g., "100px", "10rem"
  width?: string; // Optional - e.g., "200px", "20%", "auto"
  maxWidth?: string; // Optional - e.g., "500px", "50%"
}

export type Align = "left" | "center" | "right";

export interface DataTableColumn<T> {
  name: string;
  title: string | React.ReactNode;
  width?: DataTableColumnWidth;
  align: Align;
  headerAlign?: Align;
  render?: (row: T, width?: DataTableColumnWidth, isHovered?: boolean) => string | React.ReactNode;
  renderCell?: ({row, index, width, isHovered}: {row: T; index: number; width?: DataTableColumnWidth; isHovered?: boolean}) => string | React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}


export interface GroupedTableBaseColumn<T> {
  key: string;
  title: React.ReactNode;
  width?: string | number;
  align?: Align;
  renderCell?: (row: T) => React.ReactNode;
}
export interface GroupedTableBaseSubColumn {
  key: string;
  title: React.ReactNode;
  align?: Align;
  renderCell?: (
    value: any,
    row: any,
    align?: Align,
  ) => React.ReactNode;
}

export interface SelectInputItem<T = unknown> {
  id: string | number;
  label: string;
  subLabel?: string;
  metadata?: T;
}

export type DateRange = {
  start: Date | null;
  end: Date | null;
};
export interface CalendarDay {
  day: number;
  month: number;
  year: number;
}

export interface PopupRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ScheduleTime {
  time: string; // e.g., "10:00 AM"
  weekday?: number | null; // 1-7 (Monday=1, Sunday=7) or null if not applicable
  day_of_month?: number | null; // 1-31 or null if not applicable
}

export type IconTypes = IconName;

export type SideNavOptionType<T = string> = {
  route?: T;
  icon?: IconTypes;
  label: string;
  children?: SideNavOptionType<T>[];
};

export type StepsWithUnderscoreType = {
  step: number;
  label: string;
  image: any;
};

export type Nullable<T> = T | null;

export type Undefinedable<T> = {
  [K in keyof T]: T[K] | undefined;
};


export type MonthYear = {
  month: number; // 1-12
  year: number; // e.g., 2024
};

// ========================= Charts =========================
export interface DonutSegment {
  value: number;
  label: string;
  percentage?: number;
}

// =============================== API Interface ===============================
export interface Auth {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  photo?: string;
  platform?: Platform[];
}

export interface AuditLog {
  id: number;
  log_id: number;
  user_id: string;
  role: UserRole;
  resource_id?: string;
  module: {
    id: AuditLogModules;
    name: string;
  };
  action: {
    id: AuditLogScenario;
    name: string;
  };
  before: string | Record<string, unknown> | null;
  after: string | Record<string, unknown> | null;
  timestamp: string;
}