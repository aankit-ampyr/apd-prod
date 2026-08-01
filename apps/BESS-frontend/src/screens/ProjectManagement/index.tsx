import {useEffect, useState, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Text, Badge, Button, Icon, IconButton, Tooltip, Skeleton} from '@/ui-kits';
import {DataTable, FilterGroup} from '@/components';
import type {DataTableColumn, SelectInputItem} from '@/interface';
import {formatDate} from '@/utils';
import {getEnumKeysByValues, NA, ProjectStatus, UserRole} from '@/constants';
import {authDataSelector} from '@/services/redux/selectors/authSelector';
import {cn} from '@/utils/common-functions';
import {useIsTruncated, useToast} from '@/hooks';
import {ErrorCodes, getErrorMessage, getSuccessMessage, SuccessCodes} from '@/utils/getMessages';
import {projectFailure, projectLoading, projects, projectSuccess, projectTotalPages, totalProjectResults} from '@/services/redux/selectors/projectSelector';
import {
  archiveProjectRequest,
  deleteProjectRequest,
  projectListRequest,
  resetProjectMessage,
  restoreProjectRequest,
  unArchiveProjectRequest,
} from '@/services/redux/slice/projectsSlice';
import CreateProject from '@/components/ProjectManagement/CreateProject';
import DeleteProject from '@/components/ProjectManagement/DeleteProject';
import ArchiveProject from '@/components/ProjectManagement/ArchiveProject';
import {Images} from '@lazarus/react-common/assets';

// =================
// types
// =================
type Project = {
  id: number;
  proj_id: string;
  name: string;
  description: string;
  created_by: {
    id: number;
    name: string;
    role: number;
  };
  owned_by: {
    id: number;
    name: string;
    role: number;
  };

  assigned_users: {
    id: number;
    name: string;
    role: number;
    status?: boolean;
  }[];
  status: number;
  created_date: string;
};

const PAGE_SIZE = 10;
const GHOST_TABLE_ROWS = Array.from({length: 8}, (_, id) => ({id}));

