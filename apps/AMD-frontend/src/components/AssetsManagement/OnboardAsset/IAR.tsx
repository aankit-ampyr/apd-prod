import {AssetSteps, SUCCESS_KEY} from '@/constants';
import {Routes} from '@/navigation/Routes';
import {currentSelectedAsset, iarReportUploadError, iarReportUploadLoading} from '@/services/redux/selectors';
import {
  removeAssetFileRequest,
  resetAssetFileUploadError,
  uploadIARReportRequest,
} from '@/services/redux/slice';
import {Button, Text} from '@/ui-kits';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {DragAndDrop} from './DragDropFileUpload';
import {cn} from '@/utils';
import {editAssetDetails} from '@/services/api';

interface IARReportProps {
  onSave: () => void;
}

export function IARUpload(props: IARReportProps) {
  const {onSave} = props;
  // ===============
  // hooks
  // ===============
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ===============
  // selector
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);

  // ===============
  // states
  // ===============
  const [proceedLoading, setProceedLoading] = useState<boolean>(false);
  const isFilePresent = Boolean(currentAsset?.iar_report_file);
  const currentStep = currentAsset?.current_step ?? 0;
  const isStepLocked = currentStep < AssetSteps.AggregatorScada;
  const isStepCompleted = currentStep >= AssetSteps.IAR;
  const currentFileSignature = JSON.stringify(
    currentAsset?.iar_report_file
      ? {
          name: currentAsset.iar_report_file.name,
          size: currentAsset.iar_report_file.size,
          uploaded_at: currentAsset.iar_report_file.uploaded_at,
        }
      : null,
  );
  const [savedFileSignature, setSavedFileSignature] = useState<string>(() =>
    isStepCompleted ? currentFileSignature : '',
  );
  const showSaveAndContinue = !isStepCompleted || savedFileSignature !== currentFileSignature;

  // ===============
  // function
  // ===============
  function viewBenchmark() {
    if (!currentAsset?.id) return;
    navigate(Routes.VIEW_ASSET_BENCHMARK.replace(':id', String(currentAsset.id)));
  }

  async function handleSave() {
    if (!currentAsset?.id) return;

    // update the step before proceeding to
    setProceedLoading(true);
    try {
      const {data} = await editAssetDetails({
        id: currentAsset.id,
        current_step: AssetSteps.Review,
      });
      // on success save
      if (data.status === SUCCESS_KEY){
        onSave();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProceedLoading(false);
    }
  }

  // ===============
  // side effect
  // ===============
  useEffect(() => {
    return () => {
      dispatch(resetAssetFileUploadError());
    };
  }, []);

  useEffect(() => {
    if (!isStepCompleted) {
      setSavedFileSignature('');
      return;
    }

    setSavedFileSignature(previousSignature => previousSignature || currentFileSignature);
  }, [currentFileSignature, isStepCompleted]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="bg-white px-8 py-8 rounded-[40px] border flex flex-col gap-2 border-border">
        <Text variant="h3" className="text-center font-SpaceGroteskBold!">
          IAR Upload
        </Text>
        <Text variant="14R" className="text-text-secondary! text-center">
          Add your IAR file to continue asset setup
        </Text>
        <IARReportUpload disabled={isStepLocked} />
      </div>
      <div className={cn('flex self-center justify-center gap-4', !showSaveAndContinue && 'flex-col')}>
        <Button
          rightIcon="link"
          onClick={viewBenchmark}
          variant="secondary"
          text="View Benchmark Analysis"
          disabled={!isFilePresent}
          className="min-w-45 bg-white! justify-center"
        />
        {showSaveAndContinue && (
          <Button
            onClick={handleSave}
            loading={proceedLoading}
            disabled={!isFilePresent || isStepLocked}
            text="Save & Continue"
            className="w-45 justify-center"
          />
        )}
      </div>
    </div>
  );
}

interface SpecsFileUploadProps {
  disabled?: boolean;
  variant?: 'inline' | 'card';
  className?: string;
}
export function IARReportUpload(props: SpecsFileUploadProps) {
  const {disabled, variant = 'card', className} = props;
  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();

  // ===============
  // selector
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);
  const isLoading = useSelector(iarReportUploadLoading);
  const iarReportError = useSelector(iarReportUploadError);

  // ===============
  // function
  // ===============
  function uploadReport(file: File) {
    if (!currentAsset?.id) return;

    const formData = new FormData();
    formData.append('file', file);
    dispatch(uploadIARReportRequest({assetId: currentAsset.id, formData}));
  }

  function handleRemove() {
    if (!currentAsset?.id) return;
    if (!currentAsset?.iar_report_file?.id) return;
    dispatch(removeAssetFileRequest({assetId: currentAsset.id, fileId: currentAsset?.iar_report_file?.id}));
  }

  return (
    <div className={cn('mt-6', className)}>
      <DragAndDrop
        disabled={disabled}
        variant={variant}
        isLoading={isLoading}
        file={currentAsset?.iar_report_file}
        onFileAccepted={uploadReport}
        onRemove={handleRemove}
        label="aggregator"
        isValid={!iarReportError}
        uploadError={
          iarReportError
            ? {
                file_name: iarReportError?.file?.name ?? '',
                validation_errors: iarReportError?.validation_errors ?? [],
              }
            : undefined
        }
      />
    </div>
  );
}
