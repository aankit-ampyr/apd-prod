import {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {MonthYear} from '@/interface';
import {getCapacityMarketRequest} from '@/services/redux/slice/invoiceSlice';
import {CapacityMarketKPIs} from './CapacityMarketKPIs';
import {PaymentTrendGraph} from './PaymentTrendGraph';
import {CapacityMarketPaymentsTable} from './CapacityMarketPaymentsTable';

interface InvoicesCapacityMarketProps {
  assetId: number | null;
  year: number | null;
  reportingPeriod?: MonthYear;
}

export function InvoicesCapacityMarket(props: InvoicesCapacityMarketProps) {
  const {assetId, year, reportingPeriod} = props;

  /** ================= Hooks ================= */
  const dispatch = useDispatch();

  /** ================= Selectors ================= */
  const {loading, data} = useSelector((state: any) => state.invoice.capacityMarket);

  /** ================= States ================= */

  /** ================= Functions / Derived States ================= */

  /** ================= Data/Config ================= */

  /** ================= Side Effects ================= */
  useEffect(() => {
    if (assetId && year) {
      dispatch(
        getCapacityMarketRequest({
          assetId,
          year,
          month: reportingPeriod?.month,
        }),
      );
    }
  }, [assetId, year, reportingPeriod, dispatch]);

  return (
    <div className="flex flex-col gap-6">
      <CapacityMarketKPIs data={data?.kpis} isLoading={loading} />
      <PaymentTrendGraph data={data?.payment_trend} isLoading={loading} year={year} />
      <CapacityMarketPaymentsTable 
        data={data?.capacity_market_payments} 
        isLoading={loading} 
        assetId={assetId}
        year={year}
        reportingPeriod={reportingPeriod}
      />
    </div>
  );
}
