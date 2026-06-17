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
