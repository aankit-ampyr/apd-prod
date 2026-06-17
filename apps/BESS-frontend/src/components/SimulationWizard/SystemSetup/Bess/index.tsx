import {BessContainerTypes} from '@/constants';
import {Alert, Button, Icon, MultiSelectInput, Text} from '@/ui-kits';
import {enumToSelectOptions} from '@/utils';
import {useEffect, useRef, useState} from 'react';
import {BatteryInputs} from './BatteryInputs';
import {useDispatch, useSelector} from 'react-redux';
import {bessContainerConfigRequest} from '@/services/redux/slice/simulationWizardSlice';
import {RootState} from '@/services/redux/rootReducer';
import {bessConfigSuccess, bessContainerConfigData, initiateSimulationData, projectSimulationData} from '@/services/redux/selectors/simulationWizardSelector';
import {authDataSelector, allProjectsData} from '@/services/redux/selectors';
import {useChangeConfigurationConfirmation} from '../../ChangeConfigurationContext';

type Props = {
  readonly onSaveComplete?: () => void;
  readonly readOnly?: boolean;
};

export const Bess = ({onSaveComplete, readOnly}: Props) => {
  const dispatch = useDispatch();
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();

  const BESS_CONTAINER_OPTIONS = enumToSelectOptions(BessContainerTypes);

  const [selectedContainers, setSelectedContainers] = useState<number[]>([]);

  const [range, setRange] = useState([5, 95]);
  const [efficiency, setEfficiency] = useState(87);
  const [minSoc, setMinSoc] = useState(5);
  const [maxSoc, setMaxSoc] = useState(95);
  const [initialSOC, setInitialSOC] = useState(50);
  const [cycleLimit, setCycleLimit] = useState<number>(2.0);
  const [enforceCycleLimit, setEnforceCycleLimit] = useState(false);

  const isSavingRef = useRef(false);
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;
  const bessSavedData = useSelector(bessContainerConfigData);

  // Check if user is an assigned user (view-only access)
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find(project => Number(project?.id) === projectId);
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isAssignedUser = Boolean(
    authData?.id && allProjData?.some(project => Number(project?.id) === projectId && project?.assigned_users?.some(user => user.id === authData.id)),
  );

  const isReadOnly = readOnly || isAssignedUser || isProjectAssignmentPending;
  const saveSuccess = useSelector(bessConfigSuccess);
  const saveLoading = useSelector((state: RootState) => state.simulationWizard.bessContainerConfigLoading);
  const saveError = useSelector((state: RootState) => state.simulationWizard.bessContainerConfigError);

  // Note: We don't clear the saved flag (tick mark) when editing
  // The tick mark indicates the data was previously saved to server

  // Call onSaveComplete when save is successful (only for fresh saves)
  useEffect(() => {
    if (!saveLoading && saveSuccess && isSavingRef.current && onSaveComplete) {
      isSavingRef.current = false;
      onSaveComplete();
    }
  }, [saveLoading, saveSuccess, onSaveComplete]);

  useEffect(() => {
    if (!saveLoading && isSavingRef.current && !saveError && onSaveComplete) {
      isSavingRef.current = false;
      onSaveComplete();
    }
  }, [saveLoading, saveError, onSaveComplete]);

  // NOTE: GET request is dispatched from SimulationWizard when simulation_id changes
  // This ensures tick marks show immediately for all tabs without delay

  useEffect(() => {
    if (bessSavedData) {
      setSelectedContainers(Array.isArray(bessSavedData.containers) ? bessSavedData.containers.map((item: {id: number}) => Number(item.id)) : []);
      setEfficiency(bessSavedData.bess_efficiency || 87);
      setMinSoc(bessSavedData.bess_min_soc || 5);
      setMaxSoc(bessSavedData.bess_max_soc || 95);
      setRange([bessSavedData.bess_min_soc || 5, bessSavedData.bess_max_soc || 95]);
      setInitialSOC(bessSavedData.bess_initial_soc || 50);
      setCycleLimit(bessSavedData.bess_daily_cycle_limit || 2.0);
      setEnforceCycleLimit(bessSavedData.bess_enforce_cycle_limit || false);
    }
  }, [bessSavedData]);

  const handleSubmit = () => {
    if (typeof simulation_id !== 'number') {
      return;
    }
    const payload = {
      containers: selectedContainers,
      bess_efficiency: efficiency,
      bess_min_soc: minSoc,
      bess_max_soc: maxSoc,
      bess_initial_soc: initialSOC,
      bess_daily_cycle_limit: cycleLimit,
      bess_enforce_cycle_limit: enforceCycleLimit,
    };
    isSavingRef.current = true;

    dispatch(bessContainerConfigRequest({simulation_id, payload}));
  };

  const isChanged = () => {
    if (!bessSavedData) return true;

    const currentContainers = selectedContainers.slice().sort();
    const savedContainers = (bessSavedData.containers || []).map((c: any) => Number(c.id)).sort();

    const containersMatch = currentContainers.length === savedContainers.length && currentContainers.every((v, i) => v === savedContainers[i]);

    return (
      !containersMatch ||
      efficiency !== (bessSavedData.bess_efficiency || 87) ||
      minSoc !== (bessSavedData.bess_min_soc || 5) ||
      maxSoc !== (bessSavedData.bess_max_soc || 95) ||
      initialSOC !== (bessSavedData.bess_initial_soc || 50) ||
      cycleLimit !== (bessSavedData.bess_daily_cycle_limit || 2.0) ||
      enforceCycleLimit !== (bessSavedData.bess_enforce_cycle_limit || false)
    );
  };

  const isAlreadySaved = !!saveSuccess;
  const disableButton = selectedContainers.length === 0 || isReadOnly || (isAlreadySaved && !isChanged());

  const guardLocalChange = (restore: () => void) => {
    requestChangeConfigurationConfirmation({onStay: restore});
  };

  const setGuardedEfficiency = (val: number) => {
    const previous = efficiency;
    setEfficiency(val);
    guardLocalChange(() => setEfficiency(previous));
  };

  const setGuardedMinSoc = (val: number) => {
    const previousMin = minSoc;
    const previousRange = range;
    setMinSoc(val);
    guardLocalChange(() => {
      setMinSoc(previousMin);
      setRange(previousRange);
    });
  };

  const setGuardedMaxSoc = (val: number) => {
    const previousMax = maxSoc;
    const previousRange = range;
    setMaxSoc(val);
    guardLocalChange(() => {
      setMaxSoc(previousMax);
      setRange(previousRange);
    });
  };

  const setGuardedInitialSOC = (val: number) => {
    const previous = initialSOC;
    setInitialSOC(val);
    guardLocalChange(() => setInitialSOC(previous));
  };

  const setGuardedCycleLimit = (val: number | ((prev: number) => number)) => {
    const previous = cycleLimit;
    setCycleLimit(val as any);
    guardLocalChange(() => setCycleLimit(previous));
  };

  const setGuardedEnforceCycleLimit = (val: boolean) => {
    const previous = enforceCycleLimit;
    setEnforceCycleLimit(val);
    guardLocalChange(() => setEnforceCycleLimit(previous));
  };

  return (
    <div className="bg-primary-tint-2/40 p-4 mt-5 border-[1.4px] border-border rounded-md w-full">
      {' '}
      <div className="flex items-center gap-3">
        <Icon name="big-battery" className="text-black! size-6.75!" />
        <Text variant={'h4'} className="font-SpaceGroteskBold">
          Battery (BESS)
        </Text>
      </div>
      <Text variant={'body1'} className="text-primary! font-InterSemiBold! my-4">
        Container Configuration
      </Text>
      <MultiSelectInput
        placeholder="select container type"
        required
        showSelectAll
        showChipsInInput
        options={BESS_CONTAINER_OPTIONS}
        values={selectedContainers}
        disabled={isReadOnly}
        onChange={items => {
          if (isReadOnly) return;
          const previous = selectedContainers;
          setSelectedContainers(items.map(item => Number(item.id)));
          guardLocalChange(() => setSelectedContainers(previous));
        }}
      />
      {selectedContainers.length === 0 && (
        <div className="flex justify-center">
          <Alert textClassName="text-text-secondary! " message="Please select at least one container type." variant="warning" className=" w-fit! my-3.5" />
        </div>
      )}
      {selectedContainers.length > 0 && (
        <BatteryInputs
          efficiency={efficiency}
          setEfficiency={setGuardedEfficiency}
          minSoc={minSoc}
          setMinSoc={setGuardedMinSoc}
          maxSoc={maxSoc}
          setMaxSoc={setGuardedMaxSoc}
          initialSOC={initialSOC}
          setInitialSOC={setGuardedInitialSOC}
          cycleLimit={cycleLimit}
          setCycleLimit={setGuardedCycleLimit}
          enforceCycleLimit={enforceCycleLimit}
          setEnforceCycleLimit={setGuardedEnforceCycleLimit}
          readOnly={isReadOnly}
        />
      )}
      {!isReadOnly && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            size="md"
            onClick={handleSubmit}
            disabled={disableButton}
            className={`self-center ${disableButton ? 'cursor-not-allowed' : ''}`}>
            Save and Continue
          </Button>
        </div>
      )}
    </div>
  );
};
