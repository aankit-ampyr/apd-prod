import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  runSimulationSuccess,
  simulationResultSuccess,
  customSimulationSuccess,
  initiateSimulationData,
  projectSimulationData,
  multiYearRunSuccess,
  greenAnalysisRunSuccess,
  detailedGreenRunSuccess,
} from '@/services/redux/selectors/simulationWizardSelector';
import {ChangeConfiguration} from './ChangeConfiguration';
import {WebSocketContext} from '@/context/WebsocketContext';
import {ActionType, ResourceType} from '@/constants';
import {useParams} from 'react-router-dom';
import {getDGSizingSilentRequest, simulationProgressRequest} from '@/services/redux/slice/simulationWizardSlice';
import {SIMULATION_JOB_STORAGE_KEY} from '@/services/socket/SocketManager';

type PendingChange = {
  onStay?: () => void;
  forceOpen?: boolean;
};

type ChangeConfigurationContextValue = {
  requestChangeConfigurationConfirmation: (change?: PendingChange) => void;
  isSimulationRunning: boolean;
  isSimulationOwnedByCurrentSession: boolean;
  isSimulationRunningByAnotherUser: boolean;
  activeSimulationJobId: number | null;
  simulationRunningMessage: string | null;
  simulationId: number | null;
  setIsSimulationRunning: (isRunning: boolean) => void;
};

const ChangeConfigurationContext = createContext<ChangeConfigurationContextValue>({
  requestChangeConfigurationConfirmation: () => {},
  isSimulationRunning: false,
  isSimulationOwnedByCurrentSession: false,
  isSimulationRunningByAnotherUser: false,
  activeSimulationJobId: null,
  simulationRunningMessage: null,
  simulationId: null,
  setIsSimulationRunning: () => {},
});

