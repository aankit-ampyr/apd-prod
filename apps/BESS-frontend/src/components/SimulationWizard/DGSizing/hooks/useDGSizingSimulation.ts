import {runSimulationData} from '@/services/redux/selectors/simulationWizardSelector';
import {runSimulationRequest, stopSimulationRequest} from '@/services/redux/slice/simulationWizardSlice';
import {SIMULATION_JOB_STORAGE_KEY} from '@/services/socket/SocketManager';
import {useCallback, useEffect, useRef, useState, useContext} from 'react';
import {useDispatch, useSelector} from 'react-redux';
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
  const {isAnySimulationRunning, setIsSizingRunning, runningSimulationId} = useSimulationStatus() ?? {};

  const {subscribe} = useContext(WebSocketContext);

  const [isSimulationLocked, setIsSimulationLocked] = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<number | null>(null);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isStopSimulationOpen, setIsStopSimulationOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(0);
  const [totalConfig, setTotalConfig] = useState(0);
  const [currentBess, setCurrentBess] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [showCompletionProgress, setShowCompletionProgress] = useState(false);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [runSimulationDisabled, setRunSimulationDisabled] = useState(false);
  const [isOwnerRunning, setIsOwnerRunning] = useState(false);

  const [stopSimulationStatus, setStopSimulationStatus] = useState<'confirm' | 'stopping' | 'stopped'>('confirm');

  const progressContainerRef = useRef<HTMLDivElement>(null);
  const pendingRunRequestRef = useRef(false);
  const activeResourceIdRef = useRef<number | null>(null);

  const savedSimulationJobId = Number(localStorage.getItem(SIMULATION_JOB_STORAGE_KEY));
  const currentResourceId = Number.isFinite(savedSimulationJobId) && savedSimulationJobId > 0 ? savedSimulationJobId : null;

  // A status refresh can arrive after the user clicks Start but before the API
  // returns the new job id. Treat that short handoff as owned by this user too;
  // otherwise the refresh can briefly replace the progress UI with the
  // "another user is running" message.
  const isCurrentUserOwner = pendingRunRequestRef.current || (!!currentResourceId && currentResourceId === activeResourceId);
  const isBlocked = isSimulationLocked && !isCurrentUserOwner && !isSimulationRunning;
  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulationId;

  const resetSimulationProgressDetails = useCallback(() => {
    setSimulationProgress(0);
    setCurrentConfig(0);
    setTotalConfig(0);
    setCurrentBess(0);
    setCurrentDuration(0);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(event => {
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
        if (action === 'Started' || action === ActionType.Started || action === 'Updated' || action === ActionType.Updated) {
          activeResourceIdRef.current = Number(event.resource_id);
          setIsSimulationLocked(true);
          setActiveResourceId(Number(event.resource_id));
        } else if (isTerminalAction) {
          const isOwnerEvent = resourceId && event.resource_id === resourceId;

          if (event.action_id !== 8 || !isOwnerEvent) {
            activeResourceIdRef.current = null;
            setIsSimulationLocked(false);
            setActiveResourceId(null);
            setIsSimulationRunning(false);
          }
        }
      }

      // Handle progress specific to the active resourceId (the job running on this screen)
      if (resourceId && event.resource_id === resourceId) {
        if (action === 'Started' || action === ActionType.Started) {
          setIsSimulationRunning(true);
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

          setIsSimulationRunning(false);
          setIsSizingRunning(false);
          setIsOwnerRunning(false);

          pendingRunRequestRef.current = false;
          setShowCompletionProgress(true);
          setShowCompletionSummary(false);
          setRunSimulationDisabled(true);
          setIsStopSimulationOpen(false);
          setStopSimulationStatus('confirm');
          onSimulationCompleted();
          setTimeout(() => {
            setShowCompletionProgress(false);
            setShowCompletionSummary(true);
          }, 5000);
        } else if (event.action_id === 8) {
          setStopSimulationStatus('stopped');
          return;
        } else if (isTerminalAction) {
          setIsOwnerRunning(false);
          setIsSimulationRunning(false);
          setIsSizingRunning(false);
          pendingRunRequestRef.current = false;
          setIsSimulationRunning(false);
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

    localStorage.removeItem(SIMULATION_JOB_STORAGE_KEY);
    resetSimulationProgressDetails();
    setIsOwnerRunning(true);
    setIsSimulationRunning(true);
    setIsSizingRunning(true);
    pendingRunRequestRef.current = true;

    dispatch(runSimulationRequest({simulation_id: simulationId}));
  };

  const handleStopSimulation = () => {
    if (simulationId) {
      dispatch(stopSimulationRequest({simulation_id: simulationId}));
    }

    setStopSimulationStatus('stopping');
  };

  const handleCloseStoppedPopup = () => {
    setIsSimulationRunning(false);
    setIsOwnerRunning(false);
    setIsSizingRunning(false);

    pendingRunRequestRef.current = false;

    resetSimulationProgressDetails();

    setShowCompletionProgress(false);
    setShowCompletionSummary(false);

    setSimulationProgress(0);

    localStorage.removeItem(SIMULATION_JOB_STORAGE_KEY);

    activeResourceIdRef.current = null;
    setActiveResourceId(null);
    setIsSimulationLocked(false);

    setResourceId(null);
    setRunSimulationDisabled(false);
    setIsStopSimulationOpen(false);
    setStopSimulationStatus('confirm');
  };

  useEffect(() => {
    const jobId = simulationJobData?.simulation_job_id;
    if (!isSimulationRunning || !pendingRunRequestRef.current || !jobId) return;

    pendingRunRequestRef.current = false;
    localStorage.setItem(SIMULATION_JOB_STORAGE_KEY, String(jobId));
    setResourceId(jobId);
  }, [isSimulationRunning, simulationJobData?.simulation_job_id, setResourceId]);

  useEffect(() => {
    const savedJobId = Number(localStorage.getItem(SIMULATION_JOB_STORAGE_KEY));
    const normalizedSavedJobId = Number.isFinite(savedJobId) && savedJobId > 0 ? savedJobId : null;

    if (pendingRunRequestRef.current && simulationStatus !== 2) {
      return;
    }

    if (simulationStatus === undefined) {
      return;
    }

    if (simulationStatus === 1) {
      activeResourceIdRef.current = simulationJobId ?? null;
      setActiveResourceId(simulationJobId ?? null);
      setIsSimulationLocked(true);
      setRunSimulationDisabled(true);
      setIsOwnerRunning(normalizedSavedJobId === simulationJobId);

      if (!simulationJobId) {
        // Wait until backend sends the job id.
        return;
      }

      if (normalizedSavedJobId === simulationJobId) {
        setIsSimulationRunning(true);
        setResourceId(normalizedSavedJobId);
      } else if (pendingRunRequestRef.current) {
        // The current user has just started a job, but its id has not been
        // persisted yet. Do not downgrade the local progress state while the
        // run request is still resolving.
        setIsSimulationRunning(true);
      } else {
        setIsSimulationRunning(false);
        setResourceId(null);
      }
      return;
    }

    if (!normalizedSavedJobId || simulationStatus === 0) {
      localStorage.removeItem(SIMULATION_JOB_STORAGE_KEY);
      setIsSimulationRunning(false);
      setIsSimulationLocked(false);
      setActiveResourceId(null);
      activeResourceIdRef.current = null;
      setShowCompletionProgress(false);
      setShowCompletionSummary(false);
      setRunSimulationDisabled(false);
      return;
    }

    if (simulationStatus === 2) {
      setIsSimulationRunning(false);
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

    setIsSimulationRunning(true);
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
    handleCancelStopSimulation: () => {
      setIsStopSimulationOpen(false);
      setStopSimulationStatus('confirm');
    },
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
    isCurrentUserOwner,
    stopSimulationStatus,
    handleCloseStoppedPopup,
    isOwnerRunning,
  };
};
