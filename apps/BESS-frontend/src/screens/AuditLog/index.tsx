import {useEffect, useRef, useState, type ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DataTable, FilterGroup} from '@/components';
import {Badge, Text, Tooltip} from '@/ui-kits';
import {auditLogs, auditLogTotalPages, auditLogSuccess, auditLogFailure, totalAuditLogResults, auditLogLoading} from '@/services/redux/selectors';
import {resetAuditLogMessage, auditLogListRequest} from '@/services/redux/slice';
import type {AuditLog as AuditLogType, DataTableColumn, AuditLogListRequest, SelectInputItem} from '@/interface';
import {UserRole, NA, AuditModuleLabel, AuditActionLabel, ModuleBadgeColors, AuditLogModules, AuditLogScenario, BESS_USER_ROLES} from '@/constants';
import {useToast} from '@/hooks';
import {enumToSelectOptionsWithValue, formatDate, getErrorMessage, getSuccessMessage, type ErrorCodes, type SuccessCodes} from '@/utils';
import {format, isValid} from 'date-fns';
import {useContext} from 'react';
import {WebSocketContext} from '@/context/WebsocketContext';
/**
 * Page Size for pagination - 100 records per page as per requirements
 */
const PAGE_SIZE = 100;

/**
 * Role options for dropdown
 */
const ROLE_OPTIONS = BESS_USER_ROLES.filter(role => role.id !== UserRole.Admin);

/**
 * Module options for dropdown - Only Project Management and Simulation for BESS
 */
const MODULE_OPTIONS: SelectInputItem[] = enumToSelectOptionsWithValue(AuditLogModules, AuditModuleLabel).filter(
  option => option.id === AuditLogModules.PROJECT_MANAGEMENT_BESS || option.id === AuditLogModules.SIMULATION,
);

/**
 * Action options for dropdown - Only Project Management and Simulation related
 */
const PROJECT_ACTIONS = new Set([
  AuditLogScenario.PROJECT_REASSIGNED,
  AuditLogScenario.PROJECT_VIEWED,
  AuditLogScenario.PROJECT_CREATED,
  AuditLogScenario.PROJECT_EDITED,
  AuditLogScenario.PROJECT_DELETED,
  AuditLogScenario.PROJECT_RESTORED,
  AuditLogScenario.PROJECT_ARCHIVED,
  AuditLogScenario.PROJECT_UNARCHIVED,
]);
const SIMULATION_ACTIONS = new Set([
  AuditLogScenario.SIMULATION_CREATED,
  AuditLogScenario.SIMULATION_DELETED,
  AuditLogScenario.SIMULATION_EDITED,
  AuditLogScenario.SIZING_SIMULATION_RAN,
  AuditLogScenario.SIZING_SIMULATION_RERAN,
  AuditLogScenario.SIZING_SIMULATION_STOPED,
  AuditLogScenario.SIZING_SIMULATION_RESULT_VIEWED,
  AuditLogScenario.SIMULATION_CREATED,
  AuditLogScenario.SIMULATION_DELETED,
  AuditLogScenario.SIMULATION_EDITED,
  AuditLogScenario.SIZING_SIMULATION_RAN,
  AuditLogScenario.SIZING_SIMULATION_RERAN,
  AuditLogScenario.SIZING_SIMULATION_STOPED,
  AuditLogScenario.SIZING_SIMULATION_RESULT_VIEWED,
  // New simulation actions
  AuditLogScenario.CUSTOM_CONF_EDITED,
  AuditLogScenario.CUSTOM_CONF_SIMULATION_RUN,
  AuditLogScenario.CUSTOM_CONF_SIMULATION_RERUN,
  AuditLogScenario.CUSTOM_CONF_RESULT_VIEWED,
  AuditLogScenario.CUSTOM_CONF_HOURLY_EXPORTED,
  AuditLogScenario.CUSTOM_CONF_MONTHLY_EXPORTED,
  AuditLogScenario.MULTI_YEAR_CONF_EDITED,
  AuditLogScenario.MULTI_YEAR_SIMULATION_RUN,
  AuditLogScenario.MULTI_YEAR_SIMULATION_RERUN,
  AuditLogScenario.MULTI_YEAR_SIMULATION_STOP,
  AuditLogScenario.MULTI_YEAR_RESULT_VIEWED,
  AuditLogScenario.MULTI_YEAR_RESULT_EXPORTED,
  AuditLogScenario.GREEN_ENERGY_CONF_EDITED,
  AuditLogScenario.GREEN_ENERGY_SIMULATION_RUN,
  AuditLogScenario.GREEN_ENERGY_SIMULATION_RERUN,
  AuditLogScenario.GREEN_ENERGY_SIMULATION_STOP,
  AuditLogScenario.GREEN_ENERGY_RESULT_VIEWED,
  AuditLogScenario.GREEN_ENERGY_RESULT_EXPORTED,
  AuditLogScenario.CUSTOM_CONF_CREATED,
  AuditLogScenario.MULTI_YEAR_CONF_CREATED,
  AuditLogScenario.GREEN_ENERGY_CONF_CREATED,
  AuditLogScenario.SOLAR_PROFILE_CREATED,
  AuditLogScenario.SOLAR_PROFILE_UPDATED,
  AuditLogScenario.SIZING_SIMULATION_RESULT_EXPORTED,
  AuditLogScenario.DETAILED_GREEN_ENERGY_CONF_CREATED,
  AuditLogScenario.DETAILED_GREEN_ENERGY_CONF_UPDATED,
  AuditLogScenario.DETAILED_GREEN_ENERGY_SIMULATION_RUN,
  AuditLogScenario.DETAILED_GREEN_ENERGY_SIMULATION_RERUN,
  AuditLogScenario.DETAILED_GREEN_ENERGY_MONTHLY_EXPORTED,
  AuditLogScenario.DETAILED_GREEN_ENERGY_HOURLY_EXPORTED,
]);

