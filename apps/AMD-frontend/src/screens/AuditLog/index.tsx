import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DataTable, FilterGroup, ScreenWrapper} from '@/components';
import {Badge, Text, Tooltip} from '@/ui-kits';
import type {AuditLog, AuditLogListRequest, DataTableColumn, SelectInputItem} from '@/interface';
import {
  AMD_USER_ROLES,
  NA,
  APDAuditLogModules,
  APDAuditLogScenario,
  AuditModuleLabel,
  ModuleBadgeColors,
  AuditActionLabel,
  UserRole,
  AuditLogModuleLabels,
} from '@/constants';
import {useToast} from '@/hooks';
import {
  enumToSelectOptionsWithValue,
  formatDate,
  getErrorMessage,
  getSuccessMessage,
  type ErrorCodes,
  type SuccessCodes,
} from '@/utils';
import {format, isValid} from 'date-fns';
import {auditLogListRequest, resetAuditLogMessage} from '@/services/redux/slice';
import {
  auditLogCurrentPage,
  auditLogFailure,
  auditLogs,
  auditLogSuccess,
  auditLogTotalPages,
  totalAuditLogResults,
} from '@/services/redux/selectors';

/**
 * Page Size for pagination - 100 records per page as per requirements
 */
const PAGE_SIZE = 100;

/**
 * Role options for dropdown
 */
const ROLE_OPTIONS = AMD_USER_ROLES.filter(item => item.id !== UserRole.Admin);

/**
 * Module options for dropdown
 */
const MODULE_OPTIONS: SelectInputItem[] = enumToSelectOptionsWithValue(APDAuditLogModules, AuditLogModuleLabels);

/**
 * Action options for dropdown
*/
const ACTION_OPTIONS: SelectInputItem[] = enumToSelectOptionsWithValue(APDAuditLogScenario, AuditActionLabel);


/**
 * Filter type for audit log filtering
 */
type FilterType = {
  search?: string;
  log_id?: string;
  role?: UserRole;
  module?: APDAuditLogModules;
  action?: APDAuditLogScenario;
  start_date?: string;
  end_date?: string;
  date_range?: {
    start: Date | null;
    end: Date | null;
  };
};

type AuditValue = AuditLog['before'];
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

function stringifyAuditValue(raw: unknown) {
  if (raw == null) return '-';
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
  /**
   * ==================================
   * Derived State
   * ==================================
   */
  const formatted = formatAuditValue(value);

  /**
   * ==================================
   * Functions
   * ==================================
   */

  function formatAuditValue(value: AuditValue): AuditValueDisplay {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? {preview: normalizePreviewText(trimmed), entries: [{value: trimmed}]} : null;
    }

    if (isPlainObject(value)) {
      const entries = Object.entries(value)
        .map(([key, raw]) => ({
          key,
          value: stringifyAuditValue(raw),
        }))
        .filter(entry => Boolean(entry.key));

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

  /**
   * ==================================
   * Gaurd Render
   * ==================================
   */
  if (!formatted) {
    return (
      <Text variant="caption" className="text-text-secondary!">
        {NA}
      </Text>
    );
  }

  /**
   * ==================================
   * Render
   * ==================================
   */
  return (
    <div className="group relative max-w-full min-w-0">
      <Text variant="caption" className="max-w-full truncate text-text-secondary! block">
        {formatted.preview}
      </Text>

      <Tooltip
        portal
        position="bottom"
        content={
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
        className="max-w-96 whitespace-normal"
      />
    </div>
  );
}

export function AuditLog() {
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
  const currentPage = useSelector(auditLogCurrentPage);
  const totalResult = useSelector(totalAuditLogResults);
  const success = useSelector(auditLogSuccess) as SuccessCodes;
  const failure = useSelector(auditLogFailure) as ErrorCodes;

  // =================
  // states
  // =================
  const [page, setPage] = useState(1);
  const [tableMessage, setTableMessage] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>({});
  const [isInvalidSearch, setInvalidSearch] = useState<boolean>(false);

  const tableData = isInvalidSearch ? [] : auditLogsData;



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

    const newFilter: FilterType = {
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

  // =================
  // data
  // =================
  const columns: DataTableColumn<AuditLog>[] = [
    {
      name: 'log_id',
      title: 'Log ID',
      width: {minWidth: '80px'},
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
      width: {minWidth: '100px'},
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
      width: {minWidth: '100px'},
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
      width: {minWidth: '100px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.resource_id}
        </Text>
      ),
    },
    {
      name: 'module',
      title: 'Module',
      width: {minWidth: '180px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          <Badge message={AuditModuleLabel[row.module.id]} color={ModuleBadgeColors[row.module.id] as any} />
        </Text>
      ),
    },
    {
      name: 'action',
      title: 'Action',
      width: {minWidth: '100px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {AuditActionLabel[row.action.id] || NA}
        </Text>
      ),
    },
    {
      name: 'before',
      title: 'Before',
      width: {minWidth: '150px', maxWidth: '300px'},
      align: 'left',
      render: row => <AuditValueCell value={row.before} />,
    },
    {
      name: 'after',
      title: 'After',
      width: {minWidth: '150px', maxWidth: '300px'},
      align: 'left',
      render: row => <AuditValueCell value={row.after} />,
    },
    {
      name: 'timestamp',
      title: 'Date & Time',
      width: {minWidth: '150px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap">
          {row?.timestamp ? formatDate(row?.timestamp, 'dd-MMM-yyyy, hh:mm a') : NA}
        </Text>
      ),
    },
  ];

  function fetchAuditLogs() {
    const payload: AuditLogListRequest['params'] = {page, limit: PAGE_SIZE};
    if (filter.search) {
      payload.search = filter.search;
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
    fetchAuditLogs();
  }, [filter, page]);

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

  return (
    <ScreenWrapper>
      <div className="flex flex-col gap-6 p-4">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <Text variant="subtitle1" className="text-text-primary">
            Track detailed audit logs with before/after changes for all actions performed across APD environment.
          </Text>
        </div>

        {/* Filters */}
        <FilterGroup
          config={[
            {
              key: 'search',
              placeholder: 'Search by Log ID, User ID',
              type: 'search',
              props: {className: 'min-w-40'},
            },
            {
              key: 'role',
              placeholder: 'Select Role',
              type: 'select',
              options: ROLE_OPTIONS,
              props: {className: 'min-w-38'},
            },
            {
              key: 'module',
              placeholder: 'Select Module',
              type: 'searchable-select',
              options: MODULE_OPTIONS,
              props: {
                className: 'min-w-50',
                onInvalidSearchChange: setInvalidSearch,
              },
            },
            {
              key: 'action',
              placeholder: 'Select Action',
              type: 'searchable-select',
              options: ACTION_OPTIONS,
              props: {
                className: 'min-w-38',
                onInvalidSearchChange: setInvalidSearch,
              },
            },
            {
              key: 'date_range',
              type: 'date-range',
              placeholder: 'Select Date',
              props: {
                calendarClassName: 'left-1/2 -translate-x-1/2',
              },
            },
          ]}
          onChange={handleFilterChange}
        />

        {/* Table */}
        <DataTable
          columns={columns}
          data={tableData}
          totalPages={totalPagesData}
          currentPage={currentPage}
          totalResult={totalResult}
          errorMessage={tableMessage}
          onPageChange={setPage}
          stickyHeader
        />
      </div>
    </ScreenWrapper>
  );
}
