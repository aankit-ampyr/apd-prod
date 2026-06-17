import type { SelectInputItem } from "../interface";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as htmlToImage from "html-to-image";
import { Ref } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a random integer between min and max (inclusive)
export function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function appendPlural(str: string, count: number): string {
  if (count === 1) {
    return str;
  }
  return `${str}s`;
}

export function matchesRoute(pathname: string, template: string): boolean {
  const pathSegments = pathname.split("/").filter(Boolean);
  const templateSegments = template.split("/").filter(Boolean);

  if (pathSegments.length !== templateSegments.length) {
    return false;
  }

  return templateSegments.every((segment, index) => {
    // Dynamic segments (starting with :) match any value
    if (segment.startsWith(":")) {
      return true;
    }
    // Static segments must match exactly
    return segment === pathSegments[index];
  });
}

/**
 * Convert a TypeScript enum to SelectInputitem array
 * Handles both numeric and string enums
 * @param enumObject - The enum to convert
 * @param startId - Starting ID for options (default: 1)
 * @returns Array of SelectInputitem
 */
export const enumToSelectOptions = (
  enumObject: Record<string, string | number>,
  labelMapping: Record<string, string> = {},
  startId: number = 1,
): SelectInputItem[] => {
  return Object.entries(enumObject)
    .filter(([key]) => !isNaN(Number(key)))
    .map(([key, value], index) => ({
      id: startId + index,
      label: labelMapping[key] || String(value),
    }));
};

export const enumToSelectOptionsWithValue = (
  enumObject: Record<string, string | number>,
  labelMapping: Record<string, string> = {},
): SelectInputItem[] => {
  return Object.entries(enumObject)
    .filter(([key]) => !isNaN(Number(key)))
    .map(([key, value]) => {
      const label = labelMapping[key] || String(value);
      return {
        id: Number(key),
        label,
      };
    });
};

/**
 * Capitalizes the first letter of each word in a name.
 *
 * @param name - The input string (e.g., "john doe").
 * @returns The formatted string (e.g., "John Doe").
 */
export function capitalize(
  name: string,
  trim: boolean = true,
  convertRest: boolean = true,
  removeUnderScore: boolean = true,
): string {
  if (trim && !name?.trim()) {
    return "";
  }

  if (trim) {
    name = name.trim();
  }

  if (removeUnderScore) {
    name = name?.replace(/_/g, " ");
  }

  return name
    .split(/\s+/)
    .map((word) =>
      convertRest
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/**
 * Creates a blur handler that formats the input value with capitalized first letters.
 * Use this for name, designation, education, and similar text fields.
 *
 * @param handleBlur - Formik's handleBlur function
 * @param setFieldValue - Formik's setFieldValue function
 * @param fieldName - The name of the field to update
 * @returns A blur event handler function
 */
export function createCapitalizeFormattedBlurHandler(
  handleBlur: (e: React.FocusEvent<any>) => void,
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void,
  fieldName: string,
  removeUnderScore: boolean = true,
): (
  e: React.FocusEvent<HTMLInputElement> | React.FocusEvent<HTMLTextAreaElement>,
) => void {
  return (
    e:
      | React.FocusEvent<HTMLInputElement>
      | React.FocusEvent<HTMLTextAreaElement>,
  ) => {
    handleBlur(e);
    // Format value with capitalized first letters when user leaves the field
    const currentValue = (e.target as HTMLInputElement).value;
    if (currentValue?.trim()) {
      setFieldValue(
        fieldName,
        capitalize(currentValue, true, false, removeUnderScore),
      );
    }
  };
}

export const handleFloatBlurWithTrailingDotFormat =
  (field: string, handleBlur: any, setFieldValue: any) =>
  (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value?.endsWith(".")) {
      const formattedValue = `${value}00`;
      e.target.value = formattedValue;
      setFieldValue(field, formattedValue, true);
      return; // ← skip handleBlur so it doesn't re-validate the stale value
    }
    handleBlur(field)(e);
  };

/**
 * Formats a value ending with a trailing dot to have ".00"
 * Standalone version (not tied to Formik)
 * @param value - The input value string
 * @returns Formatted value string
 */
export const formatTrailingDot = (value: string): string => {
  if (value?.endsWith(".")) {
    return `${value}00`;
  }
  return value;
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Formats a file size in bytes to a human-readable string (e.g., '7.24 MB').
 * @param bytes - The file size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., '7.24 MB')
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const downloadElementAsImage = async (
  element: HTMLElement | null,
  fileName: string = "download.png",
) => {
  if (!element) return;

  try {
    const dataUrl = await htmlToImage.toPng(element, {
      filter: (node: HTMLElement) => {
        // ❌ exclude elements with 'no-export'
        return !node.classList?.contains("no-export");
      },
    });

    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Image download failed:", error);
  }
};

export const formatCurrencyToPound = (
  value: number,
  allowDecimal: boolean = true,
) => {
  const formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: allowDecimal ? 2 : 0,
    maximumFractionDigits: allowDecimal ? 2 : 0,
  });

  const absFormatted = formatter.format(Math.abs(value)).replace("£", "");

  return value < 0 ? `£-${absFormatted}` : `£${absFormatted}`;
};

