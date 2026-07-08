import {ScreenWrapper, Tabs, RevenueBenchmark, RevenueIARvsActual, MultiMarketOptmizationVsActual} from '@/components';
import {useToast} from '@/hooks';
import {Routes} from '@/navigation/Routes';
import {
  analysisAssetsList,
  assetError,
  assetSuccess,
  currentSelectedAsset,
} from '@/services/redux/selectors';
import {
  getAllAssetsListRequest,
  getAssetDetailsRequest,
  resetAssetMessage,
  resetIndustryComparisonMessage,
} from '@/services/redux/slice';
import {SearchableSelectInput, SelectInput, Text} from '@/ui-kits';
import {cn, ErrorCodes, getErrorMessage, getUniqueYearsFromAsset, matchesRoute, SuccessCodes} from '@/utils';
import {Images} from '@lazarus/react-common/assets';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams} from 'react-router-dom';

/**
 * ============================
 * CONTANTS AND ENUMS
 * ============================
 */ 


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
  const failure = useSelector(assetError) as ErrorCodes;
  const allAssets = useSelector(analysisAssetsList);
  const currentAsset = useSelector(currentSelectedAsset);

  // ================================
  // states
  // ================================
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(
    currentAsset?.id || Number(id) || null,
  );
 
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
        Overall Performance
      </Text>
      <Text variant="caption" className="text-text-secondary! mb-4">
        Based on generated Merged data + uploaded IAR data + Optimized data
      </Text>
      <div className="flex gap-8 mb-8">
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
            <OverallPerformanceTab
              assetId={currentSelectedAssetID}
              assetSystemGenerationId={currentAsset?.asset_id ?? ''}
              year={selectedYear}
              location={location.pathname}
            />
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



interface OverallPerformanceTabProps {
  assetSystemGenerationId: string;
  assetId: number;
  year: number;
  location: string;
}

enum OverallPerformanceTabEnum {
  REVENUE_BENCHMARK = 'Revenue vs Benchmarks',
  REVENUE_IAR_ACTUAL = 'Display IAR vs ARC by Stream',
  MULTI_MARKET_OPTIMIZATION = 'Optimized vs Actual',
}
function OverallPerformanceTab(props: OverallPerformanceTabProps ) {
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

