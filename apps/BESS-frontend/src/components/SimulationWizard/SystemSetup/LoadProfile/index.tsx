import {Button, Icon, Text} from '@/ui-kits';
import {LoadConfig} from './LoadConfig';
import {LoadPreview} from './LoadPreview';
import {LoadChart} from './LoadChart';
import {useEffect, useMemo, useRef, useState} from 'react';
import {saveLoadProfileRequest} from '@/services/redux/slice/simulationWizardSlice';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '@/services/redux/rootReducer';
import {
  initiateSimulationData,
  loadProfileSuccess,
  projectSimulationData,
  savedLoadProfileData as savedLoadProfileSelector,
} from '@/services/redux/selectors/simulationWizardSelector';
import {allProjectsData, authDataSelector, projectLoading} from '@/services/redux/selectors';
import {getAllProjectListRequest} from '@/services/redux/slice/projectsSlice';

type Props = {
  readonly onSaveComplete?: () => void;
  readonly setIsStepsHidden?: (hidden: boolean) => void;
  readonly readOnly?: boolean;
};

export const LoadProfile = ({onSaveComplete, setIsStepsHidden, readOnly = false}: Props) => {
  const dispatch = useDispatch();
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;
  const [currentConfig, setCurrentConfig] = useState<{
    pattern: number;
    config: any;
  } | null>(null);

  const [isFormValid, setIsFormValid] = useState(false);
  const saveSuccess = useSelector(loadProfileSuccess);
  const isSavingRef = useRef(false);
  const hasRequestedProjectListRef = useRef(false);
  const savedData = useSelector(savedLoadProfileSelector);
  const isAlreadySaved = useSelector((state: RootState) => !!state.simulationWizard.loadProfileSaved);

  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const isProjectLoading = useSelector(projectLoading);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find(project => Number(project?.id) === projectId);
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isAssignedUser = Boolean(authData?.id && currentProject?.assigned_users?.some(user => user.id === authData.id));
  const isReadOnly = readOnly || isAssignedUser || isProjectAssignmentPending;

  // Call onSaveComplete when save is successful (only for fresh saves)
  useEffect(() => {
    if (saveSuccess && isSavingRef.current && onSaveComplete) {
      isSavingRef.current = false;
      onSaveComplete();
    }
  }, [saveSuccess, onSaveComplete]);

  useEffect(() => {
    if (authData?.id && projectId && !currentProject && !isProjectLoading && !hasRequestedProjectListRef.current) {
      hasRequestedProjectListRef.current = true;
      dispatch(getAllProjectListRequest());
    }
  }, [authData?.id, projectId, currentProject, isProjectLoading, dispatch]);

  const handleFormStateChange = (state: {isValid: boolean; isFormDirty: boolean}) => {
    setIsFormValid(state.isValid);
  };

  const handleSave = () => {
    if (!currentConfig || simulation_id === null || simulation_id === undefined) return;

    isSavingRef.current = true;
    dispatch(
      saveLoadProfileRequest({
        simulation_id,
        payload: {
          pattern: currentConfig.pattern,
          config: currentConfig.config,
        },
      }),
    );
  };

  const hasChangesComparedToSaved = useMemo(() => {
    if (!isAlreadySaved) return true;
    if (!savedData || !currentConfig) return true;
    const patternChanged = savedData.pattern?.id !== currentConfig.pattern;
    if (patternChanged) return true;
    const a = savedData.config || {};
    const b = currentConfig.config || {};
    const numEq = (x: any, y: any) => {
      const nx = x === '' || x === undefined || x === null ? null : Number(x);
      const ny = y === '' || y === undefined || y === null ? null : Number(y);
      return nx === ny;
    };
    const simpleKeys = ['load_mw', 'start_time', 'end_time', 'start_month', 'end_month'];
    for (const k of simpleKeys) {
      if (!numEq(a[k], b[k])) return true;
    }
    const aw = Array.isArray(a.windows) ? a.windows : null;
    const bw = Array.isArray(b.windows) ? b.windows : null;
    if (!aw && !bw) return false;
    if ((aw?.length || 0) !== (bw?.length || 0)) return true;
    if (aw && bw) {
      for (let i = 0; i < aw.length; i++) {
        const ai = aw[i] || {};
        const bi = bw[i] || {};
        if (!numEq(ai.start_time, bi.start_time) || !numEq(ai.end_time, bi.end_time) || !numEq(ai.load_mw, bi.load_mw)) {
          return true;
        }
      }
    }
    return false;
  }, [isAlreadySaved, savedData, currentConfig]);

  const disableButton = !isFormValid || (isAlreadySaved && !hasChangesComparedToSaved);

  return (
    <>
      <div className="bg-primary-tint-2/40 p-4 mt-5 border-[1.4px] border-border rounded-md w-full">
        <div className="flex items-center gap-3">
          <Icon name="bar" size={20} />
          <Text variant={'h4'} className="font-SpaceGroteskBold">
            Load Profile
          </Text>
        </div>
        <div className="flex flex-col xl:flex-row items-start gap-4 w-full">
          <div className="w-full xl:w-[35%]">
            <LoadConfig onChangeConfig={setCurrentConfig} onFormStateChange={handleFormStateChange} readOnly={isReadOnly} />
          </div>
          <div className="flex flex-col w-full xl:w-[65%] mt-7">
            <LoadPreview />
            <LoadChart setIsStepsHidden={setIsStepsHidden} />
          </div>
        </div>
      </div>

      {!isReadOnly && (
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
  );
};
