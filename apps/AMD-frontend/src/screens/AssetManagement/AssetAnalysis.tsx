import {
  ScreenWrapper,
  Tabs,
  AssetOperations,
  AssetMarket,
  AssetSolar,
  AssetBatteryHealth,
  AssetAncillaryServices,
  AssetMarketPrices,
  AssetImabalanceAnalysis,
  AssetTbSpread,
} from '@/components';
import {AssetType} from '@/constants';
import {MonthYear, SelectInputItem} from '@/interface';
import {Routes} from '@/navigation/Routes';
import {analysisAssetsList, assetError, assetSuccess, currentSelectedAsset} from '@/services/redux/selectors';
import {getAllAssetsListRequest, getAssetDetailsRequest, resetAssetMessage} from '@/services/redux/slice';
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
  SOLAR: 'Solar',
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
  const isSolar = currentAsset?.type === AssetType.Solar;

  // ==============
  // states
  // ==============
  const [period, setPeriod] = useState<{month: number; year: number} | null>(null);
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(Number(id) || null);
  const isInputLocked = matchesRoute(location.pathname, Routes.VIEW_ASSET_ANALYSIS);

  // dereive another selected asset from current asset to prevent mismatch with current asset and asset for analysis
  const selectedAsset = currentAsset?.id === currentSelectedAssetID ? currentAsset : null;
  const isSeperateAnalysisRoute = matchesRoute(location.pathname, Routes.VIEW_ANALYSIS);
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

    dispatch(getAssetDetailsRequest({id: idTofetch}));
    lastAssetFetch.current = idTofetch;
  }, [currentAsset, currentSelectedAssetID]);

  /**
   * fetch current asset list for dropdown
   */
  useEffect(() => {
    // do not fetch if already fetched
    if (!isSeperateAnalysisRoute) return;
    if (allAssetsFetched.current) return;

    dispatch(getAllAssetsListRequest());
    allAssetsFetched.current = true;
  }, [allAssets]);

  /**
   * set current period based on current asset details, if available. This will set the period to asset's active period if available, otherwise null which will require user to select period before viewing analysis.
   */
  useEffect(() => {
    // if on sep route skip auto setting period to active period to allow user to select period and view analysis for different periods. For non sep route, set period to active period if available to prevent user from having to select period before viewing analysis.
    if (isSeperateAnalysisRoute) return;

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
   * show toast on success or failure and reset asset message on component unmount
   */
  useEffect(() => {
    return () => {
      dispatch(resetAssetMessage());
    };
  }, [success, failure]);

  return (
    <ScreenWrapper
      className="bg-linear-to-br from-[#FBFDFF] to-[#F2F3FF]"
      wrapperClassName="bg-transparent shadow-none flex flex-col gap-2 p-0! rounded-none">
      <Text variant="h3">Data Analysis Preview</Text>
      <Text variant="caption" className="text-text-secondary! mb-4">
        Based on uploaded Aggregator + SCADA data
      </Text>

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
          onChange={setPeriod}
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
      ) : isSolar ? (
        <Tabs
          key={currentSelectedAssetID}
          className="h-full mt-6"
          tabButtonClassName="px-1"
          defaultValue={TabsRoute.SOLAR}>
          <Tabs.Screen
            name={TabsRoute.SOLAR}
            element={
              <AssetSolar
                key={location.pathname}
                assetSystemGenerationId={currentAsset?.asset_id}
                assetId={currentSelectedAssetID}
                month={period?.month}
                year={period?.year}
              />
            }
          />
        </Tabs>
      ) : (
        <Tabs
          key={currentSelectedAssetID}
          className="h-full mt-6"
          tabButtonClassName="px-1"
          defaultValue={TabsRoute.OPERATIONS}>
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
  );
}
