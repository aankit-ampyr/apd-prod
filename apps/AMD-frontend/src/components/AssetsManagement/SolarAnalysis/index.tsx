import {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {AssetAnalysisTabProps} from '../Analysis/types';
import {Section, CommentTrigger} from '@/components/common';
import {CommentContextType, CommentModule, ViewAnalysisTabs, ViewAnalysisWidgets} from '@/constants';
import {
  assetDetailsFetchLoading,
  assetSolarGenerationSplitLoading,
  assetSolarGenerationSplitResult,
  assetSolarKpiVitalsLoading,
  assetSolarKpiVitalsResult,
} from '@/services/redux/selectors';
import {getAssetSolarGenerationSplitRequest, getAssetSolarKpiVitalsRequest} from '@/services/redux/slice';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {KpiVitalsCards} from './KpiVitalsCards';
import {GenerationSplitChart} from './GenerationSplitChart';

export * from './KpiVitalsCards';
export * from './GenerationSplitChart';

interface AssetSolarGenerationProps extends AssetAnalysisTabProps {}

export function AssetSolarGeneration(props: AssetSolarGenerationProps) {
  const {assetId, month, year} = props;

  const dispatch = useDispatch();

  const assetLoading = useSelector(assetDetailsFetchLoading);
  const kpiVitals = useSelector(assetSolarKpiVitalsResult);
  const kpiVitalsLoading = useSelector(assetSolarKpiVitalsLoading);
  const generationSplit = useSelector(assetSolarGenerationSplitResult);
  const generationSplitLoading = useSelector(assetSolarGenerationSplitLoading);

  useEffect(() => {
    if (!assetId || !year || !month) return;

    dispatch(getAssetSolarKpiVitalsRequest({assetId, year, month}));
    dispatch(getAssetSolarGenerationSplitRequest({assetId, year, month}));
  }, [assetId, month, year]);

  useEffect(() => {
    if (!assetId) return;
    dispatch(
      fetchCommentsRequest({
        assetId,
        context_module: CommentModule.ViewAnalysis,
        context_tab: ViewAnalysisTabs.SolarGeneration,
        context_year: year ?? undefined,
      }),
    );
  }, [assetId, dispatch, year]);

  return (
    <div className="flex flex-col gap-8">
      <Section
        icon="zap"
        title="Solar Generation"
        subtitle="Energy exported, peak power, and irradiance-based yield"
        action={
          <CommentTrigger
            contextModule={CommentModule.ViewAnalysis}
            contextTab={ViewAnalysisTabs.SolarGeneration}
            contextWidget={ViewAnalysisWidgets.SolarKpiVitals}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            contextMonth={month}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }>
        <KpiVitalsCards data={kpiVitals ?? undefined} isLoading={kpiVitalsLoading || assetLoading} />
      </Section>

      <GenerationSplitChart
        data={generationSplit ?? undefined}
        isLoading={generationSplitLoading || assetLoading}
        assetId={assetId}
        year={year}
        month={month}
      />
    </div>
  );
}
