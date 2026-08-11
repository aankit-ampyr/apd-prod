import {AssetStatus, SolarAssetSteps} from '@/constants';
import {MonthYear} from '@/interface';
import {Routes} from '@/navigation/Routes';
import {downloadAssetFile} from '@/services/api';
import {currentSelectedAsset} from '@/services/redux/selectors';
import {useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {SolarFileUpload} from '../SolarScadaUpload';
import {DownloadFileButton} from '../UploadReport';
import {Text, Icon} from '@/ui-kits';

interface SolarScadaSectionProps {
  monthYearValidation?: MonthYear;
}

export function SolarScadaSection(props: SolarScadaSectionProps) {
  const {monthYearValidation} = props;
  // ===============
  // hooks
  // ===============
  const navigate = useNavigate();

  // ===============
  // selector
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);

  // ===============
  // states
  // ===============
  const currentStep = currentAsset?.current_step ?? 0;
  const isStepLocked = currentStep < SolarAssetSteps.BasicInformation;
  const isAssetInactive = currentAsset?.status === AssetStatus.Inactive;
  const isAssetPendingApproval = currentAsset?.status === AssetStatus.PendingApproval;

  const scadaReportPresent = Boolean(currentAsset?.solar_scada_report_file && currentAsset?.solar_processed_dataset_file);

  // ===============
  // function
  // ===============
  function viewAnalysis() {
    if (!currentAsset?.id) return;
    navigate(Routes.VIEW_ASSET_ANALYSIS.replace(':id', String(currentAsset.id)));
  }

  function handleDownloadFile(id: number, name: string) {
    if (!currentAsset?.id) return;
    downloadAssetFile({
      assetId: currentAsset?.id,
      fileId: id,
      fileName: name,
    });
  }

  return (
    <div className="gap-10 flex-col flex">
      <SolarFileUpload
        disabled={isStepLocked || isAssetInactive || isAssetPendingApproval}
        variant="inline"
        className="border-none! p-0! z-10"
        monthYearValidation={monthYearValidation}
      />

      <div className="grid grid-cols-3 gap-6 -mt-4">
        <button
          disabled={isStepLocked || !scadaReportPresent}
          onClick={viewAnalysis}
          className="flex cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed items-center gap-3 rounded-md bg-white shadow-sm justify-between border-border border px-6 py-4">
          <Text variant="18M" className={`text-primary!`}>
            View Analysis
          </Text>

          <Icon name="link" className="text-primary! size-5" />
        </button>

        {currentAsset?.solar_processed_dataset_file && (
          <DownloadFileButton
            className="pl-6"
            disabled={isStepLocked || isAssetInactive}
            text="Processed Dataset"
            onClick={() => {
              if (!currentAsset?.solar_processed_dataset_file) return;
              handleDownloadFile(
                currentAsset.solar_processed_dataset_file.id,
                currentAsset.solar_processed_dataset_file.name,
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
