import {AssetStatus, AssetSteps} from '@/constants';
import {Routes} from '@/navigation/Routes';
import {currentSelectedAsset} from '@/services/redux/selectors';
import {useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {IARReportUpload} from '../IAR';
import {Text, Icon} from '@/ui-kits';

export function IARReportSection() {
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
  const isStepLocked = (() => {
    // first priority is asset onboarded, if not onboarded then do the remaining logic
    // asset is onboarded
    if ([AssetStatus.Active, AssetStatus.Inactive].includes(currentAsset?.status as any)) {
      return false;
    }

    return currentStep <= AssetSteps.AggregatorScada;
  })();
  const isAssetInactive = currentAsset?.status === AssetStatus.Inactive;
  const isAssetPendingApproval = currentAsset?.status === AssetStatus.PendingApproval;

  // ===============
  // function
  // ===============
  function viewBenchmark() {
    if (!currentAsset?.id) return;
    navigate(Routes.VIEW_ASSET_BENCHMARK.replace(':id', String(currentAsset.id)));
  }

  return (
    <div className="gap-6 flex-col flex">
      <IARReportUpload
        disabled={isStepLocked || isAssetInactive || isAssetPendingApproval}
        variant={'inline'}
        className="mt-0!"
      />
      {currentAsset?.iar_report_file && (
        <button
          disabled={!currentAsset?.iar_report_file || isStepLocked}
          onClick={viewBenchmark}
          className="flex w-1/2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed items-center gap-3 rounded-md bg-white shadow-sm justify-between border-border border px-6 py-4">
          <Text variant="18M" className={`text-primary!`}>
            View Benchmark
          </Text>

          <Icon name="link" className="text-primary! size-5" />
        </button>
      )}
    </div>
  );
}
