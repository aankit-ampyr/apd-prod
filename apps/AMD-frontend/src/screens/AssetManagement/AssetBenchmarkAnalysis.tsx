import {ScreenWrapper, Tabs, RevenueBenchmark, RevenueIARvsActual, MultiMarketOptmizationVsActual} from '@/components';
import {useToast} from '@/hooks';
import {Asset, IconTypes} from '@/interface';
import {Routes} from '@/navigation/Routes';
import {
  analysisAssetsList,
  assetIndustryBenchmarkAnalysisError,
  assetSuccess,
  currentSelectedAsset,
} from '@/services/redux/selectors';
import {
  getAllAssetsListRequest,
  getAssetDetailsRequest,
  resetAssetMessage,
  resetIndustryComparisonMessage,
} from '@/services/redux/slice';
import {Icon, SearchableSelectInput, SelectInput, Text} from '@/ui-kits';
import {cn, ErrorCodes, getErrorMessage, matchesRoute, SuccessCodes} from '@/utils';
import {Images} from '@lazarus/react-common/assets';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams} from 'react-router-dom';

/**
 * ============================
 * CONTANTS AND ENUMS
 * ============================
 */
enum MASTER_TAB_OPTION {
  OVERALL_PERFORMANCE = 'OVERALL_PERFORMANCE',
  TB_SPREAD_BENCHMARKS = 'TB_SPREAD_BENCHMARKS',
}

export function AssetBenchmarkAnalysis() {
  // ================================
  // hooks
  // ================================
  const {id} = useParams();
  const dispatch = useDispatch();
  const {showToast, dismissToast} = useToast();

  // ================================
  // selector
  // ================================
  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetIndustryBenchmarkAnalysisError) as ErrorCodes;
  const allAssets = useSelector(analysisAssetsList);
  const currentAsset = useSelector(currentSelectedAsset);

  // ================================
  // states
  // ================================
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(
    currentAsset?.id || Number(id) || null,
  );
  const [currentMasterTab, setCurrentMasterTab] = useState<MASTER_TAB_OPTION>(MASTER_TAB_OPTION.OVERALL_PERFORMANCE);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // ================================
  // computed states
  // ================================
  const isInputLocked = matchesRoute(location.pathname, Routes.VIEW_ASSET_BENCHMARK);
  const availableYears = getUniqueYearsFromAsset(currentAsset);
  const yearOptions = availableYears.map(year => ({
    id: year,
    label: `Year ${year}`,
  }));

  // ================================
  // table data
  // ================================

  // ================================
  // function and handlers
  // ================================
  function getUniqueYearsFromAsset(
    asset: {available_periods?: Asset['available_periods']} | null | undefined,
  ): number[] {
    const periods = asset?.available_periods ?? [];

    return Array.from(new Set(periods.map(p => p.year))).sort((a, b) => b - a);
  }

  // ================================
  // side effects
  // ================================
  /**
   * handle toast message
   */
  useEffect(() => {
    if (failure) {
      showToast(getErrorMessage(failure), 'error');
    }
    return () => {
      dismissToast();
      dispatch(resetAssetMessage());
      dispatch(resetIndustryComparisonMessage());
    };
  }, [dispatch, dismissToast, failure, showToast, success]);

  /**
   * Fetch all asset list
   */
  useEffect(() => {
    if (!currentSelectedAssetID) return;
    dispatch(getAssetDetailsRequest({id: Number(currentSelectedAssetID)}));
  }, [currentSelectedAssetID]);

  /**
   * Fetch all asset list
   */
  useEffect(() => {
    dispatch(getAllAssetsListRequest());
  }, []);

  /**
   * side effect to set max available year by default, only for integrated screen
   */
  useEffect(() => {
    // skip for manually selection
    if (!isInputLocked) {
      return;
    }
    if (availableYears?.length) {
      const latestYear = Math.max(...availableYears);

      setSelectedYear(latestYear);
    }
  }, [availableYears]);

  return (
    <ScreenWrapper
      wrapperClassName="bg-transparent shadow-none p-0! rounded-none!"
      className="bg-linear-to-br from-[#F3F9FF] to-[#F2F3FF] px-8! py-4!"
      nestedWrapperClassName="pt-2">
      <Text variant="h3" className="pb-1">
        Benchmark Analysis Setup
      </Text>
      <Text variant="caption" className="text-text-secondary! mb-4">
        Based on generated Merged data + uploaded IAR data
      </Text>
      <div className="flex gap-8">
        <SearchableSelectInput
          dropdownItemRenderer={item => (
            <Text variant="caption">
              {item.label}{' '}
              <span className="text-text-secondary! text-small!">({item.subLabel})</span>
            </Text>
          )}
          disabled={isInputLocked}
          label="Select Asset :"
          labelClassName="text-[16px]! absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterMedium! mr-1"
          className="ml-28"
          value={Number(currentSelectedAssetID)}
          options={allAssets}
          onChange={item => setCurrentSelectedAssetID(Number(item.id))}
          wrapperClassName={cn('', !isInputLocked && 'bg-white')}
          placeholder="Search by Asset name"
          rightIconClassName={cn(isInputLocked && 'hidden')}
          dropdownClassName=""
        />
        <SelectInput
          label="Select Year :"
          labelClassName="text-[16px]! absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterMedium! mr-1"
          options={yearOptions}
          value={selectedYear}
          onChange={val => setSelectedYear(Number(val.id))}
          className="w-60 ml-28"
          placeholder="Select Year"
          wrapperClassName={cn('bg-white')}
          isFilter
        />
      </div>

      {currentSelectedAssetID && selectedYear ? (
        <>
          <div className="grid grid-cols-2 bg-white p-4 rounded-xl border-border border mt-5 gap-4 mb-12">
            <TabButton
              icon="growth-outline"
              active={currentMasterTab === MASTER_TAB_OPTION.OVERALL_PERFORMANCE}
              text="Overall Performance"
              onClick={() => setCurrentMasterTab(MASTER_TAB_OPTION.OVERALL_PERFORMANCE)}
            />
            <TabButton
              icon="trending-up"
              active={currentMasterTab === MASTER_TAB_OPTION.TB_SPREAD_BENCHMARKS}
              text="TB Spread Benchmarks"
              onClick={() => setCurrentMasterTab(MASTER_TAB_OPTION.TB_SPREAD_BENCHMARKS)}
            />
          </div>

          {/* render tabs */}
          {currentMasterTab === MASTER_TAB_OPTION.OVERALL_PERFORMANCE && (
            <OverallPerformanceTab
              assetId={currentSelectedAssetID}
              assetSystemGenerationId={currentAsset?.asset_id ?? ''}
              year={selectedYear}
              location={location.pathname}
            />
          )}
          {currentMasterTab === MASTER_TAB_OPTION.TB_SPREAD_BENCHMARKS && (
            <TBSpreadBenchmarksTab
              assetId={currentSelectedAssetID}
              assetSystemGenerationId={currentAsset?.asset_id ?? ''}
              year={selectedYear}
              location={location.pathname}
            />
          )}
        </>
      ) : (
        <>
          <div className="h-full flex items-center justify-center flex-col gap-4">
            <img src={Images.calendarAnalysis} />
            <Text variant="free" className="text-[22px] font-InterMedium text-text-secondary!">
              Select an asset and specify year to view Benchmark analysis.
            </Text>
          </div>
        </>
      )}
    </ScreenWrapper>
  );
}

