import React, {useEffect} from 'react';
import {IconButton, Text, Button, Skeleton} from '@/ui-kits';
import {useChartsActionV2} from '@/hooks';
import {downloadInvoice, previewInvoice} from '@/services/api';
import {WithFallback} from '@lazarus/react-common';
import {cn} from '@/utils';

interface InvoicePdfPreviewProps {
  style?: React.CSSProperties;
  fileId: number;
  fileName?: string;
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  blobUrl?: string;
  assetId: number;
}

export function InvoicePdfPreview(props: InvoicePdfPreviewProps) {
  const {style, fileId, fileName, isFullScreenOverride: isFullScreen, blobUrl: blobUrlFromProps, assetId} = props;

  /**
   * ==============================
   * Hooks
   * =============================
   */
  const {chartRef, onMinimize, onMaximize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <InvoicePdfPreview {...props} isFullScreenOverride blobUrl={blobUrl ?? undefined} />,
  });

  /**
   * ==============================
   * States
   * =============================
   */
  const [blobUrl, setBlobUrl] = React.useState<string | null>(blobUrlFromProps ?? null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  /**
   * ==============================
   * functions
   * =============================
   */
  async function handleDownLoad() {
    if (!fileId || !fileName) {
      return;
    }
    await downloadInvoice({
      fileName,
      invoiceId: fileId,
      assetId,
    });
  }

  async function getBlobUrlFromFileId(fileId: number) {
    if (!fileId || !assetId) {
      return;
    }
    setIsLoading(true);
    try {
      const blob = await previewInvoice({invoiceId: fileId, assetId});
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * ==============================
   * Side Effects
   * =============================
   */
  useEffect(() => {
    if (blobUrlFromProps) {
      return;
    }
    if (fileId) {
      getBlobUrlFromFileId(fileId);
    }
  }, [fileId]);

  return (
    <div
      ref={chartRef}
      style={{
        ...style,
        ...(isFullScreen
          ? {
              width: '100%',
              height: '100%',
            }
          : {}),
      }}
      className="flex flex-col border-border border rounded-md overflow-hidden min-h-130">
      <div className="flex justify-between gap-2 bg-[#EFFAF9] px-4 py-2 items-center border-b border-border">
        <Text variant="14M">{fileName}</Text>
        <div className="flex items-center gap-3 chart-actions">
          <IconButton
            name="download"
            size={20}
            className="hover:bg-primary-tint-2! cursor-pointer charts-action"
            iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            onClick={handleDownLoad}
          />
          {!isFullScreen ? (
            <IconButton
              name="maximize"
              size={20}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={onMaximize}
            />
          ) : (
            <IconButton
              name="minimize"
              size={20}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={onMinimize}
            />
          )}
        </div>
      </div>

      <WithFallback
        isLoading={isLoading}
        fallback={
          <div className={cn('w-full bg-white h-full flex items-center justify-center', isFullScreen ? 'p-4' : 'p-2')}>
            <Skeleton className="w-full h-full! rounded-sm max-w-200" />
          </div>
        }>
        {blobUrl ? (
          <iframe
            title={fileName}
            src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <Text variant="12R" className="text-text-secondary!">
              Preview not available. You can download and view the file.
            </Text>
            <a href={blobUrl ?? ''} target="_blank" rel="noreferrer">
              <Button text="Open in new tab" variant="primary" size="sm" />
            </a>
          </div>
        )}
      </WithFallback>
    </div>
  );
}
