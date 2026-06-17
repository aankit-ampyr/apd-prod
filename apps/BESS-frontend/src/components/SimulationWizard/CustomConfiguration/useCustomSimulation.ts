import { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { WebSocketContext } from '@/context/WebsocketContext';

import {
    runCustomSimulationRequest,
} from '@/services/redux/slice/simulationWizardSlice';

import { ActionType, ResourceType } from '@/constants';

interface UseCustomSimulationProps {
    simulationId?: number;
    onSimulationCompleted: () => void;
}

export const useCustomSimulation = ({
    simulationId,
    onSimulationCompleted,
}: UseCustomSimulationProps) => {
    const dispatch = useDispatch();

    const { subscribe } = useContext(WebSocketContext);

    useEffect(() => {
        const unsubscribe = subscribe(event => {
            console.log('CUSTOM SIMULATION EVENT', event);
            console.log('EVENT', event);
            console.log('SIM ID', simulationId);

            // only SimulationJob socket
            if (
                event.resource_type !==
                ResourceType.SimulationJob
            ) {
                return;
            }


            const action =
                ActionType[event.action_id] ||
                event.action_id;

            // completed
            if (
                action === 'Completed' ||
                action === ActionType.Completed
            ) {


                // show result block
                onSimulationCompleted();
            }
        });

        return () => unsubscribe();
    }, [
        dispatch,
        simulationId,
        subscribe,
        onSimulationCompleted,
    ]);

    const handleRunSimulation = () => {
        if (!simulationId) return;

        dispatch(
            runCustomSimulationRequest({
                simulation_id: simulationId,
            })
        );
    };

    return {
        handleRunSimulation,
    };
};