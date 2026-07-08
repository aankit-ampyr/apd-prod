import {runSimulationData} from '@/services/redux/selectors/simulationWizardSelector';
import {runSimulationRequest, stopSimulationRequest} from '@/services/redux/slice/simulationWizardSlice';
import {SIMULATION_JOB_STORAGE_KEY} from '@/services/socket/SocketManager';
import {useCallback, useEffect, useRef, useState, useContext} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useChangeConfigurationConfirmation} from '../../ChangeConfigurationContext';
import {ActionType, ResourceType} from '@/constants';
import {WebSocketContext} from '@/context/WebsocketContext';
import {useSimulationStatus} from '../../SimulationStatusContext';

interface UseDGSizingSimulationParams {
  simulationId?: number;
  currentUserId?: number;
  simulationJobId?: number;
  simulationStatus?: number;
  resourceId: number | null;
  setResourceId: (id: number | null) => void;
  onSimulationCompleted: () => void;
}

export const useDGSizingSimulation = ({
  simulationId,
  simulationJobId,
  simulationStatus,
  resourceId,
  setResourceId,
  onSimulationCompleted,
}: UseDGSizingSimulationParams) => {
  const dispatch = useDispatch();
  const simulationJobData = useSelector(runSimulationData);
  const {setIsSimulationRunning} = useChangeConfigurationConfirmation();
  const {isAnySimulationRunning, setIsSizingRunning, runningSimulationId} = useSimulationStatus();

  const {subscribe} = useContext(WebSocketContext);

  const [isSimulationLocked, setIsSimulationLocked] = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<number | null>(null);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [isSimulationRunning, setIsSimulationRunningLocal] = useState(false);
  const [isStopSimulationOpen, setIsStopSimulationOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(0);
  const [totalConfig, setTotalConfig] = useState(0);
  const [currentBess, setCurrentBess] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [showCompletionProgress, setShowCompletionProgress] = useState(false);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [runSimulationDisabled, setRunSimulationDisabled] = useState(false);

  const progressContainerRef = useRef<HTMLDivElement>(null);
  const pendingRunRequestRef = useRef(false);
  const activeResourceIdRef = useRef<number | null>(null);

  const savedSimulationJobId = Number(localStorage.getItem(SIMULATION_JOB_STORAGE_KEY));
  const currentResourceId = Number.isFinite(savedSimulationJobId) && savedSimulationJobId > 0 ? savedSimulationJobId : null;

  const isCurrentUserOwner = !!currentResourceId && currentResourceId === activeResourceId;
  const isBlocked = isSimulationLocked && !isCurrentUserOwner && !isSimulationRunning;
  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulationId;

  // Keep global context and local state in sync
  useEffect(() => {
    setIsSimulationRunning(isSimulationRunning);
  }, [isSimulationRunning, setIsSimulationRunning]);

  const resetSimulationProgressDetails = useCallback(() => {
    setSimulationProgress(0);
    setCurrentConfig(0);
    setTotalConfig(0);
    setCurrentBess(0);
    setCurrentDuration(0);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(event => {
      console.log('event:', event);
      // Only handle SimulationJob events
      if (event.resource_type !== ResourceType.SizingSimulationJob) return;

      const action = ActionType[event.action_id] || event.action_id;
      const isTerminalAction =
        event.action_id === ActionType.Completed ||
        event.action_id === ActionType.Failed ||
        event.action_id === ActionType.Stopped ||
        event.action_id === ActionType.Cancelled;

      // Handle locking regardless of resourceId (if it's the same simulation)
      if (event.data?.simulation_id === simulationId || event.resource_id === activeResourceIdRef.current) {
        if (action === 'Started' || action === ActionType.Started) {
          activeResourceIdRef.current = Number(event.resource_id);
          setIsSimulationLocked(true);
          setActiveResourceId(Number(event.resource_id));
        } else if (isTerminalAction) {
          activeResourceIdRef.current = null;
          setIsSimulationLocked(false);
          setActiveResourceId(null);
          setIsSimulationRunning(false);
        }
      }

      // Handle progress specific to the active resourceId (the job running on this screen)
      if (resourceId && event.resource_id === resourceId) {
        console.log('ACTION TYPE', action, event.action_id);
        console.log('event', event);

        if (action === 'Started' || action === ActionType.Started) {
          setIsSimulationRunningLocal(true);
        } else if (action === 'Updated' || action === ActionType.Updated) {
          setSimulationProgress(Number(event.data?.progress_percentage ?? 0));
          setCurrentConfig(Number(event.data?.current_config ?? 0));
          setTotalConfig(Number(event.data?.total_config ?? 0));
          setCurrentBess(Number(event.data?.current_config_details?.bess_size_mwh ?? 0));
          setCurrentDuration(Number(event.data?.current_config_details?.duration_hr ?? 0));
        } else if (action === 'Completed' || action === ActionType.Completed) {
          const total = Number(event.data?.total_config ?? 0);
          setSimulationProgress(100);
          setCurrentConfig(total);
          setTotalConfig(total);
          setCurrentBess(Number(event.data?.current_config_details?.bess_size_mwh ?? 0));
          setCurrentDuration(Number(event.data?.current_config_details?.duration_hr ?? 0));

          setIsSimulationRunningLocal(false);
          setIsSizingRunning(false);
          pendingRunRequestRef.current = false;
          setShowCompletionProgress(true);
          setShowCompletionSummary(false);
          setRunSimulationDisabled(true);
          onSimulationCompleted();
          setTimeout(() => {
            setShowCompletionProgress(false);
            setShowCompletionSummary(true);
          }, 5000);
        } else if (isTerminalAction) {
          setIsSimulationRunning(false);
          setIsSizingRunning(false);
          pendingRunRequestRef.current = false;
          setIsSimulationRunningLocal(false);
          resetSimulationProgressDetails();
          setShowCompletionProgress(false);
          setShowCompletionSummary(false);
          setSimulationProgress(0);
          // Terminal actions except completion should allow running again.
          if (event.action_id !== ActionType.Completed) {
            setRunSimulationDisabled(false);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [subscribe, simulationId, resourceId, onSimulationCompleted, resetSimulationProgressDetails, setIsSimulationRunning]);

  const handleRunSizingSimulation = () => {
    if (!simulationId) return;

    console.log('[Simulation WS] Run simulation requested for simulation:', simulationId);
    localStorage.removeItem(SIMULATION_JOB_STORAGE_KEY);
    resetSimulationProgressDetails();
    setIsSimulationRunningLocal(true);
    pendingRunRequestRef.current = true;

    dispatch(runSimulationRequest({simulation_id: simulationId}));
  };

  const handleStopSimulation = () => {
    console.log('[Simulation WS] Stop confirmed by user');
    if (simulationId) {
      dispatch(stopSimulationRequest({simulation_id: simulationId}));
    }

    setIsSimulationRunningLocal(false);
    setIsSizingRunning(false);
    pendingRunRequestRef.current = false;
    resetSimulationProgressDetails();
    setIsStopSimulationOpen(false);
    localStorage.removeItem(SIMULATION_JOB_STORAGE_KEY);
    setShowCompletionProgress(false);
    setShowCompletionSummary(false);
    activeResourceIdRef.current = null;
    setActiveResourceId(null);
    setIsSimulationLocked(false);
    setResourceId(null);
    setRunSimulationDisabled(false);
  };

  useEffect(() => {
    const jobId = simulationJobData?.simulation_job_id;
    if (!isSimulationRunning || !pendingRunRequestRef.current || !jobId) return;

    console.log('[Simulation WS] Run simulation API returned job id:', jobId);
    pendingRunRequestRef.current = false;
    localStorage.setItem(SIMULATION_JOB_STORAGE_KEY, String(jobId));
    setResourceId(jobId);
  }, [isSimulationRunning, simulationJobData?.simulation_job_id, setResourceId]);

  useEffect(() => {
    const savedJobId = Number(localStorage.getItem(SIMULATION_JOB_STORAGE_KEY));
    const normalizedSavedJobId = Number.isFinite(savedJobId) && savedJobId > 0 ? savedJobId : null;

    if (simulationStatus === undefined) {
      return;
    }

    if (simulationStatus === 0 || simulationStatus === 1) {
      activeResourceIdRef.current = simulationJobId ?? null;
      setActiveResourceId(simulationJobId ?? null);
      setIsSimulationLocked(true);
      setRunSimulationDisabled(true);
      if (!simulationJobId) {
        // Wait until backend sends the job id.
        return;
      }

      if (normalizedSavedJobId === simulationJobId) {
        setIsSimulationRunningLocal(true);
        setResourceId(normalizedSavedJobId);
      } else {
        setIsSimulationRunningLocal(false);
        setResourceId(null);
      }
      return;
    }

    if (!normalizedSavedJobId || simulationStatus === 0) {
      localStorage.removeItem(SIMULATION_JOB_STORAGE_KEY);
      setIsSimulationRunningLocal(false);
      setIsSimulationLocked(false);
      setActiveResourceId(null);
      activeResourceIdRef.current = null;
      setShowCompletionProgress(false);
      setShowCompletionSummary(false);
      setRunSimulationDisabled(false);
      return;
    }

    if (simulationStatus === 2) {
      setIsSimulationRunningLocal(false);
      setIsSimulationLocked(false);
      setActiveResourceId(null);
      activeResourceIdRef.current = null;
      setShowCompletionProgress(true);
      setShowCompletionSummary(false);
      setRunSimulationDisabled(true);
      onSimulationCompleted();
      localStorage.removeItem(SIMULATION_JOB_STORAGE_KEY);

      setTimeout(() => {
        setShowCompletionProgress(false);
        setShowCompletionSummary(true);
      }, 5000);
      return;
    }

    console.log('[Simulation WS] Recovering simulation job after refresh:', normalizedSavedJobId);
    setIsSimulationRunningLocal(true);
    setIsSimulationLocked(true);
    setActiveResourceId(normalizedSavedJobId);
    activeResourceIdRef.current = normalizedSavedJobId;
    setResourceId(normalizedSavedJobId);
  }, [onSimulationCompleted, setResourceId, simulationJobId, simulationStatus]);

  useEffect(() => {
    if (!isSimulationRunning && !isBlocked && !shouldBlock) return;

    const handleClick = (e: MouseEvent) => {
      if (progressContainerRef.current?.contains(e.target as Node)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', handleClick, true);
    };
  }, [isSimulationRunning, isBlocked, shouldBlock]);

  return {
    currentBess,
    currentConfig,
    currentDuration,
    handleCancelStopSimulation: () => setIsStopSimulationOpen(false),
    handleOpenStopSimulation: () => setIsStopSimulationOpen(true),
    handleRunSizingSimulation,
    handleStopSimulation,
    isBlocked,
    isSimulationRunning,
    shouldBlock,
    isStopSimulationOpen,
    progressContainerRef,
    runSimulationDisabled,
    setRunSimulationDisabled,
    showCompletionProgress,
    showCompletionSummary,
    simulationProgress,
    totalConfig,
  };
};
