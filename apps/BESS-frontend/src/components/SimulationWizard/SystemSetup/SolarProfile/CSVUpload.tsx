import {Text} from '@/ui-kits';
import FileUpload from '../../../../../../../packages/react-common/src/components/CSVFileUpload';
import {useDispatch, useSelector} from 'react-redux';
import {
  clearSolarProfileData,
  clearUploadSolarCSVData,
  resetSolarProfileMessage,
  resetUploadSolarCSVMessage,
  solarProfileRequest,
  uploadSolarCSVRequest,
} from '@/services/redux/slice/simulationWizardSlice';
import {useEffect} from 'react';
import {
  solarProfileError,
  uploadSolarCSVData,
  uploadSolarCSVError,
  uploadSolarCSVSuccess,
  initiateSimulationData,
  projectSimulationData,
  savedSolarProfileData,
} from '@/services/redux/selectors/simulationWizardSelector';
import {getErrorMessage} from '@/utils/getMessages';
import {useChangeConfigurationConfirmation} from '../../ChangeConfigurationContext';

export const CSVUpload = ({readOnly, onFileChange}: {readOnly?: boolean; onFileChange?: () => void}) => {
  const dispatch = useDispatch();
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();

  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;
  const uploadData = useSelector(uploadSolarCSVData);
  const success = useSelector(uploadSolarCSVSuccess);
  const uploadErrorCode = useSelector(uploadSolarCSVError);
  const solarComputeErrorCode = useSelector(solarProfileError);
  const savedSolar = useSelector(savedSolarProfileData);

  useEffect(() => {
    if (success === 'S-20005' && simulation_id !== undefined && uploadData?.id != null) {
      dispatch(
        solarProfileRequest({
          simulation_id,
          payload: {
            type: 'file',
            source_id: Number(uploadData.id),
          },
        }),
      );
    }
  }, [success, simulation_id, uploadData?.id, dispatch]);
  const handleFileUpload = (file: File) => {
    if (!simulation_id || readOnly) {
      return;
    }
    if (onFileChange) onFileChange();
    // Note: We don't clear the saved flag (tick mark) when editing
    // The tick mark indicates the data was previously saved to server
    dispatch(
      uploadSolarCSVRequest({
        simulation_id,
        file,
      }),
    );
    requestChangeConfigurationConfirmation({
      onStay: () => {
        dispatch(clearUploadSolarCSVData());
        dispatch(clearSolarProfileData());
        dispatch(resetUploadSolarCSVMessage());
        dispatch(resetSolarProfileMessage());
        if (!savedSolar?.source?.id) return;
        dispatch(
          solarProfileRequest({
            simulation_id,
            payload: {
              type: savedSolar.source.type,
              source_id: Number(savedSolar.source.id),
            },
          }),
        );
      },
    });
  };

  const handleFileRemove = () => {
    if (readOnly) return;
    if (onFileChange) onFileChange();
    // Only discard the in-progress upload attempt/preview.
    // Keep the last saved solar selection intact for the existing-file tab.
    dispatch(clearUploadSolarCSVData());
    dispatch(clearSolarProfileData());
    dispatch(resetUploadSolarCSVMessage());
    dispatch(resetSolarProfileMessage());
    requestChangeConfigurationConfirmation({
      onStay: () => {
        if (!savedSolar?.source?.id || !simulation_id) return;
        dispatch(
          solarProfileRequest({
            simulation_id,
            payload: {
              type: savedSolar.source.type,
              source_id: Number(savedSolar.source.id),
            },
          }),
        );
      },
    });
  };

  const persistedFileData =
    success === 'S-20005' && uploadData
      ? {
          file_name: uploadData.name,
          file_size: uploadData.size,
          row_count: uploadData.rows,
          created_at: uploadData.created_at,
        }
      : undefined;

  const uploadErrorMessage = uploadErrorCode && typeof uploadErrorCode === 'string' ? getErrorMessage(uploadErrorCode as any) : '';
  const computeErrorMessage = solarComputeErrorCode && typeof solarComputeErrorCode === 'string' ? getErrorMessage(solarComputeErrorCode as any) : '';
  const externalErrorMessage = uploadErrorMessage || computeErrorMessage;
  const externalErrorTitle = uploadErrorCode === 'E-20049' ? uploadErrorMessage : undefined;

  return (
    <div className="mt-5">
      <Text variant="body1" className="text-[#2D9E7A]!">
        Upload solar generation CSV file <span className="text-primary-tint-1!">(with hourly load data) </span>
      </Text>
      <div className="border-[1.4px] border-border rounded-sm p-5 mt-2 bg-white">
        <FileUpload
          onFileSelect={handleFileUpload}
          onFileRemove={handleFileRemove}
          persistedFile={persistedFileData}
          externalErrorMessage={externalErrorMessage}
          externalErrorTitle={externalErrorTitle}
          loadingMessage=""
          requireServerValidation
          maxSizeMB={200}
          disabled={readOnly}
        />
      </div>
    </div>
  );
};
