import { DataTableColumn } from "../../interface";

// Helper function to convert ColumnWidth to style object
export const getColumnWidthStyles = (
  width: DataTableColumn<any>["width"],
): React.CSSProperties => {
  return {
    minWidth: width?.minWidth,
    width: width?.width || "auto",
    maxWidth: width?.maxWidth,
  };
};
