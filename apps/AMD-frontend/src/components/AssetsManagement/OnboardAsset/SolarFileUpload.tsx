import {useDispatch, useSelector} from 'react-redux';

import {MonthYear} from '@/interface';
import {currentSelectedAsset, solarReportUploadError, solarReportUploadLoading} from '@/services/redux/selectors';
import {removeAssetFileRequest, uploadSolarReportRequest} from '@/services/redux/slice';
import {Text} from '@/ui-kits';
import {cn} from '@/utils';

import {DragAndDrop} from './DragDropFileUpload';

interface SolarFileUploadProps {
  disabled?: boolean;
  className?: string;
  monthYearValidation?: MonthYear;
}

export function SolarFileUpload(props: SolarFileUploadProps) {
  const {disabled = false, className, monthYearValidation} = props;

  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();

  // ===============
  // selectors
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);
  const isLoading = useSelector(solarReportUploadLoading);
  const solarError = useSelector(solarReportUploadError);

  // ===============
  // functions
  // ===============
  function uploadReport(file: File) {
    if (!currentAsset?.id) return;
    const formData = new FormData();
    formData.append('file', file);

    if (monthYearValidation) {
      formData.append('month', String(monthYearValidation.month));
      formData.append('year', String(monthYearValidation.year));
    }

    dispatch(uploadSolarReportRequest({assetId: currentAsset.id, formData}));
  }

  function handleRemove() {
    if (!currentAsset?.id) return;
    if (!currentAsset?.solar_dataset_file?.id) return;
    dispatch(removeAssetFileRequest({assetId: currentAsset.id, fileId: currentAsset.solar_dataset_file.id}));
  }

  return (
    <div className={cn('bg-white px-8 py-6 rounded-3xl border border-border', className)}>
      <Text variant="16SB">Solar Data Upload</Text>
      <div className="mt-4">
        <DragAndDrop
          disabled={disabled}
          isLoading={isLoading}
          file={currentAsset?.solar_dataset_file}
          onFileAccepted={uploadReport}
          onRemove={handleRemove}
          isValid={!solarError}
          uploadError={
            solarError
              ? {
                  file_name: solarError?.file?.name ?? '',
                  validation_errors: solarError?.validation_errors ?? [],
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
