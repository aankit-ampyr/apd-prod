import React, {createContext, useContext, useMemo, useState, useEffect} from 'react';
import {WebSocketContext} from '@/context/WebsocketContext';
import {ActionType, ResourceType} from '@/constants';

type SimulationStatusContextType = {
  isSizingRunning: boolean;
  isMultiYearRunning: boolean;
  isGreenAnalysisRunning: boolean;
  isAnySimulationRunning: boolean;
  isCustomConfigRunning: boolean;
  isDetailedGreenAnalysisRunning: boolean;
  runningSimulationId: number | null;

  setIsSizingRunning: (v: boolean) => void;
  setIsMultiYearRunning: (v: boolean) => void;
  setIsGreenAnalysisRunning: (v: boolean) => void;
  setIsCustomConfigRunning: (v: boolean) => void;
  setIsDetailedGreenAnalysisRunning: (v: boolean) => void;
};

const SimulationStatusContext = createContext<SimulationStatusContextType>(null!);

export const SimulationStatusProvider = ({children}: {children: React.ReactNode}) => {
  const {subscribe} = useContext(WebSocketContext);
  const [isSizingRunning, setIsSizingRunning] = useState(false);
  const [isCustomConfigRunning, setIsCustomConfigRunning] = useState(false);
  const [isMultiYearRunning, setIsMultiYearRunning] = useState(false);
  const [isGreenAnalysisRunning, setIsGreenAnalysisRunning] = useState(false);
  const [isDetailedGreenAnalysisRunning, setIsDetailedGreenAnalysisRunning] = useState(false);
  const [runningSimulationId, setRunningSimulationId] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(event => {
      const action = event.action_id;

      // Sizing Simulation
      if (event.resource_type === ResourceType.SizingSimulationJob) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsSizingRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsSizingRunning(false);
          setRunningSimulationId(null);
        }
      }

      // Multi-Year Projection
      if (Number(event.resource_type) === 11) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsMultiYearRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsMultiYearRunning(false);
          setRunningSimulationId(null);
        }
      }

      //custom configuration
      if (Number(event.resource_type) === 10) {
        console.log('CUSTOM EVENT', ActionType[event.action_id] || event.action_id, event);
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsCustomConfigRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsCustomConfigRunning(false);
          setRunningSimulationId(null);
        }
      }

      // Green Analysis
      if (Number(event.resource_type) === 12) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsGreenAnalysisRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
          console.log('bhai', runningSimulationId);
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsGreenAnalysisRunning(false);
          setRunningSimulationId(null);
        }
      }

      //detailed green analysis
      if (Number(event.resource_type) === 13) {
        if (action === ActionType.Started || action === ActionType.Updated) {
          setIsDetailedGreenAnalysisRunning(true);
          setRunningSimulationId(Number(event.data?.simulation_id));
        }

        if (action === ActionType.Completed || action === ActionType.Stopped || action === ActionType.Failed || action === ActionType.Cancelled) {
          setIsDetailedGreenAnalysisRunning(false);
          setRunningSimulationId(null);
        }
      }
    });

    return () => unsubscribe();
  }, [subscribe]);

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
    }),
    [isSizingRunning, isMultiYearRunning, isGreenAnalysisRunning, isCustomConfigRunning, isDetailedGreenAnalysisRunning, runningSimulationId],
  );

  return <SimulationStatusContext.Provider value={value}>{children}</SimulationStatusContext.Provider>;
};

export const useSimulationStatus = () => useContext(SimulationStatusContext);
