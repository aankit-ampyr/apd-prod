import type { SelectInputItem } from '@/interface';
import {type ClassValue, clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function appendPlural(str: string, count: number): string {
  if (count === 1) {
    return str;
  }
  return `${str}s`;
}

export function matchesRoute(pathname: string, template: string): boolean {
  const pathSegments = pathname.split('/').filter(Boolean);
  const templateSegments = template.split('/').filter(Boolean);

  if (pathSegments.length !== templateSegments.length) {
    return false;
  }

  return templateSegments.every((segment, index) => {
    // Dynamic segments (starting with :) match any value
    if (segment.startsWith(':')) {
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
    return '';
  }

  if (trim) {
    name = name.trim();
  }

  if (removeUnderScore) {
    name = name?.replace(/_/g, ' ');
  }

  return name
    .split(/\s+/) // split by one or more spaces
    .map(
      word => convertRest ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
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
): (e: React.FocusEvent<HTMLInputElement> | React.FocusEvent<HTMLTextAreaElement>) => void {
  return (e: React.FocusEvent<HTMLInputElement> | React.FocusEvent<HTMLTextAreaElement>) => {
    handleBlur(e);
    // Format value with capitalized first letters when user leaves the field
    const currentValue = (e.target as HTMLInputElement).value;
    if (currentValue?.trim()) {
      setFieldValue(fieldName, capitalize(currentValue, true, false, removeUnderScore));
    }
  };
}