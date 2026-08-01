import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
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
import {useParams} from 'react-router-dom';

type PendingChange = {
  onStay?: () => void;
  forceOpen?: boolean;
};

type ChangeConfigurationContextValue = {
  requestChangeConfigurationConfirmation: (change?: PendingChange) => void;
};

const ChangeConfigurationContext = createContext<ChangeConfigurationContextValue>({
  requestChangeConfigurationConfirmation: () => {},
});

export const ChangeConfigurationProvider = ({children}: {children: React.ReactNode}) => {
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

  const pendingChangeRef = useRef<PendingChange | null>(null);
  // Track the last simulation result status for which the popup was shown
  const lastResultStatusRef = useRef<string | false | null>(null);
  // Track if popup has been shown for the current result
  const hasShownPopupRef = useRef(false);

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

  const value = useMemo(
    () => ({
      requestChangeConfigurationConfirmation,
    }),
    [requestChangeConfigurationConfirmation, simulationId],
  );

  return (
    <ChangeConfigurationContext.Provider value={value}>
      {children}
      {open && <ChangeConfiguration open={open} onStay={handleStay} onContinue={handleContinue} />}
    </ChangeConfigurationContext.Provider>
  );
};

export const useChangeConfigurationConfirmation = () => useContext(ChangeConfigurationContext);
