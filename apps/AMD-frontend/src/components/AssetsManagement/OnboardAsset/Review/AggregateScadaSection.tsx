import { AssetStatus, AssetSteps } from "@/constants";
import { MonthYear } from "@/interface";
import { Routes } from "@/navigation/Routes";
import { downloadAssetFile } from "@/services/api";
import { currentSelectedAsset, optimizedDatasetGenerationLoading } from "@/services/redux/selectors";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AggregatorFileUpload, DownloadFileButton, ScadaFileUpload } from "../UploadReport";
import { Text, Icon} from "@/ui-kits";

interface AggregatorScadaSectionProps {
  monthYearValidation?: MonthYear;
}

export function AggregateScadaSection(props: AggregatorScadaSectionProps) {
  const {monthYearValidation} = props;
  // ===============
  // hooks
  // ===============
  const navigate = useNavigate();

  // ===============
  // selector
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);
  const isOptimizedDatasetLoading = useSelector(optimizedDatasetGenerationLoading);

  // ===============
  // states
  // ===============
  const currentStep = currentAsset?.current_step ?? 0;
  const isStepLocked = currentStep < AssetSteps.IAR;
  const isAssetInactive = currentAsset?.status === AssetStatus.Inactive;
  const isAssetPendingApproval = currentAsset?.status === AssetStatus.PendingApproval;

  // ===============
  // states
  // ===============
  const bothFilePresent = Boolean(
    currentAsset?.aggregator_report_file && currentAsset?.scada_report_file && currentAsset?.merged_dataset_file,
  );

  const optimizedDatasetPresent = Boolean(
    currentAsset?.aggregator_report_file && currentAsset?.scada_report_file && currentAsset?.optimized_dataset_file,
  );

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
      <AggregatorFileUpload
        disabled={isStepLocked || isAssetInactive || isAssetPendingApproval}
        variant="inline"
        className="border-none! p-0! z-10"
        monthYearValidation={monthYearValidation}
      />
      <ScadaFileUpload
        disabled={isStepLocked || isAssetInactive || isAssetPendingApproval}
        variant="inline"
        className="border-none! p-0!"
        monthYearValidation={monthYearValidation}
      />

      <div className="grid grid-cols-3 gap-6 -mt-4">
        <button
          disabled={isStepLocked || !bothFilePresent}
          onClick={viewAnalysis}
          className="flex cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed items-center gap-3 rounded-md bg-white shadow-sm justify-between border-border border px-6 py-4">
          <Text variant="18M" className={`text-primary!`}>
            View Analysis
          </Text>

          <Icon name="link" className="text-primary! size-5" />
        </button>

        {bothFilePresent && (
          <DownloadFileButton
            className="pl-6"
            disabled={isStepLocked || !bothFilePresent || isAssetInactive}
            text="Merged Data"
            onClick={() => {
              if (!currentAsset?.merged_dataset_file) return;
              handleDownloadFile(currentAsset?.merged_dataset_file?.id, currentAsset?.merged_dataset_file?.name);
            }}
          />
        )}

        {optimizedDatasetPresent && (
          <DownloadFileButton
            className="pl-6"
            disabled={isStepLocked || isOptimizedDatasetLoading || isAssetInactive}
            text="Optimized Result"
            onClick={() => {
              if (!currentAsset?.optimized_dataset_file) return;
              handleDownloadFile(currentAsset?.optimized_dataset_file.id, currentAsset?.optimized_dataset_file.name);
            }}
          />
        )}
      </div>
    </div>
  );
}