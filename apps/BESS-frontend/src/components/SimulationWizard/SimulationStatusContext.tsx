import React, {createContext, useContext, useMemo, useState, useEffect} from 'react';
import {WebSocketContext} from '@/context/WebsocketContext';
import {ActionType} from '@/constants';
import {
  getDGSizingSilentRequest,
  getGeneratorDgSilentRequest,
  refreshProjectSimulationRequest,
  simulationProgressSilentRequest,
} from '@/services/redux/slice/simulationWizardSlice';
import {useDispatch, useSelector} from 'react-redux';
import {initiateSimulationData, projectSimulationData} from '@/services/redux/selectors/simulationWizardSelector';

type SimulationStatusContextType = {
  isSizingRunning: boolean;
  isMultiYearRunning: boolean;
  isGreenAnalysisRunning: boolean;
  isAnySimulationRunning: boolean;
  isCustomConfigRunning: boolean;
  isDetailedGreenAnalysisRunning: boolean;
  runningSimulationId: number | null;
  shouldPauseSessionTimeout: boolean;

  setIsSizingRunning: (v: boolean) => void;
  setIsMultiYearRunning: (v: boolean) => void;
  setIsGreenAnalysisRunning: (v: boolean) => void;
  setIsCustomConfigRunning: (v: boolean) => void;
  setIsDetailedGreenAnalysisRunning: (v: boolean) => void;
  userName: string | null;
  DGSizingSimulationCompleted: boolean;
  customConfigSimulationCompleted: boolean;
};

const SimulationStatusContext = createContext<SimulationStatusContextType>(null!);

export const SimulationStatusProvider = ({children}: {children: React.ReactNode}) => {
  const dispatch = useDispatch();
  const {subscribe} = useContext(WebSocketContext);
  const [isSizingRunning, setIsSizingRunning] = useState(false);
  const [isCustomConfigRunning, setIsCustomConfigRunning] = useState(false);
  const [isMultiYearRunning, setIsMultiYearRunning] = useState(false);
  const [isGreenAnalysisRunning, setIsGreenAnalysisRunning] = useState(false);
  const [isDetailedGreenAnalysisRunning, setIsDetailedGreenAnalysisRunning] = useState(false);
  const [runningSimulationId, setRunningSimulationId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [DGSizingSimulationCompleted, setDGSizingSimulationCompleted] = useState(false);
  const [customConfigSimulationCompleted, setCustomConfigSimulationCompleted] = useState(false);

  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const currentSimulationId = simulData?.id ?? proSimulData?.id;

  useEffect(() => {
    const unsubscribe = subscribe(event => {
      const action = event.action_id;
      const eventSimulationId = Number(event.data?.simulation_id);
      // DG Sizing Simulation
      if (Number(event.resource_type) === 4) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsSizingRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
          if (eventSimulationId === currentSimulationId) {
            // setDGSizingSimulationCompleted(false);
            setUserName(event.data?.user_name ?? null);
          }
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsSizingRunning(false);
          setRunningSimulationId(null);
          if (eventSimulationId === currentSimulationId) {
            setDGSizingSimulationCompleted(true);
            dispatch(
              getDGSizingSilentRequest({
                simulation_id: Number(event.data.simulation_id),
              }),
            );
            dispatch(
              getGeneratorDgSilentRequest({
                simulation_id: Number(event.data.simulation_id),
              }),
            );
            dispatch(
              simulationProgressSilentRequest({
                simulation_id: Number(event.data.simulation_id),
              }),
            );
          }
        }
      }

      // Multi-Year Projection
      if (Number(event.resource_type) === 11) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsMultiYearRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
          if (eventSimulationId === currentSimulationId) {
            setUserName(event.data?.user_name ?? null);
          }
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsMultiYearRunning(false);
          setRunningSimulationId(null);
        }
      }

      //custom configuration
      if (Number(event.resource_type) === 10) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setCustomConfigSimulationCompleted(false);
          setDGSizingSimulationCompleted(false);
          setRunningSimulationId(Number(event.data?.simulation_id));
          if (eventSimulationId === currentSimulationId) {
            setUserName(event.data?.user_name ?? null);
          }
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsCustomConfigRunning(false);
          setCustomConfigSimulationCompleted(true);
          setRunningSimulationId(null);
          if (eventSimulationId === currentSimulationId) {
            dispatch(
              refreshProjectSimulationRequest({
                simulation_id: Number(event.data.simulation_id),
              }),
            );
          }
        }
      }

      // Green Analysis
      if (Number(event.resource_type) === 12) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsGreenAnalysisRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
          if (eventSimulationId === currentSimulationId) {
            setUserName(event.data?.user_name ?? null);
          }
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsGreenAnalysisRunning(false);
          setRunningSimulationId(null);
          if (eventSimulationId === currentSimulationId) {
            dispatch(
              refreshProjectSimulationRequest({
                simulation_id: Number(event.data.simulation_id),
              }),
            );
          }
        }
      }

      //detailed green analysis
      if (Number(event.resource_type) === 13) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsDetailedGreenAnalysisRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
          if (eventSimulationId === currentSimulationId) {
            setUserName(event.data?.user_name ?? null);
          }
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsDetailedGreenAnalysisRunning(false);
          setRunningSimulationId(null);
        }
      }
    });

    return () => unsubscribe();
  }, [subscribe, currentSimulationId, dispatch]);

  const shouldPauseSessionTimeout =
    !!currentSimulationId &&
    runningSimulationId === currentSimulationId &&
    (isSizingRunning || isMultiYearRunning || isGreenAnalysisRunning || isCustomConfigRunning || isDetailedGreenAnalysisRunning);

  const value = useMemo(
    () => ({
      isSizingRunning,
      isMultiYearRunning,
      isGreenAnalysisRunning,
      isCustomConfigRunning,
      isDetailedGreenAnalysisRunning,
      runningSimulationId,

      isAnySimulationRunning: isSizingRunning || isMultiYearRunning || isGreenAnalysisRunning || isCustomConfigRunning || isDetailedGreenAnalysisRunning,

      setIsSizingRunning,
      setIsMultiYearRunning,
      setIsGreenAnalysisRunning,
      setIsCustomConfigRunning,
      setIsDetailedGreenAnalysisRunning,
      setRunningSimulationId,
      userName,
      DGSizingSimulationCompleted,
      customConfigSimulationCompleted,
      shouldPauseSessionTimeout,
    }),
    [
      isSizingRunning,
      isMultiYearRunning,
      isGreenAnalysisRunning,
      isCustomConfigRunning,
      isDetailedGreenAnalysisRunning,
      runningSimulationId,
      userName,
      DGSizingSimulationCompleted,
      customConfigSimulationCompleted,
      shouldPauseSessionTimeout,
    ],
  );

  return <SimulationStatusContext.Provider value={value}>{children}</SimulationStatusContext.Provider>;
};

export const useSimulationStatus = () => useContext(SimulationStatusContext);
