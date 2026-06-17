import React, {useEffect} from 'react';
import {Modal, Button, Text, SelectInput} from '@/ui-kits';
import {useDispatch, useSelector} from 'react-redux';
import {useDropdownValues} from '@/hooks';
import {getAllProjectListRequest, projectListRequest} from '@/services/redux/slice/projectsSlice';
import {allProjectsList} from '@/services/redux/selectors/projectSelector';
import {useFormik} from 'formik';
import {initiateSimulationRequest, resetSimulationMessage} from '@/services/redux/slice/simulationWizardSlice';
import {RootState} from '@/services/redux/rootReducer';
import {useNavigate} from 'react-router-dom';
import {Routes as WebRoutes} from '@/navigation/Routes';

interface ProjectSimulationModalProps {
  open: boolean;
}

type FormType = {
  project: number | null;
};

const initialValues: FormType = {
  project: null,
};

export const ProjectSimulationModal: React.FC<ProjectSimulationModalProps> = ({open}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const simulationSuccess = useSelector((state: RootState) => state.simulationWizard.simulationSuccess);

  // Fetch all projects for the dropdown
  const allProjects = useDropdownValues({
    fetchAction: () => dispatch(getAllProjectListRequest()),
    selector: allProjectsList,
  });

  // Always fetch all projects when modal opens
  useEffect(() => {
    if (open) {
      dispatch(getAllProjectListRequest());
    }
  }, [open, dispatch]);

  // Formik for form state
  const {dirty, isValid, errors, values, handleBlur, setFieldValue, handleSubmit, touched} = useFormik({
    initialValues,
    validationSchema: undefined, // Add validation if needed
    onSubmit: handleSimulation,
    enableReinitialize: true,
    validateOnMount: true,
  });

  useEffect(() => {
    if (simulationSuccess === 'S-20005') {
      dispatch(resetSimulationMessage());
    }
  }, [simulationSuccess, dispatch]);

  function handleSimulation(values: FormType) {
    if (!values.project) return;
    dispatch(initiateSimulationRequest({project_id: values.project, project_name: allProjects.find(p => p.id === values.project)?.label}));
  }

  const showEmptyState = allProjects.length === 0;

  return (
    <Modal open={open} maxWidth={400} className="flex! flex-col gap-6!">
      <div className="flex justify-between items-center">
        <Text variant="h3">{showEmptyState ? 'Start by creating a project' : 'Start Simulation'}</Text>
      </div>

      {showEmptyState ? (
        <>
          <Text variant="body2" className="text-text-primary!">
            You don’t have any projects yet. Create one to begin your simulation.
          </Text>
          <Button className="w-full justify-center" variant="primary" onClick={() => navigate(WebRoutes.PROJECT_MANAGEMENT)}>
            Go to Project Management
          </Button>
        </>
      ) : (
        <>
          <Text variant="body2" className="text-text-primary!">
            Select a project to continue
          </Text>
          <SelectInput
            label="Project"
            required
            placeholder="Select Project"
            options={allProjects}
            onChange={item => setFieldValue('project', Number(item.id))}
            onBlur={handleBlur('project')}
            value={values.project}
            touched={touched.project}
            error={errors.project}
          />
          <Button disabled={!dirty || !isValid} className="w-full justify-center" onClick={() => handleSubmit()} variant="primary">
            Continue
          </Button>
          <Button
            variant="tertiary"
            className="w-full justify-center bg-transparent! hover:bg-transparent! active:bg-transparent! focus:bg-transparent! outline-none! ring-0!"
            rightIcon="arrow-right"
            iconClassName="text-text-primary!"
            textClassName="text-text-primary! group-hover:text-text-primary! group-active:text-text-primary!"
            onClick={() => navigate(WebRoutes.PROJECT_MANAGEMENT)}>
            Go to Project Management
          </Button>
        </>
      )}
    </Modal>
  );
};
