import {matchesRoute, ScreenWrapper, Tabs} from '@lazarus/react-common';
import {Text, SearchableSelectInput, SelectInput} from '@/ui-kits';
import {InvoicesPdfInvoices, InvoicesRevenuReconcilliation, InvoicesCapacityMarket} from '@/components/InvoiceAnalysis';
import {Routes} from '@/navigation/Routes';
import {useEffect, useState} from 'react';
import {useParams, useLocation} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import {analysisAssetsList, currentSelectedAsset} from '@/services/redux/selectors';
import {cn, getUniqueInvoiceYearsFromAsset} from '@/utils';
import {Images} from '@/assets/images';
import {getAllAssetsListRequest, getAssetDetailsRequest} from '@/services/redux/slice';

enum InvoiceTabs {
  PDF_INVOICES = 'PDF Invoices',
  CAPACITY_MARKET = 'Capacity Market',
  REVENUE_RECONCILIATION = 'Revenue Reconciliation',
}

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
  const allAssets = useSelector(analysisAssetsList);

  /**
   * ============================
   * States
   * ===========================
   */
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(
    currentAsset?.id || Number(id) || null,
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  /**
   * ============================
   * Derived States
   * ===========================
   */
  const isInputLocked = matchesRoute(location.pathname, Routes.VIEW_INVOICE_ANALYSIS);
  const reportingPeriod = location.state?.reportingPeriod;
  const availableYears = getUniqueInvoiceYearsFromAsset(currentAsset);
  const yearOptions = availableYears.map(year => ({
    id: year,
    label: `Year ${year}`,
  }));
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
    if (reportingPeriod?.year) {
      setSelectedYear(Number(reportingPeriod.year));
      return;
    }
    if (availableYears?.length) {
      const latestYear = Math.max(...availableYears);

      setSelectedYear(latestYear);
    }
  }, [availableYears, isInputLocked, reportingPeriod]);
  return (
    <ScreenWrapper
      wrapperClassName="bg-transparent border-none p-0! shadow-none!"
      className="bg-linear-to-br from-[#F8FAFC] to-[#F2F3FF]">
      <div className="flex items-center gap-3">

        <Text variant="h3">Invoice Comparison & Analysis</Text>
      </div>
      <Text variant="14R" className="mb-7 mt-1">
        Review capacity market payments, uploaded invoice PDFs and revenue reconciliation for the selected asset.
      </Text>

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
          disabled={isInputLocked}
          wrapperClassName={cn(!isInputLocked && 'bg-white')}
          isFilter
        />
      </div>

      {showContent ? (
        <Tabs
          tabButtonClassName="pb-0 px-5 text-[16px] text-[#9197A1]! font-InterRegular!"
          activeTabIndicator="h-px!"
          defaultValue={InvoiceTabs.CAPACITY_MARKET}
          activeTabButtonClassName="bg-white py-3 rounded-t-sm border-b-2 border-b-primary text-text-primary! font-InterMedium!">
          <Tabs.Screen name={InvoiceTabs.PDF_INVOICES}>
            <InvoicesPdfInvoices
              assetId={currentSelectedAssetID}
              assetSystemGenerationId={currentAsset?.asset_id}
              year={selectedYear}
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
            <InvoicesRevenuReconcilliation />
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
      ) : allAssets.length === 0 ? (
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
  );
}
