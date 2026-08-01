import {ReactNode, useEffect, useRef, useState, useContext} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DataTable, FilterGroup} from '@/components';
import {Badge, Text, Tooltip} from '@/ui-kits';
import {
  auditLogs,
  auditLogTotalPages,
  auditLogSuccess,
  auditLogFailure,
  totalAuditLogResults,
  auditLogLoading,
} from '@/services/redux/selectors';
import {resetAuditLogMessage, auditLogListRequest} from '@/services/redux/slice';
import type {AuditLog as AuditLogType, DataTableColumn, AuditLogListRequest, SelectInputItem} from '@/interface';
import {
  UserRole,
  NA,
  AuditModuleLabel,
  AuditActionLabel,
  ModuleBadgeColors,
  AuditLogModules,
  AuditLogScenario,
  BESS_USER_ROLES,
} from '@/constants';
import {useToast, useWindowDimensions} from '@/hooks';
import {
  enumToSelectOptions,
  enumToSelectOptionsWithValue,
  formatDate,
  getErrorMessage,
  getSuccessMessage,
  type ErrorCodes,
  type SuccessCodes,
} from '@/utils';
import {format, isValid} from 'date-fns';
import {WebSocketContext} from '@/context/WebsocketContext';

/**
 * Role options for dropdown
 */
const ROLE_OPTIONS = BESS_USER_ROLES;

/**
 * Module options for dropdown
 */
const MODULE_OPTIONS: SelectInputItem[] = enumToSelectOptionsWithValue(AuditLogModules, AuditModuleLabel).sort((a, b) =>
  a.label.localeCompare(b.label),
);

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

/**
 * Action options for dropdown
 */
