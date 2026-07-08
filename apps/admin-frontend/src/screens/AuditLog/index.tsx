import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DataTable, FilterGroup} from '@/components';
import {Badge, Text} from '@/ui-kits';
import {
  auditLogs,
  auditLogTotalPages,
  auditLogSuccess,
  auditLogFailure,
  totalAuditLogResults,
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
import {useToast} from '@/hooks';
import {
  enumToSelectOptions,
  formatDate,
  getErrorMessage,
  getSuccessMessage,
  type ErrorCodes,
  type SuccessCodes,
} from '@/utils';
import {format, isValid} from 'date-fns';

/**
 * Page Size for pagination - 100 records per page as per requirements
 */
const PAGE_SIZE = 100;

/**
 * Role options for dropdown
 */
const ROLE_OPTIONS = BESS_USER_ROLES;

/**
 * Module options for dropdown
 */
const MODULE_OPTIONS: SelectInputItem[] = enumToSelectOptions(AuditLogModules, AuditModuleLabel);

/**
 * Action options for dropdown
 */
const ACTION_OPTIONS: SelectInputItem[] = enumToSelectOptions(AuditLogScenario, AuditActionLabel);

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
  const success = useSelector(auditLogSuccess) as SuccessCodes;
  const failure = useSelector(auditLogFailure) as ErrorCodes;

  // =================
  // states
  // =================
  const [page, setPage] = useState(1);
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

  const formatAuditData = (data?: string) => {
    if (!data) return NA;

    let formatted = data;

    // Convert boolean status to Active/Inactive
    formatted = formatted.replace(/\bstatus:\s*false\b/gi, 'Status: Inactive');
    formatted = formatted.replace(/\bstatus:\s*true\b/gi, 'Status: Active');

    // Convert lowercase keys to proper casing based on mockups
    formatted = formatted.replace(/(^|,\s*)name:/gi, '$1Project Name:');
    formatted = formatted.replace(/(^|,\s*)description:/gi, '$1Description:');
    formatted = formatted.replace(/(^|,\s*)status:/gi, '$1Status:');

    // Replace commas with newlines for key properties to match the multiline mockup layout
    // Use a negative lookahead to prevent matching commas inside the "Assigned users -" list
    formatted = formatted.replace(
      /,\s*(Project Name:|Description:|Status:|Responsible User:|Assigned users -)/gi,
      '\n$1',
    );

    // Show assigned-user audit values one role per line for easier reading
    formatted = formatted.replace(/Assigned users -\s*/gi, 'Assigned users -\n');
    formatted = formatted.replace(/,\s*(Admin:|Analyst:|Viewer:|Management:)/g, '\n$1');

    return formatted;
  };

  const getActionLabel = (row: AuditLogType) => {
    if (row.action.id === AuditLogScenario.PROJECT_REASSIGNED || row.action.id === AuditLogScenario.PROJECT_EDITED) {
      return 'Project Updated'; // As per the design photo
    }
    return AuditActionLabel[row.action.id] || NA;
  };

  // =================
  // data
  // =================
  const columns: DataTableColumn<AuditLogType>[] = [
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
      width: {minWidth: '180px'},
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
      width: {minWidth: '180px'},
      align: 'left',
      render: row => (
        <Badge message={AuditModuleLabel[row.module.id]} color={ModuleBadgeColors[row.module.id] as any} />
      ),
    },
    {
      name: 'action',
      title: 'Action',
      width: {minWidth: '100px'},
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
      width: {minWidth: '200px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap">
          {formatAuditData(String(row?.before))}
        </Text>
      ),
    },
    {
      name: 'after',
      title: 'After',
      width: {minWidth: '200px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary! whitespace-pre-wrap">
          {formatAuditData(String(row?.after))}
        </Text>
      ),
    },
    {
      name: 'timestamp',
      title: 'Date & Time',
      width: {minWidth: '150px'},
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
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <Text variant="subtitle1" className="text-text-primary">
          Monitor user actions, investigate issues, and support compliance
        </Text>
      </div>

      {/* Filters */}
      <FilterGroup
        config={[
          {
            key: 'search',
            placeholder: 'Search by Log ID, User ID, Resource ID',
            type: 'search',
            props: {className: 'min-w-40'},
          },
          // {
          //   key: 'role',
          //   placeholder: 'Select Role',
          //   type: 'select',
          //   options: ROLE_OPTIONS,
          //   props: {className: 'min-w-38'},
          // },
          {
            key: 'module',
            placeholder: 'Select Module',
            type: 'searchable-select',
            options: MODULE_OPTIONS,
            props: {className: 'min-w-50'},
          },
          {
            key: 'action',
            placeholder: 'Select Action',
            type: 'searchable-select',
            options: ACTION_OPTIONS,
            props: {className: 'min-w-60'},
          },
          {
            key: 'date_range',
            placeholder: 'Select Date Range',
            type: 'date-range',
            props: {
              className: 'max-w-[260px]',
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
        pageSize={PAGE_SIZE}
        totalResult={totalResult}
        errorMessage={tableMessage}
        onPageChange={setPage}
        stickyHeader
      />
    </div>
  );
}
