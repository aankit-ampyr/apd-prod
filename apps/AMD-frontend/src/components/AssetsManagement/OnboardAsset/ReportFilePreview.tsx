import {Badge, Icon, Text} from '@/ui-kits';
import {cn, formatDate, formatFileSize} from '@/utils';
import {Images} from '@lazarus/react-common/assets';
import React, {useEffect, useState} from 'react';
import {FileRemovalConfirmModal} from './FileRemovalConfirmModal';
import {Divider} from '@lazarus/react-common/components';
import {useConfirm} from '@/hooks';

// Limits the validation card to an easy-to-scan preview; users can expand the list
// only when a file returns more validation errors than we want to show by default.
const INITIAL_VISIBLE_VALIDATION_ERRORS = 5;

interface FilePreview {
  name?: string;
  size?: number;
  isLoading?: boolean;
  isValidated?: boolean;
  isPending?: boolean;
  pendingMessage?: string;
  validationMessage?: string;
  rows?: number;
  variant?: 'inline' | 'card';
  lastUpdated?: string;
  onRemove?: () => void;
  disabled?: boolean;
  projection?: {
    start?: string;
    end?: string;
  };
}

export function FilePreview(props: FilePreview) {
  const {
    projection,
    isLoading,
    validationMessage,
    isPending,
    pendingMessage,
    isValidated,
    name,
    disabled,
    rows,
    size,
    onRemove,
    variant = 'card',
    lastUpdated,
  } = props;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const handleRemoveClick = () => {
    if (disabled) return;
    setConfirmOpen(true);
  };
  const handleConfirm = () => {
    setConfirmOpen(false);
    onRemove?.();
  };
  const handleCancel = () => setConfirmOpen(false);

  return (
    <div className={cn('flex flex-col gap-2 relative w-full', variant === 'inline' ? 'grow' : 'items-center')}>
      {variant === 'card' && (
        <>
          <div className="flex gap-2 items-center">
            <Icon name="file-tick" className="size-5" />
            <Text variant="body2">{name}</Text>
          </div>
          <Text variant="caption" className="text-text-secondary!">
            {size && formatFileSize(size)}
          </Text>
          <div className="flex gap-2 items-center">
            {isLoading && <img src={Images.loading} className="size-4" />}
            {isLoading && <Text variant="body2">Validating File</Text>}

            {isValidated && <Icon name="circle-check" className="size-5 text-success" />}
            {isValidated && (
              <Text variant="body2" className="text-success!">
                {validationMessage || 'Validated Successfully'}
              </Text>
            )}
          </div>
          {isValidated && (
            <button disabled={disabled} onClick={handleRemoveClick} className="cursor-pointer group">
              <Icon name="cross" className="absolute top-0 right-0 z-10 group-disabled:cursor-not-allowed!" />
            </button>
          )}
          {isValidated && (
            <div className="bg-white rounded-2xl flex gap-3 px-4 py-3 border border-border">
              <div className="flex flex-col items-center gap-2">
                <Text variant="body2">Detected Rows</Text>
                <Badge
                  textClassName="font-InterMedium!"
                  className="px-4 py-0 bg-[#FFF6EB]"
                  message={String(rows)}
                  color="mustard"
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <Text variant="body2">Projection Period</Text>
                <Text className="text-text-secondary!" variant="caption">
                  {projection?.start && formatDate(projection?.start, 'dd MMM yyyy', true)} -{' '}
                  {projection?.end && formatDate(projection?.end, 'dd MMM yyyy', true)}
                </Text>
              </div>
            </div>
          )}
          {isPending && (
            <span className="flex gap-2 items-center">
              <Icon name="hourglass-refresh" className="text-warning size-5" />
              <Text variant="caption2" className="text-warning!">
                {pendingMessage}
              </Text>
            </span>
          )}
        </>
      )}

      {variant === 'inline' && isLoading && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-2">
            <Icon name="file-tick" className="size-5 mt-0.5" />
            <Text variant="body2">{name}</Text>
          </div>
          <div className="flex justify-center gap-4 items-center">
            <img src={Images.loading} className="size-4" />
            <Text variant="body2">Validating File</Text>
          </div>
        </div>
      )}

      {variant === 'inline' && !isLoading && (
        <div className="flex flex-col items-start self-stretch grow gap-4">
          <div className="flex gap-2">
            <Icon name="file-tick" className="size-5 mt-0.5" />

            <div className="flex flex-col gap-1">
              <Text variant="body2">{name}</Text>
              <Text variant="caption" className="text-text-secondary!">
                {size && formatFileSize(size)}
              </Text>
            </div>

            {!disabled && (
              <button disabled={disabled} onClick={handleRemoveClick} className="cursor-pointer">
                <Icon name="cross" className="absolute top-0 right-0 z-10" />
              </button>
            )}
          </div>
          <div className="p-4 w-full border border-border justify-between rounded-sm bg-white flex items-center gap-4">
            <span className="flex items-center gap-2">
              <Text variant="14M">Detected Rows :</Text>
              <Badge
                textClassName="font-InterMedium!"
                size="sm"
                className="px-4 py-0 bg-[#FFF6EB]"
                message={String(rows)}
                color="mustard"
              />
            </span>
            <Divider orientation="vertical" className="bg-disabled" />
            <span className="flex items-center gap-2">
              <Text variant="14M">Projection period: </Text>
              <Text variant="14R" className="text-text-secondary!">
                {projection?.start && formatDate(projection?.start, 'dd MMM yyyy', true)} -{' '}
                {projection?.end && formatDate(projection?.end, 'dd MMM yyyy', true)}
              </Text>
            </span>
            <Divider orientation="vertical" className="bg-disabled" />
            <span className="flex items-center gap-2">
              <Text variant="14R" className="text-text-secondary!">
                Last Updated:{' '}
              </Text>
              <Text variant="14R" className="text-text-secondary!">
                {formatDate(lastUpdated ?? '', 'dd MMM yyyy')}
              </Text>
            </span>
          </div>
        </div>
      )}

      <FileRemovalConfirmModal
        open={confirmOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        fileName={name || ''}
      />
    </div>
  );
}

