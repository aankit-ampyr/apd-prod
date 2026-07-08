import {useContext, useEffect} from 'react';
import {useDispatch} from 'react-redux';

import {WebSocketContext} from '@/context/WebsocketContext';
import {useCallback, useRef, useState} from 'react';
import {SIMULATION_JOB_STORAGE_KEY} from '@/services/socket/SocketManager';

import {runCustomSimulationRequest} from '@/services/redux/slice/simulationWizardSlice';

import {ActionType, ResourceType} from '@/constants';
import {useSimulationStatus} from '../SimulationStatusContext';

interface UseCustomSimulationProps {
  simulationId?: number;
  onSimulationCompleted: () => void;
}

export const useCustomSimulation = ({simulationId, onSimulationCompleted}: UseCustomSimulationProps) => {
  const dispatch = useDispatch();

  const {subscribe} = useContext(WebSocketContext);
  const {isAnySimulationRunning, setIsCustomConfigRunning, runningSimulationId} = useSimulationStatus();

  const CUSTOM_SIMULATION_JOB_STORAGE_KEY = `${SIMULATION_JOB_STORAGE_KEY}_custom_simulation`;

  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isSimulationLocked, setIsSimulationLocked] = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<number | null>(null);

  const pendingRunRequestRef = useRef(false);
  const activeResourceIdRef = useRef<number | null>(null);

  const getSavedJobId = useCallback(() => {
    const savedJobId = Number(localStorage.getItem(CUSTOM_SIMULATION_JOB_STORAGE_KEY));

    return Number.isFinite(savedJobId) && savedJobId > 0 ? savedJobId : null;
  }, []);

  const isCurrentUserOwner = activeResourceId !== null && getSavedJobId() === activeResourceId;

  const isBlocked = isSimulationLocked && !isCurrentUserOwner && !isSimulationRunning;

  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulationId;

  useEffect(() => {
    const unsubscribe = subscribe(event => {
      console.log('CUSTOM HOOK', event.resource_type, ActionType[event.action_id] || event.action_id);

      // only SimulationJob socket
      if (event.resource_type !== 10) {
        return;
      }

      const action = ActionType[event.action_id] || event.action_id;

      if (action === 'Started' || action === ActionType.Started) {
        const resourceId = Number(event.resource_id);

        activeResourceIdRef.current = resourceId;
        setActiveResourceId(resourceId);
        setIsSimulationLocked(true);

        const isOwnerEvent = getSavedJobId() === resourceId;

        if (isOwnerEvent || pendingRunRequestRef.current) {
          setIsSimulationRunning(true);
        } else {
          setIsSimulationRunning(false);
        }

        return;
      }

      // completed
      // if (
      //     action === 'Completed' ||
      //     action === ActionType.Completed
      // ) {

      //     // show result block
      //     onSimulationCompleted();
      // }

      if (action === 'Completed' || action === ActionType.Completed) {
        setIsSimulationRunning(false);
        setIsSimulationLocked(false);
        setIsCustomConfigRunning(false);

        activeResourceIdRef.current = null;
        setActiveResourceId(null);

        pendingRunRequestRef.current = false;

        localStorage.removeItem(CUSTOM_SIMULATION_JOB_STORAGE_KEY);

        onSimulationCompleted();
      }
    });

    return () => unsubscribe();
  }, [dispatch, simulationId, subscribe, onSimulationCompleted]);
  useEffect(() => {
    const savedJobId = getSavedJobId();
    if (!savedJobId) return;

    setIsSimulationRunning(true);
    setIsSimulationLocked(true);
    setActiveResourceId(savedJobId);
    activeResourceIdRef.current = savedJobId;
  }, [getSavedJobId]);

  const handleRunSimulation = () => {
    if (!simulationId) return;
    localStorage.removeItem(CUSTOM_SIMULATION_JOB_STORAGE_KEY);

    setIsSimulationRunning(true);
    pendingRunRequestRef.current = true;

    dispatch(
      runCustomSimulationRequest({
        simulation_id: simulationId,
      }),
    );
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

  return {
    handleRunSimulation,
    isBlocked,
    isSimulationRunning,
  };
};
