import {Text, Icon, Alert, Button} from '@/ui-kits';
import {useEffect, useState, useRef, PropsWithChildren, ButtonHTMLAttributes} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  aggregatorReportUploadError,
  aggregatorReportUploadLoading,
  currentSelectedAsset,
  optimizedDatasetGenerationLoading,
  scadaReportUploadError,
  scadaReportUploadLoading,
} from '@/services/redux/selectors';
import {
  generateOptimizedDatasetRequest,
  mergeDatasetRequest,
  removeAssetFileRequest,
  resetAssetFileUploadError,
  uploadAggregatorReportRequest,
  uploadScadaReportRequest,
} from '@/services/redux/slice';
import {useNavigate} from 'react-router-dom';
import {Routes} from '@/navigation/Routes';
import {downloadAssetFile, editAssetDetails} from '@/services/api';
import {AssetStatus, AssetSteps, SUCCESS_KEY} from '@/constants';
import {DragAndDrop} from './DragDropFileUpload';
import {cn} from '@/utils';
import {AssetReportFile, MonthYear} from '@/interface';

interface UploadAssetReportProps {
  onSave: () => void;
}

export function UploadAssetReport(props: UploadAssetReportProps) {
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
  const isOptimizedDatasetLoading = useSelector(optimizedDatasetGenerationLoading);

  // ===============
  // states
  // ===============
  const [proceedLoading, setProceedLoading] = useState(false);
  const bothFilePresent = Boolean(
    currentAsset?.aggregator_report_file && currentAsset?.scada_report_file && currentAsset?.merged_dataset_file,
  );
  const optmizedDatasetPresent = Boolean(
    currentAsset?.aggregator_report_file && currentAsset?.scada_report_file && currentAsset?.optimized_dataset_file,
  );
  const currentStep = currentAsset?.current_step ?? 0;
  const isAssetOnboarded = currentAsset?.status === AssetStatus.Active || currentAsset?.status === AssetStatus.Inactive;
  const isStepLocked = currentStep < AssetSteps.OptimizationConfiguration;
  const isStepCompleted = currentStep >= AssetSteps.AggregatorScada;
  const currentFilesSignature = JSON.stringify({
    aggregator: currentAsset?.aggregator_report_file
      ? {
          name: currentAsset.aggregator_report_file.name,
          size: currentAsset.aggregator_report_file.size,
          uploaded_at: currentAsset.aggregator_report_file.uploaded_at,
        }
      : null,
    scada: currentAsset?.scada_report_file
      ? {
          name: currentAsset.scada_report_file.name,
          size: currentAsset.scada_report_file.size,
          uploaded_at: currentAsset.scada_report_file.uploaded_at,
        }
      : null,
    isMerged: Boolean(currentAsset?.merged_dataset_file),
  });
  const [savedFilesSignature, setSavedFilesSignature] = useState<string>(() =>
    isStepCompleted ? currentFilesSignature : '',
  );
  const showSaveAndContinue = !isStepCompleted || savedFilesSignature !== currentFilesSignature;

  const aggregatorFileMonthYearValidation: MonthYear | undefined =
    getMonthYearValidationForBeforeOnboarding('aggregator');
  const scadaFileMonthYearValidation: MonthYear | undefined = getMonthYearValidationForBeforeOnboarding('scada');

  // ===============
  // function
  // ===============
  function getMonthYearValidationForBeforeOnboarding(file: 'aggregator' | 'scada'): MonthYear | undefined {
    if (isAssetOnboarded) return undefined;
    let assetFile: AssetReportFile | undefined = undefined;
    // for aggregator file, we want to validate with the month and year of the uploaded from scada file, and vice versa, because the main reason for month and year validation is to make sure the two files are from the same month and year to avoid wrong analysis result, so we want to make sure the newly uploaded file is consistent with the already uploaded file
    if (file === 'aggregator') {
      assetFile = currentAsset?.scada_report_file ?? undefined;
    } else {
      assetFile = currentAsset?.aggregator_report_file ?? undefined;
    }
    const month = assetFile?.month;
    const year = assetFile?.year;

    if (month && year) {
      return {
        month,
        year,
      };
    }
    return undefined;
  }

  function viewAnalysis() {
    if (!currentAsset?.id) return;
    navigate(Routes.VIEW_ASSET_ANALYSIS.replace(':id', String(currentAsset.id)));
  }
  function handleDownloadFile(id: number, name: string) {
    if (!currentAsset?.id) return;
    if (!currentAsset?.merged_dataset_file) return;
    downloadAssetFile({
      assetId: currentAsset?.id,
      fileId: id,
      fileName: name,
    });
  }

  async function handleSave() {
    if (!currentAsset?.id) return;

    setProceedLoading(true);
    try {
      const {data} = await editAssetDetails({
        id: currentAsset.id,
        current_step: AssetSteps.AggregatorScada,
      });

      if (data.status === SUCCESS_KEY) {
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
      setSavedFilesSignature('');
      return;
    }

    setSavedFilesSignature(previousSignature => previousSignature || currentFilesSignature);
  }, [currentFilesSignature, isStepCompleted]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <Alert
        className="inline-flex w-fit max-w-full self-center items-start text-wrap py-3"
        iconClassName="mt-1 shrink-0 sm:mt-0"
        textClassName="min-w-0 break-words leading-6"
        message={
          'Upload both Aggregator and SCADA files to view analysis. SCADA data will be resampled and merged with Aggregator data before analysis is available.'
        }
      />

      <AggregatorFileUpload disabled={isStepLocked} monthYearValidation={aggregatorFileMonthYearValidation} />
      <ScadaFileUpload disabled={isStepLocked} monthYearValidation={scadaFileMonthYearValidation} />
      <div className="grid-cols-2 gap-4 grid">
        {bothFilePresent && (
          <DownloadFileButton
            text="Download Merged Data"
            onClick={() => {
              if (!currentAsset?.merged_dataset_file) return;
              handleDownloadFile(currentAsset?.merged_dataset_file?.id, currentAsset?.merged_dataset_file?.name);
            }}
          />
        )}

        {optmizedDatasetPresent && (
          <DownloadFileButton
            disabled={isOptimizedDatasetLoading}
            text="Download Optimized Result"
            onClick={() => {
              if (!currentAsset?.optimized_dataset_file) return;
              handleDownloadFile(currentAsset?.optimized_dataset_file.id, currentAsset?.optimized_dataset_file.name);
            }}
          />
        )}
      </div>

      <div
        className={cn(
          'grid self-center justify-items-center gap-4',
          showSaveAndContinue ? 'grid-cols-2' : 'grid-cols-1',
        )}>
        <Button
          rightIcon="link"
          onClick={viewAnalysis}
          variant="secondary"
          text="View Analysis"
          disabled={!(bothFilePresent && optmizedDatasetPresent)}
          className="w-45 bg-white justify-center"
        />
        {showSaveAndContinue && (
          <Button
            onClick={handleSave}
            loading={proceedLoading}
            disabled={!(bothFilePresent && optmizedDatasetPresent) || isStepLocked}
            text="Save & Continue"
            className="w-45 justify-center"
          />
        )}
      </div>
    </div>
  );
}

