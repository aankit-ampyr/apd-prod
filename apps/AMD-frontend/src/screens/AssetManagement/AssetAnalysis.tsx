import {
  ScreenWrapper,
  Tabs,
  AssetOperations,
  AssetMarket,
  AssetBatteryHealth,
  AssetAncillaryServices,
  AssetMarketPrices,
  AssetImabalanceAnalysis,
  AssetTbSpread,
  CommentTrigger,
  NoOrganzationAssign,
  NoAssetAccess,
  NoAssetsAvailable,
} from '@/components';
import {CommentContextType, CommentModule, ViewAnalysisTabs} from '@/constants';
import {MonthYear, SelectInputItem} from '@/interface';
import {Routes} from '@/navigation/Routes';
import {
  analysisAssetsList,
  assetError,
  assetSuccess,
  currentSelectedAsset,
  analyticsFilterAssetId,
  analyticsFilterMonth,
  analyticsFilterYear,
  assetErrorMessageVars,
} from '@/services/redux/selectors';
import {
  getAllAssetsListRequest,
  getAssetDetailsRequest,
  resetAssetMessage,
  setPanelOpen,
  setActiveContext,
  fetchCommentsRequest,
  updateAnalyticsFilter,
  setPendingDeepLink,
} from '@/services/redux/slice';
import {MonthYearPicker, SearchableSelectInput, Text} from '@/ui-kits';
import {cn, ErrorCodes, matchesRoute, SuccessCodes} from '@/utils';
import {Images} from '@lazarus/react-common/assets';
import {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useLocation, useParams} from 'react-router-dom';

const TabsRoute = {
  OPERATIONS: 'Operations',
  MARKET_OPTIMIZATION: 'Market Optimization',
  MARKET_PRICES: 'Market Prices',
  ANCILARRY_SERVICES: 'Ancillary Services',
  IMBALANCE_ANALYSIS: 'Imbalance Analysis',
  PERFORMANCE: 'Performance',
  BATTERY_HEALTH: 'Battery Health',
  TB_SPREAD: 'TB Spread',
};

const TAB_ID_MAP: Record<string, string> = {
  [TabsRoute.OPERATIONS]: ViewAnalysisTabs.Operations,
  [TabsRoute.MARKET_OPTIMIZATION]: ViewAnalysisTabs.MarketOptimization,
  [TabsRoute.MARKET_PRICES]: ViewAnalysisTabs.MarketPrices,
  [TabsRoute.ANCILARRY_SERVICES]: ViewAnalysisTabs.AncillaryServices,
  [TabsRoute.IMBALANCE_ANALYSIS]: ViewAnalysisTabs.ImbalanceAnalysis,
  [TabsRoute.PERFORMANCE]: 'performance',
  [TabsRoute.BATTERY_HEALTH]: ViewAnalysisTabs.BatteryHealth,
  [TabsRoute.TB_SPREAD]: ViewAnalysisTabs.TBSpread,
};

