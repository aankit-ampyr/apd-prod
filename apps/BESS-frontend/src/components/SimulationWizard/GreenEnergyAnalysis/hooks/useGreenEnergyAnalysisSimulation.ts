import {ActionType, ResourceType} from '@/constants';
import {WebSocketContext} from '@/context/WebsocketContext';
import {RootState} from '@/services/redux/rootReducer';
import {runGreenAnalysisRequest, stopGreenAnalysisRequest} from '@/services/redux/slice/simulationWizardSlice';
import {SIMULATION_JOB_STORAGE_KEY} from '@/services/socket/SocketManager';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useSimulationStatus} from '../../SimulationStatusContext';

interface UseGreenEnergyAnalysisSimulationParams {
  simulationId?: number;
  onSimulationCompleted: () => void;
  onSimulationStopped: () => void;
}

const GREEN_ANALYSIS_JOB_STORAGE_KEY = `${SIMULATION_JOB_STORAGE_KEY}_green_analysis`;
const GREEN_ANALYSIS_RESOURCE_TYPE = 12;

export const useGreenEnergyAnalysisSimulation = ({simulationId, onSimulationCompleted, onSimulationStopped}: UseGreenEnergyAnalysisSimulationParams) => {
  const dispatch = useDispatch();
  const {subscribe} = useContext(WebSocketContext);
  const {isAnySimulationRunning, setIsGreenAnalysisRunning, runningSimulationId} = useSimulationStatus() ?? {};

  const runGreenAnalysisData = useSelector((state: RootState) => state.simulationWizard.runGreenAnalysisData);

  const [simulationProgress, setSimulationProgress] = useState(0);
  const [currentConfig, setCurrentConfig] = useState(0);
  const [totalConfig, setTotalConfig] = useState(0);
  const [currentSolar, setCurrentSolar] = useState(0);
  const [currentBess, setCurrentBess] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [currentDg, setCurrentDg] = useState(0);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isSimulationLocked, setIsSimulationLocked] = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<number | null>(null);
  const [showCompletionProgress, setShowCompletionProgress] = useState(false);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [isStopSimulationOpen, setIsStopSimulationOpen] = useState(false);
  const [runSimulationDisabled, setRunSimulationDisabled] = useState(false);
  const [stopSimulationStatus, setStopSimulationStatus] = useState<'confirm' | 'stopping' | 'stopped'>('confirm');
  const [isOwnerRunning, setIsOwnerRunning] = useState(false);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const pendingRunRequestRef = useRef(false);
  const activeResourceIdRef = useRef<number | null>(null);

  const getSavedJobId = useCallback(() => {
    const savedJobId = Number(localStorage.getItem(GREEN_ANALYSIS_JOB_STORAGE_KEY));
    return Number.isFinite(savedJobId) && savedJobId > 0 ? savedJobId : null;
  }, []);

  const savedJobId = getSavedJobId();

  const isCurrentUserOwner = pendingRunRequestRef.current || (savedJobId !== null && savedJobId === activeResourceId);
  const isBlocked = isSimulationLocked && !isCurrentUserOwner && !isSimulationRunning;

  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulationId;

  const resetProgressDetails = useCallback(() => {
    setSimulationProgress(0);
    setCurrentConfig(0);
    setTotalConfig(0);
    setCurrentSolar(0);
    setCurrentBess(0);
    setCurrentDuration(0);
    setCurrentDg(0);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(event => {
      const eventResourceType = Number(event.resource_type);
      const greenAnalysisSimulationJobType = (ResourceType as unknown as Record<string, number>).GreenAnalysisSimulationJob;
      const isGreenAnalysisJobEvent =
        eventResourceType === GREEN_ANALYSIS_RESOURCE_TYPE || (!!greenAnalysisSimulationJobType && eventResourceType === greenAnalysisSimulationJobType);

      if (!isGreenAnalysisJobEvent) return;

      const action = ActionType[event.action_id] || event.action_id;
      const isTerminalAction =
        event.action_id === ActionType.Completed ||
        event.action_id === ActionType.Failed ||
        event.action_id === ActionType.Stopped ||
        event.action_id === ActionType.Cancelled;

      const eventSimulationId = Number(event.data?.simulation_id ?? 0);
      const eventResourceId = Number(event.resource_id);
      const isActiveResourceEvent = eventResourceId === activeResourceIdRef.current;
      const isCurrentSimulationEvent = (simulationId && eventSimulationId === simulationId) || isActiveResourceEvent;
      const isOwnerEvent = getSavedJobId() === eventResourceId || (isSimulationRunning && isActiveResourceEvent);

      if (!isCurrentSimulationEvent) return;

      if (action === 'Started' || action === ActionType.Started) {
        activeResourceIdRef.current = eventResourceId;
        setActiveResourceId(eventResourceId);
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
        const configDetails = event.data?.current_config_details;

        setSimulationProgress(Number(event.data?.progress_percentage ?? 0));
        setCurrentConfig(Number(event.data?.current_config ?? 0));
        setTotalConfig(Number(event.data?.total_config ?? 0));
        setCurrentSolar(Number(configDetails?.solar_mwp ?? 0));
        setCurrentBess(Number(configDetails?.bess_size_mwh ?? 0));
        setCurrentDuration(Number(configDetails?.duration_hr ?? 0));
        setCurrentDg(Number(configDetails?.dg_size_mw ?? 0));
        return;
      }

      if (action === 'Completed' || action === ActionType.Completed) {
        if (!isOwnerEvent) {
          setIsSimulationRunning(false);
          setIsSimulationLocked(false);
          setIsGreenAnalysisRunning(false);
          setRunSimulationDisabled(false);
          pendingRunRequestRef.current = false;
          setShowCompletionProgress(false);
          setShowCompletionSummary(false);
          activeResourceIdRef.current = null;
          setActiveResourceId(null);
          localStorage.removeItem(GREEN_ANALYSIS_JOB_STORAGE_KEY);
          resetProgressDetails();
          setIsStopSimulationOpen(false);
          setStopSimulationStatus('confirm');
          onSimulationCompleted();
          return;
        }

        const total = Number(event.data?.total_config ?? totalConfig ?? 0);

        setSimulationProgress(100);
        setCurrentConfig(total);
        setTotalConfig(total);
        setIsSimulationRunning(false);
        setIsSimulationLocked(false);
        setRunSimulationDisabled(false);
        setIsOwnerRunning(false);
        pendingRunRequestRef.current = false;
        setShowCompletionProgress(true);
        setShowCompletionSummary(false);
        activeResourceIdRef.current = null;
        setActiveResourceId(null);
        localStorage.removeItem(GREEN_ANALYSIS_JOB_STORAGE_KEY);
        setIsStopSimulationOpen(false);
        setStopSimulationStatus('confirm');
        onSimulationCompleted();

        setTimeout(() => {
          setShowCompletionProgress(false);
          setShowCompletionSummary(true);
        }, 5000);
        return;
      }

      if (event.action_id === 8) {
        if (isOwnerEvent) {
          setStopSimulationStatus('stopped');
          return;
        }
      }

      if (isTerminalAction) {
        setIsOwnerRunning(false);
        setIsSimulationRunning(false);
        setIsSimulationLocked(false);
        setIsGreenAnalysisRunning(false);
        pendingRunRequestRef.current = false;
        setShowCompletionProgress(false);
        setShowCompletionSummary(false);
        activeResourceIdRef.current = null;
        setActiveResourceId(null);
        localStorage.removeItem(GREEN_ANALYSIS_JOB_STORAGE_KEY);
        resetProgressDetails();
        setRunSimulationDisabled(false);
        onSimulationStopped();
      }
    });

    return () => unsubscribe();
  }, [getSavedJobId, isSimulationRunning, onSimulationCompleted, onSimulationStopped, resetProgressDetails, simulationId, subscribe, totalConfig]);

  const handleRunGreenAnalysis = useCallback(() => {
    if (!simulationId) return;

    localStorage.removeItem(GREEN_ANALYSIS_JOB_STORAGE_KEY);
    resetProgressDetails();
    setIsOwnerRunning(true);
    setIsSimulationRunning(true);
    setShowCompletionProgress(false);
    setShowCompletionSummary(false);
    setRunSimulationDisabled(true);
    pendingRunRequestRef.current = true;

    dispatch(runGreenAnalysisRequest({simulation_id: simulationId}));
  }, [dispatch, resetProgressDetails, simulationId]);

  const handleStopGreenAnalysis = useCallback(() => {
    if (!simulationId) return;

    dispatch(stopGreenAnalysisRequest({simulation_id: simulationId}));

    setStopSimulationStatus('stopping');
  }, [dispatch, simulationId]);

  const handleCloseStoppedPopup = useCallback(() => {
    setIsSimulationRunning(false);
    setIsOwnerRunning(false);
    setIsGreenAnalysisRunning(false);
    setIsSimulationLocked(false);

    pendingRunRequestRef.current = false;

    setShowCompletionProgress(false);
    setShowCompletionSummary(false);

    activeResourceIdRef.current = null;
    setActiveResourceId(null);

    localStorage.removeItem(GREEN_ANALYSIS_JOB_STORAGE_KEY);

    resetProgressDetails();

    setRunSimulationDisabled(false);

    setIsStopSimulationOpen(false);
    setStopSimulationStatus('confirm');

    onSimulationStopped();
  }, [onSimulationStopped, resetProgressDetails, setIsGreenAnalysisRunning]);

  useEffect(() => {
    const jobId = runGreenAnalysisData?.simulation_job_id;
    if (!isSimulationRunning || !pendingRunRequestRef.current || !jobId) return;

    pendingRunRequestRef.current = false;
    localStorage.setItem(GREEN_ANALYSIS_JOB_STORAGE_KEY, String(jobId));
    activeResourceIdRef.current = Number(jobId);
    setActiveResourceId(Number(jobId));
    setIsSimulationLocked(true);
  }, [isSimulationRunning, runGreenAnalysisData?.simulation_job_id]);

  useEffect(() => {
    const normalizedSavedJobId = getSavedJobId();
    if (normalizedSavedJobId) {
      setIsSimulationRunning(true);
      setIsSimulationLocked(true);
      setRunSimulationDisabled(true);
      setActiveResourceId(normalizedSavedJobId);
      activeResourceIdRef.current = normalizedSavedJobId;
      setIsOwnerRunning(true);
    }
  }, [getSavedJobId]);

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
    currentBess,
    currentConfig,
    currentDg,
    currentDuration,
    currentSolar,
    handleCancelStopSimulation: () => {
      setIsStopSimulationOpen(false);
      setStopSimulationStatus('confirm');
    },
    handleOpenStopSimulation: () => setIsStopSimulationOpen(true),
    handleRunGreenAnalysis,
    handleStopGreenAnalysis,
    isBlocked,
    isSimulationRunning,
    isStopSimulationOpen,
    progressContainerRef,
    runSimulationDisabled,
    setRunSimulationDisabled,
    showCompletionProgress,
    showCompletionSummary,
    simulationProgress,
    totalConfig,
    stopSimulationStatus,
    handleCloseStoppedPopup,
    isCurrentUserOwner,
    setShowCompletionSummary,
    isOwnerRunning,
  };
};
