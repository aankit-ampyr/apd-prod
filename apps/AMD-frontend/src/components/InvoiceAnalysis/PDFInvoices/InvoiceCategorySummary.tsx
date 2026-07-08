import React from 'react';
import {IconTypes, Skeleton, Text} from '@/ui-kits';
import {InvoiceType, InvoiceTypeLabels} from '@/constants';
import {InvoiceExtractionCategorySummary} from '@/interface';
import {enumToSelectOptions} from '@/utils';
import {IconWrapper, WithFallback} from '@/components/common';

type CategorySummaryCardVariant = {
  icon: IconTypes;
  accentColor: string;
  iconBgColor: string;
  bgGradientEnd: string;
  bgGradientStart?: string;
};

interface InvoiceCategorySummaryProps {
  data?: InvoiceExtractionCategorySummary;
  isLoading?: boolean;
}
export function InvoiceCategorySummary(props: InvoiceCategorySummaryProps) {
  const {data, isLoading=false} = props;

  const categorySummaryVariantMap: Record<InvoiceType, CategorySummaryCardVariant> = {
    [InvoiceType.HartreePV]: {
      accentColor: '#10B981',
      bgGradientEnd: '#ECFDF5',
      icon: 'sun',
      iconBgColor: '#DBF6ED',
    },
    [InvoiceType.HartreeBESS]: {
      accentColor: '#3B82F6',
      bgGradientEnd: '#EFF6FF',
      icon: 'empty-cell',
      iconBgColor: '#E1ECFE',
    },
    [InvoiceType.EMR]: {
      accentColor: '#8B5CF6',
      iconBgColor: '#EDE6FE',
      bgGradientEnd: '#F5F3FF',
      icon: 'zap',
    },
    [InvoiceType.GridBeyond]: {
      accentColor: '#F59E0B',
      bgGradientEnd: '#FFFBEB',
      icon: 'globe',
      iconBgColor: '#FEF1D9',
    },
    [InvoiceType.HartreeBESSPower]: {
      accentColor: '#06B6D4',
      bgGradientEnd: '#ECFEFF',
      icon: 'cpu',
      iconBgColor: '#D9F5F9',
    },
    [InvoiceType.HartreeAuxiliary]: {
      accentColor: '#EC4899',
      bgGradientEnd: '#FDF2F8',
      icon: 'file-text',
      iconBgColor: '#FCE3F0',
    },
    [InvoiceType.HartreeSolarPower]: {
      accentColor: '#F97316',
      bgGradientEnd: '#FFF7ED',
      icon: 'star',
      iconBgColor: '#FEEBDB',
    },
    [InvoiceType.HartreeOther]: {
      accentColor: '#6B7280',
      bgGradientEnd: '#F9FAFB',
      icon: 'ellipsis',
      iconBgColor: '#EAEBED',
    },
  };

  const invoiceCategories = enumToSelectOptions(InvoiceType, InvoiceTypeLabels) as Array<{
    id: InvoiceType;
    label: string;
  }>;

  return (
    <WithFallback isLoading={isLoading} fallback={<InvoiceCategorySummarySkeleton />}>
      <div className="bg-white p-4 flex grow flex-col gap-2 rounded-md border border-border">
        <Text variant="h4">PDF Invoice Extraction</Text>

        <div className="grid grid-cols-4 gap-3">
          {invoiceCategories.map(category => {
            const variant = categorySummaryVariantMap[category.id];
            const label = InvoiceTypeLabels[category.id];
            const value = data?.find(i => i.type === category?.id)?.count ?? 0;
            return (
              <div
                style={{
                  background: `linear-gradient(to bottom, ${variant.bgGradientStart ?? '#ffffff'}, ${variant.bgGradientEnd})`,
                }}
                key={category.id}
                className="p-4 flex flex-col justify-between rounded-md border-border border h-full">
                <IconWrapper
                  icon={variant.icon}
                  style={{
                    backgroundColor: variant.iconBgColor,
                  }}
                  iconColor={variant.accentColor}
                />
                <Text variant="12M" className="mt-2">
                  {label}
                </Text>

                <Text variant="free" className="text-[20px] font-InterBold" style={{color: variant.accentColor}}>
                  {value}
                </Text>
              </div>
            );
          })}
        </div>
      </div>
    </WithFallback>
  );
}

function InvoiceCategorySummarySkeleton() {
  return (
    <div className="flex flex-col gap-4  bg-white rounded-lg border-border border p-4">
      <Skeleton className="h-4! w-40 rounded-full bg-[#D7D7D7]!" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({length: 8}).map((_, idx) => (
          <Skeleton key={idx} className="size-28! rounded-md bg-[#F2F3F5]!" />
        ))}
      </div>
    </div>
  );
}
