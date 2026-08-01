import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Images} from '@/assets/images';
import {DataTable, FilterGroup, AssignOrgaznizationModal, ScreenWrapper} from '@/components';
import {Button, Text, Badge, IconButton, Sort} from '@/ui-kits';
import {
  users,
  totalPages,
  userSuccess,
  userFailure,
  totalUserResults,
  allOrganizationsList,
  userLoading,
} from '@/services/redux/selectors';
import {getAllOrganizationsListRequest, resetUserMessage, userListRequest} from '@/services/redux/slice';
import type {User, DataTableColumn, UserListRequest, SortType} from '@/interface';
import {NA, AMD_USER_ROLES, UserRole, STATUS_OPTIONS} from '@/constants';
import {} from '@/utils/getMessages';
import {useToast, useDropdownValues, useWindowDimensions} from '@/hooks';
import {cn, formatDate, getErrorMessage, getSuccessMessage, type ErrorCodes, type SuccessCodes} from '@/utils';

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
  const {width} = useWindowDimensions();
  const pageSize = width < 1025 ? 6 : 10;
  const allOrgs = useDropdownValues({
    fetchAction: getAllOrganizationsListRequest,
    selector: allOrganizationsList,
  });

  // =================
  // selectors
  // =================
  const usersData = useSelector(users).slice(0, pageSize);
  const totalPagesData = useSelector(totalPages);
  const totalResult = useSelector(totalUserResults);
  const success = useSelector(userSuccess) as SuccessCodes;
  const failure = useSelector(userFailure) as ErrorCodes;
  const loading = useSelector(userLoading);

  // =================
  // states
  // =================
  const [page, setPage] = useState(1);
  const [noData, setNoData] = useState(false);
  const [filter, setFilter] = useState<FilterType>({});
  const [tableMessage, setTableMessage] = useState<string>('');
  const [currentSelectUser, setCurrentSelectUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState<false | 'add' | 'edit' | 'delete' | 'assign'>(false);

  // ================
  // functions
  // ================
  const closeModal = () => {
    setModalOpen(false);
    setCurrentSelectUser(null);
  };

  const handleAssign = (_user: User) => {
    setModalOpen('assign');
    setCurrentSelectUser(_user);
  };

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
        <Text variant="caption" className="text-secondary! text-wrap break-words">
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
      name: 'organization',
      title: 'Organization',
      width: {minWidth: '160px'},
      align: 'left',
      render: (row: User) => (
        <Text variant="caption" className={cn(row.organization ? 'text-text-secondary!' : 'text-text-secondary/40!')}>
          {row.organization?.name || 'Not Assigned'}
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
      width: {minWidth: '120px'},
      align: 'left',
      render: row => {
        return (
          <Text
            variant="caption"
            className={cn(
              row.last_activity ? 'text-text-secondary!' : 'text-text-secondary/40!',
              'whitespace-pre-wrap',
            )}>
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
      render: row => (
        <Badge
          size="sm"
          className="w-16"
          message={row.status ? 'Active' : 'Inactive'}
          color={row.status ? 'green' : 'gray'}
        />
      ),
    },
    {
      name: 'actions',
      title: 'Actions',
      width: {minWidth: '90px'},
      align: 'center',
      render: row => (
        <div className="flex items-center justify-center gap-2">
          {row.organization ? (
            <IconButton name="pencil" color="secondary" onClick={() => handleAssign(row)} />
          ) : (
            <Button onClick={() => handleAssign(row)} variant="tertiary">
              Assign
            </Button>
          )}
        </div>
      ),
    },
  ];

  function fetchUsers() {
    const payload: UserListRequest['params'] = {page, limit: pageSize};
    if (filter.search) {
      payload.search = filter.search;
    }
    if (filter.role) {
      payload.role = filter.role;
    }
    if (filter.sort) {
      payload.sort = filter.sort;
    }
    if (filter.platform) {
      payload.platform = [filter.platform];
    }
    if (filter.organization) {
      payload.organization = filter.organization;
    }
    if (filter.status !== undefined && filter.status !== null && typeof filter.status === 'number') {
      payload.status = filter.status === 1 ? true : filter.status === 2 ? false : undefined;
    }
    dispatch(userListRequest(payload));
  }

  // =================
  // side effects
  // =================
  useEffect(() => {
    fetchUsers();
  }, [filter, page, pageSize]);

  useEffect(() => {
    if (success) {
      if (!['S-10005'].includes(success)) {
        showToast(getSuccessMessage(success), 'success');
      }
      // S-10001 -> user added success,
      // S-10002, S-10003, S-1004 -> user updated success,
      // S-10011 -> user deleted successfully,
      // S-10013 -> org assign to user successfully
      if (['S-10001', 'S-10002', 'S-10003', 'S-10004', 'S-10011', 'S-10012', 'S-10013'].includes(success)) {
        // close modal only on add/edit/delete user or assign org to user success
        closeModal();
        fetchUsers();
      }
    }
    if (failure) {
      if (!['E-10014', 'E-10015', 'E-10009'].includes(failure)) {
        showToast(getErrorMessage(failure), 'error');
      }
      if (failure === 'E-10014') {
        setNoData(true);
      }
      if (failure === 'E-10015') {
        setTableMessage(getErrorMessage('E-10016'));
      }
    }
    return () => {
      dispatch(resetUserMessage());
    };
  }, [success, failure]);

  useEffect(() => {
    if (usersData.length > 0) {
      setNoData(false);
    }
  }, [usersData]);

  if (noData) {
    return (
      <ScreenWrapper>
        <div className="flex flex-col items-center justify-center h-full gap-4 py-10">
          <img src={Images.noUser} alt="No Users" className="w-22 opacity-50" />
          <Text variant="h4" className="text-text-secondary! font-InterMedium!">
            No users have been added yet.
          </Text>
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper className="min-h-0" wrapperClassName="min-h-0 p-4 sm:p-6" nestedWrapperClassName="min-h-0">
      <div className="flex flex-col gap-6 h-full min-h-0">
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
              placeholder: 'All Roles',
              type: 'select',
              options: AMD_USER_ROLES,
              props: {
                className: 'min-w-[130px]',
              },
            },
            {
              key: 'organization',
              placeholder: 'All Organizations',
              type: 'select',
              options: allOrgs,
              props: {
                className: 'min-w-[170px]',
              },
            },
            {
              key: 'status',
              placeholder: 'All Status',
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
        <div className="relative w-full flex flex-col shrink min-h-0 [&>div]:gap-4">
          <DataTable
            columns={columns}
            data={usersData}
            collapsibleOnTablet
            tabletVisibleColumns={['user_id', 'name', 'role', 'organization', 'status', 'actions']}
            totalPages={totalPagesData}
            currentPage={page}
            pageSize={pageSize}
            totalResult={totalResult}
            errorMessage={tableMessage}
            onPageChange={setPage}
            loading={loading}
            ghostRowCount={6}
            stickyHeader
          />
        </div>

        {modalOpen === 'assign' && currentSelectUser && (
          <AssignOrgaznizationModal
            currentSelectUser={currentSelectUser}
            open={modalOpen == 'assign'}
            onClose={closeModal}
          />
        )}
      </div>
    </ScreenWrapper>
  );
}
