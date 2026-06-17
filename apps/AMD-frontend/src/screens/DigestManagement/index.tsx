import {DataTable, FilterGroup, ScreenWrapper} from '@/components';
import {AddEditDigestion} from '@/components/DigestManagement/AddEditDigestion';
import {useToast} from '@/hooks';
import {getErrorMessage, getSuccessMessage, type ErrorCodes, type SuccessCodes} from '@/utils/getMessages';
import type {Digest, DataTableColumn, DigestListRequest} from '@/interface';
import {DIGEST_FREQUENCY, DIGEST_SCOPE, DigestScopeBadgeColors, STATUS_OPTIONS} from '@/constants';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Badge, Button, IconButton, Text} from '@/ui-kits';
import {
  digestCurrentPage,
  digestError,
  digestList,
  digestLoading,
  digestSuccess,
  digestTotalPages,
  digestTotalResults,
} from '@/services/redux/selectors';
import {digestListRequest, resetDigestMessage} from '@/services/redux/slice';
import {capitalize, getOrdinal} from '@/utils';

/**
 * Page size for pagination
 */
const PAGE_SIZE = 10;

type FilterType = {
  search?: string;
  scope?: number;
  frequency?: number;
  status?: number;
};

export function DigestManagement() {
  const dispatch = useDispatch();
  const {showToast} = useToast();

  const [modalOpen, setModalOpen] = useState<false | 'add' | 'edit'>(false);
  const [currentSelectDigest, setCurrentSelectDigest] = useState<Digest | null>(null);

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>({});
  const [noData, setNoData] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [expandedAppliedRow, setExpandedAppliedRow] = useState<number | null>(null);

  const digestsData = useSelector(digestList);
  const totalPages = useSelector(digestTotalPages);
  const currentPage = useSelector(digestCurrentPage);
  const totalResult = useSelector(digestTotalResults);
  const isLoading = useSelector(digestLoading);

  const success = useSelector(digestSuccess) as SuccessCodes;
  const failure = useSelector(digestError) as ErrorCodes;

  const columns: DataTableColumn<Digest>[] = [
    {
      name: 'digest_id',
      title: 'Digest ID',
      width: {minWidth: '110px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.digest_id}
        </Text>
      ),
    },
    {
      name: 'name',
      title: 'Digest Name',
      width: {minWidth: '230px'},
      align: 'left',
      render: row => (
        <Text variant="caption2" className="text-secondary! wrap-break-word">
          {row.name}
        </Text>
      ),
    },
    {
      name: 'scope',
      title: 'Scope',
      width: {minWidth: '180px'},
      align: 'left',
      render: row => (
        <Badge
          size="sm"
          message={capitalize(row.scope.label || '')}
          color={DigestScopeBadgeColors[row.scope.id] as any}
        />
      ),
    },
    {
      name: 'applied_to',
      title: 'Applies to',
      width: {minWidth: '180px'},
      align: 'left',
      render: row => {
        if (!row.resources || row.resources.length === 0) {
          return (
            <Text variant="caption2" className="text-secondary!">
              All
            </Text>
          );
        }

        const isExpanded = expandedAppliedRow === row.id;
        const resourcesToShow = isExpanded ? row.resources : row.resources.slice(0, 2);

        return (
          <div className="flex flex-col gap-1">
            {resourcesToShow.map((resource, index) => {
              const isSecond = index === 1;
              const hasMore = row.resources.length > 2;

              return (
                <div key={resource.id} className="flex items-center gap-2">
                  <div className="bg-gray-100 px-2 py-1 rounded w-fit">
                    <Text variant="small">{resource.name}</Text>
                  </div>

                  {/* +X badge */}
                  {!isExpanded && isSecond && hasMore && (
                    <span
                      className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded cursor-pointer"
                      onClick={() => setExpandedAppliedRow(prev => (prev === row.id ? null : row.id))}>
                      +{row.resources.length - 2}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Show less */}
            {isExpanded && row.resources.length > 2 && (
              <button
                className="text-xs text-primary cursor-pointer hover:underline w-fit"
                onClick={() => setExpandedAppliedRow(null)}>
                Show less
              </button>
            )}
          </div>
        );
      },
    },
    {
      name: 'frequency',
      title: 'Frequency',
      width: {minWidth: '150px'},
      align: 'left',
      render: row => (
        <Text variant="caption2" className="text-text-secondary!">
          {capitalize(row.frequency.label || '')}
        </Text>
      ),
    },
    {
      name: 'schedule',
      title: 'Schedule',
      width: {minWidth: '150px'},
      align: 'left',
      render: row => {
        const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const time = row.schedule.time;
        const weekday = row.schedule.weekday;
        const dayOfMonth = row.schedule.day_of_month;
        let formatedTime = time;

        if (weekday !== null && weekday !== undefined) {
          const dayName = DAYS_FULL[weekday - 1] || '';
          formatedTime = `${dayName},\n${time}`;
        }

        if (dayOfMonth !== null && dayOfMonth !== undefined) {
          formatedTime = `${getOrdinal(dayOfMonth)},\n${time}`;
        }

        return (
          <Text variant="caption2" className="text-text-secondary! whitespace-pre">
            {formatedTime}
          </Text>
        );
      },
    },
    {
      name: 'recipients',
      title: 'Recipients',
      width: {minWidth: '200px'},
      align: 'left',
      render: row => {
        if (!row.recipients || row.recipients.length === 0) {
          return (
            <Text variant="caption2" className="text-secondary!">
              All
            </Text>
          );
        }

        const isExpanded = expandedRow === row.id;
        const recipientsToShow = isExpanded ? row.recipients : row.recipients.slice(0, 2);

        return (
          <div className="flex flex-col gap-1">
            {recipientsToShow.map((recipient, index) => {
              const isSecond = index === 1;
              const hasMore = row.recipients.length > 2;

              return (
                <div key={recipient.id} className="flex items-center gap-2">
                  {/* Name pill */}
                  <div className="bg-gray-100 px-2 py-1 rounded w-fit">
                    <Text variant="small">{recipient.name}</Text>
                  </div>

                  {/* +X badge (only on second item when collapsed) */}
                  {!isExpanded && isSecond && hasMore && (
                    <span
                      className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded cursor-pointer"
                      onClick={() => setExpandedRow(prev => (prev === row.id ? null : row.id))}>
                      +{row.recipients.length - 2}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Show less */}
            {isExpanded && row.recipients.length > 2 && (
              <button
                className="text-xs text-primary cursor-pointer hover:underline w-fit"
                onClick={() => setExpandedRow(null)}>
                Show less
              </button>
            )}
          </div>
        );
      },
    },
    {
      name: 'status',
      title: 'Status',
      width: {minWidth: '110px'},
      align: 'left',
      render: row => (
        <Badge size="sm" message={row.status ? 'Active' : 'Inactive'} color={row.status ? 'green' : 'gray'} />
      ),
    },
    {
      name: 'actions',
      title: 'Actions',
      width: {minWidth: '90px'},
      align: 'left',
      render: row => (
        <div className="flex gap-2">
          <IconButton
            name="pencil"
            color="secondary"
            onClick={() => {
              setCurrentSelectDigest(row);
              setModalOpen('edit');
            }}
          />
        </div>
      ),
    },
  ];

  useEffect(() => {
    const payload: DigestListRequest['params'] = {page, limit: PAGE_SIZE};
    if (filter.search) {
      payload.search = filter.search;
    }
    if (filter.status !== undefined && filter.status !== null && typeof filter.status === 'number') {
      payload.status = filter.status === 1 ? true : filter.status === 2 ? false : undefined;
    }
    if (filter.scope) {
      payload.scope = filter.scope;
    }
    if (filter.frequency) {
      payload.frequency = filter.frequency;
    }
    dispatch(digestListRequest(payload));
  }, [filter, page]);

  useEffect(() => {
    if (success) {
      // Avoid showing toast for list-fetch success codes
      if (!['S-10024'].includes(success)) {
        showToast(getSuccessMessage(success), 'success');
      }

      if (['S-10020', 'S-10021'].includes(success)) {
        setModalOpen(false);
        setCurrentSelectDigest(null);
        const payload: DigestListRequest['params'] = {page, limit: PAGE_SIZE};
        if (filter.search) {
          payload.search = filter.search;
        }
        if (filter.status !== undefined && filter.status !== null && typeof filter.status === 'number') {
          payload.status = filter.status === 1 ? true : filter.status === 2 ? false : undefined;
        }
        if (filter.scope) {
          payload.scope = filter.scope;
        }
        if (filter.frequency) {
          payload.frequency = filter.frequency;
        }
        dispatch(digestListRequest(payload));
      }
    }

    if (failure) {
      if (!['E-10014', 'E-10015'].includes(failure)) {
        showToast(getErrorMessage(failure), 'error');
      }
      if (failure === 'E-10014') {
        setNoData(true);
      }
    }

    return () => {
      dispatch(resetDigestMessage());
    };
  }, [success, failure]);

  useEffect(() => {
    if (digestsData.length > 0) {
      setNoData(false);
    }
  }, [digestsData]);

  if (noData) {
    return (
      <ScreenWrapper>
        <div className="flex flex-col items-center justify-center h-full gap-4 py-10">
          <Text variant="h4" className="text-text-secondary! font-InterMedium!">
            No digests have been added yet.
          </Text>
          <Button onClick={() => setModalOpen('add')} leftIcon="plus" className="flex items-center gap-2">
            Add Digest
          </Button>

          {(modalOpen == 'add' || modalOpen == 'edit') && (
            <AddEditDigestion
              open={modalOpen === 'add' || modalOpen === 'edit'}
              onClose={() => setModalOpen(false)}
              variant={modalOpen}
              currentSelectDigest={currentSelectDigest}
            />
          )}
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <div className="flex flex-col gap-6 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Text variant="subtitle1" className="text-text-primary">
            Configure automated summary reports for stakeholders
          </Text>
          <Button
            onClick={() => {
              setCurrentSelectDigest(null);
              setModalOpen('add');
            }}
            leftIcon="plus"
            className="flex items-center gap-2">
            Add Digest
          </Button>
        </div>

        <FilterGroup
          config={[
            {
              key: 'search',
              placeholder: 'Search by Digest ID, Digest name or Recipients...',
              type: 'search',
              props: {
                className: 'min-w-[370px]',
              },
            },
            {
              key: 'scope',
              placeholder: 'All Scope',
              type: 'select',
              options: DIGEST_SCOPE,
              props: {
                className: 'min-w-[130px]',
              },
            },
            {
              key: 'frequency',
              placeholder: 'All Frequency',
              type: 'select',
              options: DIGEST_FREQUENCY,
              props: {
                className: 'min-w-[130px]',
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
          onChange={values => {
            setFilter(values);
            setPage(1);
          }}
        />

        <DataTable
          columns={columns}
          data={digestsData}
          totalPages={totalPages}
          currentPage={currentPage || page}
          totalResult={totalResult}
          onPageChange={setPage}
          loading={isLoading}
        />

        {(modalOpen == 'add' || modalOpen == 'edit') && (
          <AddEditDigestion
            open={modalOpen === 'add' || modalOpen === 'edit'}
            onClose={() => {
              setModalOpen(false);
              setCurrentSelectDigest(null);
            }}
            variant={modalOpen}
            currentSelectDigest={currentSelectDigest}
          />
        )}
      </div>
    </ScreenWrapper>
  );
}
