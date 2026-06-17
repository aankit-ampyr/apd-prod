import { Button, Icon, Text } from '@/ui-kits';
import { useEffect, useRef, useState } from 'react';
import { SelectSolarProfile } from './SelectSolarProfile';
import { CSVUpload } from './CSVUpload';
import { useDispatch, useSelector } from 'react-redux';
import { saveSolarProfileRequest } from '@/services/redux/slice/simulationWizardSlice';
import {
  saveSolarProfileLoading,
  saveSolarProfileSuccess,
  saveSolarProfileError,
  savedSolarProfileData,
  solarProfileData,
  uploadSolarCSVError,
  solarProfileError,
  initiateSimulationData,
  projectSimulationData,
} from '@/services/redux/selectors/simulationWizardSelector';
import { authDataSelector, allProjectsData } from '@/services/redux/selectors';

type Props = {
  readonly onSaveComplete?: () => void;
  readonly readOnly?: boolean;
};

export const SolarProfile = ({ onSaveComplete, readOnly }: Props) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'existing' | 'csv'>('existing');
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;
  const previewSolar = useSelector(solarProfileData);
  const savedSolar = useSelector(savedSolarProfileData);
  const solarData = previewSolar ?? savedSolar;
  const isSavingRef = useRef(false);

  const saveSuccess = useSelector(saveSolarProfileSuccess);
  const saveLoading = useSelector(saveSolarProfileLoading);
  const saveError = useSelector(saveSolarProfileError);

  // Check if user is an assigned user (view-only access)
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find(project => Number(project?.id) === projectId);
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isAssignedUser = Boolean(
    authData?.id && allProjData?.some(project => Number(project?.id) === projectId && project?.assigned_users?.some(user => user.id === authData.id)),
  );

  const isReadOnly = readOnly || isAssignedUser || isProjectAssignmentPending;

  const [maximizedChart, setMaximizedChart] = useState<'hourly' | 'monthly' | null>(null);
  // Move isExpanded to parent so it persists across remounts
  const [isExpanded, setIsExpanded] = useState(false);
  // Track if the user has made a change since last save
  const [isDirty, setIsDirty] = useState(false);

  const solarSectionRef = useRef<HTMLDivElement>(null);

  const handleMinimize = () => {
    setMaximizedChart(null);

    setTimeout(() => {
      const el = solarSectionRef.current;
      if (!el) return;

      let scrollContainer: HTMLElement | null = el.parentElement;
      while (scrollContainer) {
        const { overflow, overflowY } = window.getComputedStyle(scrollContainer);
        if (/(auto|scroll)/.test(overflow + overflowY) && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
          const chartTop = el.getBoundingClientRect().top;
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const offset = chartTop - containerTop + scrollContainer.scrollTop;
          const targetScroll = offset - scrollContainer.clientHeight * -0.5;
          scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
          break;
        }
        scrollContainer = scrollContainer.parentElement;
      }
    }, 50); // small delay lets React finish remounting the normal view
  };

  // Call onSaveComplete when save is successful (only for fresh saves)
  useEffect(() => {
    if (!saveLoading && saveSuccess && isSavingRef.current && onSaveComplete) {
      isSavingRef.current = false;
      setIsDirty(false); // Mark as not dirty after save
      onSaveComplete();
    }
  }, [saveLoading, saveSuccess, onSaveComplete]);

  // Fallback: if a save completes without error (even if success flag value doesn't change),
  // proceed to next step.
  useEffect(() => {
    if (!saveLoading && isSavingRef.current && !saveError && onSaveComplete) {
      isSavingRef.current = false;
      setIsDirty(false); // Mark as not dirty after save
      onSaveComplete();
    }
  }, [saveLoading, saveError, onSaveComplete]);

  useEffect(() => {
    if (!previewSolar) {
      setIsDirty(false);
      return;
    }

    if (!savedSolar) {
      setIsDirty(true);
      return;
    }

    const hasChangedSource = previewSolar.source.id !== savedSolar.source.id || previewSolar.source.type !== savedSolar.source.type;
    setIsDirty(hasChangedSource);
  }, [previewSolar, savedSolar]);

  // Mark as dirty when a new file is uploaded or a different profile is selected
  const handleProfileChange = () => {
    setIsDirty(true);
  };

  // Ensure the green tick (saveSuccess) is not cleared on remount, only on edit
  // No code needed here, handled in SelectSolarProfile

  const isAlreadySaved = !!saveSuccess;
  const hasUnsavedChanges =
    previewSolar && savedSolar ? previewSolar.source.id !== savedSolar.source.id || previewSolar.source.type !== savedSolar.source.type : !!previewSolar;

  const handleSave = () => {
    if (!simulation_id || !solarData) return;

    isSavingRef.current = true;

    dispatch(
      saveSolarProfileRequest({
        simulation_id,
        payload: {
          type: solarData.source.type,
          source_id: solarData.source.id,
        },
      }),
    );
  };

  const uploadError = useSelector(uploadSolarCSVError);
  const computeError = useSelector(solarProfileError);

  // Button is disabled unless the current preview truly differs from the saved solar profile.
  const disableButton = !solarData || !hasUnsavedChanges || isReadOnly || !!uploadError || !!computeError;

  return (
    <>
      {!maximizedChart && (
        <>
          <div ref={solarSectionRef} className="bg-primary-tint-2/40 p-4 mt-5 border-[1.4px] border-border rounded-md w-full">
            {' '}
            <div className="flex items-center gap-3">
              <Icon name="sun" size={22} />
              <Text variant={'h4'} className="font-SpaceGroteskBold">
                Solar Profile
              </Text>
            </div>
            <div className="bg-bg-card p-2 rounded-md flex w-[80%] xl:w-[45%] mt-4">
              {/* Select Existing File */}
              <button
                onClick={() => !isReadOnly && setActiveTab('existing')}
                disabled={isReadOnly}
                className={`flex-1 py-2 self-center rounded-md text-center font-semibold transition-all duration-200
          ${activeTab === 'existing' ? 'bg-primary text-white shadow-sm' : 'text-gray-600'} ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                Select Existing File
              </button>

              {/* Upload Custom CSV */}
              <button
                onClick={() => !isReadOnly && setActiveTab('csv')}
                disabled={isReadOnly}
                className={`flex-1 py-2 self-center rounded-md text-center font-semibold transition-all duration-200
          ${activeTab === 'csv' ? 'bg-primary text-white shadow-sm' : 'text-gray-600'} ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                Upload Custom CSV
              </button>
            </div>
            {activeTab === 'existing' && (
              <SelectSolarProfile
                data={solarData}
                onMaximize={(chart: 'hourly' | 'monthly') => setMaximizedChart(chart)}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                readOnly={isReadOnly}
                onProfileChange={handleProfileChange}
              />
            )}
            {activeTab === 'csv' && <CSVUpload readOnly={isReadOnly} onFileChange={handleProfileChange} />}
          </div>
          {activeTab === 'existing' && !isReadOnly && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                size="md"
                disabled={disableButton}
                onClick={handleSave}
                className={`self-center ${disableButton ? 'cursor-not-allowed' : ''}`}>
                Save and Continue
              </Button>
            </div>
          )}
        </>
      )}
      {maximizedChart && (
        <div className="w-full h-[calc(100vh-100px)] p-4">
          <SelectSolarProfile
            data={solarData}
            maximizedChart={maximizedChart}
            onMinimize={handleMinimize}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            readOnly={isReadOnly}
          />
        </div>
      )}
    </>
  );
};
