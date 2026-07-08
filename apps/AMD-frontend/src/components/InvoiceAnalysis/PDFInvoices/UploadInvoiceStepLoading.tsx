import React from 'react';
import {Icon, Skeleton, Text} from '@/ui-kits';
import {IconWrapper} from '@/components/common';
import {IconTypes} from '@/interface';

interface UploadInvoiceStepLoadingProps {
  files: File[];
  step: number;
  stepMessage?: string;
  stepSubMessage?: string;
  totalSteps?: number;
  completed?: boolean;
  successInvoices?: string[];
  duplicateInvoices?: string[];
  rejectedInvoices?: string[];
}
export function UploadInvoiceStepLoading(props: UploadInvoiceStepLoadingProps) {
  const {
    files,
    step,
    stepMessage,
    stepSubMessage,
    totalSteps = 4,
    completed = false,
    duplicateInvoices = [],
    rejectedInvoices = [],
    successInvoices = [],
  } = props;

  const iconsMap: Record<number, IconTypes> = {
    0: 'supported-document-shield',
    1: 'supported-document-shield',
    2: 'download-2',
    3: 'file-search-2',
    4: 'circle-check-big',
  }
  return (
    <div className="flex gap-6 flex-col bg-white p-4 border border-border rounded-md">
      <div className="flex gap-8 justify-between">
        {files.map((file, index) => (
          <div key={index} className="flex gap-2 min-w-0">
            <div className="bg-[#F1F3FF] size-8 shrink-0 flex justify-center items-center p-1 rounded">
              <Icon name="pdf" color="#6F7181" />
            </div>
            <Text variant="14SB" className="wrap-break-word min-w-0">
              {file.name}
            </Text>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <IconWrapper
          style={{
            background: `linear-gradient(to bottom right, #89FFD2, #00B08D)`,
          }}
          icon={step == -1 ? 'file-big' : iconsMap[step]}
          iconClassName="text-white!"
        />
        <div className="flex flex-col gap-1">
          <Text variant="free" className="text-[#10AC8A]! text-[10px] font-InterSemiBold!">
            Step {step} of {totalSteps}
          </Text>
          <Text variant="16B" className="">
            {stepMessage}
          </Text>
          <Text variant="12R" className="text-text-secondary!">
            {stepSubMessage}
          </Text>
        </div>
      </div>

      {!completed ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${totalSteps}, 1fr)`,
          }}
          className="gap-4">
          {Array.from({length: totalSteps}).map((_, index) => {
            const barStep = index + 1;
            const isCompleted = completed || step > barStep;
            const isCurrent = step === barStep;

            if (isCurrent) {
              return <Skeleton key={index} className="h-2! rounded bg-linear-to-r from-[#89FFD2] to-[#00B08D]" />;
            }

            return <div key={index} className={`h-2 rounded ${isCompleted ? 'bg-[#16BD98]' : 'bg-[#E7EFEE]'}`} />;
          })}
        </div>
      ) : (
        <div className="grid-cols-3 grid gap-4 items-start">
          <InvoiceUploadSummaryCard title={`Successfully extracted`} variant="success" files={successInvoices} />
          <InvoiceUploadSummaryCard title={`Failed`} variant="rejected" files={rejectedInvoices} />
          <InvoiceUploadSummaryCard title={`Duplicate File Detected`} variant="duplicate" files={duplicateInvoices} />
        </div>
      )}
    </div>
  );
}

interface InvoiceUploadSummaryCardProps {
  title: string;
  variant: 'duplicate' | 'success' | 'rejected';
  files: string[];
}
function InvoiceUploadSummaryCard(props: InvoiceUploadSummaryCardProps) {
  const {title, variant, files} = props;

  const variants: Record<typeof variant, {icon: IconTypes; iconColor: string; bgColor: string}> = {
    success: {
      icon: 'circle-check',
      iconColor: '#16A34A',
      bgColor: '#EEFFED',
    },
    rejected: {
      icon: 'circle-cross',
      iconColor: 'var(--color-error)',
      bgColor: '#FFF1E6',
    },
    duplicate: {
      icon: 'files',
      iconColor: 'var(--color-secondary)',
      bgColor: '#F0F6F8',
    },
  };

  const variantStyle = variants[variant];

  return (
    <div className="flex gap-2 items-start p-4 rounded-md" style={{backgroundColor: variantStyle.bgColor}}>
      <div className={`size-8 shrink-0 flex justify-center items-center p-1 rounded bg-white shadow-sm`}>
        <Icon name={variantStyle.icon} color={variantStyle.iconColor} />
      </div>
      <div className="flex flex-col gap-1">
        <Text variant="14R">
          <span className="text-base font-InterSemiBold!">{files.length} </span>
          {title}
        </Text>

        <div>
          {variant === 'success' ? (
            <span className="flex items-center gap-1">
              <Icon name="circle-info-2" size={11} />
              <Text variant="free" className="text-[11px] text-text-secondary!">
                Invoices Updated in a table
              </Text>
            </span>
          ) : (
            files.map(file => (
              <span key={file} className="flex items-center gap-2">
                <Icon
                  name={variant === 'rejected' ? 'supported-document-cross' : 'supported-document'}
                  color={variant === 'rejected' ? 'var(--color-error)' : 'var(--color-secondary)'}
                />
                <Text variant="12SB">{file}</Text>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
