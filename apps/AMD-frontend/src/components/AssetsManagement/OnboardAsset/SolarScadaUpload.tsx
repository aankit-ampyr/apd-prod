import {Button} from '@/ui-kits';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {currentSelectedAsset, solarScadaReportUploadError, solarScadaReportUploadLoading} from '@/services/redux/selectors';
import {removeAssetFileRequest, resetAssetFileUploadError, uploadSolarScadaReportRequest} from '@/services/redux/slice';
import {useNavigate} from 'react-router-dom';
import {Routes} from '@/navigation/Routes';
import {downloadAssetFile, editAssetDetails} from '@/services/api';
import {AssetStatus, SolarAssetSteps, SUCCESS_KEY} from '@/constants';
import {DragAndDrop} from './DragDropFileUpload';
import {Alert} from '@/ui-kits';
import {MonthYear} from '@/interface';
import {DownloadFileButton} from './UploadReport';
import {UploadFileHistory} from './Review/FileUploadHistory';

interface SolarFileUploadProps {
  disabled: boolean;
  variant?: 'inline' | 'card';
  className?: string;
  monthYearValidation?: MonthYear;
}

export function SolarFileUpload(props: SolarFileUploadProps) {
  const {disabled, variant = 'card', className, monthYearValidation} = props;
  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();

  // ===================
  // selector
  // ===================
  const currentAsset = useSelector(currentSelectedAsset);
  const isLoading = useSelector(solarScadaReportUploadLoading);
  const solarReportError = useSelector(solarScadaReportUploadError);

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

    dispatch(uploadSolarScadaReportRequest({assetId: currentAsset.id, formData}));
  }

  function handleRemove() {
    if (!currentAsset?.id) return;
    if (!currentAsset?.solar_scada_report_file?.id) return;
    dispatch(removeAssetFileRequest({assetId: currentAsset.id, fileId: currentAsset.solar_scada_report_file.id}));
  }

  return (
    <div className={variant === 'card' ? `bg-white px-8 py-6 rounded-3xl border border-border ${className ?? ''}` : className}>
      <DragAndDrop
        variant={variant}
        disabled={disabled}
        isLoading={isLoading}
        file={currentAsset?.solar_scada_report_file}
        onFileAccepted={uploadReport}
        onRemove={handleRemove}
        label="solar"
        isValid={!solarReportError}
        uploadError={
          solarReportError
            ? {
                file_name: solarReportError?.file?.name ?? '',
                validation_errors: solarReportError?.validation_errors ?? [],
              }
            : undefined
        }
      />
    </div>
  );
}

interface SolarScadaUploadProps {
  onSave: () => void;
}

export function SolarScadaUpload(props: SolarScadaUploadProps) {
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
  const [proceedLoading, setProceedLoading] = useState(false);
  const scadaReportPresent = Boolean(currentAsset?.solar_scada_report_file && currentAsset?.solar_processed_dataset_file);
  const currentStep = currentAsset?.current_step ?? 0;
  const isAssetOnboarded = currentAsset?.status === AssetStatus.Active || currentAsset?.status === AssetStatus.Inactive;
  const isStepLocked = currentStep < SolarAssetSteps.BasicInformation;
  const isStepCompleted = currentStep >= SolarAssetSteps.ScadaUpload;
  const currentFileSignature = JSON.stringify({
    solar: currentAsset?.solar_scada_report_file
      ? {
          name: currentAsset.solar_scada_report_file.name,
          size: currentAsset.solar_scada_report_file.size,
          uploaded_at: currentAsset.solar_scada_report_file.uploaded_at,
        }
      : null,
  });
  const [savedFileSignature, setSavedFileSignature] = useState<string>(() =>
    isStepCompleted ? currentFileSignature : '',
  );
  const showSaveAndContinue = !isStepCompleted || savedFileSignature !== currentFileSignature;

  // ===============
  // function
  // ===============
  function viewAnalysis() {
    if (!currentAsset?.id) return;
    navigate(Routes.VIEW_ASSET_ANALYSIS.replace(':id', String(currentAsset.id)));
  }
  function handleDownloadFile(id: number, name: string) {
    if (!currentAsset?.id) return;
    if (!currentAsset?.solar_processed_dataset_file) return;
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
        current_step: SolarAssetSteps.ScadaUpload,
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
      setSavedFileSignature('');
      return;
    }

    setSavedFileSignature(previousSignature => previousSignature || currentFileSignature);
  }, [currentFileSignature, isStepCompleted]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <Alert
        className="inline-flex w-fit max-w-full self-center items-start text-wrap py-3"
        iconClassName="mt-1 shrink-0 sm:mt-0"
        textClassName="min-w-0 break-words leading-6"
        message={
          'Upload the monthly Solar SCADA export. The report will be resampled to a 15-minute dataset before analysis is available.'
        }
      />

      <SolarFileUpload disabled={isStepLocked} />

      {currentAsset?.solar_processed_dataset_file && (
        <div className="grid-cols-2 gap-4 grid">
          <DownloadFileButton
            text="Download Processed Dataset"
            onClick={() => {
              if (!currentAsset?.solar_processed_dataset_file) return;
              handleDownloadFile(
                currentAsset.solar_processed_dataset_file.id,
                currentAsset.solar_processed_dataset_file.name,
              );
            }}
          />
        </div>
      )}

      <div
        className={`grid self-center justify-items-center gap-4 ${showSaveAndContinue ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <Button
          rightIcon="link"
          onClick={viewAnalysis}
          variant="secondary"
          text="View Analysis"
          disabled={!scadaReportPresent}
          className="w-45 bg-white justify-center"
        />
        {showSaveAndContinue && (
          <Button
            onClick={handleSave}
            loading={proceedLoading}
            disabled={!scadaReportPresent || isStepLocked}
            text="Save & Continue"
            className="w-45 justify-center"
          />
        )}
      </div>

      <UploadFileHistory />
    </div>
  );
}