interface FilePreview2<T> extends Pick<FilePreview, 'name' | 'size' | 'disabled' | 'isLoading' | 'onRemove'> {
  fileInfoPoints: Array<{
    label: string;
    value: (file: T) => string | React.ReactNode;
  }>;
  file?: T;
}
export function FilePreview2<T>(props: FilePreview2<T>) {
  const {fileInfoPoints, disabled, isLoading, name, onRemove, size, file} = props;

  /**
   * ====================
   * Hooks
   * ====================
   */
  const removalConfirm = useConfirm();

  /**
   * ====================
   * Functions
   * ===================
   */
  const handleRemoveClick = async () => {
    if (disabled) return;

    const confirmed = await removalConfirm({
      render: ({onCancel, onConfirm}) => (
        <FileRemovalConfirmModal onClose={onCancel} onConfirm={onConfirm} open={true} fileName={name}/>
      ),
    });
    if (confirmed) {
      onRemove?.();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 items-center">
        <div className="flex gap-2 items-start">
          <Icon name="file-tick" className="size-5 mt-1" />
          <Text variant="body2">{name}</Text>
        </div>
        <Text variant="caption" className="text-text-secondary!">
          {size && formatFileSize(size)}
        </Text>
        <div className="flex gap-2 mt-2 items-center">
          {isLoading && <img src={Images.loading} className="size-4" />}
          {isLoading && <Text variant="body2">Validating File</Text>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex grow self-stretch flex-col gap-1">
      <div className="flex gap-2 items-start">
        <Icon name="file-tick" className="size-5 mt-1" />

        <div className="flex flex-col gap-1">
          <Text variant="body2">{name}</Text>
          <Text variant="caption" className="text-text-secondary!">
            {size && formatFileSize(size)}
          </Text>
        </div>

        {!disabled && (
          <button disabled={disabled} onClick={handleRemoveClick} className=" ml-auto cursor-pointer">
            <Icon name="cross" />
          </button>
        )}
      </div>

      {file && fileInfoPoints.length > 0 && (
        <div className="flex gap-4 mt-2 justify-between bg-white border border-border rounded-sm p-4">
          {fileInfoPoints.map((point, index) => {
            const value = point.value(file);
            return (
              <React.Fragment key={index}>
                <div key={index} className="flex gap-1">
                  <Text variant="14M">{point.label} : </Text>
                  {typeof value === 'string' ? <Text variant="14R">{value}</Text> : value}
                </div>

                {index !== fileInfoPoints.length - 1 && <Divider orientation="vertical" className="bg-disabled" />}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ValidationErrorProps {
  fileName: string;
  errors: string[];
  inputRef?: any;
}

export function ValidationErrorCard({fileName, errors, inputRef}: ValidationErrorProps) {
  const [showAllErrors, setShowAllErrors] = useState(false);

  useEffect(() => {
    setShowAllErrors(false);
  }, [errors, fileName]);

  const handleUploadClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  const hasExpandableErrors = errors.length > INITIAL_VISIBLE_VALIDATION_ERRORS;
  const visibleErrors = showAllErrors ? errors : errors.slice(0, INITIAL_VISIBLE_VALIDATION_ERRORS);

  return (
    <>
      <div className="flex flex-col gap-3 border border-error bg-warning/5 rounded-md px-8 py-4 relative">
        {/* Top */}
        <div className="flex justify-between items-start ">
          <span className="flex items-center gap-2">
            <Icon name="file-tick" className="size-5" />
            <Text className="font-InterSemiBold!">{fileName}</Text>
          </span>

          <div className="flex items-center gap-4">
            <button onClick={handleUploadClick} className="flex items-center gap-2 text-primary cursor-pointer">
              <Icon stroke="2" name="upload" className="size-4 text-primary!" />
              <Text className="text-primary!">Upload New</Text>
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-error-text mt-2">
          <Icon name="circle-plus" className="size-4 rotate-45" />
          <Text className="text-error-text! text-[14px]!">Validation Unsuccessful</Text>
        </div>
      </div>

      {/* Errors */}
      <div className="mt-3 rounded-md overflow-hidden border-b-none border border-border ">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <Icon name="infoCircle" className="size-4 text-red-500" />
          <Text className="text-[14px]! font-InterRegular!">
            <span className="text-error-text! font-InterSemiBold!">{errors.length} errors</span>{' '}
            <span className="font-InterSemiBold!">in {fileName}</span>
          </Text>
        </div>

        {visibleErrors.map((err, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 p-3 border-b border-border border-r-none border-l-2 border-l-error bg-warning/5 last:border-t-0 last:border-b-0">
            <span className="flex gap-2 text-[14px]">
              <span>{i + 1}.</span>
              <Text className="text-[14px]!">{err}</Text>
            </span>
            {i === visibleErrors.length - 1 && hasExpandableErrors && (
              <button
                type="button"
                onClick={() => setShowAllErrors(prev => !prev)}
                className="flex items-center gap-2 text-text-primary cursor-pointer">
                <Text className="text-text-primary! text-[12px]!" variant="caption">
                  {showAllErrors ? 'View Less' : 'View All'}
                </Text>
                <Icon name={showAllErrors ? 'cheveron-up' : 'cheveron-down'} className="size-3 text-text-primary!" />
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
