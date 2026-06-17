import type { SelectInputItem } from "../../interface";
import { useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

type UseDropdownValuesArgs<T> = {
  allowFetch?: boolean;
  selector: (rootState: any) => T[];
  fetchAction: () => any;
  mapToSelectInputItem?: (item: T) => SelectInputItem;
};

export function useDropdownValues<T extends SelectInputItem>(
  args: UseDropdownValuesArgs<T>,
): SelectInputItem[] {
  const { allowFetch = true, fetchAction, selector, mapToSelectInputItem } = args;

  const dropdownValues = useSelector(selector);
  const dispatch = useDispatch();

  // Stable ref so we never need fetchAction in the dep array
  const fetchActionRef = useRef(fetchAction);
  fetchActionRef.current = fetchAction;

  useEffect(() => {
    if (!allowFetch) return;
    if (dropdownValues.length > 0) return; // already have data, skip

    dispatch(fetchActionRef.current());
  }, [allowFetch, dispatch, dropdownValues.length > 0]); // eslint-disable-line

  if (mapToSelectInputItem) {
    return dropdownValues.map(mapToSelectInputItem);
  }

  return dropdownValues;
}