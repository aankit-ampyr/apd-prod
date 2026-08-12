import {useEffect, useRef, useState} from 'react';
import {DataTable, FilterGroup, ScreenWrapper} from '@/components';
import {SIMULATION_STATUS} from '@/constants';
import {useDropdownValues, useToast} from '@/hooks';
import type {DataTableColumn, SortType} from '@/interface';
import {allProjectsData, allProjectsList, authDataSelector, projectLoading} from '@/services/redux/selectors';
import {
  deleteSimulationSuccess,
  initiateSimulationData,
  projectSimulationData,
  projectSimulationError,
  projectSimulationSuccess,
  simulationListData,
  simulationListError,
  simulationListLoading,
  simulationListSuccess,
  updateSimulationError,
  updateSimulationSuccess,
} from '@/services/redux/selectors/simulationWizardSelector';
import {getAllProjectListRequest} from '@/services/redux/slice';
import {
  deleteProjectSimulationRequest,
  getProjectSimulationRequest,
  getSimulationListRequest,
  initiateProjectSimulationRequest,
  resetInitiateSimulation,
  resetProjectSimulation,
  resetDeleteSimulation,
  resetUpdateSimulation,
  resetUpdateSimulationFailure,
  updateProjectSimulationRequest,
  clearAllSimulationErrors,
} from '@/services/redux/slice/simulationWizardSlice';
import {DeleteSimulation, DiscardSimulation} from '@/components/SimulationWizard/DeleteSimulation';
import {Badge, Button, Icon, Sort, Text, TextInput, Skeleton, SearchableSelectInput} from '@/ui-kits';
import {Images} from '@lazarus/react-common/assets';
import {useFormik} from 'formik';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {Routes} from '@/navigation/Routes';
import {format} from 'date-fns';
import {ErrorCodes, formatDate, getErrorMessage, getSuccessMessage, SuccessCodes} from '@/utils';

type FormType = {
  project: number | null;
};

type SimulationStatus = 'in_progress' | 'completed' | 'failed';

type SimulationRow = {
  id: number;
  sim_id: number;
  editedStep: number;
  simulation: string;
  status: SimulationStatus;
  statusLabel: string | React.ReactNode;
  updatedAt: string;
};

type FilterType = {
  search?: string;
  status?: number;
  start_date?: string;
  end_date?: string;
  date_range?: {
    start: Date | null;
    end: Date | null;
  };
};

type SimulationModalType = 'delete' | 'discard';

const initialValues: FormType = {
  project: null,
};

const PAGE_SIZE = 10;
const GHOST_TABLE_ROWS = Array.from({length: 8}, (_, id) => ({id}));

