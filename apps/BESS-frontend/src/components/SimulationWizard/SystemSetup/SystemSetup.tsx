import {Generator} from './Generator';
import {Bess} from './Bess';
import {SolarProfile} from './SolarProfile';
import {LoadProfile} from './LoadProfile';
import {SystemSetupTabs} from './SystemSetupTabs';
import {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {useSelector} from 'react-redux';
import {
  bessConfigSuccess,
  generatorSuccess,
  loadProfileError,
  loadProfileSaved,
  projectSimulationData,
  saveSolarProfileSuccess,
} from '@/services/redux/selectors/simulationWizardSelector';
import {allProjectsData, authDataSelector} from '@/services/redux/selectors';
import {Icon, Text} from '@/ui-kits';
import {useSimulationStatus} from '../SimulationStatusContext';

interface SystemSetupProps {
  setIsStepsHidden: (hidden: boolean) => void;
  onNextToDispatchRules?: () => void;
}

export const SystemSetup: React.FC<SystemSetupProps> = ({setIsStepsHidden, onNextToDispatchRules}) => {
  const [activeTab, setActiveTab] = useState<string>('load');

  const {isAnySimulationRunning, runningSimulationId} = useSimulationStatus();
  const simulationError = useSelector(loadProfileError);
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const proSimulData = useSelector(projectSimulationData);
  const currentSimulationId = proSimulData?.id ?? null;

  const shouldBlock = isAnySimulationRunning && runningSimulationId === currentSimulationId;
  console.log('currentSimulationId: ', currentSimulationId);
  console.log('runningSimulationId: ', runningSimulationId);
  console.log('shouldBlock: ', shouldBlock);

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

  const isAssignedUser = Boolean(
    authData?.id &&
    allProjData?.some(project => Number(project?.id) === proSimulData?.project_id && project?.assigned_users?.some(user => user.id === authData.id)),
  );

  const isLoadProfileComplete = useSelector(loadProfileSaved) === 'S-20004' && simulationError !== 'E-20026';
  const isSolarProfileComplete = useSelector(saveSolarProfileSuccess) === 'S-20006' && simulationError !== 'E-20006';
  const isBessConfigComplete = useSelector(bessConfigSuccess) === 'S-20011' && simulationError !== 'E-20026';
  const generatorSuccessVal = useSelector(generatorSuccess);
  const isGeneratorConfigComplete = isLoadProfileComplete && isSolarProfileComplete && isBessConfigComplete && generatorSuccessVal === 'S-20019';

  const completedTabs = useMemo(() => {
    return {
      load: isLoadProfileComplete,
      solar: isSolarProfileComplete,
      battery: isBessConfigComplete,
      generator: isGeneratorConfigComplete,
    };
  }, [isLoadProfileComplete, isSolarProfileComplete, isBessConfigComplete, isGeneratorConfigComplete]);
  return (
    <div>
      <SystemSetupTabs activeTab={activeTab} onChange={setActiveTab} completedTabs={completedTabs} />
      {shouldBlock && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-3 rounded-md border border-[#F7C9C4] bg-[#FFF6F4] px-4 py-3">
            <Icon name="infoCircle" className="size-4.5! text-warning!" />
            <Text variant="14M" className="text-warning!">
              Another simulation is currently running. You'll be able to start a new one once it finishes. Please check back later.
            </Text>
          </div>
        </div>
      )}

      {activeTab === 'load' && <LoadProfile onSaveComplete={() => setActiveTab('solar')} setIsStepsHidden={setIsStepsHidden} readOnly={isAssignedUser} />}
      {activeTab === 'solar' && <SolarProfile onSaveComplete={() => setActiveTab('battery')} readOnly={!isLoadProfileComplete} />}
      {activeTab === 'battery' && <Bess onSaveComplete={() => setActiveTab('generator')} readOnly={!(isLoadProfileComplete && isSolarProfileComplete)} />}
      {activeTab === 'generator' && (
        <Generator onNextToDispatchRules={onNextToDispatchRules} readOnly={!(isLoadProfileComplete && isSolarProfileComplete && isBessConfigComplete)} />
      )}
      {shouldBlock && createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
    </div>
  );
};
