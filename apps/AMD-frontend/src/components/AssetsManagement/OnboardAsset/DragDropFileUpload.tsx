import { Asset } from "@/interface";
import { assetError, assetSuccess } from "@/services/redux/selectors";
import { Icon, Text } from "@/ui-kits";
import { cn, ErrorCodes, getErrorMessage, SuccessCodes } from "@/utils";
import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useSelector } from "react-redux";
import { FilePreview, ValidationErrorCard } from "./ReportFilePreview";

interface DragAndDropProps {
  onFileAccepted?: (file: File) => void;
  isLoading?: boolean;
  isValid?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
  file?: Asset['aggregator_report_file'];
  label?: 'aggregator' | 'scada';
  uploadError?: {
    file_name?: string;
    validation_errors?: string[];
  };
  isPending?: boolean;
  pendingMessage?: string;
  validationMessage?: string;
  variant?: 'inline' | 'card';
}

export function DragAndDrop(props: DragAndDropProps) {
  const {
    file,
    isLoading = true,
    isPending,
    pendingMessage,
    validationMessage,
    isValid = false,
    onFileAccepted,
    uploadError,
    onRemove,
    disabled,
    variant = 'card',
  } = props;

  // =============
  // states
  // =============
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<File | null>(null);
  const inputElementRef = useRef<HTMLInputElement | null>(null);

  // =============
  // hooks
  // =============
  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    disabled,
    multiple: false,
    onDrop: handleDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  // =============
  // selectors
  // =============
  const assetFailure = useSelector(assetError) as ErrorCodes;
  const success = useSelector(assetSuccess) as SuccessCodes;

  // ===================
  // dereived states
  // ===================
  const hasFile = Boolean(file || filePreview);
  const rootContainerClassName = cn(
    'border-2 rounded-lg p-6 flex flex-col items-center transition-colors cursor-pointer',
    variant === 'inline' ? 'justify-start' : 'justify-center ',
    isDragActive ? 'border-primary-tint-1 bg-primary-tint-2' : 'border-border bg-[#F7F8F9]',
    error && 'border-red-500 bg-red-50',
    hasFile && 'bg-primary-tint-2 cursor-auto',
    disabled && "cursor-not-allowed",
    file ? "border-solid" : "border-dashed",
  );
  const isValidationError = !isLoading && uploadError;
  const rootProps = (!hasFile && !isValidationError) ? getRootProps() : {};

  const {ref: dropzoneInputRef, ...rest}: any = getInputProps();

  // ===================
  // functions
  // ===================
  function handleDrop(files: File[]) {
    setError(null);
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }

  const handleFile = (file: File) => {
    const isExcel =
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.xlsx');
    if (!isExcel) {
      setError(getErrorMessage('E-10084'));
      return;
    }
    setError(null);
    setFilePreview(file);
    onFileAccepted?.(file);
  };

  function resetLocalSelection() {
    setFilePreview(null);
    if (inputElementRef.current) {
      inputElementRef.current.value = '';
    }
  }

  function setInputRef(node: HTMLInputElement | null) {
    inputElementRef.current = node;
    if (typeof dropzoneInputRef === 'function') {
      dropzoneInputRef(node);
      return;
    }
    if (dropzoneInputRef) {
      dropzoneInputRef.current = node;
    }
  }

  // ===================
  // side effects
  // ===================
  useEffect(() => {
    if (success && ['S-10029', 'S-10030', 'S-10033', 'S-10034', 'S-10039', 'S-10040', 'S-10053'].includes(success)) {
      resetLocalSelection();
    }
    // any failure, reset the state
    if (assetFailure) {
      resetLocalSelection();
    }
  }, [success, assetFailure]);

  useEffect(() => {
    if (!file && !isLoading) {
      resetLocalSelection();
    }
  }, [file, isLoading]);

  return (
    <div {...rootProps} className={cn(!isValidationError ? rootContainerClassName : '', '')} style={{minHeight: variant === 'card' ? 160 : 120}}>
      {/* always render the input */}
      <input ref={setInputRef} {...rest} className={hasFile && 'hidden'} />
      {!hasFile && !isValidationError && (
        <div className="flex flex-col gap-3 items-center">
          <Icon name="upload" width={48} height={48} className={cn(`mb-2`, error && 'text-error-text')} />
          <div className="flex flex-col gap-2 items-center">
            <Text variant="largeBody" className="font-medium text-text-primary!">
              Drag & drop or click to browse
            </Text>
            <Text variant="caption" className="font-medium text-text-placeholder!">
              Supported: .xlsx  · Max 100 MB
            </Text>
          </div>
          {error && (
            <Text variant="caption" className="text-red-500 mt-2">
              {error}
            </Text>
          )}
        </div>
      )}
      {isLoading && filePreview && (
        <FilePreview variant={variant} onRemove={onRemove} name={filePreview.name} size={filePreview.size} isLoading={isLoading} />
      )}

      {!isLoading && file && (
        <FilePreview variant={variant}
          name={file.name ?? filePreview?.name}
          size={file.size}
          disabled={disabled}
          isLoading={isLoading}
          isValidated={isValid}
          isPending={isPending}
          pendingMessage={pendingMessage}
          validationMessage={validationMessage}
          rows={file.total_rows}
          lastUpdated={file?.uploaded_at}
          onRemove={onRemove}
          projection={{
            end: file.projection_summary?.end_timestamp,
            start: file.projection_summary?.start_timestamp,
          }}
        />
      )}

      {isValidationError && (
        <ValidationErrorCard
          fileName={uploadError.file_name ?? filePreview?.name ?? ''}
          errors={uploadError.validation_errors ?? []}
          inputRef={inputElementRef}
        />
      )}
    </div>
  );
}