interface TabButtonProps {
  active?: boolean;
  text: string;
  onClick: () => void;
  icon: IconTypes;
}
function TabButton(props: TabButtonProps) {
  const {onClick, icon, text, active} = props;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-2 justify-center border border-border bg-bg-card p-2 text-[#B0B6C2] rounded-md',
        active && 'border-primary bg-white text-text-secondary',
      )}>
      <Icon name={icon} className="size-5" />
      <Text variant="free" className="font-InterSemiBold text-large-body text-inherit!">
        {text}
      </Text>
    </button>
  );
}

interface MasterTabsProps {
  assetSystemGenerationId: string;
  assetId: number;
  year: number;
  location: string;
}

enum OverallPerformanceTabEnum {
  REVENUE_BENCHMARK = 'Revenue vs Benchmarks',
  REVENUE_IAR_ACTUAL = 'Revenue IAR vs Actual',
  MULTI_MARKET_OPTIMIZATION = 'Multi-Market Optimization vs Actual',
}
function OverallPerformanceTab(props: MasterTabsProps) {
  const {assetId, assetSystemGenerationId, year, location} = props;

  return (
    <div className="rounded-none! grow flex flex-col">
      <Tabs
        key={assetId}
        tabButtonClassName="pb-0 px-5"
        activeTabIndicator="h-px!"
        defaultValue={OverallPerformanceTabEnum.REVENUE_BENCHMARK}
        activeTabButtonClassName="bg-white py-3 rounded-t-sm text-text-primary! font-InterMedium">
        <Tabs.Screen name={OverallPerformanceTabEnum.REVENUE_BENCHMARK}>
          <RevenueBenchmark
            key={location}
            assetSystemGenerationId={assetSystemGenerationId}
            assetId={assetId}
            year={year}
          />
        </Tabs.Screen>
        <Tabs.Screen name={OverallPerformanceTabEnum.REVENUE_IAR_ACTUAL}>
          <RevenueIARvsActual
            key={location}
            assetSystemGenerationId={assetSystemGenerationId}
            assetId={assetId}
            year={year}
          />
        </Tabs.Screen>
        <Tabs.Screen name={OverallPerformanceTabEnum.MULTI_MARKET_OPTIMIZATION}>
          <MultiMarketOptmizationVsActual
            key={location}
            assetSystemGenerationId={assetSystemGenerationId}
            assetId={assetId}
            year={year}
          />
        </Tabs.Screen>
      </Tabs>
    </div>
  );
}

function TBSpreadBenchmarksTab(_props: MasterTabsProps) {
  return <div>TBSpreadBenchmarksTab</div>;
}