export const ChangeConfigurationProvider = ({children}: {children: React.ReactNode}) => {
  const dispatch = useDispatch();
  const {id: simulationIdFromUrl} = useParams();
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  // Sync simulationId from Redux or URL
  const simulationId = useMemo(() => {
    const id = simulData?.id ?? proSimulData?.id ?? simulationIdFromUrl;
    return id ? Number(id) : null;
  }, [simulData?.id, proSimulData?.id, simulationIdFromUrl]);

  const simulationResultsStatus = useSelector(simulationResultSuccess);
  const simulationRunSuccess = useSelector(runSimulationSuccess);
  const customSimulationResultStatus = useSelector(customSimulationSuccess);
  const multiYearProjectionRunSuccess = useSelector(multiYearRunSuccess);
  const greenAnalysisRunSuccessStatus = useSelector(greenAnalysisRunSuccess);
  const detailedGreenRunSuccessStatus = useSelector(detailedGreenRunSuccess);
  const shouldConfirmConfigurationChange =
    simulationResultsStatus === 'S-20032' ||
    simulationRunSuccess === 'S-20033' ||
    customSimulationResultStatus === 'S-20038' ||
    multiYearProjectionRunSuccess === 'S-20043' ||
    greenAnalysisRunSuccessStatus === 'S-20048' ||
    detailedGreenRunSuccessStatus === 'S-20054';
  const [open, setOpen] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [activeSimulationJobId, setActiveSimulationJobId] = useState<number | null>(null);
  const [simulationRunningMessage, setSimulationRunningMessage] = useState<string | null>(null);

  const pendingChangeRef = useRef<PendingChange | null>(null);
  const {subscribe} = useContext(WebSocketContext);
  // Track the last simulation result status for which the popup was shown
  const lastResultStatusRef = useRef<string | false | null>(null);
  // Track if popup has been shown for the current result
  const hasShownPopupRef = useRef(false);

  const getStoredSimulationJobId = useCallback(() => {
    const storedJobId = Number(localStorage.getItem(SIMULATION_JOB_STORAGE_KEY));
    return Number.isFinite(storedJobId) && storedJobId > 0 ? storedJobId : null;
  }, []);

  const isSimulationOwnedByCurrentSession = activeSimulationJobId !== null && getStoredSimulationJobId() === activeSimulationJobId;
  const isSimulationRunningByAnotherUser = isSimulationRunning && activeSimulationJobId !== null && !isSimulationOwnedByCurrentSession;

  // Reset the shown flag if the simulation result changes
  useEffect(() => {
    if (simulationResultsStatus !== lastResultStatusRef.current) {
      lastResultStatusRef.current = simulationResultsStatus;
      hasShownPopupRef.current = false;
    }
  }, [simulationResultsStatus]);

  // Reset popup state after every successful simulation completion
  useEffect(() => {
    if (
      simulationResultsStatus === 'S-20032' ||
      simulationRunSuccess === 'S-20033' ||
      customSimulationResultStatus === 'S-20038' ||
      multiYearProjectionRunSuccess === 'S-20043' ||
      greenAnalysisRunSuccessStatus === 'S-20048' ||
      detailedGreenRunSuccessStatus === 'S-20054'
    ) {
      hasShownPopupRef.current = false;
    }
  }, [
    simulationResultsStatus,
    simulationRunSuccess,
    customSimulationResultStatus,
    multiYearProjectionRunSuccess,
    greenAnalysisRunSuccessStatus,
    detailedGreenRunSuccessStatus,
  ]);

  const requestChangeConfigurationConfirmation = useCallback(
    (change?: PendingChange) => {
      const shouldAllowOpen = change?.forceOpen || shouldConfirmConfigurationChange;

      if (!shouldAllowOpen || open || hasShownPopupRef.current) {
        return;
      }
      pendingChangeRef.current = change || null;
      setOpen(true);
      hasShownPopupRef.current = true;
    },
    [open, shouldConfirmConfigurationChange],
  );

  const handleStay = () => {
    pendingChangeRef.current?.onStay?.();
    pendingChangeRef.current = null;
    setOpen(false);
    // Allow popup to show again after Stay
    hasShownPopupRef.current = false;
  };

  const handleContinue = () => {
    pendingChangeRef.current = null;
    setOpen(false);
    // Do NOT allow popup to show again after Continue (keep hasShownPopupRef true)
  };

  useEffect(() => {
    const unsubscribe = subscribe(event => {
      // Only handle SimulationJob events
      if (event.resource_type !== ResourceType.SizingSimulationJob) return;
      const isCurrentSimulation = event.data?.simulation_id === simulationId || event.resource_id === activeSimulationJobId;
      if (isCurrentSimulation) {
        if (event.action_id === ActionType.Started) {
          const startedJobId = Number(event.resource_id);
          setActiveSimulationJobId(startedJobId);
          setIsSimulationRunning(true);
          setSimulationRunningMessage(
            getStoredSimulationJobId() === startedJobId ? null : 'Another simulation is currently running. You’ll be able to start a new one once it finishes.',
          );
          if (simulationId !== null) {
            dispatch(simulationProgressRequest({simulation_id: simulationId}));
          }
        } else if (
          event.action_id === ActionType.Completed ||
          event.action_id === ActionType.Failed ||
          event.action_id === ActionType.Stopped ||
          event.action_id === ActionType.Cancelled
        ) {
          setActiveSimulationJobId(null);
          setIsSimulationRunning(false);
          setSimulationRunningMessage(null);
          if (simulationId !== null) {
            dispatch(simulationProgressRequest({simulation_id: simulationId}));
          }
          if (simulationId !== null) {
            dispatch(getDGSizingSilentRequest({simulation_id: simulationId}));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [dispatch, getStoredSimulationJobId, simulationId, subscribe, activeSimulationJobId]);

  useEffect(() => {
    if (!isSimulationRunningByAnotherUser) {
      setSimulationRunningMessage(null);
    } else if (!simulationRunningMessage) {
      setSimulationRunningMessage("Another simulation is currently running. You'll be able to start a new one once it finishes. Please check back later.");
    }
  }, [isSimulationRunningByAnotherUser, simulationRunningMessage]);

  const value = useMemo(
    () => ({
      requestChangeConfigurationConfirmation,
      isSimulationRunning,
      isSimulationOwnedByCurrentSession,
      isSimulationRunningByAnotherUser,
      activeSimulationJobId,
      simulationRunningMessage,
      simulationId,
      setIsSimulationRunning,
    }),
    [
      requestChangeConfigurationConfirmation,
      isSimulationRunning,
      isSimulationOwnedByCurrentSession,
      isSimulationRunningByAnotherUser,
      activeSimulationJobId,
      simulationRunningMessage,
      simulationId,
    ],
  );

  return (
    <ChangeConfigurationContext.Provider value={value}>
      {children}
      {open && <ChangeConfiguration open={open} onStay={handleStay} onContinue={handleContinue} />}
    </ChangeConfigurationContext.Provider>
  );
};

export const useChangeConfigurationConfirmation = () => useContext(ChangeConfigurationContext);
