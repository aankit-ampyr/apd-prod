import {DGDriggerType, DGRunScheduleMode, LoadServingPriority} from '@/constants';
import {RootState} from '@/services/redux/rootReducer';
import {
  bessContainerConfigData,
  dispatchRuleData,
  dispatchRuleDataFailure,
  dispatchRuleDataSuccess,
  generatorData,
  loadProfileData,
  savedLoadProfileData,
  solarProfileData,
  savedSolarProfileData,
  generatorData as generatorSavedData,
  initiateSimulationData,
  projectSimulationData,
  simulationProjectLoading,
  dispatchRuleDataLoading,
} from '@/services/redux/selectors/simulationWizardSelector';
import {authDataSelector, allProjectsData, projectLoading} from '@/services/redux/selectors';
import {getAllProjectListRequest} from '@/services/redux/slice/projectsSlice';
import {dispatchRuleRequest, editedStepSimulationDataRequest, getDispatchRuleRequest} from '@/services/redux/slice/simulationWizardSlice';
import {Alert, Button, Icon, Skeleton, Text} from '@/ui-kits';
import {IOSSingleSlider, RadioCard} from '@lazarus/react-common/components';
import {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useChangeConfigurationConfirmation} from '../ChangeConfigurationContext';
import {createPortal} from 'react-dom';
import {useSimulationStatus} from '../SimulationStatusContext';

function DispatchRulesGhostLoader() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mt-1">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-64" />
      </div>

      {/* Summary Card */}
      <div className="border border-border rounded-lg p-6 mt-4">
        <Skeleton className="h-6 w-52 mb-5" />
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-4 w-full mt-5" />
        <Skeleton className="h-4 w-11/12 mt-2" />
      </div>

      <hr className="my-5 text-disabled!" />

      {/* Card 1 */}
      <div className="border border-border rounded-lg p-4 mt-4">
        <Skeleton className="h-6 w-48 mb-3" />
        <Skeleton className="h-4 w-80 mb-5" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      </div>

      {/* Card 2 */}
      <div className="border border-border rounded-lg p-4 mt-4">
        <Skeleton className="h-6 w-44 mb-3" />
        <Skeleton className="h-4 w-72 mb-5" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      </div>

      {/* Card 3 */}
      <div className="border border-border rounded-lg p-4 mt-4">
        <Skeleton className="h-6 w-52 mb-3" />
        <Skeleton className="h-4 w-80 mb-5" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      </div>

      {/* Card 4 */}
      <div className="border border-border rounded-lg p-4 mt-4">
        <Skeleton className="h-6 w-52 mb-3" />
        <Skeleton className="h-4 w-72 mb-5" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      </div>

      {/* Card 5 */}
      <div className="border border-border rounded-lg p-4 mt-4">
        <Skeleton className="h-6 w-44 mb-3" />
        <Skeleton className="h-4 w-80 mb-5" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      </div>

      {/* Card 6 */}
      <div className="border border-border rounded-lg p-4 mt-4">
        <Skeleton className="h-6 w-52 mb-3" />
        <Skeleton className="h-4 w-80 mb-5" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="mt-6 flex justify-center gap-5">
        <Skeleton className="h-11 w-40 rounded-md" />
        <Skeleton className="h-11 w-52 rounded-md" />
      </div>
    </div>
  );
}

interface DispatchRulesProps {
  onNextToSizing?: () => void;
}

