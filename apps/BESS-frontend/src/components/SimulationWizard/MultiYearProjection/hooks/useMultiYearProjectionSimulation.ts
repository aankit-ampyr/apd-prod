import {ActionType, ResourceType} from '@/constants';
import {WebSocketContext} from '@/context/WebsocketContext';
import {RootState} from '@/services/redux/rootReducer';
import {stopMultiYearProjectionRequest, runMultiYearProjectionRequest} from '@/services/redux/slice/simulationWizardSlice';
import {SIMULATION_JOB_STORAGE_KEY} from '@/services/socket/SocketManager';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useSimulationStatus} from '../../SimulationStatusContext';

interface UseMultiYearProjectionSimulationParams {
  simulationId?: number;
  onSimulationCompleted: (processedYears: number) => void;
  onSimulationStopped: () => void;
}

const MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY = `${SIMULATION_JOB_STORAGE_KEY}_multi_year_projection`;

export const useMultiYearProjectionSimulation = ({simulationId, onSimulationCompleted, onSimulationStopped}: UseMultiYearProjectionSimulationParams) => {
  const dispatch = useDispatch();
  const {subscribe} = useContext(WebSocketContext);
  const {isAnySimulationRunning, setIsMultiYearRunning, runningSimulationId} = useSimulationStatus();

  const runMultiYearProjectionData = useSelector((state: RootState) => state.simulationWizard.runMultiYearProjectionData);

  const [simulationProgress, setSimulationProgress] = useState(0);
  const [currentConfig, setCurrentConfig] = useState(0);
  const [totalConfig, setTotalConfig] = useState(0);
  const [currentYear, setCurrentYear] = useState(0);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isSimulationLocked, setIsSimulationLocked] = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<number | null>(null);
  const [showCompletionProgress, setShowCompletionProgress] = useState(false);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [processedYears, setProcessedYears] = useState(0);
  const [isStopSimulationOpen, setIsStopSimulationOpen] = useState(false);
  const [runSimulationDisabled, setRunSimulationDisabled] = useState(false);

  const progressContainerRef = useRef<HTMLDivElement>(null);
  const pendingRunRequestRef = useRef(false);
  const activeResourceIdRef = useRef<number | null>(null);

  const getSavedJobId = useCallback(() => {
    const savedJobId = Number(localStorage.getItem(MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY));
    return Number.isFinite(savedJobId) && savedJobId > 0 ? savedJobId : null;
  }, []);

  const isCurrentUserOwner = activeResourceId !== null && getSavedJobId() === activeResourceId;
  const isBlocked = isSimulationLocked && !isCurrentUserOwner && !isSimulationRunning;

  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulationId;

  const resetProjectionProgressDetails = useCallback(() => {
    setSimulationProgress(0);
    setCurrentConfig(0);
    setTotalConfig(0);
    setCurrentYear(0);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(event => {
      const isSimulationJobEvent = event.resource_type === ResourceType.SimulationJob || Number(event.resource_type) === 11;
      if (!isSimulationJobEvent) return;

      const action = ActionType[event.action_id] || event.action_id;
      const isTerminalAction =
        event.action_id === ActionType.Completed ||
        event.action_id === ActionType.Failed ||
        event.action_id === ActionType.Stopped ||
        event.action_id === ActionType.Cancelled;

      const eventSimulationId = Number(event.data?.simulation_id ?? 0);
      const isCurrentSimulationEvent = (simulationId && eventSimulationId === simulationId) || event.resource_id === activeResourceIdRef.current;
      const eventResourceId = Number(event.resource_id);
      const isOwnerEvent = getSavedJobId() === eventResourceId;

      if (!isCurrentSimulationEvent) return;

      if (action === 'Started' || action === ActionType.Started) {
        const resourceId = eventResourceId;
        // Only set activeResourceId and lock state from websocket
        // Do NOT set localStorage here - it should only be set when current user initiates the run
        // This way other users will have isSimulationLocked=true but won't have the job id in localStorage
        activeResourceIdRef.current = resourceId;
        setActiveResourceId(resourceId);
        setIsSimulationLocked(true);
        setRunSimulationDisabled(true);

        if (isOwnerEvent || isSimulationRunning || pendingRunRequestRef.current) {
          setIsSimulationRunning(true);
          setShowCompletionProgress(false);
          setShowCompletionSummary(false);
        } else {
          setIsSimulationRunning(false);
        }

        return;
      }

      if ((action === 'Updated' || action === ActionType.Updated) && isOwnerEvent) {
        setSimulationProgress(Number(event.data?.progress_percentage ?? 0));
        setCurrentConfig(Number(event.data?.current_config ?? 0));
        setTotalConfig(Number(event.data?.total_config ?? 0));
        setCurrentYear(Number(event.data?.year ?? 0));
        return;
      }

      if (action === 'Completed' || action === ActionType.Completed) {
        if (!isOwnerEvent) {
          const yearsProcessed = Number(event.data?.year ?? event.data?.total_config ?? 0);

          setIsSimulationRunning(false);
          setIsMultiYearRunning(false);
          setIsSimulationLocked(false);
          setRunSimulationDisabled(false);
          pendingRunRequestRef.current = false;
          setShowCompletionProgress(false);
          setShowCompletionSummary(false);
          activeResourceIdRef.current = null;
          setActiveResourceId(null);
          localStorage.removeItem(MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY);
          resetProjectionProgressDetails();
          onSimulationCompleted(yearsProcessed);
          return;
        }

        const total = Number(event.data?.total_config ?? 0);
        const yearsProcessed = Number(event.data?.year ?? total ?? 0);

        setSimulationProgress(100);
        setCurrentConfig(total);
        setTotalConfig(total);
        setCurrentYear(yearsProcessed);
        setProcessedYears(yearsProcessed);
        setIsSimulationRunning(false);
        setIsSimulationLocked(false);
        setRunSimulationDisabled(false);
        pendingRunRequestRef.current = false;
        setShowCompletionProgress(true);
        setShowCompletionSummary(false);
        activeResourceIdRef.current = null;
        setActiveResourceId(null);
        localStorage.removeItem(MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY);

        onSimulationCompleted(yearsProcessed);

        setTimeout(() => {
          setShowCompletionProgress(false);
          setShowCompletionSummary(true);
        }, 5000);
        return;
      }

      if (isTerminalAction) {
        setIsSimulationRunning(false);
        setIsMultiYearRunning(false);
        setIsSimulationLocked(false);
        pendingRunRequestRef.current = false;
        setShowCompletionProgress(false);
        setShowCompletionSummary(false);
        activeResourceIdRef.current = null;
        setActiveResourceId(null);
        localStorage.removeItem(MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY);
        resetProjectionProgressDetails();
        setRunSimulationDisabled(false);
        onSimulationStopped();
      }
    });

    return () => unsubscribe();
  }, [getSavedJobId, isSimulationRunning, onSimulationCompleted, onSimulationStopped, resetProjectionProgressDetails, simulationId, subscribe]);

  const handleRunProjection = useCallback(() => {
    if (!simulationId) return;

    localStorage.removeItem(MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY);

    resetProjectionProgressDetails();
    setIsSimulationRunning(true);
    setShowCompletionProgress(false);
    setShowCompletionSummary(false);
    setRunSimulationDisabled(true);
    pendingRunRequestRef.current = true;

    dispatch(runMultiYearProjectionRequest({simulation_id: simulationId}));
  }, [dispatch, resetProjectionProgressDetails, simulationId]);

  const handleStopProjection = useCallback(() => {
    if (!simulationId) return;

    dispatch(stopMultiYearProjectionRequest({simulation_id: simulationId}));

    setIsSimulationRunning(false);
    setIsMultiYearRunning(false);
    setIsSimulationLocked(false);
    pendingRunRequestRef.current = false;
    setShowCompletionProgress(false);
    setShowCompletionSummary(false);
    setIsStopSimulationOpen(false);
    setRunSimulationDisabled(false);
    activeResourceIdRef.current = null;
    setActiveResourceId(null);
    localStorage.removeItem(MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY);
    resetProjectionProgressDetails();
    onSimulationStopped();
  }, [dispatch, onSimulationStopped, resetProjectionProgressDetails, simulationId]);

  useEffect(() => {
    const jobId = runMultiYearProjectionData?.simulation_job_id;
    if (!isSimulationRunning || !pendingRunRequestRef.current || !jobId) return;

    pendingRunRequestRef.current = false;
    localStorage.setItem(MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY, String(jobId));
    activeResourceIdRef.current = Number(jobId);
    setActiveResourceId(Number(jobId));
    setIsSimulationLocked(true);
  }, [isSimulationRunning, runMultiYearProjectionData?.simulation_job_id]);

  useEffect(() => {
    const normalizedSavedJobId = getSavedJobId();
    if (normalizedSavedJobId) {
      setIsSimulationRunning(true);
      setIsSimulationLocked(true);
      setRunSimulationDisabled(true);
      setActiveResourceId(normalizedSavedJobId);
      activeResourceIdRef.current = normalizedSavedJobId;
    }
  }, [getSavedJobId]);

  useEffect(() => {
    if (!simulationId) {
      localStorage.removeItem(MULTI_YEAR_PROJECTION_JOB_STORAGE_KEY);
    }
  }, [simulationId]);

  useEffect(() => {
    if (!isSimulationRunning && !isBlocked && !shouldBlock) return;

    const handleClick = (event: MouseEvent) => {
      if (progressContainerRef.current?.contains(event.target as Node)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', handleClick, true);
    };
  }, [isBlocked, isSimulationRunning, shouldBlock]);

  return {
    currentConfig,
    currentYear,
    handleCancelStopSimulation: () => setIsStopSimulationOpen(false),
    handleOpenStopSimulation: () => setIsStopSimulationOpen(true),
    handleRunProjection,
    handleStopProjection,
    isBlocked,
    isSimulationRunning,
    isStopSimulationOpen,
    processedYears,
    progressContainerRef,
    runSimulationDisabled,
    setRunSimulationDisabled,
    showCompletionProgress,
    showCompletionSummary,
    simulationProgress,
    totalConfig,
  };
};
