import {useEffect, useState, useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {ScreenWrapper, ExecutiveAnalysis, NoOrganzationAssign, NoAssetsAvailable} from '@/components';
import {SearchableSelectInput, SelectInput, Text} from '@/ui-kits';
import {Images} from '@/assets/images';
import {enumToSelectOptions, ErrorCodes, getErrorMessage, getUniqueYearsFromAsset, SuccessCodes} from '@/utils';
import {AssetType, CommentContextType, CommentModule} from '@/constants';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetError,
  assetSuccess,
  currentSelectedAsset,
  executiveAnalysisAssetsList,
  analyticsFilterAssetId,
  analyticsFilterYear,
  analyticsFilterAssetType,
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
import {useToast} from '@/hooks';
import {CommentTrigger, NoAssetAccess} from '@/components/common';

/**
 * ==============================
 * Types & constants
 * ==============================
 */
const ASSET_TYPES = enumToSelectOptions(AssetType).filter(item => item.id !== AssetType.Solar);

export function ExecutiveAnalysisScreen() {
  // ================================
  // hooks
  // ================================
  const dispatch = useDispatch();
  const {showToast, dismissToast} = useToast();
  const location = useLocation();

  // ================================
  // selector
  // ================================

  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetError) as ErrorCodes;
  const currentAsset = useSelector(currentSelectedAsset);
  const rawAllAssets = useSelector((state: any) => state.asset.allAssets);
  const failureData = useSelector(assetErrorMessageVars) as Record<string, string>;

  const persistedAssetId = useSelector(analyticsFilterAssetId);
  const persistedYear = useSelector(analyticsFilterYear);
  const persistedAssetType = useSelector(analyticsFilterAssetType);

  // ================================
  // states
  // ================================
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(persistedAssetId);
  const [selectedYear, setSelectedYear] = useState<number | null>(persistedYear);
  const [assetType, setAssetType] = useState<AssetType | null>(persistedAssetType);
  const [showNoAssetAccess, setShowNoAssetAccess] = useState<boolean>(false);
  const [showNoOrganizationAssign, setShowNoOrganizationAssign] = useState<boolean>(false);
  const [isInitialLoadFinished, setIsInitialLoadFinished] = useState<boolean>(false);
  const isDeepLinkingRef = useRef<boolean>(false);

  useEffect(() => {
    dispatch(
      updateAnalyticsFilter({
        assetId: currentSelectedAssetID !== null ? currentSelectedAssetID : null,
        year: selectedYear !== null ? selectedYear : null,
        assetType: assetType !== null ? assetType : null,
      }),
    );
  }, [currentSelectedAssetID, selectedYear, assetType, dispatch]);

  const allAssets = useSelector(executiveAnalysisAssetsList(assetType ?? AssetType.BESS));
  const pendingDeepLink = useSelector((state: any) => state.notification.pendingDeepLink);

  // ================================
  // Derived States
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
    };
  }, [dispatch, dismissToast, failure, showToast, success]);

  /**
   * Close comment panel when switching assets, years, or modules
   */
  useEffect(() => {
    dispatch(setPanelOpen(false));
  }, [location.pathname, currentSelectedAssetID, selectedYear, dispatch]);

  /**
   * get asset details on selected asset ID change
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
   * Hydrate state from pending deep link
   */
  useEffect(() => {
    if (pendingDeepLink && pendingDeepLink.context_module === CommentModule.ExecutiveAnalysis) {
      isDeepLinkingRef.current = true;
      if (pendingDeepLink.asset_id) {
        setCurrentSelectedAssetID(Number(pendingDeepLink.asset_id));
      }
      if (pendingDeepLink.context_year) {
        setSelectedYear(Number(pendingDeepLink.context_year));
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
      setSelectedYear(null);
      setShowNoAssetAccess(true);
    }
  }, [failure, dispatch]);

  /**
   * Sync assetType from currentAsset if deep linking
   */
  useEffect(() => {
    const asset = currentAsset as any;
    if (asset?.id === currentSelectedAssetID && asset?.type && asset.type !== assetType) {
      setAssetType(asset.type as AssetType);
    }
  }, [currentAsset, currentSelectedAssetID, assetType]);

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
        className="bg-linear-to-br from-[#F8FAFC] to-[#F2F3FF]"
        wrapperClassName="p-0! bg-transparent shadow-none! rounded-none! flex flex-col">
        {/* header */}
        <div className="border mb-3 relative border-[#D8ECF2] rounded-lg p-4 bg-linear-to-br! from-[#F4F9FF] to-[#E0EDFA]  flex flex-col gap-6">
          {/* backgound images */}
          <div className="absolute w-60 h-full top-0 right-0">
            <img src={Images.sun} alt="Auth Background" />
            <img src={Images.zap} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <img src={Images.lightBulb} className="absolute top-0 right-0" />
            <img src={Images.battery2} className="absolute bottom-0 left-0" />
            <img src={Images.windmills} className="absolute bottom-0 right-0" />
          </div>

          <div className="flex justify-between items-start z-10">
            <Text variant="free" className="font-InterBold! text-[22px]">
              Multi-Month Performance Overview <span className="text-primary z-10">for Management</span>
            </Text>

            {currentSelectedAssetID && selectedYear ? (
              <CommentTrigger
                contextType={CommentContextType.Screen}
                contextModule={CommentModule.ExecutiveAnalysis}
                variant="icon-with-text"
                label="Comments"
                className="bg-white px-4 py-1 rounded-[8px] border border-gray-200"
                contextAssetId={currentSelectedAssetID}
                contextYear={selectedYear}
              />
            ) : null}
          </div>

          <Text variant="14M" className="z-10">
            Select an asset and year for a 12-month performance overview.
          </Text>

          <div className="grid grid-cols-3 max-w-180 w-full gap-4">
            <SelectInput
              isFilter
              label="ASSET TYPE"
              options={ASSET_TYPES}
              value={assetType}
              onChange={({id}) => setAssetType(id as AssetType)}
              wrapperClassName="bg-white!"
            />
            <SearchableSelectInput
              isFilter
              value={currentSelectedAssetID}
              onChange={({id}) => {
                isDeepLinkingRef.current = false;
                setCurrentSelectedAssetID(id as number);
              }}
              label="ASSET NAME"
              dropdownItemRenderer={item => (
                <Text variant="caption">
                  {item.label} <span className="text-text-secondary! text-small!">({item.subLabel})</span>
                </Text>
              )}
              options={allAssets}
              wrapperClassName="bg-white!"
              disabled={!assetType}
            />
            <SelectInput
              isFilter
              value={selectedYear}
              onChange={({id}) => {
                isDeepLinkingRef.current = false;
                setSelectedYear(id as number);
              }}
              label="YEAR"
              options={yearOptions}
              wrapperClassName="bg-white!"
              disabled={!currentSelectedAssetID}
            />
          </div>
        </div>

        <ExecutiveAnalysis
          asset_id={currentSelectedAssetID ?? undefined}
          assetSystemGenerationId={currentAsset?.asset_id}
          year={selectedYear ?? undefined}
        />
      </ScreenWrapper>
    </>
  );
}
