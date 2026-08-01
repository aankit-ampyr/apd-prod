import {matchesRoute, ScreenWrapper, Tabs} from '@lazarus/react-common';
import {Text, SearchableSelectInput, SelectInput, MonthYearPicker} from '@/ui-kits';
import {InvoicesPdfInvoices, InvoicesRevenuReconcilliation, InvoicesCapacityMarket} from '@/components/InvoiceAnalysis';
import {CommentTrigger} from '@/components/common/CommentTrigger';
import {NoOrganzationAssign, NoAssetAccess, NoAssetsAvailable} from '@/components/common/AnalyticsFallbackScreen';
import {Routes} from '@/navigation/Routes';
import {useEffect, useState, useRef} from 'react';
import {useParams, useLocation} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import {
  analysisAssetsList,
  currentSelectedAsset,
  analyticsFilterAssetId,
  analyticsFilterYear,
  assetError,
  assetErrorMessageVars,
} from '@/services/redux/selectors';
import {cn, getUniqueInvoiceYearsFromAsset, ErrorCodes} from '@/utils';
import {Images} from '@/assets/images';
import {
  getAllAssetsListRequest,
  getAssetDetailsRequest,
  setPanelOpen,
  setActiveContext,
  fetchCommentsRequest,
  updateAnalyticsFilter,
  setPendingDeepLink,
} from '@/services/redux/slice';

import {CommentContextType, CommentModule, InvoiceAnalysisTabs} from '@/constants';

enum InvoiceTabs {
  PDF_INVOICES = 'PDF Invoices',
  CAPACITY_MARKET = 'Capacity Market',
  REVENUE_RECONCILIATION = 'Revenue Reconciliation',
}

const TAB_ID_MAP: Record<string, string> = {
  [InvoiceTabs.PDF_INVOICES]: InvoiceAnalysisTabs.PdfInvoices,
  [InvoiceTabs.CAPACITY_MARKET]: InvoiceAnalysisTabs.CapacityMarket,
  [InvoiceTabs.REVENUE_RECONCILIATION]: InvoiceAnalysisTabs.RevenueReconciliation,
};