const ACTION_OPTIONS: SelectInputItem[] = enumToSelectOptionsWithValue(AuditLogScenario, AuditActionLabel).filter(
  option => PROJECT_ACTIONS.has(Number(option.id)) || SIMULATION_ACTIONS.has(Number(option.id)),
);
/**
 * Filter type for audit log filtering
 */
type FilterType = {
  search?: string;
  log_id?: string;
  role?: UserRole;
  module?: AuditLogModules;
  action?: AuditLogScenario;
  start_date?: string;
  end_date?: string;
  date_range?: {
    start: Date | null;
    end: Date | null;
  };
};

export function AuditLog() {
  const {subscribe} = useContext(WebSocketContext);
  // =================
  // hooks
  // =================
  const dispatch = useDispatch();
  const {showToast} = useToast();

  // =================
  // selectors
  // =================
  const auditLogsData = useSelector(auditLogs);
  const totalPagesData = useSelector(auditLogTotalPages);
  const totalResult = useSelector(totalAuditLogResults);
  const isLoading = useSelector(auditLogLoading);
  const success = useSelector(auditLogSuccess) as SuccessCodes;
  const failure = useSelector(auditLogFailure) as ErrorCodes;

  // =================
  // states
  // =================
  const [page, setPage] = useState(1);
  const [showGhostLoader, setShowGhostLoader] = useState(true);
  const hasObservedLoading = useRef(false);
  const pendingAuditLogList = useRef<typeof auditLogsData | null>(null);
  const [tableMessage, setTableMessage] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>({});

  // ================
  // functions
  // ================
  const handleFilterChange = (values: FilterType) => {
    const toApiDate = (date: Date | string | null | undefined) => {
      if (!date) return undefined;
      const parsedDate = date instanceof Date ? date : new Date(date);
      if (!isValid(parsedDate)) return undefined;
      return format(parsedDate, 'yyyy-MM-dd');
    };

    let newFilter: FilterType = {
      search: values.search || undefined,
    };
    if (values.action) newFilter.action = values.action;
    if (values.log_id) newFilter.log_id = values.log_id;
    if (values.module) newFilter.module = values.module;
    if (values.role) newFilter.role = values.role;
    const startDate = values.date_range?.start ?? values.start_date;
    const endDate = values.date_range?.end ?? values.end_date;
    const formattedStartDate = toApiDate(startDate);
    const formattedEndDate = toApiDate(endDate);

    if (formattedStartDate) {
      newFilter.start_date = formattedStartDate;
    }
    if (formattedEndDate) {
      newFilter.end_date = formattedEndDate;
    }

    setFilter(newFilter);
    setPage(1);
  };

  const formatAuditData = (data?: string | object | null): {label: string; tooltip?: ReactNode} => {
    if (!data) return {label: NA};

    // If it's a string, return as-is
    if (typeof data === 'string') {
      let formatted = data;
      // Convert boolean status to Active/Inactive
      formatted = formatted.replace(/\bstatus:\s*false\b/gi, 'Status: Inactive');
      formatted = formatted.replace(/\bstatus:\s*true\b/gi, 'Status: Active');
      // Convert lowercase keys to proper casing based on mockups
      formatted = formatted.replace(/(^|,\s*)name:/gi, '$1Project Name:');
      formatted = formatted.replace(/(^|,\s*)description:/gi, '$1Description:');
      formatted = formatted.replace(/(^|,\s*)status:/gi, '$1Status:');
      // Replace commas with newlines for key properties
      formatted = formatted.replace(/,\s*(Project Name:|Description:|Status:|Responsible User:|Assigned users -)/gi, '\n$1');
      // Show assigned-user audit values one role per line
      formatted = formatted.replace(/Assigned users -\s*/gi, 'Assigned users -\n');
      formatted = formatted.replace(/,\s*(Admin:|Analyst:|Viewer:|Management:)/g, '\n$1');
      return {label: formatted};
    }

    // If it's an object
    if (typeof data === 'object') {
      // Check if empty object
      if (Object.keys(data).length === 0) return {label: NA};

      // Get the first key as the label (e.g., "SIZING CONFIGURATION", "SYSTEM SETUP", etc.)
      const keys = Object.keys(data);
      const firstKey = keys[0];
      const innerData = (data as Record<string, unknown>)[firstKey];

      // Format the value for display
      const formatDisplayValue = (value: unknown): string => {
        if (value === null) return 'N/A';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
      };

      // Build styled tooltip content
      let tooltipContent: ReactNode = null;
      if (typeof innerData === 'object' && innerData !== null) {
        const entries = Object.entries(innerData as Record<string, unknown>);
        tooltipContent = (
          <div className="flex flex-col gap-1">
            {entries.map(([key, value], index) => (
              <div key={index} className="flex items-center gap-1">
                <Text variant="small" className="text-text-secondary!">
                  {key}:
                </Text>
                <Text variant="small" className="font-InterSemiBold! text-text-secondary!">
                  {formatDisplayValue(value)}
                </Text>
              </div>
            ))}
          </div>
        );
      } else {
        tooltipContent = (
          <Text variant="small" className="text-small! font-InterSemiBold! text-text-secondary!">
            {formatDisplayValue(innerData)}
          </Text>
        );
      }

      return {label: firstKey, tooltip: tooltipContent};
    }

    return {label: String(data)};
  };

  const getActionLabel = (row: AuditLogType) => {
    if (row.action.id === AuditLogScenario.PROJECT_REASSIGNED || row.action.id === AuditLogScenario.PROJECT_EDITED) {
      return 'Project Updated'; // As per the design photo
    }
    return AuditActionLabel[row.action.id] || NA;
  };

  useEffect(() => {
    const unsubscribe = subscribe(event => {
      // Audit Log resource
      if (Number(event.resource_type) !== 14) return;

      fetchAuditLogs();
    });

    return () => unsubscribe();
  }, [subscribe, page, filter]);

  // =================
  // data
  // =================
  const columns: DataTableColumn<AuditLogType>[] = [
    {
      name: 'log_id',
      title: 'Log ID',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.log_id}
        </Text>
      ),
    },
    {
      name: 'user_id',
      title: 'User ID',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.user_id}
        </Text>
      ),
    },
    {
      name: 'role',
      title: 'Role',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-secondary!">
          {UserRole[row.role]}
        </Text>
      ),
    },
    {
      name: 'resource_id',
      title: 'Resource ID',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-secondary!">
          {row?.resource_id || NA}
        </Text>
      ),
    },
    {
      name: 'module',
      title: 'Module',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => <Badge message={AuditModuleLabel[row.module.id]} color={ModuleBadgeColors[row.module.id] as any} />,
    },
    {
      name: 'action',
      title: 'Action',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {getActionLabel(row)}
        </Text>
      ),
    },
    {
      name: 'before',
      title: 'Before',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => {
        const {label, tooltip} = formatAuditData(row.before);
        return (
          <div className="relative group">
            <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap cursor-default">
              {label}
            </Text>
            {tooltip && <Tooltip message={tooltip} position="top" portal className="border-[#9ECBC5]! border-2!" />}
          </div>
        );
      },
    },
    {
      name: 'after',
      title: 'After',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => {
        const {label, tooltip} = formatAuditData(row.after);
        return (
          <div className="relative group">
            <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap cursor-default">
              {label}
            </Text>
            {tooltip && <Tooltip message={tooltip} position="top" portal className="border-[#9ECBC5]! border!" />}
          </div>
        );
      },
    },
    {
      name: 'timestamp',
      title: 'Date & Time',
      width: {minWidth: '170px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap">
          {row?.timestamp ? formatDate(row?.timestamp, 'dd MMM yyyy, hh:mm:ss a') : NA}
        </Text>
      ),
    },
  ];

  function fetchAuditLogs() {
    const payload: AuditLogListRequest['params'] = {page, limit: PAGE_SIZE};
    if (filter.search) {
      payload.search = filter.search;
    }
    if (filter.log_id) {
      payload.log_id = filter.log_id;
    }
    if (filter.role) {
      payload.role = filter.role;
    }
    if (filter.module) {
      payload.module = filter.module;
    }
    if (filter.action) {
      payload.action = filter.action;
    }
    if (filter.start_date) {
      payload.start_date = filter.start_date;
    }
    if (filter.end_date) {
      payload.end_date = filter.end_date;
    }
    dispatch(auditLogListRequest(payload));
  }

  // =================
  // side effects
  // =================
  useEffect(() => {
    if (isLoading) {
      hasObservedLoading.current = true;
      return;
    }

    if (hasObservedLoading.current) {
      hasObservedLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [isLoading]);

  useEffect(() => {
    pendingAuditLogList.current = auditLogsData;
    setShowGhostLoader(true);
    fetchAuditLogs();
  }, [filter, page]);

  useEffect(() => {
    if (pendingAuditLogList.current !== auditLogsData) {
      pendingAuditLogList.current = null;
      hasObservedLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [auditLogsData]);

  useEffect(() => {
    if (hasObservedLoading.current && (success || failure)) {
      hasObservedLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [success, failure]);

  useEffect(() => {
    if (success) {
      if (!['S-10014', 'S-20036'].includes(success)) {
        showToast(getSuccessMessage(success), 'success');
      }
    }
    if (failure) {
      if (!['E-10030', 'E-10014'].includes(failure)) {
        showToast(getErrorMessage(failure), 'error');
      }
      if (failure === 'E-20030') {
        setTableMessage('No records match applied filters');
      }
    }
    return () => {
      dispatch(resetAuditLogMessage());
    };
  }, [success, failure]);

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Text variant="subtitle1" className="text-text-primary">
          Track detailed audit logs with before/after changes for all actions performed across the PSP environment.
        </Text>
      </div>

      {/* Filters */}
      <FilterGroup
        config={[
          {
            key: 'search',
            placeholder: 'Search by Log ID, User ID, Resource ID',
            type: 'search',
            props: {className: 'min-w-73'},
          },
          {
            key: 'role',
            placeholder: 'Select Role',
            type: 'select',
            options: ROLE_OPTIONS,
            props: {className: 'min-w-32.25'},
          },
          {
            key: 'module',
            placeholder: 'Select Module',
            type: 'searchable-select',
            options: MODULE_OPTIONS,
            props: {className: 'min-w-37.25'},
          },
          {
            key: 'action',
            placeholder: 'Select Action',
            type: 'searchable-select',
            options: ACTION_OPTIONS,
            props: {className: 'w-48!'},
          },
          // {
          //   key: 'start_date',
          //   placeholder: 'From Date',
          //   type: 'date',
          // },
          // {
          //   key: 'end_date',
          //   placeholder: 'To Date',
          //   type: 'date',
          // },
          {
            key: 'date_range',
            placeholder: 'Date Range',
            type: 'date-range',
            props: {
              className: 'max-w-37',
              usePortal: true,
              // calendarClassName: "!left-auto !right-0"
            },
          },
        ]}
        onChange={handleFilterChange}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={auditLogsData}
        totalPages={totalPagesData}
        currentPage={page}
        totalResult={totalResult}
        errorMessage={tableMessage}
        onPageChange={setPage}
        stickyHeader
        loading={showGhostLoader}
        ghostRowCount={9}
        tableHeightWhenScrollable={700}
      />
    </div>
  );
}