const ACTION_OPTIONS: SelectInputItem[] = enumToSelectOptionsWithValue(AuditLogScenario, AuditActionLabel).sort(
  (a, b) => a.label.localeCompare(b.label),
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

type AuditValue = AuditLogType['before'];
type AuditValueEntry = {key: string; value: string} | {value: string};

type AuditValueDisplay = {
  preview: string;
  entries: AuditValueEntry[];
} | null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePreviewText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function stringifyAuditValue(raw: unknown, key?: string) {
  if (raw == null) return '-';

  // Handle rich text comment content
  if (key === 'Comment Content' || key === 'Reply Content') {
    let parsedRaw = raw;
    if (typeof raw === 'string') {
      try {
        parsedRaw = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    if (Array.isArray(parsedRaw)) {
      try {
        return parsedRaw
          .map((node: any) => {
            if (node.type === 'mention' && node.user?.name) {
              return `@${node.user.name}`;
            }
            return node.text || '';
          })
          .join('');
      } catch {
        // fallback
      }
    }
  }

  if (typeof raw === 'string') return normalizePreviewText(raw);
  if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'bigint') {
    return String(raw);
  }

  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

function AuditValueCell({value}: {value: AuditValue}) {
  const formatted = formatAuditValue(value);

  function formatAuditValue(value: AuditValue): AuditValueDisplay {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string') {
      let formatted = value;
      // Convert boolean status to Active/Inactive
      formatted = formatted.replace(/\bstatus:\s*false\b/gi, 'Status: Inactive');
      formatted = formatted.replace(/\bstatus:\s*true\b/gi, 'Status: Active');
      // Convert lowercase keys to proper casing based on mockups
      formatted = formatted.replace(/(^|,\s*)name:/gi, '$1Project Name:');
      formatted = formatted.replace(/(^|,\s*)description:/gi, '$1Description:');
      formatted = formatted.replace(/(^|,\s*)status:/gi, '$1Status:');
      // Replace commas with newlines for key properties
      formatted = formatted.replace(
        /,\s*(Project Name:|Description:|Status:|Responsible User:|Assigned users -)/gi,
        '\n$1',
      );
      // Show assigned-user audit values one role per line
      formatted = formatted.replace(/Assigned users -\s*/gi, 'Assigned users -\n');
      formatted = formatted.replace(/,\s*(Admin:|Analyst:|Viewer:|Management:)/g, '\n$1');

      const trimmed = formatted.trim();
      return trimmed ? {preview: normalizePreviewText(trimmed), entries: [{value: trimmed}]} : null;
    }

    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      if (keys.length === 0) return null;

      // Admin-frontend logic: if it's an object with a single key containing another object (e.g., "SIZING CONFIGURATION")
      if (keys.length === 1) {
        const firstKey = keys[0];
        const innerData = value[firstKey];
        if (isPlainObject(innerData)) {
          const innerEntries = Object.entries(innerData).map(([k, v]) => ({
            key: k,
            value: stringifyAuditValue(v, k),
          }));
          return {
            preview: firstKey,
            entries: innerEntries,
          };
        } else {
          // If the inner value isn't an object, just show the formatted string
          return {
            preview: firstKey,
            entries: [{value: stringifyAuditValue(innerData, firstKey)}],
          };
        }
      }

      // Fallback robust AMD logic for flat objects
      const entries = Object.entries(value)
        .map(([key, raw]) => {
          const displayKey = key === 'Parent Comment Title' || key === 'Parent Comment' ? 'Comment Title' : key;
          return {
            key: displayKey,
            value: stringifyAuditValue(raw, displayKey),
          };
        })
        .filter(entry => Boolean(entry.key) && entry.key !== 'Reply Title')
        .sort((a, b) => {
          if ('key' in a && a.key === 'Comment Title') return -1;
          if ('key' in b && b.key === 'Comment Title') return 1;
          return 0;
        });

      if (!entries.length) {
        return null;
      }

      return {
        preview: entries.map(({key, value: entryValue}) => `${key}: ${entryValue}`).join(' | '),
        entries,
      };
    }

    const fallback = normalizePreviewText(String(value));
    return fallback ? {preview: fallback, entries: [{value: fallback}]} : null;
  }

  if (!formatted) {
    return (
      <Text variant="caption" className="text-text-secondary!">
        {NA}
      </Text>
    );
  }

  return (
    <div className="relative group">
      <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap cursor-default line-clamp-2">
        {formatted.preview}
      </Text>

      {formatted.entries.length > 0 && (
        <Tooltip
          portal
          position="top"
          message={
            <div className="max-w-96 whitespace-pre-wrap wrap-break-word flex flex-col gap-1">
              {formatted.entries.map((entry, index) =>
                'key' in entry ? (
                  <div key={`${entry.key}-${index}`} className="flex flex-wrap gap-1">
                    <Text variant="12R" className="text-secondary!">
                      {entry.key}:
                    </Text>
                    <Text variant="12M">{entry.value}</Text>
                  </div>
                ) : (
                  <Text key={`value-${index}`} variant="12M">
                    {entry.value}
                  </Text>
                ),
              )}
            </div>
          }
          className="border-[#9ECBC5]! border-2! max-w-96 whitespace-normal"
        />
      )}
    </div>
  );
}

export function AuditLog() {
  const {subscribe} = useContext(WebSocketContext);
  // =================
  // hooks
  // =================
  const dispatch = useDispatch();
  const {showToast} = useToast();
  const {width} = useWindowDimensions();
  const alwaysShrink = width <= 1024;
  const pageSize = alwaysShrink ? 20 : 50;

  // =================
  // selectors
  // =================
  const auditLogsData = useSelector(auditLogs);
  const totalPagesData = useSelector(auditLogTotalPages);
  const totalResult = useSelector(totalAuditLogResults);
  const success = useSelector(auditLogSuccess) as SuccessCodes;
  const failure = useSelector(auditLogFailure) as ErrorCodes;
  const isLoading = useSelector(auditLogLoading);

  const [showGhostLoader, setShowGhostLoader] = useState(true);

  const hasObservedLoading = useRef(false);

  const pendingAuditLogList = useRef<typeof auditLogsData | null>(null);

  // =================
  // states
  // =================
  const [page, setPage] = useState(1);
  const [tableMessage, setTableMessage] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>({});

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

  const getActionLabel = (row: AuditLogType) => {
    if (row.action.id === AuditLogScenario.PROJECT_REASSIGNED || row.action.id === AuditLogScenario.PROJECT_EDITED) {
      return 'Project Updated';
    }
    return AuditActionLabel[row.action.id] || NA;
  };

  const formatAuditData = (data?: string | object | null): {label: string; tooltip?: ReactNode} => {
    if (!data) return {label: NA};

    if (typeof data === 'string') {
      let formatted = data;
      formatted = formatted.replace(/\bstatus:\s*false\b/gi, 'Status: Inactive');
      formatted = formatted.replace(/\bstatus:\s*true\b/gi, 'Status: Active');
      formatted = formatted.replace(/(^|,\s*)name:/gi, '$1Project Name:');
      formatted = formatted.replace(/(^|,\s*)description:/gi, '$1Description:');
      formatted = formatted.replace(/(^|,\s*)status:/gi, '$1Status:');
      formatted = formatted.replace(
        /,\s*(Project Name:|Description:|Status:|Responsible User:|Assigned users -)/gi,
        '\n$1',
      );
      formatted = formatted.replace(/Assigned users -\s*/gi, 'Assigned users -\n');
      formatted = formatted.replace(/,\s*(Admin:|Analyst:|Viewer:|Management:)/g, '\n$1');
      return {label: formatted};
    }

    if (typeof data === 'object') {
      if (Object.keys(data).length === 0) return {label: NA};

      const keys = Object.keys(data);
      const firstKey = keys[0];
      const innerData = (data as Record<string, unknown>)[firstKey];

      const formatDisplayValue = (value: unknown): string => {
        if (value === null) return 'N/A';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
      };

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

  // =================
  // data
  // =================
  const columns: DataTableColumn<AuditLogType>[] = [
    {
      name: 'log_id',
      title: 'Log ID',
      width: {minWidth: '96px'},
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
      width: {minWidth: '116px'},
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
      width: {minWidth: '116px'},
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
      width: {minWidth: '136px'},
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
      width: {minWidth: '156px'},
      align: 'left',
      render: row => (
        <Badge message={AuditModuleLabel[row.module.id]} color={ModuleBadgeColors[row.module.id] as any} />
      ),
    },
    {
      name: 'action',
      title: 'Action',
      width: {minWidth: alwaysShrink ? '136px' : '200px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-secondary! whitespace-pre-wrap line-clamp-2">
          {getActionLabel(row)}
        </Text>
      ),
    },
    {
      name: 'before',
      title: 'Before',
      width: {minWidth: '176px'},
      align: 'left',
      render: row => {
        const {label, tooltip} = formatAuditData(row.before);
        const isBess = row.platform === 'BESS';

        return isBess ? (
          <div className="relative group">
            <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap cursor-default">
              {label}
            </Text>

            {tooltip && <Tooltip message={tooltip} position="top" portal className="border-[#9ECBC5]! border-2!" />}
          </div>
        ) : (
          <AuditValueCell value={row.before} />
        );
      },
    },
    {
      name: 'after',
      title: 'After',
      width: {minWidth: '176px'},
      align: 'left',
      render: row => {
        const {label, tooltip} = formatAuditData(row.after);
        const isBess = row.platform === 'BESS';

        return isBess ? (
          <div className="relative group">
            <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap cursor-default">
              {label}
            </Text>

            {tooltip && <Tooltip message={tooltip} position="top" portal className="border-[#9ECBC5]! border!" />}
          </div>
        ) : (
          <AuditValueCell value={row.after} />
        );
      },
    },
    {
      name: 'timestamp',
      title: 'Date & Time',
      width: {minWidth: '156px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap">
          {row?.timestamp ? formatDate(row?.timestamp, 'dd MMM yyyy, hh:mm:ss a') : NA}
        </Text>
      ),
    },
  ];

  function fetchAuditLogs() {
    const payload: AuditLogListRequest['params'] = {page, limit: pageSize};
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
    const unsubscribe = subscribe(event => {
      if (Number(event.resource_type) !== 14) return;

      fetchAuditLogs();
    });

    return () => unsubscribe();
  }, [subscribe, page, pageSize, filter]);

  useEffect(() => {
    pendingAuditLogList.current = auditLogsData;

    setShowGhostLoader(true);
    fetchAuditLogs();
  }, [filter, page, pageSize]);

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
      if (!['S-10014'].includes(success)) {
        showToast(getSuccessMessage(success), 'success');
      }
    }
    if (failure) {
      if (!['E-10030', 'E-10014'].includes(failure)) {
        showToast(getErrorMessage(failure), 'error');
      }
      if (failure === 'E-10030') {
        setTableMessage('No records match applied filters');
      }
    }
    return () => {
      dispatch(resetAuditLogMessage());
    };
  }, [success, failure]);

  const GHOST_TABLE_ROWS = Array.from({length: 8}, (_, id) => ({id}));

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <Text variant="subtitle1" className="text-text-primary">
          Monitor user actions, investigate issues, and support compliance
        </Text>
      </div>

      {/* Filters */}
      <FilterGroup
        filterGroupClassName="w-full"
        config={[
          {
            key: 'search',
            placeholder: 'Search by Log ID, User ID, Resource ID',
            type: 'search',
            wrapperClassName: alwaysShrink ? 'w-[calc(66.666%-8px)] shrink-0' : '',
            props: {
              className: alwaysShrink ? 'w-full' : 'w-[300px]',
            },
          },
          {
            key: 'module',
            placeholder: 'Select Module',
            type: 'searchable-select',
            options: MODULE_OPTIONS,
            wrapperClassName: alwaysShrink ? 'w-[calc(33.333%-8px)] shrink-0' : '',
            props: {
              className: alwaysShrink ? 'w-full' : 'w-[240px]',
            },
          },
          {
            key: 'action',
            placeholder: 'Select Action',
            type: 'searchable-select',
            options: ACTION_OPTIONS,
            wrapperClassName: alwaysShrink ? 'w-[calc(33.333%-8px)] shrink-0' : 'flex-1',
            props: {
              className: alwaysShrink ? 'w-full' : 'w-full min-w-[240px]',
            },
          },
          {
            key: 'date_range',
            placeholder: 'Select Date Range',
            type: 'date-range',
            wrapperClassName: alwaysShrink ? 'w-[calc(33.333%-8px)] shrink-0' : '',
            props: {
              className: alwaysShrink ? 'w-full' : 'w-[260px]',
              usePortal: true,
            },
          },
        ]}
        onChange={handleFilterChange}
      />

      <div className="relative w-full flex-1 flex flex-col min-h-0">
        <DataTable
          columns={columns}
          data={auditLogsData}
          totalPages={totalPagesData}
          currentPage={page}
          pageSize={pageSize}
          totalResult={totalResult}
          errorMessage={tableMessage}
          stickyHeader
          loading={showGhostLoader}
          onPageChange={setPage}
          tableHeightWhenScrollable={700}
          ghostRowCount={6}
          hideScrollbarWhenLoading={true}
          collapsibleOnTablet={true}
          tabletVisibleColumns={['log_id', 'user_id', 'module', 'action', 'before', 'after']}
        />
      </div>
    </div>
  );
}
