import {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Images} from '@/assets/images';
import {Text, Badge, Sort} from '@/ui-kits';
import {users, totalPages, userSuccess, userFailure, totalUserResults, currentUserPage, userLoading} from '@/services/redux/selectors';
import {resetUserMessage, userListRequest} from '@/services/redux/slice';
import type {User, DataTableColumn, UserListRequest, SortType} from '@/interface';
import {NA, USER_ROLES, UserRole, STATUS_OPTIONS} from '@/constants';
import {getErrorMessage, getSuccessMessage, type ErrorCodes, type SuccessCodes} from '@/utils/getMessages';
import {useToast} from '@/hooks';
import {cn} from '@/utils/common-functions';
import {formatDate} from '@/utils';
import {DataTable, FilterGroup} from '@/components';

/**
 * Page Size for pagination
 */
const PAGE_SIZE = 10;
/**
 * Filter type for user list filtering
 */
type FilterType = {
  search?: string;
  role?: UserRole;
  platform?: number;
  status?: number;
  organization?: number;
  sort?: SortType;
};

export function UserManagement() {
  // =================
  // hooks
  // =================
  const dispatch = useDispatch();
  const {showToast} = useToast();

  // =================
  // selectors
  // =================
  const userListData = useSelector(users);
  const usersData = userListData.slice(0, PAGE_SIZE);
  const totalPagesData = useSelector(totalPages);
  const totalResult = useSelector(totalUserResults);
  const currentPage = useSelector(currentUserPage);
  const isLoading = useSelector(userLoading);
  const success = useSelector(userSuccess) as SuccessCodes;
  const failure = useSelector(userFailure) as ErrorCodes;

  // =================
  // states
  // =================
  const [page, setPage] = useState(1);
  const [showGhostLoader, setShowGhostLoader] = useState(true);
  const hasObservedLoading = useRef(false);
  const pendingUserList = useRef<typeof userListData | null>(null);
  const [noData, setNoData] = useState(false);
  const [filter, setFilter] = useState<FilterType>({});
  const [tableMessage, setTableMessage] = useState<string>('');

  const normalizedStatus = filter.status !== undefined && filter.status !== null ? Number(filter.status) : undefined;

  const hasActiveFilters = Boolean(filter.search || filter.role || normalizedStatus !== undefined);

  function handleSort(sort: SortType) {
    setFilter(p => ({...p, sort}));
  }

  // =================
  // data
  // =================
  const columns: DataTableColumn<User>[] = [
    {
      name: 'user_id',
      title: 'User ID',
      width: {minWidth: '90px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.user_id}
        </Text>
      ),
    },
    {
      name: 'name',
      title: 'Name',
      width: {minWidth: '140px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-secondary! text-wrap! break-all">
          {row.name}
        </Text>
      ),
    },
    {
      name: 'email',
      title: 'Email',
      width: {minWidth: '200px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.email}
        </Text>
      ),
    },
    {
      name: 'role',
      title: 'Role',
      width: {minWidth: '110px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-secondary!">
          {UserRole[row.role]}
        </Text>
      ),
    },
    {
      name: 'last_login',
      title: (
        <div className="flex items-center gap-1">
          <Text variant="caption">Last Login</Text>
          <Sort sort={filter.sort ?? null} onSortChange={handleSort} />
        </div>
      ),
      width: {minWidth: '90px'},
      align: 'left',
      render: row => {
        return (
          <Text variant="caption" className={cn(row.last_activity ? 'text-text-secondary!' : 'text-text-secondary/40!', 'whitespace-pre-wrap')}>
            {formatDate(row.last_activity, "dd-MMM-yyyy, '\n'hh:mm a") || NA}
          </Text>
        );
      },
    },
    {
      name: 'status',
      title: 'Status',
      width: {minWidth: '90px'},
      align: 'left',
      render: row => <Badge size="sm" className="w-16" message={row.status ? 'Active' : 'Inactive'} color={row.status ? 'green' : 'gray'} />,
    },
  ];

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
    const payload: UserListRequest['params'] = {page, limit: PAGE_SIZE};
    if (filter.search) {
      payload.search = filter.search;
    }
    if (filter.role) {
      payload.role = filter.role;
    }
    if (normalizedStatus !== undefined) {
      payload.status = normalizedStatus === 1 ? true : normalizedStatus === 2 ? false : undefined;
    }
    if (filter.sort) {
      payload.sort = filter.sort;
    }
    pendingUserList.current = userListData;
    // Don't show ghost loader for sorting
    if (!filter.sort) {
      setShowGhostLoader(true);
    }
    dispatch(userListRequest(payload));
  }, [filter, page, normalizedStatus]);

  useEffect(() => {
    if (pendingUserList.current !== userListData) {
      pendingUserList.current = null;
      hasObservedLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [userListData]);

  useEffect(() => {
    if (hasObservedLoading.current && (success || failure)) {
      hasObservedLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [success, failure]);

  useEffect(() => {
    if (success) {
      if (!['S-20001'].includes(success)) {
        showToast(getSuccessMessage(success), 'success');
      }
    }
    if (failure) {
      if (!['E-20006', 'E-20005'].includes(failure)) {
        showToast(getErrorMessage(failure), 'error');
      }
      if (failure === 'E-20006') {
        if (hasActiveFilters) {
          setTableMessage(getErrorMessage('E-20011'));
          setNoData(false);
        } else {
          setNoData(true);
        }
      }
      if (failure === 'E-20005') {
        setTableMessage(getErrorMessage('E-20011'));
      }
    }
    return () => {
      dispatch(resetUserMessage());
    };
  }, [success, failure, hasActiveFilters]);

  useEffect(() => {
    if (usersData.length > 0) {
      setNoData(false);
      setTableMessage('');
    }
  }, [usersData]);

  if (noData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-10">
        <img src={Images.noUser} alt="No Users" className="w-22 opacity-50" />
        <Text variant="h4" className="text-text-secondary! font-InterMedium!">
          No users have been added yet.
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Text variant="subtitle1" className="text-text-primary">
          Manage user accounts, roles, and access.
        </Text>
      </div>

      {/* Search & Filters */}
      <FilterGroup
        config={[
          {
            key: 'search',
            placeholder: 'Search by ID, name or email...',
            type: 'search',
            props: {
              className: 'min-w-[300px]',
            },
          },
          {
            key: 'role',
            placeholder: 'Select Role',
            type: 'select',
            options: USER_ROLES,
            props: {
              className: 'min-w-[130px]',
            },
          },
          {
            key: 'status',
            placeholder: 'Status',
            type: 'select',
            options: STATUS_OPTIONS,
            props: {
              className: 'min-w-[130px]',
            },
          },
        ]}
        onChange={setFilter}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={usersData}
        totalPages={totalPagesData}
        currentPage={currentPage}
        totalResult={totalResult}
        errorMessage={tableMessage}
        onPageChange={setPage}
        stickyHeader
        loading={showGhostLoader}
        ghostRowCount={6}
        tableHeightWhenScrollable={700}
      />
    </div>
  );
}