export const formatMegaWatt = (value: number) => {
  return `${Number(value.toFixed(2))} MW`;
};

export async function downloadChart(
  chartRef: any,
  downloadName: string = "load-chart.png",
) {
  const chartElement = chartRef?.current as HTMLElement | null;
  if (!chartElement) return;
  const exportEdgeBuffer = 64;

  const expandedElements = Array.from(
    chartElement.querySelectorAll<HTMLElement>('[data-export-full-width="true"]'),
  );
  const savedStyles = expandedElements.map((element) => ({
    element,
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    overflow: element.style.overflow,
    overflowX: element.style.overflowX,
    overflowY: element.style.overflowY,
    scrollLeft: element.scrollLeft,
  }));
  const savedChartStyle = {
    width: chartElement.style.width,
    maxWidth: chartElement.style.maxWidth,
    overflow: chartElement.style.overflow,
    overflowX: chartElement.style.overflowX,
    overflowY: chartElement.style.overflowY,
  };

  try {
    expandedElements.forEach((element) => {
      element.style.width = `${element.scrollWidth + exportEdgeBuffer}px`;
      element.style.maxWidth = "none";
      element.style.overflow = "hidden";
      element.style.overflowX = "hidden";
      element.style.overflowY = "hidden";
      element.scrollLeft = 0;
    });

    const widestExpandedNode = expandedElements.reduce((max, element) => {
      return Math.max(max, element.offsetWidth, element.scrollWidth);
    }, 0);

    const exportWidth = Math.max(
      chartElement.offsetWidth,
      chartElement.scrollWidth,
      widestExpandedNode + exportEdgeBuffer,
    );
    const exportHeight = Math.max(chartElement.offsetHeight, chartElement.scrollHeight);

    chartElement.style.width = `${exportWidth}px`;
    chartElement.style.maxWidth = "none";
    chartElement.style.overflow = "hidden";
    chartElement.style.overflowX = "hidden";
    chartElement.style.overflowY = "hidden";

    const dataUrl = await htmlToImage.toPng(chartElement, {
      width: exportWidth,
      height: exportHeight,
      style: {
        width: `${exportWidth}px`,
        height: `${exportHeight}px`,
      },
      filter: (node: HTMLElement) => {
        return !node.classList?.contains("chart-actions");
      },
    });
    const link = document.createElement("a");
    link.download = downloadName;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("Download failed", err);
  } finally {
    savedStyles.forEach(({ element, width, maxWidth, overflow, overflowX, overflowY, scrollLeft }) => {
      element.style.width = width;
      element.style.maxWidth = maxWidth;
      element.style.overflow = overflow;
      element.style.overflowX = overflowX;
      element.style.overflowY = overflowY;
      element.scrollLeft = scrollLeft;
    });
    chartElement.style.width = savedChartStyle.width;
    chartElement.style.maxWidth = savedChartStyle.maxWidth;
    chartElement.style.overflow = savedChartStyle.overflow;
    chartElement.style.overflowX = savedChartStyle.overflowX;
    chartElement.style.overflowY = savedChartStyle.overflowY;
  }
}

export function seededRandom(seed: number): number {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Triggers browser download for a Blob
 * Creates a temporary link, clicks it, then cleans up
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export const formatValue = (
  value: any,
  formatter?: (val: number) => string,
) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return formatter ? formatter(value) : value;
};

export function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

export const formatNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(
      value % 1_000_000_000 === 0 ? 0 : 1
    )}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(
      value % 1_000_000 === 0 ? 0 : 1
    )}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(
      value % 1_000 === 0 ? 0 : 1
    )}k`;
  }

  return `${value}`;
};

// export const 