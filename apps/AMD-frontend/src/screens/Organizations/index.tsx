import {useToast, useWindowDimensions} from '@/hooks';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Images} from '@/assets/images';
import {Button, Text, Badge, IconButton, Sort} from '@/ui-kits';
import {
  organizationList,
  organizationTotalPages,
  organizationSuccess,
  organizationError,
  organizationTotalResults,
  organizationLoading,
} from '@/services/redux/selectors';
import {resetOrganizationMessage, organizationListRequest} from '@/services/redux/slice';
import type {Organization, DataTableColumn, OrganizationListRequest, SortType} from '@/interface';
import {NA, STATUS_OPTIONS} from '@/constants';
import {getErrorMessage, getSuccessMessage, type ErrorCodes, type SuccessCodes, formatDate} from '@/utils';
import {DataTable, FilterGroup, OrganizationEntry, ScreenWrapper} from '@/components';

/**
 * Filter type for user list filtering
 */
type FilterType = {
  search?: string;
  status?: number;
  sort?: SortType;
};

export function Organizations() {
  // =================
  // hooks
  // =================
  const dispatch = useDispatch();
  const {showToast} = useToast();

  // =================
  // selectors
  // =================
  const {width} = useWindowDimensions();
  const pageSize = width < 1025 ? 6 : 10;
  const organizations = useSelector(organizationList).slice(0, pageSize);
  const totalPages = useSelector(organizationTotalPages);
  const totalResult = useSelector(organizationTotalResults);
  const success = useSelector(organizationSuccess) as SuccessCodes;
  const failure = useSelector(organizationError) as ErrorCodes;
  const isLoading = useSelector(organizationLoading);

  // =================
  // states
  // =================
  const [filter, setFilter] = useState<FilterType>({});
  const [noData, setNoData] = useState(false);
  const [tableMessage, setTableMessage] = useState<string>('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState<false | 'add' | 'edit'>(false);
  const [currentSelectOrganization, setCurrentSelectOrganization] = useState<Organization | null>(null);

  // ================
  // functions
  // ================
  function editOrganization(org: Organization) {
    setCurrentSelectOrganization(org);
    setModalOpen('edit');
  }

  function closeModal() {
    setModalOpen(false);
    setCurrentSelectOrganization(null);
  }

  function handleSort(sort: SortType) {
    setFilter(p => ({...p, sort}));
  }

  // =================
  // data
  // =================
  const columns: DataTableColumn<Organization>[] = [
    {
      name: 'org_id',
      title: 'Org ID',
      width: {minWidth: '90px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.org_id}
        </Text>
      ),
    },
    {
      name: 'organization_name',
      title: 'Organization Name',
      width: {minWidth: '90px'},
      align: 'left',
      render: row => (
        <Text variant="caption2" className="text-text-primary!">
          {row.name}
        </Text>
      ),
    },
    {
      name: 'created_at',
      title: (
        <div className="flex items-center gap-1">
          <Text variant="caption">Created On</Text>
          <Sort sort={filter.sort ?? null} onSortChange={handleSort} />
        </div>
      ),
      width: {minWidth: '90px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.created_at ? formatDate(row.created_at, 'dd-MMM-yyyy, hh:mm a') : NA}
        </Text>
      ),
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
      render: row => <IconButton name="pencil" color="secondary" onClick={() => editOrganization(row)} />,
    },
  ];

  // =========================
  // side effects
  // =========================
  useEffect(() => {
    const payload: OrganizationListRequest['params'] = {page, limit: pageSize};
    if (filter.search) {
      payload.search = filter.search;
    }
    if (filter.status !== undefined && filter.status !== null && typeof filter.status === 'number') {
      payload.status = filter.status === 1 ? true : filter.status === 2 ? false : undefined;
    }
    if (filter.sort) {
      payload.sort = filter.sort;
    }
    dispatch(organizationListRequest(payload));
  }, [filter, page, pageSize]);

  useEffect(() => {
    if (success) {
      if (!['S-10006'].includes(success)) {
        showToast(getSuccessMessage(success), 'success');
      }
      // success
      if (['S-10007', 'S-10008', 'S-10009', 'S-10010'].includes(success)) {
        // close modal only on add/edit user success
        closeModal();
      }
    }
    if (failure) {
      if (!['E-10014', 'E-10015', 'E-10019'].includes(failure)) {
        showToast(getErrorMessage(failure), 'error');
      }
      if (failure === 'E-10014') {
        setNoData(true);
      }
      if (failure === 'E-10015') {
        setTableMessage(getErrorMessage('E-10017'));
      }
    }
    return () => {
      dispatch(resetOrganizationMessage());
    };
  }, [success, failure]);

  useEffect(() => {
    if (organizations.length > 0) {
      setNoData(false);
    }
  }, [organizations]);

  if (noData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-10">
        <img src={Images.noOrganization} alt="No Organizations" className="w-34 opacity-50" />
        <Text variant="h4" className="text-text-secondary! font-InterMedium!">
          No organizations have been added yet.
        </Text>
        <Button onClick={() => setModalOpen('add')} leftIcon="plus" className="flex items-center gap-2">
          Add Organization
        </Button>

        {(modalOpen == 'add' || modalOpen == 'edit') && (
          <OrganizationEntry
            open={modalOpen === 'add' || modalOpen === 'edit'}
            onClose={closeModal}
            variant={modalOpen}
            currentSelectOrganization={currentSelectOrganization}
          />
        )}
      </div>
    );
  }

  return (
    <ScreenWrapper className="min-h-0" wrapperClassName="min-h-0 p-4 sm:p-6" nestedWrapperClassName="min-h-0">
      <div className="flex flex-col gap-6 h-full min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Text variant="subtitle1" className="text-text-primary">
            Manage organizations and their status across the platform.
          </Text>
          <Button onClick={() => setModalOpen('add')} leftIcon="plus" className="flex items-center gap-2">
            Add Organization
          </Button>
        </div>

        <FilterGroup
          config={[
            {
              key: 'search',
              placeholder: 'Search by ID, name',
              type: 'search',
              props: {
                className: 'min-w-[300px]',
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
        <div className="relative w-full flex flex-col shrink min-h-0 [&>div]:gap-4">
          <DataTable
            columns={columns}
            data={organizations}
            totalPages={totalPages}
            currentPage={page}
            pageSize={pageSize}
            totalResult={totalResult}
            onPageChange={setPage}
            errorMessage={tableMessage}
            stickyHeader
            loading={isLoading}
            ghostRowCount={6}
          />
        </div>

        {(modalOpen == 'add' || modalOpen == 'edit') && (
          <OrganizationEntry
            open={modalOpen === 'add' || modalOpen === 'edit'}
            onClose={closeModal}
            variant={modalOpen}
            currentSelectOrganization={currentSelectOrganization}
          />
        )}
      </div>
    </ScreenWrapper>
  );
}