function ProjectManagementGhostLoader() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton animation="wave" variant="rounded" width={280} height={20} className="rounded-full!" />
        <Skeleton animation="wave" variant="rounded" width={150} height={40} className="rounded-lg!" />
      </div>
      <div className="flex flex-wrap gap-4">
        {[300, 140].map((width, index) => (
          <Skeleton key={index} animation="wave" variant="rounded" width={width} height={40} className="rounded-lg!" />
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#D9E1E7]">
        <table className="w-full min-w-max">
          <thead className="bg-[#E9FAF8]">
            <tr>
              {Array.from({length: 8}).map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <Skeleton animation="wave" variant="rounded" width={90} height={18} className="rounded-full!" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GHOST_TABLE_ROWS.map(row => (
              <tr key={row.id}>
                {Array.from({length: 8}).map((_, index) => (
                  <td key={index} className="px-4 py-4">
                    <Skeleton animation="wave" variant="rounded" width={index % 2 ? 120 : 80} height={16} className="rounded-full!" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type FilterType = {
  search?: string;
  status?: number;
};

const STATUS_OPTIONS: SelectInputItem[] = [
  {id: ProjectStatus.Active, label: 'Active'},
  {id: ProjectStatus.Inactive, label: 'Inactive'},
  {id: ProjectStatus.Archived, label: 'Archived'},
];

export function ProjectManagement() {
  const dispatch = useDispatch();
  const {showToast} = useToast();

  const projectData = useSelector(projects);
  const totalPagesData = useSelector(projectTotalPages);
  const totalResult = useSelector(totalProjectResults);
  const isLoading = useSelector(projectLoading);
  const success = useSelector(projectSuccess) as SuccessCodes;
  const failure = useSelector(projectFailure) as ErrorCodes;
  const authUser = useSelector(authDataSelector);

  const [page, setPage] = useState(1);
  const [showGhostLoader, setShowGhostLoader] = useState(true);
  const hasObservedLoading = useRef(false);
  const pendingProjectList = useRef<typeof projectData | null>(null);
  const [filter, setFilter] = useState<FilterType>({});
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState<false | 'add' | 'edit'>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [currentSelectUser, setCurrentSelectUser] = useState<Project | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [noData, setNoData] = useState(false);
  const [expandedDescRow, setExpandedDescRow] = useState<number | null>(null);
  const [expandedNameRow, setExpandedNameRow] = useState<number | null>(null);

  const [tableMessage, setTableMessage] = useState('');

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
    const payload: any = {
      page,
      limit: PAGE_SIZE,
    };

    if (filter.search) payload.search = filter.search;
    if (filter.status !== undefined) payload.status = filter.status;

    pendingProjectList.current = projectData;
    setShowGhostLoader(true);
    dispatch(projectListRequest(payload));
  }, [page, filter]);

  useEffect(() => {
    if (pendingProjectList.current !== projectData) {
      pendingProjectList.current = null;
      hasObservedLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [projectData]);

  useEffect(() => {
    if (hasObservedLoading.current && (success || failure)) {
      hasObservedLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [success, failure]);

  // Reset to page 1 whenever filters change so search is global, not scoped to the current page
  useEffect(() => {
    setPage(1);
  }, [filter.search, filter.status]);

  useEffect(() => {
    if (success && !failure) {
      if (['S-20013', 'S-20014', 'S-20015', 'S-20016', 'S-20017', 'S-20018'].includes(success)) {
        showToast(getSuccessMessage(success), 'success');
        setCreateProjectModalOpen(false);
        setExpandedDescRow(null);
        setExpandedRow(null);
        setExpandedNameRow(null);
        dispatch(
          projectListRequest({
            page,
            limit: PAGE_SIZE,
            ...(filter.search && {search: filter.search}),
            ...(filter.status !== undefined && {status: filter.status}),
          }),
        );
      }
    }
    if (failure) {
      if (['E-20026', 'E-20027', 'E-20028', 'E-20029', 'E-20030', 'E-20031', 'E-20032', 'E-20033'].includes(failure)) {
        showToast(getErrorMessage(failure), 'error');
      }
      if (failure === 'E-20006') {
        setNoData(true);
      }
      if (failure === 'E-20005') {
        setTableMessage(getErrorMessage('E-20011'));
      }
    }
  }, [success, failure, page, filter]);

  useEffect(() => {
    return () => {
      dispatch(resetProjectMessage());
    };
  }, []);

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1:
        return {label: 'Active', color: 'green'};
      case 2:
        return {label: 'Inactive', color: 'navy'};
      case 3:
        return {label: 'Archived', color: 'orange'};
      case 4:
        return {label: 'Deleted', color: 'red'};
      default:
        return {label: NA, color: 'gray'};
    }
  };

  const handleEdit = (project: Project) => {
    setCreateProjectModalOpen('edit');
    setCurrentSelectUser(project);
  };

  const closeCreateProjectModal = () => {
    setCreateProjectModalOpen(false);
  };

  const columns: DataTableColumn<Project>[] = [
    {
      name: 'proj_id',
      title: 'Project ID',
      width: {minWidth: '100px'},
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {row.proj_id}
        </Text>
      ),
      align: 'left',
    },
    {
      name: 'name',
      title: 'Project Name',
      width: {minWidth: '180px', maxWidth: '240px'},
      render: row => <NameCell key={`${row.id}-${row.name}`} row={row} expandedNameRow={expandedNameRow} setExpandedNameRow={setExpandedNameRow} />,
      align: 'left',
    },

    {
      name: 'description',
      title: 'Description',
      width: {minWidth: '220px', maxWidth: '250px'},
      render: row => (
        <DescriptionCell key={`${row.id}-${row.description}`} row={row} expandedDescRow={expandedDescRow} setExpandedDescRow={setExpandedDescRow} />
      ),
      align: 'left',
    },

    {
      name: 'created_by',
      title: 'Created By',
      width: {minWidth: '160px'},
      render: row => (
        <div className="flex flex-col">
          <Text className="text-secondary!">{row?.created_by?.name || NA}</Text>
          {row?.created_by?.role !== undefined && (
            <Text variant="caption" className="text-text-secondary!">
              ({getEnumKeysByValues(UserRole, row.created_by.role)})
            </Text>
          )}
        </div>
      ),
      align: 'left',
    },

    {
      name: 'assigned_users',
      title: 'Assigned Users',
      width: {minWidth: '200px'},
      render: row => {
        const isExpanded = expandedRow === row.id;
        const usersToShow = isExpanded ? row.assigned_users : row.assigned_users?.slice(0, 2);

        return (
          <div className="flex flex-col">
            {usersToShow?.map(user => (
              <Text key={user?.id} className="text-text-primary!">
                {user?.name} <span className="text-text-secondary!">({getEnumKeysByValues(UserRole, user?.role)})</span>
              </Text>
            ))}

            {row?.assigned_users?.length > 2 && (
              <button
                className="text-md text-primary! cursor-pointer hover:underline flex justify-start"
                onClick={() => setExpandedRow(prev => (prev === row.id ? null : row.id))}>
                {isExpanded ? 'Show less' : `+${row.assigned_users.length - 2} more`}
              </button>
            )}
          </div>
        );
      },
      align: 'left',
    },
    {
      name: 'status',
      title: 'Status',
      width: {minWidth: '120px'},
      render: row => {
        const status = getStatusLabel(row.status);
        return <Badge size="sm" className="w-20" message={status.label} color={status.color as any} />;
      },
      align: 'left',
    },
    {
      name: 'created_date',
      title: 'Created Date',
      width: {minWidth: '160px'},
      render: row => (
        <Text variant="caption" className={cn('whitespace-pre-line', row.created_date ? 'text-text-secondary!' : 'text-text-secondary/40!')}>
          {formatDate(row.created_date, "dd-MMM-yyyy,'\n' hh:mm a") || NA}
        </Text>
      ),
      align: 'left',
    },

    {
      name: 'actions',
      title: 'Actions',
      width: {minWidth: '120px'},
      render: row => {
        const status = row.status as ProjectStatus;

        return (
          <div className="flex items-center justify-center gap-4">
            {(status === ProjectStatus.Active || status === ProjectStatus.Inactive) && (
              <>
                {/* Edit icon only for BESS Admin or responsible Analyst/creator, and not Archived */}
                {authUser &&
                  (authUser.role === UserRole.Admin ||
                    (authUser.role === UserRole.Analyst &&
                      ((row?.created_by?.id && authUser.id === row.created_by.id) || (row?.owned_by?.id && authUser.id === row.owned_by.id)))) && (
                    <span className="relative group">
                      <Tooltip message="Edit" position="bottom" />
                      <IconButton name="pencil" color="secondary" className="text-secondary! cursor-pointer" onClick={() => handleEdit(row)} />
                    </span>
                  )}
                {/* Archive icon only for Admin, Creator, or Responsible User, and only for Active/Inactive projects */}
                {(authUser?.role === UserRole.Admin || authUser?.id === row?.created_by?.id || authUser?.id === row?.owned_by?.id) && (
                  <span className="relative group ">
                    <Tooltip message="Archive" position="bottom" />
                    <IconButton
                      name="box-arrow-down"
                      color="secondary"
                      className="text-secondary! cursor-pointer"
                      onClick={() => {
                        setCurrentSelectUser(row);
                        setArchiveModalOpen(true);
                      }}
                    />
                  </span>
                )}
                {/* Delete icon only for Creator or Admin, and only for Active/Inactive projects */}
                {(authUser?.role === UserRole.Admin || authUser?.id === row?.created_by?.id) && (
                  <span className="relative group">
                    <Tooltip message="Delete" position="bottom" />
                    <IconButton
                      name="trash"
                      color="error"
                      className="text-error! cursor-pointer"
                      onClick={() => {
                        setCurrentSelectUser(row);
                        setDeleteModalOpen(true);
                      }}
                    />
                  </span>
                )}
              </>
            )}

            {status === ProjectStatus.Archived && (
              <span className="relative group">
                <Tooltip message="Unarchive" position="bottom" />
                <IconButton name="box-arrow-up" color="secondary" className="text-secondary! cursor-pointer" onClick={() => handleUnarchive(row)} />
              </span>
            )}
          </div>
        );
      },
      align: 'left',
    },
  ];

  const handleRestore = (row: Project) => {
    if (!row?.id) return;
    dispatch(restoreProjectRequest(row.id));
    setCurrentSelectUser(null);
  };

  const handleUnarchive = (row: Project) => {
    if (!row?.id) return;
    dispatch(unArchiveProjectRequest(row.id));
    setCurrentSelectUser(null);
  };

  const handleDeleteProject = () => {
    if (!currentSelectUser?.id) return;

    dispatch(deleteProjectRequest({id: currentSelectUser.id}));

    setDeleteModalOpen(false);
    setCurrentSelectUser(null);
  };

  const handleArchiveProject = () => {
    if (!currentSelectUser?.id) return;

    dispatch(archiveProjectRequest(currentSelectUser.id));
    setArchiveModalOpen(false);
    setCurrentSelectUser(null);
  };

  if (noData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-10">
        <img src={Images.noBattery} alt="No Projects" className="w-22" />
        <Text variant="h4" className="text-text-secondary! font-InterMedium!">
          No projects created yet.{' '}
        </Text>
        <Button
          onClick={() => {
            setCurrentSelectUser(null);
            setCreateProjectModalOpen('add');
          }}
          leftIcon="plus"
          className="flex items-center gap-2">
          Create Project
        </Button>

        {(createProjectModalOpen === 'add' || createProjectModalOpen === 'edit') && (
          <CreateProject editData={currentSelectUser} open={true} onClose={closeCreateProjectModal} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Text variant="subtitle1" className="text-text-primary">
          View and manage all platform projects.
        </Text>
        <Button
          onClick={() => {
            setCurrentSelectUser(null);
            setCreateProjectModalOpen('add');
          }}
          leftIcon="plus"
          className="flex items-center gap-2">
          Create Project
        </Button>
      </div>
      <FilterGroup
        config={[
          {
            key: 'search',
            placeholder: 'Search by Project ID, Name or Created By...',
            type: 'search',
            props: {className: 'min-w-[300px]'},
          },
          {
            key: 'status',
            placeholder: 'Status',
            type: 'select',
            options: STATUS_OPTIONS,
            props: {className: 'min-w-[140px]'},
          },
        ]}
        onChange={setFilter}
      />

      {/* Table */}
      {showGhostLoader ? (
        <div className="overflow-x-auto rounded-lg border border-[#D9E1E7]">
          <table className="w-full min-w-max">
            <thead className="bg-[#E9FAF8]">
              <tr>
                {Array.from({length: 8}).map((_, index) => (
                  <th key={index} className="px-4 py-3">
                    <Skeleton animation="wave" variant="rounded" width={90} height={18} className="rounded-full!" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GHOST_TABLE_ROWS.map(row => (
                <tr key={row.id}>
                  {Array.from({length: 8}).map((_, index) => (
                    <td key={index} className="px-4 py-4">
                      <Skeleton animation="wave" variant="rounded" width={index % 2 ? 120 : 80} height={16} className="rounded-full!" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={projectData}
          totalPages={totalPagesData}
          currentPage={page}
          totalResult={totalResult}
          errorMessage={tableMessage}
          onPageChange={setPage}
          stickyHeader
          tableHeightWhenScrollable={700}
        />
      )}

      {(createProjectModalOpen === 'add' || createProjectModalOpen === 'edit') && (
        <CreateProject editData={currentSelectUser} open={true} onClose={closeCreateProjectModal} />
      )}
      {deleteModalOpen && (
        <DeleteProject
          open={deleteModalOpen}
          onCancel={() => {
            setDeleteModalOpen(false);
            setCurrentSelectUser(null);
          }}
          projectName={currentSelectUser?.name || ''}
          onDelete={handleDeleteProject}
        />
      )}
      {archiveModalOpen && (
        <ArchiveProject
          open={archiveModalOpen}
          onCancel={() => {
            setArchiveModalOpen(false);
            setCurrentSelectUser(null);
          }}
          onArchive={handleArchiveProject}
        />
      )}
    </div>
  );
}

function DescriptionCell({row, expandedDescRow, setExpandedDescRow}: any) {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isTruncated = useIsTruncated(textRef, containerRef);

  const isExpanded = expandedDescRow === row.id;

  return (
    <div className="flex flex-col" ref={containerRef}>
      <Text ref={textRef} className={cn('text-text-secondary! whitespace-normal', !isExpanded && 'line-clamp-2')}>
        {row.description || NA}
      </Text>

      {row.description && (isTruncated || isExpanded) && (
        <button
          type="button"
          className="flex justify-end cursor-pointer mt-1"
          onClick={() => setExpandedDescRow((prev: any) => (prev === row.id ? null : row.id))}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') setExpandedDescRow((prev: any) => (prev === row.id ? null : row.id));
          }}>
          <Icon name={isExpanded ? 'cheveron-up' : 'cheveron-down'} size={12} className="text-secondary!" />
        </button>
      )}
    </div>
  );
}

function NameCell({row, expandedNameRow, setExpandedNameRow}: any) {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isTruncated = useIsTruncated(textRef, containerRef);
  const isExpanded = expandedNameRow === row.id;

  return (
    <div className="flex flex-col" ref={containerRef}>
      <Text ref={textRef} className={cn('text-secondary! whitespace-normal wrap-break-word', !isExpanded && 'line-clamp-2')}>
        {row?.name || NA}
      </Text>

      {row?.name && (isTruncated || isExpanded) && (
        <button
          type="button"
          className="flex justify-end cursor-pointer mt-1"
          onClick={() => setExpandedNameRow((prev: any) => (prev === row.id ? null : row.id))}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') setExpandedNameRow((prev: any) => (prev === row.id ? null : row.id));
          }}>
          <Icon name={isExpanded ? 'cheveron-up' : 'cheveron-down'} size={12} className="text-secondary!" />
        </button>
      )}
    </div>
  );
}
