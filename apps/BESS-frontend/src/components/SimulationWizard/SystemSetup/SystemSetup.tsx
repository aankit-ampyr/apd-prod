import {Generator} from './Generator';
import {Bess} from './Bess';
import {SolarProfile} from './SolarProfile';
import {LoadProfile} from './LoadProfile';
import {SystemSetupTabs} from './SystemSetupTabs';
import {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {useSelector} from 'react-redux';
import {projectSimulationData} from '@/services/redux/selectors/simulationWizardSelector';
import {allProjectsData, authDataSelector} from '@/services/redux/selectors';
import {Alert} from '@/ui-kits';
import {useSimulationStatus} from '../SimulationStatusContext';

interface SystemSetupProps {
  setIsStepsHidden: (hidden: boolean) => void;
  onNextToDispatchRules?: () => void;
}

export const SystemSetup: React.FC<SystemSetupProps> = ({setIsStepsHidden, onNextToDispatchRules}) => {
  const [activeTab, setActiveTab] = useState<string>('load');

  const {isAnySimulationRunning, runningSimulationId, userName} = useSimulationStatus() ?? {};
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const proSimulData = useSelector(projectSimulationData);
  const currentSimulationId = proSimulData?.id ?? null;

  const shouldBlock = isAnySimulationRunning && runningSimulationId === currentSimulationId;

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
  useEffect(() => {
    const screenWrapper = document.querySelector('.screen-wrapper');
    let scrollContainer: HTMLElement | null = screenWrapper?.parentElement ?? null;

    while (scrollContainer) {
      const {overflow, overflowY} = window.getComputedStyle(scrollContainer);

      if (/(auto|scroll)/.test(`${overflow}${overflowY}`)) {
        scrollContainer.scrollTo({
          top: 0,
          behavior: 'auto',
        });
        return;
      }

      scrollContainer = scrollContainer.parentElement;
    }

    window.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, [activeTab]);

  const isAssignedUser = Boolean(
    authData?.id &&
    allProjData?.some(project => Number(project?.id) === proSimulData?.project_id && project?.assigned_users?.some(user => user.id === authData.id)),
  );

  const progress = Number(proSimulData?.progress ?? 0);
  console.log('progress: ', progress);

  const completedTabs = useMemo(() => {
    return {
      load: progress >= 1,
      solar: progress >= 2,
      battery: progress >= 3,
      generator: progress >= 4,
    };
  }, [progress]);

  return (
    <div>
      {shouldBlock && (
        <div className="flex justify-center my-3">
          <Alert
            textClassName="text-error-text! text-[14px]!"
            iconClassName="mt-0! size-4.5!"
            iconName="warning-triangle-sharp"
            message={`${userName} is currently running this simulation. You can run it again once it completes`}
            variant="error"
            className={`w-fit! justify-center items-center! p-3! border-0.5 border-error/20`}
          />
        </div>
      )}
      <SystemSetupTabs activeTab={activeTab} onChange={setActiveTab} completedTabs={completedTabs} />

      {activeTab === 'load' && <LoadProfile onSaveComplete={() => setActiveTab('solar')} setIsStepsHidden={setIsStepsHidden} readOnly={isAssignedUser} />}
      {activeTab === 'solar' && (
        <SolarProfile
          onSaveComplete={() => setActiveTab('battery')}
          readOnly={Boolean(Number(proSimulData?.progress) < 1)}
          setIsStepsHidden={setIsStepsHidden}
        />
      )}
      {activeTab === 'battery' && (
        <Bess
          onSaveComplete={() => setActiveTab('generator')}
          readOnly={Boolean(Number(proSimulData?.progress) < 1 && Boolean(Number(proSimulData?.progress) < 2))}
        />
      )}
      {activeTab === 'generator' && (
        <Generator
          onNextToDispatchRules={onNextToDispatchRules}
          readOnly={Boolean(Number(proSimulData?.progress) < 1) && Boolean(Number(proSimulData?.progress) < 2) && Boolean(Number(proSimulData?.progress) < 3)}
        />
      )}
      {shouldBlock && createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
    </div>
  );
};
