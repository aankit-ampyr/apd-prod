import {
  ScreenWrapper,
  Tabs,
  RevenueBenchmark,
  RevenueIARvsActual,
  MultiMarketOptmizationVsActual,
  NoOrganzationAssign,
  NoAssetAccess,
  NoAssetsAvailable,
} from '@/components';
import {useToast, useWindowDimensions} from '@/hooks';
import {BenchmarkAnalysisTabs, TABLET_SCREEN_BREAKPOINT} from '@/constants';
import {Routes} from '@/navigation/Routes';
import {
  benchmarkAnalysisAssetsList,
  assetError,
  assetSuccess,
  currentSelectedAsset,
  analyticsFilterAssetId,
  analyticsFilterYear,
  assetErrorMessageVars,
} from '@/services/redux/selectors';
import {
  getAllAssetsListRequest,
  getAssetDetailsRequest,
  resetAssetMessage,
  resetIndustryComparisonMessage,
  setPanelOpen,
  setActiveContext,
  fetchCommentsRequest,
  updateAnalyticsFilter,
  setPendingDeepLink,
} from '@/services/redux/slice';
import {SearchableSelectInput, SelectInput, Text} from '@/ui-kits';
import {cn, ErrorCodes, getErrorMessage, getUniqueYearsFromAsset, matchesRoute, SuccessCodes} from '@/utils';
import {Images} from '@lazarus/react-common/assets';
import {useEffect, useState, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams} from 'react-router-dom';

/**
 * ============================
 * CONTANTS AND ENUMS
 * ============================
 */
import {CommentContextType, CommentModule} from '@/constants';
import {CommentTrigger} from '@/components/common/CommentTrigger';

enum OverallPerformanceTabEnum {
  REVENUE_BENCHMARK = 'Revenue vs Benchmarks',
  REVENUE_IAR_ACTUAL = 'IAR vs Actual',
  MULTI_MARKET_OPTIMIZATION = 'Optimized vs Actual',
}

const TAB_ID_MAP: Record<string, string> = {
  [OverallPerformanceTabEnum.REVENUE_BENCHMARK]: BenchmarkAnalysisTabs.RevenueVsBenchmarks,
  [OverallPerformanceTabEnum.REVENUE_IAR_ACTUAL]: BenchmarkAnalysisTabs.RevenueIarVsActual,
  [OverallPerformanceTabEnum.MULTI_MARKET_OPTIMIZATION]: BenchmarkAnalysisTabs.OptimizedVsActual,
};

