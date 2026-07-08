import {GradientKPI} from '@/components/AssetsManagement/common/GradientKpi';
import {formatCurrencyToPound} from '@/utils';
import blueCoin from '@/assets/images/blue-coin.png';
import orangeCoin from '@/assets/images/orange-coin.png';
import purpleCoin from '@/assets/images/purple-coin.png';

interface CapacityMarketKPIsProps {
  data?: {
    capacity_payments: number | null;
    emr_invoices: number | null;
    average_monthly_payment: number | null;
  };
  isLoading: boolean;
}

export function CapacityMarketKPIs({data, isLoading}: CapacityMarketKPIsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GradientKPI
        title="Capacity Payments"
        value={formatCurrencyToPound(data?.capacity_payments ?? 0)}
        variant="blue"
        icon="cap_payment"
        isLoading={isLoading}
        backgroundImage={blueCoin}
        backgroundImageClassName="-right-6 -bottom-8 h-28 w-28 xl:-right-6 xl:-bottom-10 xl:h-36 xl:w-36"
      />
      <GradientKPI
        title="EMR Invoices"
        value={(data?.emr_invoices ?? 0).toString()}
        variant="orange"
        icon="ticket"
        isLoading={isLoading}
        backgroundImage={orangeCoin}
        backgroundImageClassName="-right-6 -bottom-8 h-28 w-28 xl:-right-6 xl:-bottom-10 xl:h-36 xl:w-36"
      />
      <GradientKPI
        title="Avg Monthly Payment"
        value={formatCurrencyToPound(data?.average_monthly_payment ?? 0)}
        variant="purple"
        icon="receive-money"
        isLoading={isLoading}
        backgroundImage={purpleCoin}
        backgroundImageClassName="-right-6 -bottom-8 h-28 w-28 xl:-right-6 xl:-bottom-10 xl:h-36 xl:w-36"
      />
    </div>
  );
}
