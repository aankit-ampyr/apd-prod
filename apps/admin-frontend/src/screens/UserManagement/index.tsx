import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Images} from '@/assets/images';
import {DataTable, DeleteUserModal, FilterGroup, UserEntryModal} from '@/components';
import {Button, Text, Badge, IconButton, Sort, Icon} from '@/ui-kits';
import {
  users,
  totalPages,
  userSuccess,
  userFailure,
  totalUserResults,
  currentUserPage,
} from '@/services/redux/selectors';
import {resetUserMessage, userListRequest} from '@/services/redux/slice';
import type {User, DataTableColumn, UserListRequest, SelectInputItem, SortType} from '@/interface';
import {
  NA,
  Platform,
  PLATFORM_LABELS,
  AMD_USER_ROLES,
  BESS_USER_ROLES,
  UserRole,
  STATUS_OPTIONS,
  TABLET_SCREEN_BREAKPOINT,
  USER_ROLE_LABELS,
} from '@/constants';
import {useToast, useWindowDimensions} from '@/hooks';
import {
  cn,
  enumToSelectOptions,
  formatDate,
  getErrorMessage,
  getSuccessMessage,
  type ErrorCodes,
  type SuccessCodes,
} from '@/utils';

/**
 * Platform labels and options
 */
const BOTH_PLATFORM = 3;
const PLATFORM_OPTIONS: SelectInputItem[] = [
  ...enumToSelectOptions(Platform, PLATFORM_LABELS),
  {id: BOTH_PLATFORM, label: `APD & PSP`},
];

const ALL_ROLES = enumToSelectOptions(UserRole, USER_ROLE_LABELS);

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

  // =================
  // selectors
  // =================
  const baseUsers = useSelector(users);
  const totalPagesData = useSelector(totalPages);
  const currentPage = useSelector(currentUserPage);
  const totalResult = useSelector(totalUserResults);
  const success = useSelector(userSuccess) as SuccessCodes;
  const failure = useSelector(userFailure) as ErrorCodes;

  // =================
  // states
  // =================
  const [page, setPage] = useState(1);
  const usersData = baseUsers;
  const [noData, setNoData] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
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

  const handleEdit = (_user: User) => {
    setModalOpen('edit');
    setCurrentSelectUser(_user);
  };

  const handleDelete = (_user: User) => {
    setModalOpen('delete');
    setCurrentSelectUser(_user);
  };

  const UserRoleOptions = () => {
    if (filter?.platform === Platform.APD) {
      return AMD_USER_ROLES;
    }
    if (filter.platform === Platform.PSP) {
      return BESS_USER_ROLES;
    }
    if (filter?.platform === BOTH_PLATFORM) {
      // since APD user roles are common in both APD itself as well as PSP
      return AMD_USER_ROLES;
    }
    return ALL_ROLES;
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
      name: 'platform',
      title: 'Platform',
      width: {minWidth: '160px'},
      align: 'left',
      render: row => {
        let label = '-';
        if (row.role !== UserRole.SuperAdmin) {
          label = row.platform ? row.platform.map(p => PLATFORM_LABELS[p]).join(' & ') : NA;
        }
        return (
          <Text variant="caption" className="text-text-secondary!">
            {label}
          </Text>
        );
      },
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
        <div className="flex items-center gap-1 whitespace-nowrap">
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
      title: (
        <div className="flex items-center justify-center gap-2">
          <Text variant="caption">Actions</Text>
        </div>
      ),
      width: {minWidth: '90px'},
      align: 'center',
      render: row => {
        if (row.role === UserRole.SuperAdmin) {
          return <Text variant='14M'>-</Text>;
        }
        return (
          <div className="flex items-center justify-center gap-4">
            <IconButton name="pencil" color="secondary" onClick={() => handleEdit(row)} />
            <IconButton name="trash" color="error" onClick={() => handleDelete(row)} />
          </div>
        );
      },
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
      let platform = [];
      if (filter.platform === BOTH_PLATFORM) {
        platform = [Platform.APD, Platform.PSP];
      } else {
        platform = [filter.platform];
      }

      payload.platform = platform;
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

  const AddUserCTA = () => {
    return (
      <Button onClick={() => setModalOpen('add')} leftIcon="user-plus" className="flex items-center gap-2">
        Add User
      </Button>
    );
  };

  if (noData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-10">
        <img src={Images.noUser} alt="No Users" className="w-22 opacity-50" />
        <Text variant="h4" className="text-text-secondary! font-InterMedium!">
          No users have been added yet.
        </Text>
        <AddUserCTA />

        {(modalOpen == 'add' || modalOpen == 'edit') && (
          <UserEntryModal
            open={modalOpen == 'add' || modalOpen == 'edit'}
            variant={modalOpen}
            currentSelectUser={currentSelectUser}
            onClose={closeModal}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 overflow-hidden shrink-0">
        <Text variant="subtitle2" className="text-text-primary truncate">
          Manage user accounts, roles, and access.
        </Text>
        <AddUserCTA />
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
            key: 'platform',
            placeholder: 'Select Platform',
            type: 'select',
            options: PLATFORM_OPTIONS,
            props: {
              className: 'min-w-[170px]',
            },
          },
          {
            key: 'role',
            placeholder: 'Select Role',
            type: 'select',
            options: UserRoleOptions(),
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
      <div className="relative w-full flex-1 flex flex-col min-h-0">
        {width <= TABLET_SCREEN_BREAKPOINT && (
          <div className="absolute top-7 -right-3.5 -translate-y-1/2 z-20">
            <button
              onClick={() => setIsTableExpanded(!isTableExpanded)}
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <Icon
                name={isTableExpanded ? 'expand-admin-users-table-compress' : 'expand-admin-users-table-compressed'}
                size={34}
                className="text-primary!"
              />
            </button>
          </div>
        )}
        <DataTable
          columns={columns.filter(col => {
            if (!isTableExpanded && width <= TABLET_SCREEN_BREAKPOINT) {
              return col.name !== 'email' && col.name !== 'last_login';
            }
            return true;
          })}
          data={usersData}
          totalPages={totalPagesData}
          currentPage={page}
          pageSize={pageSize}
          totalResult={totalResult}
          errorMessage={tableMessage}
          onPageChange={setPage}
        />
      </div>

      {(modalOpen == 'add' || modalOpen == 'edit') && (
        <UserEntryModal
          open={modalOpen == 'add' || modalOpen == 'edit'}
          variant={modalOpen}
          currentSelectUser={currentSelectUser}
          onClose={closeModal}
        />
      )}

      {modalOpen == 'delete' && currentSelectUser && (
        <DeleteUserModal open={modalOpen == 'delete'} onClose={closeModal} currentSelectUser={currentSelectUser} />
      )}
    </div>
  );
}