export function AssetAnalysis() {
  // ====================
  // hooks
  // ====================

  const {id} = useParams();
  const location = useLocation();
  const dispatch = useDispatch();

  // ==============
  // selector
  // ==============
  const currentAsset = useSelector(currentSelectedAsset);
  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetError) as ErrorCodes;
  const allAssets = useSelector(analysisAssetsList);
  const rawAllAssets = useSelector((state: any) => state.asset.allAssets);
  const failureData = useSelector(assetErrorMessageVars) as Record<string, string>;
  const pendingDeepLink = useSelector((state: any) => state.notification.pendingDeepLink);

  const persistedAssetId = useSelector(analyticsFilterAssetId);
  const persistedMonth = useSelector(analyticsFilterMonth);
  const persistedYear = useSelector(analyticsFilterYear);
  const isInputLocked = matchesRoute(location.pathname, Routes.VIEW_ASSET_ANALYSIS);

  // ==============
  // states
  // ==============
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(
    isInputLocked ? Number(id) || null : persistedAssetId,
  );
  const [period, setPeriod] = useState<{month: number; year: number} | null>(
    persistedMonth && persistedYear ? {month: persistedMonth, year: persistedYear} : null,
  );
  const [activeTab, setActiveTab] = useState<string>(TabsRoute.OPERATIONS);
  const [tabResetKey, setTabResetKey] = useState<number>(0);
  const [showNoOrganizationAssign, setShowNoOrganizationAssign] = useState<boolean>(false);
  const [showNoAssetAccess, setShowNoAssetAccess] = useState<boolean>(false);
  const isSeperateAnalysisRoute = matchesRoute(location.pathname, Routes.VIEW_ANALYSIS);
  const [isInitialLoadFinished, setIsInitialLoadFinished] = useState<boolean>(!isSeperateAnalysisRoute);
  const [isPreservingYear, setIsPreservingYear] = useState<boolean>(!persistedMonth && !!persistedYear);

  useEffect(() => {
    dispatch(
      updateAnalyticsFilter({
        assetId: currentSelectedAssetID !== null ? currentSelectedAssetID : null,
        month: period?.month !== null && period?.month !== undefined ? period.month : null,
        year: isPreservingYear
          ? persistedYear
          : period?.year !== null && period?.year !== undefined
            ? period.year
            : null,
        assetType: currentAsset?.id === currentSelectedAssetID && currentAsset?.type ? currentAsset.type : null,
      }),
    );
  }, [currentSelectedAssetID, period, currentAsset, dispatch, isPreservingYear, persistedYear]);

  const selectedAsset = currentAsset?.id === currentSelectedAssetID ? currentAsset : null;

  useEffect(() => {
    if (isPreservingYear) {
      if (!currentSelectedAssetID) {
        setIsPreservingYear(false);
        return;
      }
      if (selectedAsset?.available_periods && persistedYear) {
        const periodsForYear = selectedAsset.available_periods.filter(p => p.year === persistedYear);
        if (periodsForYear.length > 0) {
          const latestMonth = Math.max(...periodsForYear.map(p => p.month));
          setPeriod({month: latestMonth, year: persistedYear});
        }
        setIsPreservingYear(false);
      }
    }
  }, [isPreservingYear, persistedYear, selectedAsset, currentSelectedAssetID]);

  useEffect(() => {
    if (!currentSelectedAssetID) {
      setPeriod(null);
      return;
    }
    if (!selectedAsset) return;

    if (period && selectedAsset.available_periods) {
      const isValid = selectedAsset.available_periods.some(p => p.month === period.month && p.year === period.year);
      if (!isValid) {
        const periodsForYear = selectedAsset.available_periods.filter(p => p.year === period.year);
        if (periodsForYear.length > 0) {
          const latestMonth = Math.max(...periodsForYear.map(p => p.month));
          setPeriod({month: latestMonth, year: period.year});
        } else {
          setPeriod(null);
        }
      }
    }
  }, [period, selectedAsset, currentSelectedAssetID]);

  useEffect(() => {
    if (currentSelectedAssetID && allAssets.length > 0) {
      if (!allAssets.some(asset => asset.id === currentSelectedAssetID)) {
        setCurrentSelectedAssetID(null);
      }
    }
  }, [currentSelectedAssetID, allAssets]);
  const renderIntialScreen = isSeperateAnalysisRoute && (!currentSelectedAssetID || !period?.month || !period?.year);
  const selectInputOptions = ((): SelectInputItem<{
    organization_id: number;
    organization_name: string;
    available_periods?: MonthYear[];
  }>[] => {
    if (isSeperateAnalysisRoute) {
      return allAssets;
    }
    return [{id: currentAsset?.id ?? 0, label: currentAsset?.name ?? '', subLabel: currentAsset?.organization?.name}];
  })();

  // ===================
  // refs
  // ===================
  const allAssetsFetched = useRef<boolean>(false);
  const lastAssetFetch = useRef<number | null>(null);
  const isDeepLinkingRef = useRef<boolean>(false);

  // ==============
  // side effects
  // ==============

  /**
   * fetch current asset
   */
  useEffect(() => {
    if (!currentSelectedAssetID) return;
    const idTofetch = Number(currentSelectedAssetID);
    if (lastAssetFetch.current === idTofetch) return;

    dispatch(getAssetDetailsRequest({id: idTofetch, skip_audit: true}));
    lastAssetFetch.current = idTofetch;
  }, [currentAsset, currentSelectedAssetID]);

  /**
   * fetch current asset list for dropdown
   */
  useEffect(() => {
    // do not fetch if already fetched
    if (!isSeperateAnalysisRoute) return;
    if (allAssetsFetched.current) return;

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
    allAssetsFetched.current = true;
  }, [allAssets]);

  /**
   * Close comment panel when switching tabs or context
   */
  useEffect(() => {
    dispatch(setPanelOpen(false));
  }, [location.pathname, currentSelectedAssetID, period?.year, period?.month, activeTab, dispatch]);

  /**
   * set current period based on current asset details, if available. This will set the period to asset's active period if available, otherwise null which will require user to select period before viewing analysis.
   */
  useEffect(() => {
    // if on sep route skip auto setting period to active period to allow user to select period and view analysis for different periods. For non sep route, set period to active period if available to prevent user from having to select period before viewing analysis.
    if (isSeperateAnalysisRoute) return;
    if (isDeepLinkingRef.current) return;

    if (selectedAsset && selectedAsset?.active_period?.month && selectedAsset?.active_period?.year) {
      setPeriod({
        month: selectedAsset.active_period.month,
        year: selectedAsset.active_period.year,
      });
      return;
    }

    setPeriod(null);
  }, [selectedAsset]);

  /**
   * Hydrate state from pending deep link
   */
  useEffect(() => {
    if (pendingDeepLink && pendingDeepLink.context_module === CommentModule.ViewAnalysis) {
      isDeepLinkingRef.current = true;
      if (pendingDeepLink.asset_id) {
        setCurrentSelectedAssetID(Number(pendingDeepLink.asset_id));
      }
      if (pendingDeepLink.context_month && pendingDeepLink.context_year) {
        setPeriod({
          month: Number(pendingDeepLink.context_month),
          year: Number(pendingDeepLink.context_year),
        });
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
      // We Clear deep link FIRST so deepLinkMiddleware won't swallow setPanelOpen(false)
      dispatch(setPendingDeepLink(null));
      dispatch(setPanelOpen(false));
      setCurrentSelectedAssetID(null);
      setPeriod(null);
      setShowNoAssetAccess(true);
    }
  }, [failure, dispatch]);

  /**
   * show toast on success or failure and reset asset message on component unmount
   */
  useEffect(() => {
    return () => {
      dispatch(resetAssetMessage());
    };
  }, [success, failure]);

  if (showNoOrganizationAssign) {
    return (
      <ScreenWrapper
        wrapperClassName="bg-transparent border-none p-0! shadow-none!"
        className="bg-linear-to-br from-[#F8FAFC] to-[#F2F3FF]">
        <NoOrganzationAssign />
      </ScreenWrapper>
    );
  }

  if (isInitialLoadFinished && isSeperateAnalysisRoute && rawAllAssets.length === 0) {
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
          setPeriod(null);
        }}
      />
      <ScreenWrapper
      className="bg-linear-to-br from-[#FBFDFF] to-[#F2F3FF]"
      wrapperClassName="bg-transparent shadow-none flex flex-col gap-2 p-0! rounded-none">
      <div className="flex justify-between items-start">
        <div>
          <Text variant="h3">Data Analysis Preview</Text>
          <Text variant="caption" className="text-text-secondary! mb-4">
            Based on uploaded Aggregator + SCADA data
          </Text>
        </div>
        {currentSelectedAssetID && period?.year ? (
          <CommentTrigger
            contextType={CommentContextType.Screen}
            contextModule={CommentModule.ViewAnalysis}
            variant="icon-with-text"
            label="Comments"
            className="bg-white px-4 py-1 rounded-sm border border-gray-200 mt-2"
            contextAssetId={currentSelectedAssetID}
            contextYear={period.year}
            contextMonth={period.month}
            contextTab={activeTab ? TAB_ID_MAP[activeTab] : undefined}
          />
        ) : null}
      </div>

      <div className="flex gap-8">
        <SearchableSelectInput
          dropdownItemRenderer={item => (
            <Text variant="caption">
              {item.label} <span className="text-text-secondary! text-small!">({item.subLabel})</span>
            </Text>
          )}
          disabled={isInputLocked}
          label="Select Asset :"
          labelClassName="text-[16px]! absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterMedium! mr-1"
          options={selectInputOptions}
          className="ml-28"
          value={Number(currentSelectedAssetID)}
          onChange={item => {
            isDeepLinkingRef.current = false;
            setCurrentSelectedAssetID(Number(item.id));
          }}
          wrapperClassName={cn('', !isInputLocked && 'bg-white')}
          placeholder="Search by Asset name"
          rightIconClassName={cn(isInputLocked && 'hidden')}
          dropdownClassName=""
        />
        <MonthYearPicker
          label="Select Month & Year :"
          labelClassName="text-[16px]! absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterMedium! mr-1"
          className="ml-44"
          allowedMonths={selectedAsset?.available_periods}
          disabled={isInputLocked}
          wrapperClassName={cn('w-60', !isInputLocked && 'bg-white')}
          iconClassName="text-text-placeholder!"
          value={isInputLocked ? selectedAsset?.active_period : period}
          onChange={newPeriod => {
            isDeepLinkingRef.current = false;
            setPeriod(newPeriod);
          }}
          placeholder=""
          rightIconClassName={cn(isInputLocked && 'hidden')}
        />
      </div>

      {renderIntialScreen ? (
        <div className="flex h-full items-center justify-center flex-col gap-4">
          <img src={Images.calendarAnalysis} alt="Select asset and period" />
          <Text variant="free" className="text-[22px] font-InterMedium text-text-secondary!">
            Select an asset and specify month and year to view analysis.
          </Text>
        </div>
      ) : (
        <Tabs
          key={`${currentSelectedAssetID}-${tabResetKey}`}
          className="h-full mt-6"
          tabButtonClassName="px-1"
          defaultValue={activeTab}
          onChange={(tab: string) => setActiveTab(tab)}>
          <Tabs.Screen
            name={TabsRoute.OPERATIONS}
            element={
              <AssetOperations
                key={location.pathname}
                assetSystemGenerationId={currentAsset?.asset_id}
                assetId={currentSelectedAssetID}
                month={period?.month}
                year={period?.year}
              />
            }
          />
          <Tabs.Screen
            name={TabsRoute.MARKET_OPTIMIZATION}
            element={
              <AssetMarket
                key={location.pathname}
                assetSystemGenerationId={currentAsset?.asset_id}
                assetId={currentSelectedAssetID}
                month={period?.month}
                year={period?.year}
              />
            }
          />
          <Tabs.Screen
            name={TabsRoute.MARKET_PRICES}
            element={
              <AssetMarketPrices
                key={location.pathname}
                assetSystemGenerationId={currentAsset?.asset_id}
                assetId={currentSelectedAssetID}
                month={period?.month}
                year={period?.year}
              />
            }
          />
          <Tabs.Screen
            name={TabsRoute.ANCILARRY_SERVICES}
            element={
              <AssetAncillaryServices
                key={location.pathname}
                assetSystemGenerationId={currentAsset?.asset_id}
                assetId={currentSelectedAssetID}
                month={period?.month}
                year={period?.year}
              />
            }
          />

          <Tabs.Screen
            name={TabsRoute.IMBALANCE_ANALYSIS}
            element={
              <AssetImabalanceAnalysis
                key={location.pathname}
                assetSystemGenerationId={currentAsset?.asset_id}
                assetId={currentSelectedAssetID}
                month={period?.month}
                year={period?.year}
              />
            }
          />
          <Tabs.Screen
            name={TabsRoute.BATTERY_HEALTH}
            element={
              <AssetBatteryHealth
                key={location.pathname}
                assetSystemGenerationId={currentAsset?.asset_id}
                assetId={currentSelectedAssetID}
                month={period?.month}
                year={period?.year}
              />
            }
          />
          <Tabs.Screen
            name={TabsRoute.TB_SPREAD}
            element={
              <AssetTbSpread
                key={location.pathname}
                assetSystemGenerationId={currentAsset?.asset_id}
                assetId={currentSelectedAssetID}
                month={period?.month}
                year={period?.year}
              />
            }
          />
        </Tabs>
      )}
    </ScreenWrapper>
    </>
  );
}
