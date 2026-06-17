import React, { useState, useRef, useEffect } from "react";
import { Button, Icon, Text } from "../../ui-kit";
import { cn } from "../../utils";

type ValidationState = "idle" | "loading" | "success" | "error";

interface FileUploadProps {
  maxSizeMB?: number;
  maxRows?: number;
  onFileSelect?: (file: File) => void;
  onFileRemove?: () => void;
  persistedFile?: any;
  externalErrorMessage?: string;
  externalErrorTitle?: string;
  loadingMessage?: string;
  requireServerValidation?: boolean;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  maxSizeMB = 50,
  maxRows = 8760,
  onFileSelect,
  onFileRemove,
  persistedFile,
  externalErrorMessage,
  externalErrorTitle,
  loadingMessage = "Validating CSV with server...",
  requireServerValidation = false,
  disabled = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [validationState, setValidationState] =
    useState<ValidationState>("idle");
  const [message, setMessage] = useState<string>("");
  const [rowCount, setRowCount] = useState<number>(0);
  const [uploadedAt, setUploadedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastUploadedFileName = useRef<string | null>(null);
  const lastPersistedSyncKey = useRef<string | null>(null);

  useEffect(() => {
    // Never overwrite a live error state with stale persisted success.
    if (externalErrorMessage || !persistedFile) return;
    // Hydrate persisted success on initial load, or complete an in-flight
    // server validation that is still waiting in loading state.
    const canHydratePersistedSuccess =
      (file === null && validationState === "idle") ||
      (requireServerValidation &&
        validationState === "loading" &&
        file?.name === persistedFile.file_name);

    if (!canHydratePersistedSuccess) return;
    const syncKey = `${persistedFile.file_name || ""}-${persistedFile.file_size || 0}-${persistedFile.created_at || ""}`;
    if (lastPersistedSyncKey.current === syncKey) return;
    lastPersistedSyncKey.current = syncKey;

    setFile({
      name: persistedFile.file_name,
      size: persistedFile.file_size,
    } as File);

    const rows = persistedFile.row_count || 0;
    setRowCount(rows);
    setUploadedAt(new Date(persistedFile.created_at));
    setValidationState("success");
    setMessage(`CSV validated — ${rows} hourly rows detected, no missing values found.`);
  }, [persistedFile, externalErrorMessage, file, validationState, requireServerValidation]);

  useEffect(() => {
    if (!externalErrorMessage) return;
    setValidationState("error");
    setMessage(externalErrorMessage);
    setUploadedAt(null);
  }, [externalErrorMessage]);

  useEffect(() => {
    if (!uploadedAt) return;

    const interval = setInterval(() => {
      setTick((prev) => prev + 1); // triggers re-render
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [uploadedAt]);


  const handleFile = async (selectedFile: File) => {
    // Reset
    setValidationState("idle");
    setMessage("");
    setUploadedAt(null);
    setRowCount(0);
    setFile(selectedFile);

    // Validate type
    if (!selectedFile.name.endsWith(".csv")) {
      setValidationState("error");
      setMessage("Only CSV files are allowed.");
      return;
    }

    // Validate size
    const sizeMB = selectedFile.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setValidationState("error");
      setMessage(`File exceeds ${maxSizeMB} MB limit.`);
      return;
    }

    // Hard cap at 200MB
    if (sizeMB > 200) {
      setValidationState("error");
      setMessage("File size exceeds 200MB limit.");
      return;
    }

    // Duplicate name check (only against immediately previous file)
    if (lastUploadedFileName.current === selectedFile.name) {
      setValidationState("error");
      setMessage("Duplicate file name not accepted.");
      setFile(selectedFile);
      return;
    }

    try {
      //  Read CSV
      const text = await selectedFile.text();

      //  Check for empty file
      if (!text || text.trim().length === 0) {
        setValidationState("error");
        setMessage("Invalid CSV structure: empty file.");
        return;
      }

      // Parse rows
      const rows = text
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter((row) => row.length > 0);

      // Check if file has any rows
      if (rows.length === 0) {
        setValidationState("error");
        setMessage("Invalid CSV structure: no data rows found.");
        return;
      }

      //  Check for columns
      const firstRow = rows[0]?.split(",");
      if (!firstRow || firstRow.length === 0) {
        setValidationState("error");
        setMessage("Invalid CSV structure: no columns detected.");
        return;
      }

      //  detect header (first row non-numeric)
      const firstValue = rows[0]?.split(",")[0];
      const hasHeader = isNaN(Number(firstValue));

      //  Check for required columns (timestamp and solar)
      if (hasHeader) {
        const headerRow = rows[0].toLowerCase();
        const hasTimestampColumn = headerRow.includes("timestamp") || headerRow.includes("time") || headerRow.includes("date");
        const hasSolarColumn = headerRow.includes("solar") || headerRow.includes("generation") || headerRow.includes("power") || headerRow.includes("kwh") || headerRow.includes("mwh");

        if (!hasTimestampColumn || !hasSolarColumn) {
          setValidationState("error");
          setMessage("Invalid CSV structure: missing timestamp or solar generation columns.");
          return;
        }
      }

      //  ignore header in count
      const dataRows = hasHeader ? rows.length - 1 : rows.length;

      //  Check minimum row count (8760 hours per year)
      const minRows = 8760;
      if (dataRows < minRows) {
        setValidationState("error");
        setMessage(`Row count (${dataRows}) is less than ${minRows} hours per year required.`);
        return;
      }

      if (dataRows > maxRows) {
        setValidationState("error");
        setMessage(`Max ${maxRows} rows allowed.`);
        return;
      }

      // Validate all columns for blank values and numeric columns for invalid values
      const dataStartIndex = hasHeader ? 1 : 0;
      const headerColumns = hasHeader ? rows[0].split(",").map(col => col.trim()) : [];
      const validationErrors: string[] = [];
      const blankRowsPerColumn: Record<string, number[]> = {};
      const negativeRowsPerColumn: Record<string, number[]> = {};
      const infiniteRowsPerColumn: Record<string, number[]> = {};

      for (let i = dataStartIndex; i < rows.length; i++) {
        const columns = rows[i].split(",");

        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
          const cellValue = columns[colIdx]?.trim();
          const columnName = hasHeader && headerColumns[colIdx] ? headerColumns[colIdx] : `Column ${colIdx + 1}`;
          const colNameLower = columnName.toLowerCase();

          // Check for blank values in ALL columns (including timestamp)
          if (cellValue === undefined || cellValue === "") {
            if (!blankRowsPerColumn[columnName]) blankRowsPerColumn[columnName] = [];
            blankRowsPerColumn[columnName].push(i + 1);
            continue;
          }

          // Skip timestamp/date columns for numeric validation only
          const isTimestampColumn = colNameLower.includes("timestamp") || colNameLower.includes("time") || colNameLower.includes("date");
          if (isTimestampColumn) {
            continue;
          }

          const numValue = Number(cellValue);

          // Skip non-numeric values (text labels, etc.)
          if (isNaN(numValue)) continue;

          // Check for non-finite values (Infinity)
          if (!Number.isFinite(numValue)) {
            if (!infiniteRowsPerColumn[columnName]) infiniteRowsPerColumn[columnName] = [];
            infiniteRowsPerColumn[columnName].push(i + 1);
            continue;
          }

          // Check for negative values
          if (numValue < 0) {
            if (!negativeRowsPerColumn[columnName]) negativeRowsPerColumn[columnName] = [];
            negativeRowsPerColumn[columnName].push(i + 1);
            continue;
          }
        }
      }

      // Helper to format row numbers into ranges (e.g., 1, 3, 6-9)
      const formatRanges = (nums: number[]) => {
        if (nums.length === 0) return "";
        const sorted = [...nums].sort((a, b) => a - b);
        const ranges: string[] = [];
        let start = sorted[0];
        let end = sorted[0];

        for (let j = 1; j <= sorted.length; j++) {
          if (j < sorted.length && sorted[j] === end + 1) {
            end = sorted[j];
          } else {
            if (start === end) {
              ranges.push(`${start}`);
            } else {
              ranges.push(`${start}-${end}`);
            }
            if (j < sorted.length) {
              start = sorted[j];
              end = sorted[j];
            }
          }
        }
        return ranges.join(", ");
      };

      // Add grouped blank value errors to validationErrors
      Object.entries(blankRowsPerColumn).forEach(([col, rows]) => {
        validationErrors.push(`'${col}' has blank values at rows: ${formatRanges(rows)}.`);
      });

      // Add grouped infinite value errors to validationErrors
      Object.entries(infiniteRowsPerColumn).forEach(([col, rows]) => {
        validationErrors.push(`'${col}' has infinite values at rows: ${formatRanges(rows)}.`);
      });

      // Add grouped negative value errors to validationErrors
      Object.entries(negativeRowsPerColumn).forEach(([col, rows]) => {
        validationErrors.push(`'${col}' has negative values at rows: ${formatRanges(rows)}.`);
      });
      // If there are validation errors, show them all
      if (validationErrors.length > 0) {
        setValidationState("error");
        setMessage(validationErrors.join("\n"));
        return;
      }

      // Local checks passed; wait for backend if required.
      lastUploadedFileName.current = selectedFile.name;
      setFile(selectedFile);
      if (requireServerValidation) {
        setValidationState("loading");
        setMessage(loadingMessage);
      } else {
        setValidationState("success");
        setMessage(
          `CSV validated — ${dataRows} hourly rows detected, no missing values found.`,
        );
      }
      setRowCount(dataRows);
      setUploadedAt(new Date());

      // Send to parent
      onFileSelect?.(selectedFile);
    } catch (error) {
      setValidationState("error");
      // Handle general CSV parsing failures (encoding issues, malformed data)
      if (error instanceof TypeError) {
        setMessage("CSV parsing failed: encoding issues or malformed data detected.");
      } else if (error instanceof Error) {
        setMessage(`CSV parsing failed: ${error.message}`);
      } else {
        setMessage("Error reading CSV file. Please ensure the file is properly formatted.");
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "Uploaded just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
      return `Uploaded ${minutes} ${minutes === 1 ? "min" : "mins"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24)
      return `Uploaded ${hours} ${hours === 1 ? "hour" : "hours"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `Uploaded ${days} ${days === 1 ? "day" : "days"} ago`;

    const months = Math.floor(days / 30);
    if (months < 12)
      return `Uploaded ${months} ${months === 1 ? "month" : "months"} ago`;

    const years = Math.floor(months / 12);
    return `Uploaded ${years} ${years === 1 ? "year" : "years"} ago`;
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
    // Reset input value to allow re-selecting the same file
    e.target.value = "";
  };

  const removeFile = () => {
    if (disabled) return;
    setFile(null);
    setValidationState("idle");
    setMessage("");
    setUploadedAt(null);
    setRowCount(0);
    lastUploadedFileName.current = null; // Clear duplicate tracking
    lastPersistedSyncKey.current = null;
    onFileRemove?.();
  };

  return (
    <div className="w-full ">
      {/* Hidden file input - always rendered */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        hidden
        disabled={disabled}
        onChange={handleBrowse}
      />

      {/* Upload Box */}
      {!file && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          <div className="flex justify-center">
            <Icon
              name="cloud-upload"
              size={26}
              className="text-text-primary! flex justify-center"
            />
          </div>
          <div className="space-y-3">
            <Text variant="body1" className="font-medium">
              Drag & drop your CSV file here
            </Text>
            <Text variant="small" className="text-text-secondary!">
              or click to browse from your computer
            </Text>
          </div>

          <div className="flex justify-center gap-4 text-xs  my-4">
            <div className="flex items-center gap-1">
              <Icon name="circle-info" size={20} className="text-primary!" />
              <Text variant="small" className="text-text-secondary!">
                CSV only
              </Text>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="circle-info" size={20} className="text-primary!" />
              <Text variant="small" className="text-text-secondary!">
                Max {maxSizeMB} MB
              </Text>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="circle-info" size={20} className="text-primary!" />
              <Text variant="small" className="text-text-secondary!">
                {maxRows.toLocaleString()} hourly rows recommended
              </Text>
            </div>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => !disabled && fileInputRef.current?.click()}
              variant="primary"
              disabled={disabled}
              className={cn(
                "text-white px-5 py-2 rounded-md self-center",
                !disabled ? "cursor-pointer" : "cursor-not-allowed"
              )}
            >
              Browse File
            </Button>
          </div>
        </div>
      )}

      {/* File Card */}
      {(file) && (
        <div className={cn("mt-4 rounded-lg p-4 bg-white", disabled && "opacity-80")}>
          <div className="flex border-[1.4px] border-border p-3 rounded-lg justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary-tint-2! w-8 h-8 rounded-md flex items-center justify-center">
                <Icon name="file-text" size={20} className="text-[#2A9D8F]!" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB •{" "}
                  {rowCount.toLocaleString()} rows •{" "}
                  {uploadedAt ? getTimeAgo(uploadedAt) : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              {validationState === "success" && (
                <div className="flex items-center gap-3">
                  <Icon
                    name="circle-check-big"
                    size={16}
                    className="text-success!"
                  />
                  <Text variant="caption" className="text-success! text-sm">
                    Validated
                  </Text>
                </div>
              )}

              {validationState === "loading" && (
                <div className="flex items-center gap-3">
                  <Icon name="circle-info" size={18} className="text-primary!" />
                  <Text variant="caption2" className="text-primary! text-sm font-InterMedium">
                    Validating
                  </Text>
                </div>
              )}

              {validationState === "error" && (
                <div className="flex items-center gap-3">
                  <Icon name="circle-x" size={18} className="text-error!" />
                  <Text
                    variant="caption2"
                    className="text-error! text-sm font-InterMedium"
                  >
                    {externalErrorTitle || "Validation Unsuccessful"}
                  </Text>
                </div>
              )}

              <button
                className={cn(
                  "flex items-center gap-2",
                  !disabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
                onClick={() => !disabled && fileInputRef.current?.click()}
                disabled={disabled}
              >
                <Icon name="upload" size={18} className="text-primary!" />
                <Text
                  variant="caption2"
                  className="text-primary! text-sm font-InterMedium"
                >
                  Upload New
                </Text>
              </button>

              <button
                onClick={() => !disabled && removeFile()}
                disabled={disabled}
                className={cn(
                  "text-text-secondary! text-lg!",
                  !disabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Validation Message */}
          {message && (
            <div
              className={`mt-3 p-3 rounded-md text-sm ${validationState === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : validationState === "loading"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-red-50 text-red-700 border border-red-200"
                }`}
            >
              <div className="flex items-start gap-2">
                {validationState === "success" ? (
                  <Icon name="tick" size={16} className="text-success! mt-0.5" />
                ) : validationState === "loading" ? (
                  <Icon name="circle-info" size={16} className="text-primary! mt-0.5" />
                ) : (
                  <Icon
                    name="circle-alert"
                    size={16}
                    className="text-red-600! mt-0.5"
                  />
                )}{" "}
                <span className="whitespace-pre-line">{message}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

