import { format, parseISO, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export const formatDate = (date: string | Date, formatStr: string = 'yyyy-MM-dd', utc: boolean = false) => {
  try{

    if (!date) return "";
    
    const parsedDate =
      typeof date === "string" ? parseISO(date) : date;

       // If UTC flag is true → force UTC formatting
    if (utc) {
      return formatInTimeZone(parsedDate, "UTC", formatStr);
    }
    
    return format(parsedDate, formatStr);
  }
  catch(error) {
    console.error("Error formatting date:", error);
    return typeof date === "string" ? date : ""; // Return the original date string if parsing/formatting fails
  }
};

export const parseDate = (dateString: string | Date, formatStr: string = 'dd-MM-yyyy'): Date | null => {
  try {
    if (!dateString) return null;

    const parsedDate =
      typeof dateString === "string" ? parse(dateString, formatStr, new Date()) : dateString;

    return parsedDate;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
};