interface SpecsFileUploadProps {
  disabled: boolean;
  variant?: 'inline' | 'card';
  className?: string;
  monthYearValidation?: MonthYear;
}

export function AggregatorFileUpload(props: SpecsFileUploadProps) {
  const {disabled, variant = 'card', className, monthYearValidation} = props;
  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();

  // ===================
  // selector
  // ===================
  const currentAsset = useSelector(currentSelectedAsset);
  const isLoading = useSelector(aggregatorReportUploadLoading);
  const aggregatorReportError = useSelector(aggregatorReportUploadError);

  // ===================
  // functions
  // ===================
  function uploadReport(file: File) {
    if (!currentAsset?.id) return;

    const formData = new FormData();
    formData.append('file', file);

    if (monthYearValidation) {
      formData.append('month', String(monthYearValidation.month));
      formData.append('year', String(monthYearValidation.year));
    }

    dispatch(uploadAggregatorReportRequest({assetId: currentAsset.id, formData}));
  }
  function handleRemove() {
    if (!currentAsset?.id) return;
    if (!currentAsset?.aggregator_report_file?.id) return;
    dispatch(removeAssetFileRequest({assetId: currentAsset.id, fileId: currentAsset.aggregator_report_file.id}));
  }

  return (
    <div className={cn('bg-white px-8 py-6 rounded-3xl border border-border', className)}>
      <Text variant="16SB">Aggregator Report Upload</Text>
      <div className="mt-4">
        <DragAndDrop
          variant={variant}
          disabled={disabled}
          isLoading={isLoading}
          file={currentAsset?.aggregator_report_file}
          onFileAccepted={uploadReport}
          onRemove={handleRemove}
          label="aggregator"
          isValid={!aggregatorReportError}
          uploadError={
            aggregatorReportError
              ? {
                  file_name: aggregatorReportError?.file?.name ?? '',
                  validation_errors: aggregatorReportError?.validation_errors ?? [],
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

export function ScadaFileUpload(props: SpecsFileUploadProps) {
  const {disabled, variant = 'card', className, monthYearValidation} = props;
  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();

  // ===================
  // selector
  // ===================
  const currentAsset = useSelector(currentSelectedAsset);
  const isLoading = useSelector(scadaReportUploadLoading);
  const scadaReportError = useSelector(scadaReportUploadError);

  // ===================
  // state
  // ===================
  const isMergeCompleted = currentAsset?.merged_dataset_file;
  const mergeTriggeredRef = useRef<{assetId: number; aggregatorId: number; scadaId: number} | null>(null);
  const optimizedDatasetTriggeredRef = useRef<{assetId: number; mergedFileId: number} | null>(null);

  // ===================
  // functions
  // ===================
  function uploadReport(file: File) {
    if (!currentAsset?.id) return;
    const formData = new FormData();
    formData.append('file', file);

    if (monthYearValidation) {
      formData.append('month', String(monthYearValidation.month));
      formData.append('year', String(monthYearValidation.year));
    }

    dispatch(uploadScadaReportRequest({assetId: currentAsset.id, formData}));
  }

  function handleRemove() {
    if (!currentAsset?.id) return;
    if (!currentAsset?.scada_report_file?.id) return;
    dispatch(removeAssetFileRequest({assetId: currentAsset.id, fileId: currentAsset.scada_report_file.id}));
  }

  // ===================
  // side effects
  // ===================
  useEffect(() => {
    // if aggregator file is present, trigger merge and not merged
    if (!currentAsset?.id) return;
    if (!currentAsset?.aggregator_report_file) return;
    if (!currentAsset.scada_report_file) return;
    if (currentAsset?.merged_dataset_file) return;

    // Check if we already triggered merge for this specific file combination
    const currentTrigger = {
      assetId: currentAsset.id,
      aggregatorId: currentAsset.aggregator_report_file.id,
      scadaId: currentAsset.scada_report_file.id,
    };

    if (
      mergeTriggeredRef.current &&
      mergeTriggeredRef.current.assetId === currentTrigger.assetId &&
      mergeTriggeredRef.current.aggregatorId === currentTrigger.aggregatorId &&
      mergeTriggeredRef.current.scadaId === currentTrigger.scadaId
    ) {
      return; // Already triggered for this combination
    }

    mergeTriggeredRef.current = currentTrigger;

    dispatch(
      mergeDatasetRequest({
        assetId: currentAsset.id,
        scada_file_id: currentAsset?.scada_report_file?.id,
        aggregator_file_id: currentAsset?.aggregator_report_file?.id,
      }),
    );
  }, [
    currentAsset?.id,
    currentAsset?.aggregator_report_file?.id,
    currentAsset?.scada_report_file?.id,
    currentAsset?.merged_dataset_file,
  ]);

  useEffect(() => {
    // Trigger optimized dataset generation after merged file is created
    if (!currentAsset?.id) return;
    if (!currentAsset?.merged_dataset_file) return;
    if (currentAsset?.optimized_dataset_file) return;

    // Check if we already triggered optimized dataset generation for this merged file
    const currentTrigger = {
      assetId: currentAsset.id,
      mergedFileId: currentAsset.merged_dataset_file.id,
    };

    if (
      optimizedDatasetTriggeredRef.current &&
      optimizedDatasetTriggeredRef.current.assetId === currentTrigger.assetId &&
      optimizedDatasetTriggeredRef.current.mergedFileId === currentTrigger.mergedFileId
    ) {
      return; // Already triggered for this merged file
    }

    optimizedDatasetTriggeredRef.current = currentTrigger;

    dispatch(
      generateOptimizedDatasetRequest({
        assetId: currentAsset.id,
        merged_file_id: currentAsset.merged_dataset_file.id,
      }),
    );
  }, [currentAsset?.id, currentAsset?.merged_dataset_file?.id, currentAsset?.optimized_dataset_file, dispatch]);

  return (
    <div className={cn('bg-white px-8 py-6 rounded-3xl border border-border', className)}>
      <Text variant="16SB">SCADA Report Upload</Text>
      <div className="mt-4">
        <DragAndDrop
          variant={variant}
          disabled={disabled}
          isPending={!currentAsset?.aggregator_report_file}
          pendingMessage={'Waiting for Aggregator file to perform merge'}
          validationMessage={!isMergeCompleted ? 'Resampling Completed' : ''}
          isLoading={isLoading}
          file={currentAsset?.scada_report_file}
          onFileAccepted={uploadReport}
          onRemove={handleRemove}
          isValid={!scadaReportError}
          label="scada"
          uploadError={
            scadaReportError
              ? {
                  file_name: scadaReportError?.file?.name ?? '',
                  validation_errors: scadaReportError?.validation_errors ?? [],
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

interface DownloadFileButtonProps extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  text: string;
}

export function DownloadFileButton(props: DownloadFileButtonProps) {
  const {className, text, disabled, ...rest} = props;
  return (
    <button
      className={cn(
        'cursor-pointer flex items-center gap-4 justify-between p-4 bg-[#F7F7F7] rounded-md border-disabled border',
        disabled && 'cursor-not-allowed opacity-70',
        className,
      )}
      disabled={disabled}
      {...rest}>
      <Text>{text}</Text>
      <Icon name="download" />
    </button>
  );
}