export function AssetBenchmarkAnalysis() {
  // ================================
  // hooks
  // ================================
  const {id} = useParams();
  const dispatch = useDispatch();
  const {showToast, dismissToast} = useToast();
  const {width} = useWindowDimensions();
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  // ================================
  // selector
  // ================================
  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetError) as ErrorCodes;
  const allAssets = useSelector(benchmarkAnalysisAssetsList);
  const rawAllAssets = useSelector((state: any) => state.asset.allAssets);
  const failureData = useSelector(assetErrorMessageVars) as Record<string, string>;
  const currentAsset = useSelector(currentSelectedAsset);
  const pendingDeepLink = useSelector((state: any) => state.notification.pendingDeepLink);

  const persistedAssetId = useSelector(analyticsFilterAssetId);
  const persistedYear = useSelector(analyticsFilterYear);
  const isInputLocked = matchesRoute(location.pathname, Routes.VIEW_ASSET_BENCHMARK);

  // ================================
  // states
  // ================================
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(
    isInputLocked ? Number(id) || null : persistedAssetId,
  );
  const [activeTab, setActiveTab] = useState<string>(OverallPerformanceTabEnum.REVENUE_BENCHMARK);
  const [tabResetKey, setTabResetKey] = useState<number>(0);
  const [isInitialLoadFinished, setIsInitialLoadFinished] = useState<boolean>(false);

  const [selectedYear, setSelectedYear] = useState<number | null>(persistedYear);
  const [showNoOrganizationAssign, setShowNoOrganizationAssign] = useState<boolean>(false);
  const [showNoAssetAccess, setShowNoAssetAccess] = useState<boolean>(false);
  const isDeepLinkingRef = useRef<boolean>(false);

  useEffect(() => {
    dispatch(
      updateAnalyticsFilter({
        assetId: currentSelectedAssetID !== null ? currentSelectedAssetID : null,
        year: selectedYear !== null ? selectedYear : null,
        assetType: currentAsset?.id === currentSelectedAssetID && currentAsset?.type ? currentAsset.type : null,
      }),
    );
  }, [currentSelectedAssetID, selectedYear, currentAsset, dispatch]);

  // ================================
  // computed states
  // ================================
  const selectedAsset = currentAsset?.id === currentSelectedAssetID ? currentAsset : null;
  const availableYears = getUniqueYearsFromAsset(selectedAsset);
  const yearOptions = availableYears.map(year => ({
    id: year,
    label: `Year ${year}`,
  }));

  useEffect(() => {
    if (!currentSelectedAssetID) {
      setSelectedYear(null);
      return;
    }
    if (!selectedAsset) return;

    if (selectedYear) {
      if (!availableYears.includes(selectedYear)) {
        setSelectedYear(null);
      }
    }
  }, [selectedYear, availableYears, selectedAsset, currentSelectedAssetID]);

  useEffect(() => {
    if (currentSelectedAssetID && allAssets.length > 0) {
      if (!allAssets.some(asset => asset.id === currentSelectedAssetID)) {
        setCurrentSelectedAssetID(null);
      }
    }
  }, [currentSelectedAssetID, allAssets]);

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
    dispatch(getAssetDetailsRequest({id: Number(currentSelectedAssetID), skip_audit: true}));
  }, [currentSelectedAssetID]);

  /**
   * Fetch all asset list
   */
  useEffect(() => {
    dispatch(
      getAllAssetsListRequest({
        onSuccess: () => {
          setShowNoOrganizationAssign(false);
          setIsInitialLoadFinished(true);
        },
        onFailure: data => {
          if (data?.status_code === 'E-10272') {
            setShowNoOrganizationAssign(true);
          }
          setIsInitialLoadFinished(true);
        },
      }),
    );
  }, []);

  /**
   * Close comment panel when switching tabs or context
   */
  useEffect(() => {
    dispatch(setPanelOpen(false));
  }, [currentSelectedAssetID, selectedYear, activeTab, dispatch]);

  /**
   * side effect to set max available year by default, only for integrated screen
   */
  useEffect(() => {
    // skip for manually selection
    if (!isInputLocked) {
      return;
    }
    if (isDeepLinkingRef.current) return;
    if (availableYears?.length) {
      const latestYear = Math.max(...availableYears);

      setSelectedYear(latestYear);
    }
  }, [availableYears]);

  /**
   * Hydrate state from pending deep link
   */
  useEffect(() => {
    if (pendingDeepLink && pendingDeepLink.context_module === CommentModule.BenchmarkAnalysis) {
      isDeepLinkingRef.current = true;
      if (pendingDeepLink.asset_id) {
        setCurrentSelectedAssetID(Number(pendingDeepLink.asset_id));
      }
      if (pendingDeepLink.context_year) {
        setSelectedYear(Number(pendingDeepLink.context_year));
      }
      if (pendingDeepLink.context_tab) {
        const tabKey = Object.keys(TAB_ID_MAP).find(key => TAB_ID_MAP[key] === pendingDeepLink.context_tab);
        if (tabKey) {
          setActiveTab(tabKey);
          setTabResetKey(prev => prev + 1);
        }
      }

      const panelContext = {
        ...pendingDeepLink,
        context_asset_id: pendingDeepLink.asset_id,
      };

      dispatch(setActiveContext(panelContext));
      dispatch(fetchCommentsRequest({assetId: pendingDeepLink.asset_id}));
      dispatch(setPanelOpen(true));
    }
  }, [pendingDeepLink, dispatch]);

  /**
   * Detect access denied (403) from asset details fetch and show the no-access modal
   */
  useEffect(() => {
    if (failure === ('E-ACCESS-DENIED' as any)) {
      // Clear deep link FIRST so deepLinkMiddleware won't swallow setPanelOpen(false)
      dispatch(setPendingDeepLink(null));
      dispatch(setPanelOpen(false));
      setCurrentSelectedAssetID(null);
      setSelectedYear(null);
      setShowNoAssetAccess(true);
    }
  }, [failure, dispatch]);

  if (showNoOrganizationAssign) {
    return (
      <ScreenWrapper
        wrapperClassName="bg-transparent border-none p-0! shadow-none!"
        className="bg-linear-to-br from-[#F8FAFC] to-[#F2F3FF]">
        <NoOrganzationAssign />
      </ScreenWrapper>
    );
  }

  if (isInitialLoadFinished && rawAllAssets.length === 0) {
    return (
      <ScreenWrapper
        wrapperClassName="bg-transparent border-none p-0! shadow-none!"
        className="bg-linear-to-br from-[#F8FAFC] to-[#F2F3FF] p-6 lg:p-12 xl:p-16 flex flex-col">
        <div className="grow bg-white flex flex-col items-center justify-center border-border border rounded-4xl shadow-[0_79px_32px_0_rgba(190,207,213,0.01),0_44px_27px_0_rgba(190,207,213,0.05),0_20px_20px_0_rgba(190,207,213,0.09),0_5px_11px_0_rgba(190,207,213,0.10)]">
          <NoAssetsAvailable organizationName={failureData?.organization_name} />
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <>
      <NoAssetAccess
        isOpen={showNoAssetAccess}
        onReset={() => {
          setShowNoAssetAccess(false);
          setCurrentSelectedAssetID(null);
          setSelectedYear(null);
        }}
      />
      <ScreenWrapper
        wrapperClassName="bg-transparent shadow-none p-0! rounded-none!"
        className="bg-linear-to-br from-[#F3F9FF] to-[#F2F3FF] px-8! py-4!"
        nestedWrapperClassName="pt-2">
      <div className="flex items-start justify-between w-full">
        <div>
          <Text variant="h3" className="pb-1">
            Overall Performance
          </Text>
          <Text variant="caption" className="text-text-secondary! mb-4">
            Based on generated Merged data + uploaded IAR data + Optimized data
          </Text>
        </div>
        {currentSelectedAssetID && selectedYear ? (
          <CommentTrigger
            contextType={CommentContextType.Screen}
            contextModule={CommentModule.BenchmarkAnalysis}
            variant="icon-with-text"
            label="Comments"
            className="bg-white px-4 py-1.5 rounded-[8px] border border-gray-200 mt-2"
            contextAssetId={currentSelectedAssetID}
            contextYear={selectedYear}
            contextTab={activeTab ? TAB_ID_MAP[activeTab] : undefined}
          />
        ) : null}
      </div>
      <div className={cn('flex mb-8', isTablet ? 'gap-4' : 'gap-8')}>
        <SearchableSelectInput
          dropdownItemRenderer={item => (
            <Text variant="caption">
              {item.label} <span className="text-text-secondary! text-small!">({item.subLabel})</span>
            </Text>
          )}
          disabled={isInputLocked}
          label="Select Asset :"
          labelClassName="text-[16px]! absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterMedium! mr-1"
          className={cn('ml-28', isTablet && 'w-48')}
          value={Number(currentSelectedAssetID)}
          options={allAssets}
          onChange={item => {
            isDeepLinkingRef.current = false;
            setCurrentSelectedAssetID(Number(item.id));
          }}
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
          onChange={val => {
            isDeepLinkingRef.current = false;
            setSelectedYear(Number(val.id));
          }}
          className={cn('ml-28', isTablet ? 'w-40' : 'w-60')}
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
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabResetKey={tabResetKey}
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
    </>
  );
}

interface OverallPerformanceTabProps {
  assetSystemGenerationId: string;
  assetId: number;
  year: number;
  location: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabResetKey: number;
}
function OverallPerformanceTab(props: OverallPerformanceTabProps) {
  const {assetId, assetSystemGenerationId, year, location, activeTab, setActiveTab, tabResetKey} = props;
  const {width} = useWindowDimensions();
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  return (
    <div className="rounded-none! grow flex flex-col">
      <Tabs
        key={`${assetId}-${tabResetKey}`}
        tabButtonClassName={cn('pb-0', isTablet ? 'px-2 flex-1 whitespace-nowrap' : 'px-5')}
        activeTabIndicator="h-px!"
        defaultValue={activeTab}
        onChange={tab => setActiveTab(tab)}
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