export const DispatchRules = ({onNextToSizing}: DispatchRulesProps) => {
  const dispatch = useDispatch();
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();
  const {isAnySimulationRunning, runningSimulationId, userName} = useSimulationStatus() ?? {};

  const dgData = useSelector(generatorData);
  const success = useSelector(dispatchRuleDataSuccess);
  const failure = useSelector(dispatchRuleDataFailure);
  const isProSimulLoading = useSelector(simulationProjectLoading);
  const dispatchLoading = useSelector(dispatchRuleDataLoading);

  const saveLoading = useSelector((state: RootState) => state.simulationWizard.dispatchRuleLoading);
  const hasGenerator = dgData?.is_included;
  const isBinaryMode = dgData?.is_binary;
  const isSavingRef = useRef(false);
  const hasRequestedProjectListRef = useRef(false);
  const [hasSavedInCurrentSession, setHasSavedInCurrentSession] = useState(false);
  const skipScheduleTimeDefaultsFromQ1 = useRef(false);
  const skipSocOffDefaultFromRestore = useRef(false);
  const skipStopSocDefaultFromRestore = useRef(false);

  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;

  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulation_id;

  // Check if user is an assigned user (view-only access)
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const isProjectLoading = useSelector(projectLoading);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find(project => Number(project?.id) === projectId);
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isAssignedUser = Boolean(authData?.id && currentProject?.assigned_users?.some(user => user.id === authData.id));

  const bessSavedData = useSelector(bessContainerConfigData);

  const dispatchData = useSelector(dispatchRuleData);

  const loadProfileCurrent = useSelector(loadProfileData);
  const loadProfileSaved = useSelector(savedLoadProfileData);
  const solarProfileCurrent = useSelector(solarProfileData);
  const solarProfileSaved = useSelector(savedSolarProfileData);
  const bessSaved = useSelector(bessContainerConfigData);
  const generatorSaved = useSelector(generatorSavedData);
  const isStep1Complete = Boolean((loadProfileSaved || loadProfileCurrent) && (solarProfileSaved || solarProfileCurrent) && bessSaved && generatorSaved);

  const minSoc = Number(bessSavedData?.bess_min_soc);

  const maxSoc = Number(bessSavedData?.bess_max_soc);

  const steps = [
    'Solar power serves load directly',
    'Excess solar charges the battery',
    'Battery discharges when solar is insufficient',
    'Any remaining deficit is unserved load',
  ];

  // Track dirty state for Save & Continue button
  const [dirty, setDirty] = useState(false);
  const lastSaved = useRef<any>({});

  // Form fields
  const [q1, setQ1] = useState<number | null>(DGRunScheduleMode.Anytime);
  const [q2, setQ2] = useState<number | null>(DGDriggerType['Battery + Solar deficiency']);
  const [q3, setQ3] = useState<boolean | null>(false);
  const [q4, setQ4] = useState<number | null>(LoadServingPriority['BESS First (Solar → BESS → DG)']);
  const [q5, setQ5] = useState<boolean | null>(false);
  const [q6, setQ6] = useState<boolean | null>(false);
  const [startTime, setStartTime] = useState(6);
  const [endTime, setEndTime] = useState(18);

  const [socOn, setSocOn] = useState(() => Math.max(30, minSoc));

  // Returns the default for socOff, but clamps to at least socOn + 20 for stopSoc
  const getSocOffDefault = (minValue?: number) => {
    let baseDefault;
    if (socOn + 10 < 80 && 80 < maxSoc) {
      baseDefault = 80;
    } else {
      baseDefault = Math.min(socOn + 10, maxSoc);
    }
    if (typeof minValue === 'number') {
      return Math.max(baseDefault, minValue);
    }
    return baseDefault;
  };

  const [socOff, setSocOff] = useState(() => getSocOffDefault());

  const [minLoad, setMinLoad] = useState(70);
  // For stopSoc, default must be at least socOn + 20
  const [stopSoc, setStopSoc] = useState(() => getSocOffDefault(socOn + 20));

  const getCurrentFormValues = () => ({
    q1,
    q2,
    q3,
    q4,
    q5,
    q6,
    startTime,
    endTime,
    socOn,
    socOff,
    minLoad,
    stopSoc,
  });

  const restoreFormValues = (values: ReturnType<typeof getCurrentFormValues>) => {
    skipScheduleTimeDefaultsFromQ1.current = true;
    skipSocOffDefaultFromRestore.current = true;
    skipStopSocDefaultFromRestore.current = true;
    setQ1(values.q1);
    setQ2(values.q2);
    setQ3(values.q3);
    setQ4(values.q4);
    setQ5(values.q5);
    setQ6(values.q6);
    setStartTime(values.startTime);
    setEndTime(values.endTime);
    setSocOn(values.socOn);
    setSocOff(values.socOff);
    setMinLoad(values.minLoad);
    setStopSoc(values.stopSoc);
  };

  const confirmDispatchRuleChange = (previousValues: ReturnType<typeof getCurrentFormValues>) => {
    requestChangeConfigurationConfirmation({
      onStay: () => restoreFormValues(previousValues),
    });
  };

  const updateDispatchField = <T,>(setter: (value: T) => void, value: T) => {
    const previousValues = getCurrentFormValues();
    setter(value);
    confirmDispatchRuleChange(previousValues);
  };

  const applyScheduleDefaults = (mode: DGRunScheduleMode) => {
    const previousValues = getCurrentFormValues();
    setQ1(mode);

    if (mode === DGRunScheduleMode.DayOnly || mode === DGRunScheduleMode.NightOnly) {
      setQ2(DGDriggerType['Battery SOC threshold']);
      setQ3(false);
      setQ4(LoadServingPriority['BESS First (Solar → BESS → DG)']);
      setQ5(true);
      setQ6(false);
      confirmDispatchRuleChange(previousValues);
      return;
    }

    if (mode === DGRunScheduleMode.CustomBlackout) {
      setQ2(DGDriggerType['Battery + Solar deficiency']);
      setQ3(false);
      setQ4(LoadServingPriority['BESS First (Solar → BESS → DG)']);
      setQ5(true);
      setQ6(false);
    }

    confirmDispatchRuleChange(previousValues);
  };

  useEffect(() => {
    if (!shouldBlock) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', handleClick, true);
    };
  }, [shouldBlock]);

  useEffect(() => {
    // On mount, fetch existing dispatch rule data if it exists to pre-populate form
    if (simulation_id) {
      dispatch(getDispatchRuleRequest({simulation_id}));
    }
  }, [simulation_id]);

  useEffect(() => {
    if (authData?.id && projectId && !currentProject && !isProjectLoading && !hasRequestedProjectListRef.current) {
      hasRequestedProjectListRef.current = true;
      dispatch(getAllProjectListRequest());
    }
  }, [authData?.id, projectId, currentProject, isProjectLoading, dispatch]);

  useEffect(() => {
    if (simulation_id) {
      dispatch(editedStepSimulationDataRequest({simulation_id}));
    }
  }, [simulation_id]);

  useEffect(() => {
    // Enable Save & Continue when no dispatch data exists (new project with defaults)
    if (!dispatchData && !hasSavedInCurrentSession) {
      setDirty(true);
    }
  }, [dispatchData, hasSavedInCurrentSession]);

  // On load, set form fields and lastSaved
  useEffect(() => {
    if (dispatchData) {
      setQ1(dispatchData?.dg_run_schedule_mode ?? DGRunScheduleMode.Anytime);
      setQ2(dispatchData?.dg_trigger_type ?? DGDriggerType['Battery + Solar deficiency']);
      setQ3(dispatchData?.is_dg_charging_bess ?? false);
      setQ4(dispatchData?.load_serving_priority ?? LoadServingPriority['BESS First (Solar → BESS → DG)']);
      setQ5(dispatchData?.is_dg_takeover_full_load ?? true);
      setQ6(dispatchData?.is_cycle_charging_enabled ?? false);

      if (dispatchData?.dg_start_time !== null && dispatchData?.dg_end_time !== null) {
        skipScheduleTimeDefaultsFromQ1.current = true;
      }

      setStartTime(dispatchData?.dg_start_time !== undefined && dispatchData?.dg_start_time !== null ? Number(dispatchData?.dg_start_time) : 6);
      setEndTime(dispatchData?.dg_end_time !== undefined && dispatchData?.dg_end_time !== null ? Number(dispatchData?.dg_end_time) : 18);
      setSocOn(
        dispatchData?.dg_soc_on_threshold !== undefined && dispatchData?.dg_soc_on_threshold !== null
          ? Number(dispatchData?.dg_soc_on_threshold)
          : Math.max(30, minSoc),
      );
      setSocOff(
        dispatchData?.dg_soc_off_threshold !== undefined && dispatchData?.dg_soc_off_threshold !== null
          ? Number(dispatchData?.dg_soc_off_threshold)
          : getSocOffDefault(),
      );
      setMinLoad(dispatchData?.min_load !== undefined && dispatchData?.min_load !== null ? Number(dispatchData?.min_load) : 70);
      setStopSoc(dispatchData?.stop_soc !== undefined && dispatchData?.stop_soc !== null ? Number(dispatchData?.stop_soc) : getSocOffDefault());

      // If loaded data matches form state, set hasSavedInCurrentSession true
      setTimeout(() => {
        const payload = {
          dg_run_schedule_mode: dispatchData?.dg_run_schedule_mode ?? DGRunScheduleMode.Anytime,
          dg_trigger_type: dispatchData?.dg_trigger_type ?? DGDriggerType['Battery + Solar deficiency'],
          is_dg_charging_bess: dispatchData?.is_dg_charging_bess ?? false,
          load_serving_priority: dispatchData?.load_serving_priority ?? LoadServingPriority['BESS First (Solar → BESS → DG)'],
          is_dg_takeover_full_load: dispatchData?.is_dg_takeover_full_load ?? true,
          is_cycle_charging_enabled: dispatchData?.is_cycle_charging_enabled ?? false,
          dg_start_time: dispatchData?.dg_start_time !== undefined && dispatchData?.dg_start_time !== null ? Number(dispatchData?.dg_start_time) : 6,
          dg_end_time: dispatchData?.dg_end_time !== undefined && dispatchData?.dg_end_time !== null ? Number(dispatchData?.dg_end_time) : 18,
          dg_soc_on_threshold:
            dispatchData?.dg_soc_on_threshold !== undefined && dispatchData?.dg_soc_on_threshold !== null ? Number(dispatchData?.dg_soc_on_threshold) : 30,
          dg_soc_off_threshold:
            dispatchData?.dg_soc_off_threshold !== undefined && dispatchData?.dg_soc_off_threshold !== null
              ? Number(dispatchData?.dg_soc_off_threshold)
              : getSocOffDefault(),
          min_load: dispatchData?.min_load !== undefined && dispatchData?.min_load !== null ? Number(dispatchData?.min_load) : 70,
          stop_soc: dispatchData?.stop_soc !== undefined && dispatchData?.stop_soc !== null ? Number(dispatchData?.stop_soc) : Math.min(30 + 30, maxSoc),
        };
        // Compare with dispatchData itself (form state is set to this on mount)
        setHasSavedInCurrentSession(true);
      }, 0);
    }
  }, [dispatchData]);

  useEffect(() => {
    if (!saveLoading && isSavingRef.current) {
      setHasSavedInCurrentSession(Boolean(success) && !failure);
      isSavingRef.current = false;
    }
  }, [saveLoading, success, failure]);

  useEffect(() => {
    if (skipScheduleTimeDefaultsFromQ1.current) {
      skipScheduleTimeDefaultsFromQ1.current = false;
      return;
    }
    if (q1 === DGRunScheduleMode.DayOnly) {
      setStartTime(6);
      setEndTime(18);
      return;
    }

    if (q1 === DGRunScheduleMode.NightOnly) {
      setStartTime(18);
      setEndTime(6);
      return;
    }

    if (q1 === DGRunScheduleMode.CustomBlackout) {
      setStartTime(22);
      setEndTime(6);
    }
  }, [q1]);

  useEffect(() => {
    if (skipSocOffDefaultFromRestore.current) {
      skipSocOffDefaultFromRestore.current = false;
      return;
    }
    setSocOff(getSocOffDefault());
  }, [getSocOffDefault]);

  useEffect(() => {
    if (skipStopSocDefaultFromRestore.current) {
      skipStopSocDefaultFromRestore.current = false;
      return;
    }
    // Always clamp stopSoc to at least socOn + 20
    setStopSoc(getSocOffDefault(socOn + 20));
  }, [socOn, maxSoc]);

  const getTopCardData = () => {
    // DEFAULT (No generator or not selected)
    if (!q1 && !q2) {
      return {
        heading: 'Solar + BESS Only',
        metrics: 'Solar → Battery → Unserved',
        message: 'Solar power serves load directly. Excess solar charges battery. Battery discharges when solar is insufficient.',
      };
    }

    // =========================
    // HEADING (Q1 + Q2)
    // =========================
    let heading = '';

    if (q1 === DGRunScheduleMode.Anytime && q2 === DGDriggerType['Battery + Solar deficiency']) {
      heading = 'Green Priority';
    } else if (q1 === DGRunScheduleMode.DayOnly && q2 === DGDriggerType['Battery SOC threshold']) {
      heading = 'DG Day Charge';
    } else if (q1 === DGRunScheduleMode.NightOnly && q2 === DGDriggerType['Battery SOC threshold']) {
      heading = 'DG Night SoC Trigger';
    } else if (q1 === DGRunScheduleMode.CustomBlackout && q2 === DGDriggerType['Battery + Solar deficiency']) {
      heading = 'DG Blackout Window';
    } else if (q1 === DGRunScheduleMode.Anytime && q2 === DGDriggerType['Battery SOC threshold']) {
      heading = 'DG Emergency Only';
    } else if (q1 === DGRunScheduleMode.NightOnly && q2 === DGDriggerType['Pre-emptive night charge']) {
      heading = 'DG Night Charge';
    }

    // =========================
    // METRICS (Q3 + Q4)
    // =========================
    let metrics = '';

    if (q4 === LoadServingPriority['DG First (Solar → DG → BESS)']) {
      metrics = 'Solar → DG → BESS → Unserved';
    } else {
      metrics = 'Solar → BESS → DG → Unserved';
    }
    if (q3 === true) {
      // BESS First (default)
      metrics += ' + DG → Battery';
    }

    // =========================
    // MESSAGE (Q1-Q6)
    // =========================
    let message = '';

    // Custom messages for specific combinations
    if (q4 === LoadServingPriority['BESS First (Solar → BESS → DG)'] && q3 === true) {
      // If DG can charge battery, show bracket as 'Depends on Q1+Q2 (Excess DG charges battery)'
      let mainMsg = '';
      if (q1 === DGRunScheduleMode.Anytime && q2 === DGDriggerType['Battery + Solar deficiency'] && q5 === true && q6 === false) {
        mainMsg = 'Generator runs only when battery depleted';
      } else if (q1 === DGRunScheduleMode.DayOnly && q2 === DGDriggerType['Battery SOC threshold'] && q5 === true && q6 === false) {
        mainMsg = 'Generator can only run during day hours, SoC-triggered';
      } else if (q1 === DGRunScheduleMode.NightOnly && q2 === DGDriggerType['Battery SOC threshold'] && q5 === true && q6 === false) {
        mainMsg = 'Generator runs at night when battery low';
      } else if (q1 === DGRunScheduleMode.CustomBlackout && q2 === DGDriggerType['Battery + Solar deficiency'] && q5 === true && q6 === false) {
        mainMsg = 'Generator cannot run during specified hours';
      } else if (q1 === DGRunScheduleMode.Anytime && q2 === DGDriggerType['Battery SOC threshold'] && q5 === true && q6 === false) {
        mainMsg = 'Generator starts only when battery drops below threshold';
      } else if (q1 === DGRunScheduleMode.NightOnly && q2 === DGDriggerType['Pre-emptive night charge'] && q5 === true && q6 === false) {
        mainMsg = 'Generator charges battery proactively at night';
      }
      if (mainMsg) {
        message = `${mainMsg} (Excess DG charges battery)`;
      } else {
        // fallback for other BESS First + DG charges battery
        message = 'Generator runs when battery is low and excess DG power charges battery (Excess DG charges battery)';
      }
    } else if (
      q1 === DGRunScheduleMode.Anytime &&
      q2 === DGDriggerType['Battery + Solar deficiency'] &&
      q3 === false &&
      q4 === LoadServingPriority['BESS First (Solar → BESS → DG)']
    ) {
      message = 'Generator runs only when battery depleted (Battery charges from solar only)';
    } else if (
      q1 === DGRunScheduleMode.DayOnly &&
      q2 === DGDriggerType['Battery SOC threshold'] &&
      q3 === false &&
      q4 === LoadServingPriority['BESS First (Solar → BESS → DG)']
    ) {
      message = 'Generator can only run during day hours, SoC-triggered (Battery charges from solar only)';
    } else if (
      q1 === DGRunScheduleMode.NightOnly &&
      q2 === DGDriggerType['Battery SOC threshold'] &&
      q3 === false &&
      q4 === LoadServingPriority['BESS First (Solar → BESS → DG)']
    ) {
      message = 'Generator runs at night when battery low (Battery charges from solar only)';
    } else if (
      q1 === DGRunScheduleMode.CustomBlackout &&
      q2 === DGDriggerType['Battery + Solar deficiency'] &&
      q3 === false &&
      q4 === LoadServingPriority['BESS First (Solar → BESS → DG)']
    ) {
      message = 'Generator cannot run during specified hours (Battery charges from solar only)';
    } else if (
      q1 === DGRunScheduleMode.Anytime &&
      q2 === DGDriggerType['Battery SOC threshold'] &&
      q3 === false &&
      q4 === LoadServingPriority['BESS First (Solar → BESS → DG)']
    ) {
      message = 'Generator starts only when battery drops below threshold (Battery charges from solar only)';
    } else if (
      q1 === DGRunScheduleMode.NightOnly &&
      q2 === DGDriggerType['Pre-emptive night charge'] &&
      q3 === false &&
      q4 === LoadServingPriority['BESS First (Solar → BESS → DG)']
    ) {
      message = 'Generator charges battery proactively at night (Battery charges from solar only)';
    } else if (q4 === LoadServingPriority['DG First (Solar → DG → BESS)'] && q3 === true) {
      // If DG First and DG can charge battery, show bracket as '(Excess DG charges battery)'
      let mainMsg = '';
      if (q1 === DGRunScheduleMode.Anytime && q2 === DGDriggerType['Battery + Solar deficiency']) {
        mainMsg = 'Generator runs only when battery depleted';
      } else if (q1 === DGRunScheduleMode.DayOnly && q2 === DGDriggerType['Battery SOC threshold']) {
        mainMsg = 'Generator can only run during day hours, SoC-triggered';
      } else if (q1 === DGRunScheduleMode.NightOnly && q2 === DGDriggerType['Battery SOC threshold']) {
        mainMsg = 'Generator runs at night when battery low';
      } else if (q1 === DGRunScheduleMode.CustomBlackout && q2 === DGDriggerType['Battery + Solar deficiency']) {
        mainMsg = 'Generator cannot run during specified hours';
      } else if (q1 === DGRunScheduleMode.Anytime && q2 === DGDriggerType['Battery SOC threshold']) {
        mainMsg = 'Generator starts only when battery drops below threshold';
      } else if (q1 === DGRunScheduleMode.NightOnly && q2 === DGDriggerType['Pre-emptive night charge']) {
        mainMsg = 'Generator charges battery proactively at night';
      }
      if (mainMsg) {
        message = `${mainMsg} (Excess DG charges battery)`;
      } else {
        // fallback for other DG First + DG charges battery
        message = 'Generator prioritizes serving load first, battery charges later. (Excess DG charges battery)';
      }
    } else if (q4 === LoadServingPriority['DG First (Solar → DG → BESS)'] && q3 === false) {
      // If DG First and solar only, show bracket as '(Battery charges from solar only)'
      let mainMsg = '';
      if (q1 === DGRunScheduleMode.Anytime && q2 === DGDriggerType['Battery + Solar deficiency']) {
        mainMsg = 'Generator runs only when battery depleted';
      } else if (q1 === DGRunScheduleMode.DayOnly && q2 === DGDriggerType['Battery SOC threshold']) {
        mainMsg = 'Generator can only run during day hours, SoC-triggered';
      } else if (q1 === DGRunScheduleMode.NightOnly && q2 === DGDriggerType['Battery SOC threshold']) {
        mainMsg = 'Generator runs at night when battery low';
      } else if (q1 === DGRunScheduleMode.CustomBlackout && q2 === DGDriggerType['Battery + Solar deficiency']) {
        mainMsg = 'Generator cannot run during specified hours';
      } else if (q1 === DGRunScheduleMode.Anytime && q2 === DGDriggerType['Battery SOC threshold']) {
        mainMsg = 'Generator starts only when battery drops below threshold';
      } else if (q1 === DGRunScheduleMode.NightOnly && q2 === DGDriggerType['Pre-emptive night charge']) {
        mainMsg = 'Generator charges battery proactively at night';
      }
      if (mainMsg) {
        message = `${mainMsg} (Battery charges from solar only)`;
      } else {
        // fallback for other DG First + solar only
        message = 'Generator prioritizes serving load first, battery charges later. (Battery charges from solar only)';
      }
    } else {
      // Fallback to previous logic
      if (q4 === LoadServingPriority['DG First (Solar → DG → BESS)']) {
        message = 'Generator prioritizes serving load first, battery charges later. Leads to fewer battery cycles but higher fuel usage.';
      } else {
        // BESS First
        message = q3
          ? 'Generator runs when battery is low and excess DG power charges battery.'
          : 'Generator runs only when battery is depleted. Battery charges only from solar.';
      }
    }

    return {heading, metrics, message};
  };

  const {heading, metrics, message} = getTopCardData();

  const handleSave = () => {
    if (typeof simulation_id !== 'number') {
      return;
    }
    const payload = {
      simulation_id: simulation_id,
      dg_run_schedule_mode: q1 as number,
      dg_start_time: q1 === DGRunScheduleMode.Anytime ? null : startTime,
      dg_end_time: q1 === DGRunScheduleMode.Anytime ? null : endTime,
      dg_trigger_type: q2,
      dg_soc_on_threshold: q2 === DGDriggerType['Battery SOC threshold'] ? socOn : null,
      dg_soc_off_threshold: q2 === DGDriggerType['Battery SOC threshold'] ? socOff : null,
      is_dg_charging_bess: q3,
      load_serving_priority: q4,
      is_dg_takeover_full_load: q5,
      is_cycle_charging_enabled: q6,
      min_load: q6 ? minLoad : null,
      stop_soc: q6 ? stopSoc : null,
    };
    isSavingRef.current = true;
    dispatch(dispatchRuleRequest(payload));
    // Optimistically set dirty to false (will be reset by useEffect on success)
    lastSaved.current = {
      q1,
      q2,
      q3,
      q4,
      q5,
      q6,
      startTime,
      endTime,
      socOn,
      socOff,
      minLoad,
      stopSoc,
    };
    setDirty(false);
  };

  const ErrorMessage = ({message}: {message: string}) => (
    <div className="flex items-center gap-2 mt-3 text-error-text!">
      <Icon name="infoCircle" className="text-error-text! size-4" />
      <Text variant="caption" className="text-error-text! font-InterMedium!">
        {message}
      </Text>
    </div>
  );

  const isTimeInvalid = startTime === endTime;
  const getTimeValidationMessage = () => {
    if (q1 === DGRunScheduleMode.NightOnly) {
      return 'Night start and end cannot be the same hour';
    }

    if (q1 === DGRunScheduleMode.CustomBlackout) {
      return 'Blackout start and end cannot be the same hour';
    }

    return 'Day start and end cannot be the same hour';
  };

  const isStep1Changed = () => {
    if (!dispatchData) return false;
    return dispatchData.is_generator_included !== !!hasGenerator || dispatchData.is_generator_binary !== !!isBinaryMode;
  };

  const isChanged = () => {
    if (!dispatchData) return true;

    const payload = {
      simulation_id: simulation_id,
      dg_run_schedule_mode: q1 as number,
      dg_start_time: q1 === DGRunScheduleMode.Anytime ? null : startTime,
      dg_end_time: q1 === DGRunScheduleMode.Anytime ? null : endTime,
      dg_trigger_type: q2,
      dg_soc_on_threshold: q2 === DGDriggerType['Battery SOC threshold'] ? socOn : null,
      dg_soc_off_threshold: q2 === DGDriggerType['Battery SOC threshold'] ? socOff : null,
      is_dg_charging_bess: q3,
      load_serving_priority: q4,
      is_dg_takeover_full_load: q5,
      is_cycle_charging_enabled: q6,
      min_load: q6 ? minLoad : null,
      stop_soc: q6 ? stopSoc : null,
    };

    const savedStartTime = dispatchData.dg_start_time;
    const savedEndTime = dispatchData.dg_end_time;
    const savedSocOn = dispatchData.dg_soc_on_threshold;
    const savedSocOff = dispatchData.dg_soc_off_threshold;
    const savedMinLoad = dispatchData.min_load;
    const savedStopSoc = dispatchData.stop_soc;

    return (
      isStep1Changed() ||
      payload.dg_run_schedule_mode !== dispatchData.dg_run_schedule_mode ||
      payload.dg_trigger_type !== dispatchData.dg_trigger_type ||
      payload.is_dg_charging_bess !== dispatchData.is_dg_charging_bess ||
      payload.load_serving_priority !== dispatchData.load_serving_priority ||
      payload.is_dg_takeover_full_load !== dispatchData.is_dg_takeover_full_load ||
      payload.is_cycle_charging_enabled !== dispatchData.is_cycle_charging_enabled ||
      (payload.dg_start_time === null ? savedStartTime !== null : payload.dg_start_time !== Number(savedStartTime)) ||
      (payload.dg_end_time === null ? savedEndTime !== null : payload.dg_end_time !== Number(savedEndTime)) ||
      (payload.dg_soc_on_threshold === null ? savedSocOn !== null : payload.dg_soc_on_threshold !== Number(savedSocOn)) ||
      (payload.dg_soc_off_threshold === null ? savedSocOff !== null : payload.dg_soc_off_threshold !== Number(savedSocOff)) ||
      (payload.min_load === null ? savedMinLoad !== null : payload.min_load !== Number(savedMinLoad)) ||
      (payload.stop_soc === null ? savedStopSoc !== null : payload.stop_soc !== Number(savedStopSoc))
    );
  };

  const hasValidationErrors = Boolean(
    (q1 !== DGRunScheduleMode.Anytime && Number(isTimeInvalid)) ||
    (q6 === true && Number(socOn + 20 >= maxSoc)) ||
    (q2 === DGDriggerType['Battery SOC threshold'] && Number(minSoc >= maxSoc - 10)) ||
    (q2 === DGDriggerType['Battery SOC threshold'] && Number(socOn + 10 >= maxSoc)),
  );

  const btnDisable = Boolean(hasValidationErrors || !isStep1Complete || (!hasSavedInCurrentSession && !dirty) || (hasSavedInCurrentSession && !isChanged()));

  if (isProSimulLoading || dispatchLoading) {
    return <DispatchRulesGhostLoader />;
  }

  return (
    <div>
      {shouldBlock && (
        <div className="flex justify-center">
          <Alert
            textClassName="text-error-text! text-[14px]!"
            iconClassName="mt-0! size-4.5!"
            iconName="warning-triangle-sharp"
            message={`${userName} is currently running this simulation. You can run it again once it completes`}
            variant="error"
            className={`w-fit! justify-center items-center! p-3! border-0.5 border-error/20`}
          />
        </div>
      )}
      <div className="flex items-center gap-3 mt-1">
        <Icon name="monitor-settings" className="text-black! size-6.75!" />
        <Text variant="h3" className="font-SpaceGroteskBold">
          System Configuration
        </Text>
      </div>

      <div className="bg-[#F2F7F6] border border-border border-l-secondary rounded-lg p-6 mt-4 border-l-3">
        {hasGenerator ? (
          <div>
            <div className="flex items-center gap-2">
              <Icon name="circle-check-big" className="text-text-primary! size-5" />
              <Text variant="body1" className="font-InterSemiBold! text-text-primary!">
                Dispatch Strategy Selected
              </Text>
            </div>

            <div className="mt-4 rounded-md bg-white px-5 py-3">
              <Text variant="small" className="font-InterSemiBold! text-success!">
                {heading}
              </Text>
              <Text variant="caption" className="mt-1 font-InterMedium! text-text-primary!">
                {metrics}
              </Text>
            </div>

            <Text variant="caption" className="mt-4 font-InterMedium! text-text-primary!">
              {message}
            </Text>
          </div>
        ) : (
          <>
            <div className="border border-border bg-white rounded-sm p-3">
              <div className="flex items-start gap-2">
                <Icon name="infoCircle" className="text-primary! mt-1" />
                <div className="flex flex-col">
                  <Text variant="caption" className="font-semibold! text-text-primary! mb-3">
                    Your system has no generator. The dispatch strategy is automatically set to Solar + BESS Only.
                  </Text>
                  <Text variant="caption" className="font-InterSemibold! text-success!">
                    Solar → Battery → Unserved
                  </Text>
                </div>
              </div>
            </div>

            <div className="border border-border bg-white rounded-sm p-3 mt-4">
              <Text variant="caption2" className="font-InterMedium! mb-2">
                How it works:
              </Text>

              <ol className="list-decimal pl-5 space-y-1">
                {steps.map((step, index) => (
                  <li key={index} className="text-[14px] text-text-primary! font-InterMedium">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>
      <hr className="w-full text-disabled! my-5" />

      {hasGenerator && (
        <>
          <div className="bg-[#F7FDFC] border border-border p-4 mt-4 rounded-lg">
            <Text variant="body1" className=" text-text-primary! font-InterSemiBold!">
              1. When can DG run?
            </Text>
            <Alert
              iconClassName="text-primary!"
              message="Restricts DG to specific hours. Affects green hours vs DG hours balance."
              textClassName="text-text-secondary! font-InterRegular! text-[12px]! mt-0.5"
              className="border-none px-0! mb-2"
            />
            <div className="grid grid-cols-2 gap-4">
              <RadioCard
                label="Anytime"
                checked={q1 === DGRunScheduleMode.Anytime}
                onChange={() => updateDispatchField(setQ1, DGRunScheduleMode.Anytime)}
                className="w-full"
                disabled={isAssignedUser}
              />

              <RadioCard
                label="Day Only"
                checked={q1 === DGRunScheduleMode.DayOnly}
                onChange={() => applyScheduleDefaults(DGRunScheduleMode.DayOnly)}
                className="w-full"
                disabled={isAssignedUser}
              />

              <RadioCard
                label="Night Only"
                checked={q1 === DGRunScheduleMode.NightOnly}
                onChange={() => applyScheduleDefaults(DGRunScheduleMode.NightOnly)}
                className="w-full"
                disabled={isAssignedUser}
              />

              <RadioCard
                label="Custom Blackout"
                checked={q1 === DGRunScheduleMode.CustomBlackout}
                onChange={() => applyScheduleDefaults(DGRunScheduleMode.CustomBlackout)}
                className="w-full"
                disabled={isAssignedUser}
              />
            </div>
            {q1 !== DGRunScheduleMode.Anytime && q1 !== null && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <IOSSingleSlider
                  valueLabelOnThumb="off"
                  label="Start Hour"
                  min={0}
                  max={23}
                  step={1}
                  value={startTime}
                  onChange={value => updateDispatchField(setStartTime, value)}
                  unit="hr"
                  valueLabel
                  valueLabelClassName={isTimeInvalid ? 'text-error-text!' : ''}
                  readOnly={isAssignedUser}
                />

                <IOSSingleSlider
                  valueLabelOnThumb="off"
                  label="End Hour"
                  min={0}
                  max={23}
                  step={1}
                  value={endTime}
                  onChange={value => updateDispatchField(setEndTime, value)}
                  unit="hr"
                  valueLabel
                  valueLabelClassName={isTimeInvalid ? 'text-error-text!' : ''}
                  readOnly={isAssignedUser}
                />
              </div>
            )}
            {q1 !== DGRunScheduleMode.Anytime && isTimeInvalid && <ErrorMessage message={getTimeValidationMessage()} />}
          </div>

          <div className="bg-[#F7FDFC] border border-border p-4 mt-4 rounded-lg">
            <Text variant="body1" className=" text-text-primary! font-InterSemiBold!">
              2. What triggers DG?
            </Text>
            <Alert
              iconClassName="text-primary!"
              message="Controls DG start frequency. Affects DG runtime hours and start count."
              textClassName="text-text-secondary! font-InterRegular! text-[12px]! mt-0.5"
              className="border-none px-0! mb-2"
            />
            <div className="grid grid-cols-2 gap-4">
              {(q1 === DGRunScheduleMode.Anytime || q1 === DGRunScheduleMode.CustomBlackout) && (
                <RadioCard
                  label="When battery + solar cannot meet load"
                  checked={q2 === DGDriggerType['Battery + Solar deficiency']}
                  onChange={() => updateDispatchField(setQ2, DGDriggerType['Battery + Solar deficiency'])}
                  className="w-full"
                  disabled={isAssignedUser}
                />
              )}

              {(q1 === DGRunScheduleMode.Anytime ||
                q1 === DGRunScheduleMode.DayOnly ||
                q1 === DGRunScheduleMode.NightOnly ||
                q1 === DGRunScheduleMode.CustomBlackout) && (
                <RadioCard
                  label="When battery charge drops below threshold"
                  checked={q2 === DGDriggerType['Battery SOC threshold']}
                  onChange={() => updateDispatchField(setQ2, DGDriggerType['Battery SOC threshold'])}
                  className="w-full"
                  disabled={isAssignedUser}
                />
              )}

              {q1 === DGRunScheduleMode.NightOnly && (
                <RadioCard
                  label="At start of night (pre-emptive charging)"
                  checked={q2 === DGDriggerType['Pre-emptive night charge']}
                  onChange={() => updateDispatchField(setQ2, DGDriggerType['Pre-emptive night charge'])}
                  className="w-full"
                  disabled={isAssignedUser}
                />
              )}
            </div>
            {q2 === DGDriggerType['Battery SOC threshold'] && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <IOSSingleSlider
                    label="ON below %"
                    valueLabelOnThumb="off"
                    min={Number(bessSavedData?.bess_min_soc)}
                    max={Number(bessSavedData?.bess_max_soc) - 10}
                    step={5}
                    // value={minSoc >= maxSoc - 10 ? Number(bessSavedData?.bess_min_soc) : socOn}
                    // value={Math.max(30, minSoc)}
                    value={socOn}
                    onChange={value => updateDispatchField(setSocOn, value)}
                    unit="%"
                    valueLabel={!(minSoc >= maxSoc - 10)}
                    disabled={minSoc >= maxSoc - 10}
                    readOnly={isAssignedUser}
                  />
                  {/* ON error here */}
                  {(socOn < minSoc || minSoc >= maxSoc - 10) && <ErrorMessage message="SOC ON threshold cannot be below BESS min SOC" />}

                  {socOff - socOn < 20 && !(socOn + 10 >= maxSoc) && (
                    <div className="flex items-center gap-2 mt-3 text-error-text!">
                      <Icon name="infoCircle" className="text-error-text! size-4" />
                      <Text variant="caption" className="text-error-text! font-InterMedium!">
                        Small deadband ({socOff - socOn}%) may cause frequent cycling
                      </Text>
                    </div>
                  )}
                </div>
                <div>
                  <IOSSingleSlider
                    label="OFF above %"
                    valueLabelOnThumb="off"
                    min={socOn + 10}
                    max={Number(bessSavedData?.bess_max_soc)}
                    step={5}
                    value={socOff}
                    onChange={value => updateDispatchField(setSocOff, value)}
                    unit="%"
                    valueLabel={!(socOn + 10 >= maxSoc || minSoc >= maxSoc - 10)}
                    disabled={socOn + 10 >= maxSoc || minSoc >= maxSoc - 10}
                    readOnly={isAssignedUser}
                  />
                  {/* OFF error here */}
                  {(socOff > maxSoc || socOn + 10 >= maxSoc || minSoc >= maxSoc - 10) && (
                    <ErrorMessage message="SOC OFF threshold cannot exceed BESS max SOC" />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#F7FDFC] border border-border p-4 mt-4 rounded-lg">
            <Text variant="body1" className=" text-text-primary! font-InterSemiBold!">
              3. Can DG charge battery?
            </Text>
            <Alert
              iconClassName="text-primary!"
              message="If Yes, excess DG power charges BESS. Can reduce solar wastage but increases DG fuel use."
              textClassName="text-text-secondary! font-InterRegular! text-[12px]! mt-0.5"
              className="border-none px-0! mb-2"
            />
            <div className="grid grid-cols-2 gap-4">
              <RadioCard
                label="No — Solar only charges BESS"
                checked={q3 === false}
                onChange={() => updateDispatchField(setQ3, false)}
                className="w-full"
                disabled={isAssignedUser}
              />

              <RadioCard
                label="Yes — Excess DG power charges BESS"
                checked={q3 === true}
                onChange={() => updateDispatchField(setQ3, true)}
                className="w-full"
                disabled={isAssignedUser}
              />
            </div>
          </div>

          <div className={`${q5 === true ? 'bg-[#F8F8F8]' : ''} bg-[#F7FDFC] border border-border p-4 mt-4 rounded-lg`}>
            <Text variant="body1" className={`${q5 === true ? 'text-text-placeholder! font-InterSemiBold!' : 'text-text-primary! font-InterSemiBold!'} `}>
              4. Load serving priority?
            </Text>
            <Alert
              iconClassName={q5 === true ? 'text-[#B6B6B6]!' : 'text-primary!'}
              message="BESS First = more BESS cycles, less  G runtime. DG First = fewer cycles, more fuel."
              textClassName="text-text-secondary! font-InterRegular! text-[12px]! mt-0.5"
              className="border-none px-0! mb-2"
            />
            <div className="grid grid-cols-2 gap-4">
              <RadioCard
                label="BESS First"
                subLabel="Solar → BESS → DG"
                checked={q4 === LoadServingPriority['BESS First (Solar → BESS → DG)']}
                onChange={() => updateDispatchField(setQ4, LoadServingPriority['BESS First (Solar → BESS → DG)'])}
                className={q5 === true ? 'w-full bg-[#F1F1F1]! border-[#F1F1F1]! opacity-70' : 'w-full'}
                disabled={isAssignedUser || q5 === true}
              />

              <RadioCard
                label="DG First"
                subLabel="Solar → DG → BESS"
                checked={q4 === LoadServingPriority['DG First (Solar → DG → BESS)']}
                onChange={() => updateDispatchField(setQ4, LoadServingPriority['DG First (Solar → DG → BESS)'])}
                className={q5 === true ? 'w-full bg-bg-card! border-[#F1F1F1]! opacity-70' : 'w-full'}
                disabled={isAssignedUser || q5 === true}
              />
            </div>
            {q5 === true && (
              <Alert
                iconName="octagon-alert"
                iconClassName="text-[#ED9024]!"
                message={
                  <>
                    <Text variant="14M" className="block text-text-primary! font-InterMedium!">
                      Disabled — Takeover Mode overrides load priority
                    </Text>
                    <Text variant="14R" className="block mt-1 text-text-secondary!">
                      On hours when Solar + BESS can't fully cover the load, DG serves as much as it can (up to its capacity) — priority order no longer applies
                      that hour.
                    </Text>
                  </>
                }
                textClassName="font-InterRegular! text-[14px]!"
                className="mt-4 border-[#ED9024]! bg-[#FFF8F0]!"
              />
            )}
          </div>

          <div className="bg-[#F7FDFC] border border-border p-4 mt-4 rounded-lg">
            <Text variant="body1" className=" text-text-primary! font-InterSemiBold!">
              5. DG takeover mode?
            </Text>
            <Alert
              iconClassName="text-primary!"
              message="If Yes, DG runs at higher load for fuel efficiency. Excess charges BESS."
              textClassName="text-text-secondary! font-InterRegular! text-[12px]! mt-0.5"
              className="border-none px-0! mb-2"
            />
            <div className="grid grid-cols-2 gap-4">
              <RadioCard
                label="No — DG fills only deficit"
                checked={q5 === false}
                onChange={() => updateDispatchField(setQ5, false)}
                className="w-full"
                disabled={isAssignedUser}
              />

              <RadioCard
                label="Yes — DG serves full load"
                checked={q5 === true}
                onChange={() => updateDispatchField(setQ5, true)}
                className="w-full"
                disabled={isAssignedUser}
              />
            </div>
            {q5 === true && (
              <div className="bg-[#ECF7F6] p-3 border border-border rounded-md mt-4">
                <Text variant="caption" className=" text-text-primary! font-InterRegular!">
                  DG → Load, Solar → BESS
                </Text>
              </div>
            )}
          </div>

          <div className="bg-[#F7FDFC] border border-border p-4 mt-4 rounded-lg">
            <Text variant="body1" className=" text-text-primary! font-InterSemiBold!">
              6. Cycle charging mode?
            </Text>
            {isBinaryMode ? (
              <>
                <Text variant="body1" className=" text-text-secondary! font-InterSemiBold! my-2">
                  Not available in Binary DG mode (DG always runs at 100%)
                </Text>
                <Alert
                  iconClassName="text-primary!"
                  message="Switch to Variable DG mode in Step 1 to enable cycle charging."
                  textClassName="text-text-secondary! font-InterRegular! text-[14px]! mt-0.5"
                  className="border-primary"
                />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <RadioCard
                    label="No — DG follows load"
                    checked={q6 === false}
                    onChange={() => updateDispatchField(setQ6, false)}
                    className="w-full"
                    disabled={isAssignedUser}
                  />
                  <RadioCard
                    label="Yes — DG at min load %"
                    checked={q6 === true}
                    onChange={() => updateDispatchField(setQ6, true)}
                    className="w-full"
                    disabled={isAssignedUser}
                  />
                </div>
                {!dgData?.is_binary && q6 === true && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <IOSSingleSlider
                      label="Min load %"
                      valueLabelOnThumb={'off'}
                      min={50}
                      max={90}
                      step={5}
                      value={socOn + 20 >= maxSoc || minSoc >= maxSoc - 10 ? 50 : minLoad}
                      onChange={value => updateDispatchField(setMinLoad, value)}
                      unit="%"
                      valueLabel={!(socOn + 20 >= maxSoc || minSoc >= maxSoc - 10)}
                      disabled={socOn + 20 >= maxSoc || minSoc >= maxSoc - 10}
                      readOnly={isAssignedUser}
                    />

                    <IOSSingleSlider
                      label="Stop SOC %"
                      valueLabelOnThumb="off"
                      min={socOn + 20 >= maxSoc ? maxSoc : socOn + 20}
                      max={maxSoc}
                      step={5}
                      // value={Math.max(socOn + 20, stopSoc)}
                      value={stopSoc}
                      onChange={value => updateDispatchField(setStopSoc, value)}
                      unit="%"
                      valueLabel={!(socOn + 20 >= maxSoc || minSoc >= maxSoc - 10)}
                      disabled={socOn + 20 >= maxSoc || minSoc >= maxSoc - 10}
                      readOnly={isAssignedUser}
                    />
                  </div>
                )}
              </>
            )}
            {q6 === true && (socOn + 20 >= maxSoc || minSoc >= maxSoc - 10) && (
              <ErrorMessage message={`SOC ON + 20% cannot exceed ${maxSoc}%. Please lower SOC ON threshold.`} />
            )}
          </div>
        </>
      )}

      <div className="mt-6 flex justify-center gap-5">
        {!isAssignedUser && !isProjectAssignmentPending && (
          <Button variant="secondary" size="md" disabled={btnDisable} onClick={handleSave} className="self-center w-40 flex justify-center">
            Save
          </Button>
        )}

        <Button
          size="md"
          className="w-50 my-6 flex justify-center"
          disabled={(!dispatchData && success !== 'S-20023') || isChanged() || hasValidationErrors}
          onClick={onNextToSizing}>
          Next → Sizing
        </Button>
      </div>
      {shouldBlock && createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
    </div>
  );
};
