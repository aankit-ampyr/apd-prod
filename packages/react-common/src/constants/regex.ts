/**
 * emailRegex: Validates an email with alphanumeric, periods, plus, hyphen, underscores,
 * and a domain with 2+ characters after a dot.
 */
export const emailRegex =
  /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/;

/**
 * nameRegex: Validates a name with only alphabets, spaces, and periods.
 */
export const nameRegex = /^[A-Za-z .]+$/;
export const digestNameRegex = /^[A-Za-z ]+$/;

/**
 * assetNameRegex: Validates asset name (a-zA-Z, spaces, period, hyphen, underscore, parenthesis)
 */
export const assetNameRegex = /^[a-zA-Z0-9 .\-_()]+$/;

/**
 * assetLocationRegex: Validates location (a-zA-Z, spaces, period, hyphen, comma)
 */
export const assetLocationRegex = /^[a-zA-Z .\-,]+$/;

/**
 * assetCapacityRegex: Validates capacity (number with up to 2 decimals)
 */
export const assetCapacityRegex = /^\d+(\.\d{1,2})?$/;