function SimulationListingGhostLoader() {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#D9E1E7]">
      <table className="w-full min-w-max">
        <thead className="bg-[#E9FAF8]">
          <tr>
            {Array.from({length: 5}).map((_, index) => (
              <th key={index} className="px-4 py-3">
                <Skeleton animation="wave" variant="rounded" width={100} height={18} className="rounded-full!" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GHOST_TABLE_ROWS.map(row => (
            <tr key={row.id}>
              {Array.from({length: 5}).map((_, index) => (
                <td key={index} className="px-4 py-4">
                  <Skeleton animation="wave" variant="rounded" width={index === 1 ? 160 : 100} height={16} className="rounded-full!" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_FILTER_MAP: Record<number, SimulationStatus> = {
  1: 'completed',
  2: 'failed',
  3: 'in_progress',
};

export const SimulationListing = () => {
  const dispatch = useDispatch();
  const {showToast} = useToast();

  const navigate = useNavigate();

  const simulationError = useSelector(simulationListError);
  const simulationListSuccessCode = useSelector(simulationListSuccess);
  const isSimulationListLoading = useSelector(simulationListLoading);

  const simulData = useSelector(initiateSimulationData);
  const simulListData = useSelector(simulationListData);

  const updateSimlSuccess = useSelector(updateSimulationSuccess) as SuccessCodes;

  const deleteSimlSuccess = useSelector(deleteSimulationSuccess) as SuccessCodes;

  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const projectsLoading = useSelector(projectLoading);

  const failure = useSelector(simulationListError) as ErrorCodes;
  const updateFailure = useSelector(updateSimulationError) as ErrorCodes;

  const [simulations, setSimulations] = useState<SimulationRow[]>([]);
  const [showGhostLoader, setShowGhostLoader] = useState(false);
  const hasObservedSimulationListLoading = useRef(false);
  const pendingSimulationList = useRef<typeof simulListData | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>({});
  const [sort, setSort] = useState<SortType>(null);
  const [editingSimulationId, setEditingSimulationId] = useState<number | null>(null);
  const [editingSimulationName, setEditingSimulationName] = useState('');
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationRow | null>(null);
  const [activeModal, setActiveModal] = useState<SimulationModalType | null>(null);
  const [tableMessage, setTableMessage] = useState('');
  const [projectInitialized, setProjectInitialized] = useState(false);

  const {errors, values, handleBlur, setFieldValue, touched, setFieldTouched} = useFormik({
    initialValues,
    validationSchema: undefined,
    onSubmit: () => {},
    enableReinitialize: true,
    validateOnMount: true,
  });

  const hasActiveFilters = Boolean(filter.search || filter.status !== undefined || filter.start_date || filter.end_date);

  useEffect(() => {
    if (isSimulationListLoading) {
      hasObservedSimulationListLoading.current = true;
      return;
    }

    if (hasObservedSimulationListLoading.current) {
      hasObservedSimulationListLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [isSimulationListLoading]);

  useEffect(() => {
    if (hasObservedSimulationListLoading.current && (simulationListSuccessCode || simulationError)) {
      hasObservedSimulationListLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [simulationListSuccessCode, simulationError]);

  useEffect(() => {
    dispatch(clearAllSimulationErrors());
  }, []);

  useEffect(() => {
    if (values.project) {
      dispatch(getSimulationListRequest({project_id: values.project}));
    }
  }, [values.project]);

  useEffect(() => {
    if (simulData?.id) {
      navigate(`${Routes.SIMULATION_WIZARD}/${simulData.id}`);
      dispatch(resetInitiateSimulation());
    }
  }, [simulData?.id, dispatch, navigate]);

  useEffect(() => {
    const savedProjectId = localStorage.getItem('selectedProjectId');
    if (savedProjectId) {
      setFieldValue('project', Number(savedProjectId));
    } else {
      setFieldValue('project', null);
      localStorage.removeItem('selectedProjectId');
    }
    setProjectInitialized(true);
  }, []);

  useEffect(() => {
    if ((updateSimlSuccess || deleteSimlSuccess) && !failure) {
      // Handle update simulation success
      if (['S-20028', 'S-20029', 'S-20030', 'S-20031'].includes(updateSimlSuccess)) {
        showToast(getSuccessMessage(updateSimlSuccess), 'success');
        if (updateSimlSuccess === 'S-20028' && values.project) {
          // Preserve current sort order and filters when refetching after update
          const payload: any = {
            project_id: values.project,
            page,
            limit: PAGE_SIZE,
            sort: sort || 'desc',
          };
          if (filter.search) payload.search = filter.search;
          if (filter.status) payload.status = filter.status;
          if (filter.start_date) payload.start_date = filter.start_date;
          if (filter.end_date) payload.end_date = filter.end_date;
          dispatch(getSimulationListRequest(payload));
        }
        dispatch(resetUpdateSimulation());
      }
      // Handle delete simulation success
      if (['S-20029'].includes(deleteSimlSuccess)) {
        showToast(getSuccessMessage(deleteSimlSuccess), 'success');
        if (values.project) {
          // Preserve current sort order when refetching after delete
          const payload: any = {
            project_id: values.project,
            page,
            limit: PAGE_SIZE,
            sort: sort || 'desc',
          };
          if (filter.search) payload.search = filter.search;
          if (filter.status) payload.status = filter.status;
          if (filter.start_date) payload.start_date = filter.start_date;
          if (filter.end_date) payload.end_date = filter.end_date;
          dispatch(getSimulationListRequest(payload));
        }
        dispatch(resetDeleteSimulation());
      }
    }
    if (failure || updateFailure) {
      if (updateFailure === 'E-20045') {
        showToast(getErrorMessage(updateFailure), 'error');
      }
      if (failure === 'E-20043' && hasActiveFilters) {
        setTableMessage(getErrorMessage('E-20011'));
      }
    }
    return () => {
      dispatch(resetUpdateSimulationFailure());
    };
  }, [updateSimlSuccess, deleteSimlSuccess, failure, updateFailure, page, filter, hasActiveFilters]);

  const allProjects = useDropdownValues({
    fetchAction: () => dispatch(getAllProjectListRequest()),
    selector: allProjectsList,
  });

  const isProjectLoading = allProjects?.length === 0;

  useEffect(() => {
    dispatch(getAllProjectListRequest());
  }, [allProjects.length, dispatch]);

  const isAssignedUser = Boolean(
    authData?.id && allProjData?.some(project => Number(project?.id) === values.project && project?.assigned_users?.some(user => user.id === authData.id)),
  );
  const simulationStatusOptions = isAssignedUser ? SIMULATION_STATUS.filter(status => status.id !== 2) : SIMULATION_STATUS;

  const isProjectSelected = Boolean(values.project);
  const shouldDisableFilters = !isProjectSelected || simulationError === 'E-20006' || simulationError === 'E-20015';
  const shouldDisableStartSimulation = !isProjectSelected || simulationError === 'E-20015';
  const isPermissionLoading = values.project && authData?.id && !allProjData?.length;

  const handleFilterChange = (values: FilterType) => {
    const toApiDate = (date: Date | string | null | undefined) => {
      if (!date) return undefined;
      const parsed = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(parsed.getTime())) return undefined;
      return format(parsed, 'dd-MM-yyyy');
    };

    let newFilter: FilterType = {
      search: values.search || undefined,
    };

    if (values.status) newFilter.status = values.status;

    const startDate = values.date_range?.start ?? values.start_date;
    const endDate = values.date_range?.end ?? values.end_date;

    const formattedStart = toApiDate(startDate);
    const formattedEnd = toApiDate(endDate);

    if (formattedStart) newFilter.start_date = formattedStart;
    if (formattedEnd) newFilter.end_date = formattedEnd;

    setFilter(newFilter);
    setPage(1);
  };

  function fetchSimulations() {
    if (!values.project) return;

    pendingSimulationList.current = simulListData;
    setShowGhostLoader(true);

    const payload: any = {
      project_id: values.project,
      page,
      limit: PAGE_SIZE,
      sort: sort || 'desc',
    };

    if (filter.search) payload.search = filter.search;
    if (filter.status) payload.status = filter.status;
    if (filter.start_date) payload.start_date = filter.start_date;
    if (filter.end_date) payload.end_date = filter.end_date;

    dispatch(getSimulationListRequest(payload));
  }

  useEffect(() => {
    fetchSimulations();
  }, [filter, page, sort, values.project]);

  useEffect(() => {
    if (pendingSimulationList.current !== simulListData) {
      pendingSimulationList.current = null;
      hasObservedSimulationListLoading.current = false;
      setShowGhostLoader(false);
    }
  }, [simulListData]);

  function handleStartEditSimulation(row: SimulationRow) {
    setEditingSimulationId(row.id);
    setEditingSimulationName(row.simulation);
  }

  function handleSaveSimulationName(row: SimulationRow) {
    const nextName = editingSimulationName.trim();

    // Only update if the name actually changed
    if (nextName && row.id && nextName !== row.simulation) {
      dispatch(
        updateProjectSimulationRequest({
          simulation_id: row.id,
          name: nextName,
        }),
      );
      setSimulations(prev => prev.map(item => (item.id === row.id ? {...item, simulation: nextName} : item)));
    }

    setEditingSimulationId(null);
    setEditingSimulationName('');
  }

  function handleOpenSimulationModal(row: SimulationRow, modalType: SimulationModalType) {
    setSelectedSimulation(row);
    setActiveModal(modalType);
  }

  function handleCloseSimulationModal() {
    setActiveModal(null);
    setSelectedSimulation(null);
  }

  function handleRemoveSelectedSimulation() {
    if (selectedSimulation) {
      // Call deleteProjectSimulationRequest with simulation id
      dispatch(
        deleteProjectSimulationRequest({
          simulation_id: selectedSimulation.id,
        }),
      );
      setSimulations(prev => prev.filter(item => item.id !== selectedSimulation.id));
    }

    handleCloseSimulationModal();
  }

  const getStepName = (editedStep: number) => {
    if (editedStep >= 1 && editedStep <= 4) return 'System Setup';
    if (editedStep === 5) return 'Dispatch Rules';
    if (editedStep === 6) return 'BESS & DG Sizing';
    if (editedStep === 7) return 'Simulation Result';
    if (editedStep === 8 || editedStep === 9) return 'Custom Configuration';
    if (editedStep === 10 || editedStep === 11) return 'Multi Year Projection';
    if (editedStep === 12) return 'Green Energy Analysis';
    if (editedStep >= 13) return 'Completed';

    return 'System Setup';
  };

  function mapSimulationData(apiData: any[]): SimulationRow[] {
    return apiData.reduce<SimulationRow[]>((rows, item) => {
      let status = STATUS_FILTER_MAP[item.status];

      const editedStep = Number(item.edited_step) || 1;

      // Only step 13 should be completed
      if (editedStep < 13 && status === 'completed') {
        status = 'in_progress';
      }

      if (isAssignedUser && status === 'failed') {
        return rows;
      }

      let statusLabel = getStepName(editedStep);

      if (status === 'failed') {
        statusLabel = 'Failed';
      }

      rows.push({
        id: item.id,
        sim_id: item.sim_id,
        simulation: item.name,
        status,
        editedStep,
        statusLabel,
        updatedAt: item.last_updated,
      });

      return rows;
    }, []);
  }

  useEffect(() => {
    if (simulListData?.simulations) {
      const mappedData = mapSimulationData(simulListData.simulations);
      setSimulations(mappedData);

      if (mappedData.length > 0) {
        setTableMessage('');
      } else if (hasActiveFilters) {
        setTableMessage(getErrorMessage('E-20011'));
      }
    }
  }, [simulListData, hasActiveFilters, isAssignedUser]);

  const columns: DataTableColumn<SimulationRow>[] = [
    {
      name: 'id',
      title: 'Simulation ID',
      width: {minWidth: '200px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-primary!">
          {' '}
          {row?.sim_id}{' '}
        </Text>
      ),
    },
    {
      name: 'simulation',
      title: 'Simulation',
      width: {minWidth: '220px'},
      align: 'left',
      render: row => {
        const isEditing = editingSimulationId === row.id;

        if (isEditing) {
          return (
            <TextInput
              autoFocus
              value={editingSimulationName}
              onChange={setEditingSimulationName}
              onBlur={() => handleSaveSimulationName(row)}
              onKeyDown={(event: any) => {
                if (event.key === 'Enter') {
                  handleSaveSimulationName(row);
                }
                if (event.key === 'Escape') {
                  setEditingSimulationId(null);
                  setEditingSimulationName('');
                }
              }}
              className="h-10 w-48"
            />
          );
        }

        return (
          <div className="group flex items-center gap-3">
            <Text variant="caption" className="text-text-primary! font-InterMedium!">
              {row.simulation}
            </Text>
            {!isAssignedUser && (
              <button
                type="button"
                onClick={() => handleStartEditSimulation(row)}
                className="opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer">
                <Icon name="pencil" size={16} className="text-primary!" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      name: 'status',
      title: 'Status',
      width: {minWidth: '260px'},
      align: 'left',
      render: row => <SimulationStatusBadge status={row.status} label={row.statusLabel} />,
    },
    {
      name: 'last_updated',
      title: (
        <div className="flex items-center gap-1">
          <Text variant="caption">Last Updated</Text>
          <Sort sort={sort} onSortChange={setSort} />
        </div>
      ),
      width: {minWidth: '210px'},
      align: 'left',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {formatDate(row.updatedAt, 'dd-MMM-yyyy, hh:mm a')}
        </Text>
      ),
    },
    {
      name: 'action',
      title: 'Action',
      width: {minWidth: '250px'},
      align: 'left',
      render: row => <SimulationActionCell row={row} isAssignedUser={Boolean(isAssignedUser)} onAction={handleOpenSimulationModal} />,
    },
  ];

  const renderContent = () => {
    if ((!projectInitialized || showGhostLoader || isPermissionLoading) && !sort) {
      return <SimulationListingGhostLoader />;
    }

    if (!values.project || simulationError === 'E-20015') {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-10">
          <img src={Images.files} alt="No Projects" className="w-22" />
          <Text variant="h4" className="text-text-secondary! font-InterMedium!">
            Select project to view simulations.
          </Text>
        </div>
      );
    }

    if (simulationError === 'E-20043' && !hasActiveFilters) {
      return (
        <div className="flex flex-col items-center justify-center min-h-full! gap-4 py-10">
          <img src={Images.noBatteryCross} alt="No Simulations" className="w-22" />
          <Text variant="h4" className="text-text-secondary! font-InterMedium!">
            No simulations yet. Start a new simulation to get started.
          </Text>
        </div>
      );
    }

    return (
      <DataTable
        columns={columns}
        data={mapSimulationData(simulListData?.simulations || [])}
        totalPages={simulListData?.total_pages || 1}
        currentPage={simulListData?.current_page || 1}
        totalResult={simulListData?.total_count || 0}
        errorMessage={tableMessage}
        onPageChange={setPage}
        stickyHeader
      />
    );
  };

  const handleNewSimulation = () => {
    // Always use the latest selected project from formik state
    if (!values.project) return;
    dispatch(initiateProjectSimulationRequest({project_id: values.project}));
  };

  return (
    <ScreenWrapper>
      <div className="flex flex-col gap-6 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Text variant="subtitle1" className="text-text-primary">
            View, resume, and analyze your simulation runs
          </Text>
          {(!projectInitialized || showGhostLoader || isPermissionLoading) && !sort ? (
            <Skeleton animation="wave" variant="rounded" width={180} height={40} />
          ) : (
            !isAssignedUser && (
              <Button onClick={handleNewSimulation} leftIcon="plus" disabled={shouldDisableStartSimulation} className="flex items-center gap-2">
                Start New Simulation
              </Button>
            )
          )}
        </div>

        <div className="flex flex-col gap-10 xl:gap-20 xl:flex-row">
          <div className="flex items-center gap-1.5 xl:mt-0 whitespace-nowrap!">
            <Text variant="16M" className="text-text-primary">
              Select Project :
            </Text>

            {projectsLoading ? (
              <Skeleton animation="wave" variant="rounded" width={210} height={40} className="rounded-md!" />
            ) : (
              <SearchableSelectInput
                required
                placeholder="Select Project"
                options={allProjects}
                onChange={item => {
                  setPage(1);
                  setFilter({});

                  if (!item?.id) {
                    setFieldValue('project', null);
                    setFieldTouched('project', false);

                    localStorage.removeItem('selectedProjectId');
                    return;
                  }

                  const projectId = Number(item.id);
                  setFieldValue('project', projectId);
                  localStorage.setItem('selectedProjectId', String(projectId));

                  dispatch(getSimulationListRequest({project_id: projectId}));
                }}
                onBlur={handleBlur('project')}
                value={values.project}
                touched={touched.project}
                error={errors.project}
                className="w-52"
                isFilter
              />
            )}
          </div>

          <FilterGroup
            filterGroupClassName="flex flex-1 flex-wrap items-end gap-4 z-99"
            clearButtonClassName="ml-auto"
            disabled={shouldDisableFilters}
            config={[
              {
                key: 'search',
                placeholder: 'Search Simulations...',
                type: 'search',
                props: {className: 'min-w-40', disabled: shouldDisableFilters},
              },
              {
                key: 'status',
                placeholder: 'All Status',
                type: 'select',
                options: simulationStatusOptions,
                props: {className: 'min-w-30', disabled: shouldDisableFilters},
              },
              {
                key: 'date_range',
                placeholder: 'Date Range',
                type: 'date-range',
                props: {
                  className: 'max-w-[260px]',
                  disabled: shouldDisableFilters,
                  usePortal: true,
                },
              },
            ]}
            onChange={handleFilterChange}
          />
        </div>

        <div className="flex flex-col gap-4">{renderContent()}</div>
      </div>
      {activeModal === 'delete' && (
        <DeleteSimulation open={activeModal === 'delete'} onCancel={handleCloseSimulationModal} onDelete={handleRemoveSelectedSimulation} />
      )}
      {activeModal === 'discard' && (
        <DiscardSimulation open={activeModal === 'discard'} onCancel={handleCloseSimulationModal} onDiscard={handleRemoveSelectedSimulation} />
      )}
    </ScreenWrapper>
  );
};

function SimulationStatusBadge({status, label}: Readonly<{status: SimulationStatus; label: string | React.ReactNode}>) {
  const colorMap: Record<SimulationStatus, 'blue' | 'green' | 'red'> = {
    in_progress: 'blue',
    completed: 'green',
    failed: 'red',
  };

  return <Badge size="sm" textClassName="font-InterMedium!" message={label} color={colorMap[status] as any} />;
}

function SimulationActionCell({
  row,
  isAssignedUser,
  onAction,
}: Readonly<{row: SimulationRow; isAssignedUser: boolean; onAction: (row: SimulationRow, modalType: SimulationModalType) => void}>) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {showToast} = useToast();

  const projSimlSuccess = useSelector(projectSimulationSuccess) as SuccessCodes;
  const proSimulData = useSelector(projectSimulationData);
  const resumeRequestedRef = useRef(false);
  const projectSimulErr = useSelector(projectSimulationError);

  const handleResumeSetup = () => {
    resumeRequestedRef.current = true;
    dispatch(getProjectSimulationRequest({simulation_id: row?.id}));
  };

  useEffect(() => {
    if (projSimlSuccess === 'S-20031' && resumeRequestedRef.current) {
      resumeRequestedRef.current = false;
      navigate(`${Routes.SIMULATION_WIZARD}/${proSimulData?.id}`);
      dispatch(resetProjectSimulation());
    }
  }, [projSimlSuccess, proSimulData, dispatch, navigate]);

  useEffect(() => {
    if (
      (projectSimulErr === 'E-20043' || projectSimulErr === 'E-20004' || projectSimulErr === 'E-20065' || projectSimulErr === 'E-20066') &&
      resumeRequestedRef.current
    ) {
      resumeRequestedRef.current = false;
      showToast(getErrorMessage(projectSimulErr), 'error');
      dispatch(resetProjectSimulation());
    }
  }, [projectSimulErr]);

  if (isAssignedUser) {
    if (row.editedStep >= 13) {
      return (
        <div className="flex items-center gap-3">
          <ActionButton icon="eye" label="View Results" variant="teal" onClick={handleResumeSetup} />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <ActionButton icon="eye" label="View" variant="teal" onClick={handleResumeSetup} />
      </div>
    );
  }

  if (row.editedStep >= 13) {
    return (
      <div className="flex items-center gap-3">
        <ActionButton icon="eye" label="View Results" variant="teal" onClick={handleResumeSetup} />
      </div>
    );
  }

  const handleRetrySimulation = () => {
    dispatch(getProjectSimulationRequest({simulation_id: row?.id}));
  };

  if (row.status === 'failed') {
    return (
      <div className="flex items-center gap-3">
        <ActionButton icon="rotateCcw" label="Retry" variant="teal" onClick={handleRetrySimulation} />
        <ActionButton icon="trash" label="Delete" variant="danger" onClick={() => onAction(row, 'delete')} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <ActionButton icon="play" label="Resume Setup" variant="teal" onClick={handleResumeSetup} />
      <ActionButton icon="cross" label="Discard" variant="danger" onClick={() => onAction(row, 'discard')} />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  variant,
  onClick,
}: Readonly<{
  icon: 'eye' | 'rotateCcw' | 'trash' | 'cross' | 'play';
  label: string;
  variant: 'teal' | 'danger';
  onClick?: () => void;
}>) {
  const variants = {
    teal: {
      button: 'border-border',
      content: 'text-primary!',
    },
    danger: {
      button: 'border-border',
      content: 'text-error!',
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center whitespace-nowrap gap-2 rounded-sm border bg-white px-4 shadow-sm cursor-pointer ${variants[variant].button}`}>
      <Icon name={icon} size={16} className={variants[variant].content} />
      <Text variant="btnSmall" className={`font-InterSemibold! ${variants[variant].content}`}>
        {label}
      </Text>{' '}
    </button>
  );
}