export function InvoiceAnalysisScreen() {
  /**
   * ============================
   * Hooks
   * ===========================
   */
  const {id} = useParams();
  const dispatch = useDispatch();
  const location = useLocation();

  /**
   * ============================
   * Selectors
   * ===========================
   */
  const currentAsset = useSelector(currentSelectedAsset);
  const rawAllAssets = useSelector((state: any) => state.asset.allAssets);
  const failureData = useSelector(assetErrorMessageVars) as Record<string, string>;
  const allAssets = useSelector(analysisAssetsList);
  const pendingDeepLink = useSelector((state: any) => state.notification.pendingDeepLink);
  const failure = useSelector(assetError) as ErrorCodes;

  const persistedAssetId = useSelector(analyticsFilterAssetId);
  const persistedYear = useSelector(analyticsFilterYear);
  const isInputLocked = matchesRoute(location.pathname, Routes.VIEW_INVOICE_ANALYSIS);

  /**
   * ============================
   * States
   * ===========================
   */
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(
    isInputLocked ? Number(id) || null : persistedAssetId,
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(persistedYear);
  const [selectedMonth] = useState<number | null>(
    location.state?.reportingPeriod?.month ? Number(location.state.reportingPeriod.month) : null,
  );
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

  /**
   * ============================
   * Derived States
   * ===========================
   */
  const [activeTab, setActiveTab] = useState<string>(InvoiceTabs.PDF_INVOICES);
  const [tabResetKey, setTabResetKey] = useState<number>(0);
  const [isInitialLoadFinished, setIsInitialLoadFinished] = useState<boolean>(false);
  const reportingPeriod = location.state?.reportingPeriod;
  const selectedAsset = currentAsset?.id === currentSelectedAssetID ? currentAsset : null;
  const availableYears = getUniqueInvoiceYearsFromAsset(selectedAsset);
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
  const hasValidData = availableYears.length > 0;
  const showContent = currentSelectedAssetID && selectedYear && hasValidData;

  /**
   * ===========================
   * Side Effects
   * =========================
   */
  /**
   * Fetch current selected asset details when currentSelectedAssetID changes
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
    if (reportingPeriod?.year) {
      setSelectedYear(Number(reportingPeriod.year));
      return;
    }
    if (availableYears?.length) {
      const latestYear = Math.max(...availableYears);

      setSelectedYear(latestYear);
    }
  }, [availableYears, isInputLocked, reportingPeriod]);

  /**
   * Hydrate state from pending deep link
   */
  useEffect(() => {
    if (pendingDeepLink && pendingDeepLink.context_module === CommentModule.InvoiceAnalysis) {
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
      // WE Clear deep link FIRST so deepLinkMiddleware won't swallow setPanelOpen(false)
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
        wrapperClassName="bg-transparent border-none p-0! shadow-none!"
        className="bg-linear-to-br from-[#F8FAFC] to-[#F2F3FF]">
        <div className="flex items-start justify-between w-full">
        <div>
          <div className="flex items-center gap-3">
            <Text variant="h3">Invoice Comparison & Analysis</Text>
          </div>
          <Text variant="14R" className="mb-7 mt-1">
            Review capacity market payments, uploaded invoice PDFs and revenue reconciliation for the selected asset.
          </Text>
        </div>

        {currentSelectedAssetID && selectedYear ? (
          <CommentTrigger
            contextType={CommentContextType.Screen}
            contextModule={CommentModule.InvoiceAnalysis}
            variant="icon-with-text"
            label="Comments"
            className="bg-white px-4 py-1.5 rounded-[8px] border border-gray-200 mt-2"
            contextAssetId={currentSelectedAssetID}
            contextYear={selectedYear}
            contextTab={activeTab ? TAB_ID_MAP[activeTab] : undefined}
          />
        ) : null}
      </div>

      <div className="flex gap-8 mb-8">
        <SearchableSelectInput
          dropdownItemRenderer={item => (
            <Text variant="caption">
              {item.label} <span className="text-text-secondary! text-small!">({item.subLabel})</span>
            </Text>
          )}
          disabled={isInputLocked}
          label="Select Asset :"
          labelClassName="text-[16px]! absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterMedium! mr-1"
          className="ml-28"
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
        {isInputLocked ? (
          <MonthYearPicker
            label="Select Month & Year :"
            labelClassName="text-[16px]! absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterMedium! mr-1"
            className="ml-44"
            disabled={true}
            wrapperClassName="w-60"
            iconClassName="text-text-placeholder!"
            value={{month: selectedMonth as number, year: selectedYear as number}}
            onChange={() => {}}
            placeholder=""
            rightIconClassName="hidden"
          />
        ) : (
          <SelectInput
            label="Select Year :"
            labelClassName="text-[16px]! absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterMedium! mr-1"
            options={yearOptions}
            value={selectedYear}
            onChange={val => {
              isDeepLinkingRef.current = false;
              setSelectedYear(Number(val.id));
            }}
            className="w-60 ml-28"
            placeholder="Select Year"
            wrapperClassName="bg-white"
            isFilter
          />
        )}
      </div>

      {showContent ? (
        <Tabs
          key={`${currentSelectedAssetID}-${tabResetKey}`}
          tabButtonClassName="pb-0 px-5 text-[16px] text-[#9197A1]! font-InterRegular!"
          activeTabIndicator="h-px!"
          defaultValue={activeTab}
          onChange={tab => setActiveTab(tab)}
          activeTabButtonClassName="bg-white py-3 rounded-t-sm border-b-2 border-b-primary text-text-primary! font-InterMedium!">
          <Tabs.Screen name={InvoiceTabs.PDF_INVOICES}>
            <InvoicesPdfInvoices
              assetId={currentSelectedAssetID}
              assetSystemGenerationId={currentAsset?.asset_id}
              year={selectedYear}
              month={selectedMonth ?? undefined}
            />
          </Tabs.Screen>
          <Tabs.Screen name={InvoiceTabs.CAPACITY_MARKET}>
            <InvoicesCapacityMarket
              assetId={currentSelectedAssetID}
              year={selectedYear}
              reportingPeriod={reportingPeriod}
            />
          </Tabs.Screen>
          <Tabs.Screen name={InvoiceTabs.REVENUE_RECONCILIATION}>
            <InvoicesRevenuReconcilliation
              assetId={currentSelectedAssetID}
              assetSystemGenerationId={currentAsset?.asset_id}
              year={selectedYear}
              month={selectedMonth ?? undefined}
            />
          </Tabs.Screen>
        </Tabs>
      ) : currentSelectedAssetID && !hasValidData ? (
        <div className="h-full flex items-center justify-center flex-col gap-4">
          <img src={Images.calenderTicket} />
          <Text variant="free" className="text-[22px] font-InterMedium text-text-primary!">
            No invoice analysis data available
          </Text>
          <Text variant="free" className="text-[16px] font-InterRegular text-text-secondary!">
            Upload invoice PDF and settlement CSV files for this asset to view Invoice analysis.
          </Text>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center flex-col gap-4">
          <img src={Images.calendarAnalysis} />
          <Text variant="free" className="text-[22px] font-InterMedium text-text-secondary!">
            Select an asset and specify year to view analysis.
          </Text>
        </div>
      )}
    </ScreenWrapper>
    </>
  );
}
