import React, {useEffect, useState} from 'react';
import {AnalyticsTable, Divider, SectionHeader} from '../common';
import {Button, Icon, Modal, MonthYearSelector, MultiMonthYearSelector, Text, Tooltip} from '@/ui-kits';
import {
  AddMonthlyValuesRequest,
  DataTableColumn,
  Metric,
  MetricMonthlyValues,
  MetricMonthlyValueTabluar,
  MonthYear,
} from '@/interface';
import {AssetMetrics, CALENDAR_MONTH_NAMES, SUCCESS_KEY} from '@/constants';
import {useDispatch, useSelector} from 'react-redux';
import {
  monthlyMetricsValues,
  monthlyValuesLoading,
  monthlyValuesUpdateLoading,
  settingsSuccess,
} from '@/services/redux/selectors';
import {addMonthlyValuesRequest, getMonthlyValuesRequest} from '@/services/redux/slice/settingsSlice';
import {cn, ErrorCodes, formatTrailingDot, getErrorMessage, SuccessCodes} from '@/utils';
import {useClickOutside, useToast} from '@/hooks';
import {getModoBenchmarkMonthlyValue} from '@/services/api';

type FieldErrorMap = Record<string, boolean>;

type ValidationError = {
  id: number;
  field: string;
  code: ErrorCodes;
};

function normalizeMonthlyValue(value: string) {
  return formatTrailingDot(value.trim());
}

/**
 * maximum colums to show
 */

const MAX_COLS_TO_SHOW = 3;

export function MonthlyValues() {
  // =========================
  // hooks
  // =========================
  const dispatch = useDispatch();
  const {showToast} = useToast();

  // =========================
  // selector
  // =========================
  const monthlyMetricValue = useSelector(monthlyMetricsValues);
  const success = useSelector(settingsSuccess) as SuccessCodes;
  const updateLoading = useSelector(monthlyValuesUpdateLoading);
  const fetchLoading = useSelector(monthlyValuesLoading);

  // =========================
  // states
  // =========================
  const [isAddMonthPickerOpen, setIsAddMonthPickerOpen] = useState<boolean>(false);
  const [selectedAddMonthYear, setSelectedAddMonthYear] = useState<MonthYear | undefined>();
  const hasMonthlyValues = monthlyMetricValue.monthly_values?.length > 0;
  const [activeColumn, setActiveColumn] = useState<MonthYear | null>(null);
  const [columnData, setColumnData] = useState<Record<number, string>>({});
  const [originalColumnData, setOriginalColumnData] = useState<Record<number, string>>({});
  const [filterValue, setFilterValue] = useState<MonthYear[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const fieldErrors = getFieldErrors(errors);
  const hasErrors = errors.length > 0;

  // Modo Benchmark API states
  const [modoBenchmarkLoading, setModoBenchmarkLoading] = useState<boolean>(false);
  const [modoBenchmarkError, setModoBenchmarkError] = useState<string | null>(null);

  // Check if any changes have been made
  const hasChanges = (() => {
    // For new column: check if any value is entered
    if (selectedAddMonthYear && !hasMonthlyValues) {
      return Object.values(columnData).some(val => val !== '');
    }

    // For editing: compare current data with original
    const allKeys = new Set([...Object.keys(columnData), ...Object.keys(originalColumnData)]);
    for (const key of allKeys) {
      const current = columnData[Number(key)] ?? '';
      const original = originalColumnData[Number(key)] ?? '';
      if (current !== original) {
        return true;
      }
    }
    return false;
  })();

  /**
   * Prepares derived state required for rendering the monthly metrics table.
   */
  const groupedMonthlyData = monthlyMetricData(monthlyMetricValue.monthly_values, monthlyMetricValue.metric);
  const hasFilterApplied = filterValue.length > 0;
  const monthlyValuesDataColums: DataTableColumn<MetricMonthlyValueTabluar>[] = generateMonthlyColumns(
    groupedMonthlyData,
    hasMonthlyValues,
    selectedAddMonthYear,
    hasFilterApplied,
  );

  // Get existing month/year combinations to disable in the add month modal
  const existingMonthYears: MonthYear[] = (() => {
    const uniqueSet = new Set<string>();
    const result: MonthYear[] = [];

    monthlyMetricValue.monthly_values?.forEach(item => {
      const key = `${item.month}-${item.year}`;
      if (!uniqueSet.has(key)) {
        uniqueSet.add(key);
        result.push({month: item.month, year: item.year});
      }
    });

    return result;
  })();

  const isDataBeingEdited = Boolean(selectedAddMonthYear) || Boolean(activeColumn);

  // =========================
  // functions
  // =========================

  async function fetchModoBenchmark(param: MonthYear) {
    setModoBenchmarkLoading(true);
    setModoBenchmarkError(null);

    try {
      const response = await getModoBenchmarkMonthlyValue(param);
      if (response?.data?.status === SUCCESS_KEY) {
        const benchmark = Number.parseInt(response?.data?.data?.modo_benchmark_per_mw_per_year);
        // Pre-fill the Modo Benchmark value in columnData
        if (benchmark !== undefined && benchmark !== null) {
          setColumnData(prev => ({
            ...prev,
            [AssetMetrics.ModoBenchmark]: benchmark ? String(benchmark) : '',
          }));
        }
      } else {
        setModoBenchmarkError(getErrorMessage(response?.data?.status_code) || 'Failed to fetch Modo Benchmark');
      }
    } catch (err: any) {
      // error will always be of structure
      /**
       * {
       *  status: 'error',
       *  status_code: some code
       * }
       */
      const errorMessage = err?.data?.status_code
        ? getErrorMessage(err.data.status_code)
        : 'Failed to fetch Modo Benchmark from API';
      setModoBenchmarkError(errorMessage);
    } finally {
      setModoBenchmarkLoading(false);
    }
  }

  function handleBlurValidation(metricId: number, value: string) {
    const formattedValue = normalizeMonthlyValue(value);

    // Update columnData with formatted value if it changed
    if (formattedValue !== value) {
      setColumnData(prev => ({
        ...prev,
        [metricId]: formattedValue,
      }));
    }

    if (formattedValue === '') {
      setErrors(prev => prev.filter(err => err.id !== metricId));
      return;
    }
    const validationErrors = validateMonthlyValues({[metricId]: formattedValue}, monthlyMetricValue.metric);

    setErrors(prev => {
      // remove previous error for this field
      const filtered = prev.filter(err => err.id !== metricId);

      return [...filtered, ...validationErrors];
    });

    // toast trigger
    if (validationErrors.length > 0) {
      const latestError = validationErrors[validationErrors.length - 1];
      showToast(getErrorMessage(latestError.code), 'error');
    }
  }

  /**
   * Validates monthly values based on metric-specific rules
   * Returns array of validation errors
   */
  function validateMonthlyValues(data: Record<number, string>, metrics: Metric[]): ValidationError[] {
    const validationErrors: ValidationError[] = [];

    Object.entries(data).forEach(([metricIdStr, valueStr]) => {
      const metricId = Number(metricIdStr);
      const metric = metrics.find(m => m.id === metricId);
      if (!metric) return;

      const normalizedValue = normalizeMonthlyValue(valueStr);

      // Skip empty values
      if (normalizedValue === '') return;

      const value = Number(normalizedValue);

      // Check if value is a valid number
      if (isNaN(value)) {
        validationErrors.push({id: metricId, field: 'value', code: 'E-10201'});
        return;
      }

      // Round-Trip Efficiency: must be between 80 and 90
      if (metricId === AssetMetrics.RoundTripEfficiency) {
        if (value < 80 || value > 90) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10203'});
        }
        // At most 2 decimal places
        const decimalPart = normalizedValue.split('.')[1];
        if (decimalPart && decimalPart.length > 2) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10211'});
        }
      }

      // Modo Benchmark: Non-negative, decimal values not allowed
      if (metricId === AssetMetrics.ModoBenchmark) {
        if (value < 0) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10202'});
        }
        if (value % 1 !== 0) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10209'});
        }
      }

      // DUoS Fixed Charges: Negative allowed, decimal values not allowed
      if (metricId === AssetMetrics.DuosFixedCharges) {
        if (value % 1 !== 0) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10209'});
        }
      }

      // DUoS Credit: Non-negative, decimal values not allowed
      if (metricId === AssetMetrics.DuosCredit) {
        if (value < 0) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10202'});
        }
        if (value % 1 !== 0) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10209'});
        }
      }

      // Capacity Market: Non-negative, decimal values not allowed
      if (metricId === AssetMetrics.CapacityMarket) {
        if (value < 0) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10202'});
        }
        if (value % 1 !== 0) {
          validationErrors.push({id: metricId, field: 'value', code: 'E-10209'});
        }
      }
    });

    return validationErrors;
  }

  function getFieldErrors(errors: ValidationError[]): FieldErrorMap {
    const map: FieldErrorMap = {};
    errors.forEach(err => {
      map[`${err.id}`] = true;
    });
    return map;
  }

  function handleSave() {
    if (!activeColumn) return;

    // Validate before saving
    const validationErrors = validateMonthlyValues(columnData, monthlyMetricValue.metric);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      const latestError = validationErrors[validationErrors.length - 1];
      showToast(getErrorMessage(latestError.code), 'error');
      return;
    }

    setErrors([]);

    const payload: AddMonthlyValuesRequest['payload'] = Object.entries(columnData)
      .map(([metric_id, value]) => [metric_id, normalizeMonthlyValue(value)] as const)
      .map(([metric_id, value]) => ({
      metric_id: Number(metric_id),
      month: activeColumn.month,
      year: activeColumn.year,
      value: value ? Number(value) : null,
    }));

    dispatch(addMonthlyValuesRequest(payload));
  }

  function resetEditAddData() {
    setActiveColumn(null);
    setSelectedAddMonthYear(undefined);
    setColumnData({});
    setOriginalColumnData({});
    setModoBenchmarkLoading(false);
    setModoBenchmarkError(null);
  }

  function handleAddMonthColum(data: MonthYear) {
    setSelectedAddMonthYear(data);
    setActiveColumn(data);
    setColumnData({}); // fresh start
    setOriginalColumnData({}); // no original data for new column
    fetchModoBenchmark(data);
  }

  function handleEditColumn(data: MonthYear) {
    // Clear any add-column state
    setSelectedAddMonthYear(undefined);
    setActiveColumn(data);

    // Pre-populate columnData with existing values for this month/year
    const existingData: Record<number, string> = {};
    monthlyMetricValue.monthly_values.forEach(item => {
      if (item.month === data.month && item.year === data.year) {
        existingData[item.metric_id] = item.value !== null && item.value !== undefined ? String(item.value) : '';
      }
    });
    setColumnData({...existingData});
    setOriginalColumnData({...existingData});
  }

  function cancelEdit() {
    setSelectedAddMonthYear(undefined);
    setActiveColumn(null);
    setColumnData({});
    setOriginalColumnData({});
    setErrors([]);
    setModoBenchmarkLoading(false);
    setModoBenchmarkError(null);
  }

  function handleFilter(val: MonthYear[]) {
    if (!val.length) {
      dispatch(getMonthlyValuesRequest({month: [], year: []}));
      return;
    }

    const months = val.map(v => v.month);
    const years = [...new Set(val.map(v => v.year))];

    dispatch(
      getMonthlyValuesRequest({
        month: months,
        year: years,
      }),
    );
  }

  function monthlyMetricData(monthly_values: MetricMonthlyValues[], metric: Metric[]): MetricMonthlyValueTabluar[] {
    if (fetchLoading) {
      const dummyMonths = [1, 2, 3, 4]; // 👈 control skeleton columns
      return [
        AssetMetrics.RoundTripEfficiency,
        AssetMetrics.ModoBenchmark,
        AssetMetrics.CapacityMarket,
        AssetMetrics.DuosCredit,
        AssetMetrics.DuosFixedCharges,
      ].map(
        (item, _): MetricMonthlyValueTabluar => ({
          id: item,
          columns: dummyMonths.map(m => ({
            month: m,
            year: 2026,
            value: null,
          })),
          metric_name: AssetMetrics[item],
        }),
      );
    }
    const map = new Map<number, MetricMonthlyValueTabluar>();

    // Step 1: Initialize all metrics
    metric.forEach(m => {
      map.set(m.id, {
        id: m.id,
        metric_name: m.metric_name,
        columns: [],
      });
    });

    // Step 2: Fill data
    monthly_values.forEach(item => {
      const entry = map.get(item.metric_id);

      if (entry) {
        entry.columns.push({
          month: item.month,
          year: item.year,
          value: item.value,
        });
      }
    });

    // Step 3: No sorting - keep the order as received from API
    // (Removed: entry.columns.sort((a, b) => a.month - b.month))

    return Array.from(map.values());
  }

  function generateMonthlyColumns(
    data: MetricMonthlyValueTabluar[],
    hasMonthlyValues: boolean,
    selectedAddMonthYear?: MonthYear,
    hasFilterApplied?: boolean,
  ): DataTableColumn<MetricMonthlyValueTabluar>[] {
    let newColumnData: DataTableColumn<MetricMonthlyValueTabluar> | null = null;

    // Metric Column (always first)
    const metricColumn: DataTableColumn<MetricMonthlyValueTabluar> = {
      name: 'metric',
      align: 'left',
      title: <Text variant="14R">Metric Name</Text>,
      width: {minWidth: '330px', maxWidth: '390px'},
      render: row => {
        // for modo benchmark metric it will be fetched from API so it will render some extra text "Auto (API)"
        if (row.id === AssetMetrics.ModoBenchmark) {
          return (
            <Text className="flex items-center gap-4">
              {row.metric_name}
              <span
                className={cn(
                  'flex items-center gap-1 text-sm! text-text-secondary!',
                  modoBenchmarkError && 'text-error-text!',
                )}>
                {modoBenchmarkLoading ? (
                  <>
                    <Icon name="loader" className="size-3.5 animate-spin" /> fetching...
                  </>
                ) : modoBenchmarkError ? (
                  <span className="relative group flex items-center gap-1">
                    <Icon name="infoCircle" className="size-3.5" /> Auto (API) Failed
                    <Tooltip position="top" message={modoBenchmarkError ?? ''} />
                  </span>
                ) : (
                  <>
                    <Icon name="infoCircle" className="size-3.5" /> Auto (API)
                  </>
                )}
              </span>
            </Text>
          );
        }
        return (
          <Text variant="14M" className="text-text-primary!">
            {row.metric_name}
          </Text>
        );
      },
    };

    // no data
    if (!hasMonthlyValues && !selectedAddMonthYear && !fetchLoading) {
      return [
        metricColumn,
        {
          name: 'no-data',
          align: 'left',
          render: () => <p className="text-text-secondary! text-caption font-InterLight">-</p>,
          title: <p className="text-text-secondary! text-caption italic font-InterLight">No months added yet</p>,
          width: {minWidth: '100px', maxWidth: '120px'},
        },
      ];
    }

    // Step 1: get unique months
    const monthMap = new Map<string, {month: number; year: number}>();

    data.forEach(metric => {
      metric.columns.forEach(col => {
        const key = `${col.month}-${col.year}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, {month: col.month, year: col.year});
        }
      });
    });

    // Keep original order (no sorting) and limit to 4 columns if no filter applied
    let uniqueMonths = Array.from(monthMap.values());
    if (!hasFilterApplied && uniqueMonths.length > MAX_COLS_TO_SHOW) {
      uniqueMonths = uniqueMonths.slice(0, MAX_COLS_TO_SHOW);
    }

    // Step 2: dynamic month columns
    const monthColumns: DataTableColumn<MetricMonthlyValueTabluar>[] = uniqueMonths.map(({month, year}) => {
      const isActive = activeColumn?.month === month && activeColumn?.year === year;

      return {
        name: `${month}-${year}`,
        align: 'left',
        title: (
          <div className="flex items-center gap-2">
            <p className="text-text-primary! text-caption font-InterLight">
              {fetchLoading ? '' : `${CALENDAR_MONTH_NAMES[month - 1]} ${year}`}
            </p>
            {!isActive && !fetchLoading && (
              <button onClick={() => handleEditColumn({month, year})} className="cursor-pointer hover:opacity-70">
                <Icon name="pencil" className="text-text-secondary size-3" />
              </button>
            )}
          </div>
        ),
        width: {minWidth: '180px', maxWidth: '180px'},
        render: row => {
          const found = row.columns.find(c => c.month === month && c.year === year);

          if (!isActive) {
            return <Text variant="14M">{found?.value ?? '-'}</Text>;
          }

          const hasError = fieldErrors[`${row.id}`];
          const disabled = row.id === AssetMetrics.ModoBenchmark && !modoBenchmarkError;
          return (
            <input
              disabled={disabled}
              className={cn(
                'max-w-30 border px-3 py-1 rounded text-caption',
                hasError ? 'border-error' : 'border-border',
                disabled && 'bg-bg-card!',
              )}
              placeholder="-"
              onBlur={e => {
                handleBlurValidation(row.id, e.target.value);
              }}
              value={columnData[row.id] ?? ''}
              onChange={e => {
                const value = e.target.value;
                setColumnData(prev => ({
                  ...prev,
                  [row.id]: value,
                }));
                setErrors(prev => {
                  const hasFieldError = prev.some(err => err.id === row.id);
                  if (!hasFieldError) return prev;

                  const nextFieldErrors = validateMonthlyValues({[row.id]: value}, monthlyMetricValue.metric);
                  const otherErrors = prev.filter(err => err.id !== row.id);
                  return [...otherErrors, ...nextFieldErrors];
                });
              }}
            />
          );
        },
      };
    });

    // Step 3: newly adding editable colums
    if (selectedAddMonthYear) {
      const {month, year} = selectedAddMonthYear;

      // prevent duplicate if already exists
      const alreadyExists = monthColumns.some(col => col.name === `${month}-${year}`);

      if (!alreadyExists) {
        newColumnData = {
          name: `${month}-${year}`,
          align: 'left',
          title: (
            <p className="text-text-primary! text-caption font-InterLight">
              {CALENDAR_MONTH_NAMES[month - 1]} {year}
            </p>
          ),
          width: {minWidth: '120px', maxWidth: '140px'},
          render: row => {
            const isActive = activeColumn?.month === month && activeColumn?.year === year;

            const found = row.columns.find(c => c.month === month && c.year === year);

            if (!isActive) {
              return <p>{found?.value ?? '-'}</p>;
            }

            const hasError = fieldErrors[`${row.id}`];

            // disabling Modo benchmark since its values will fetched from API
            const disabled = row.id === AssetMetrics.ModoBenchmark && !modoBenchmarkError;
            return (
              <input
                className={cn(
                  'max-w-30 border px-3 py-1 rounded text-caption',
                  hasError ? 'border-error' : 'border-border',
                  disabled && 'bg-bg-card!',
                )}
                placeholder="-"
                disabled={disabled}
                value={columnData[row.id] ?? found?.value ?? ''}
                onChange={e => {
                  const value = e.target.value;

                  setColumnData(prev => ({
                    ...prev,
                    [row.id]: value,
                  }));
                  setErrors(prev => {
                    const hasFieldError = prev.some(err => err.id === row.id);
                    if (!hasFieldError) return prev;

                    const nextFieldErrors = validateMonthlyValues({[row.id]: value}, monthlyMetricValue.metric);
                    const otherErrors = prev.filter(err => err.id !== row.id);
                    return [...otherErrors, ...nextFieldErrors];
                  });
                }}
                onBlur={e => {
                  handleBlurValidation(row.id, e.target.value);
                }}
              />
            );
          },
        };
      }
    }

    // Final return (metric + months)
    const newColums = newColumnData ? [newColumnData] : [];
    return [metricColumn, ...newColums, ...monthColumns];
  }

  // =========================
  // side effects
  // =========================
  useEffect(() => {
    handleFilter(filterValue);
  }, []);

  useEffect(() => {
    if (success) {
      // refetch on added successfully
      if (['S-10044'].includes(success)) {
        resetEditAddData();
        // refetch values
        handleFilter(filterValue);
      }
    }
  }, [success]);

  return (
    <React.Fragment>
      <div className="flex my-5 gap-4 items-center">
        <SectionHeader
          title="Monthly Configured Values"
          subtitle="Add monthly columns and enter hardcoded metric values"
          icon="calendar"
        />
        <MonthFilter
          disabled={fetchLoading || isDataBeingEdited}
          className="ml-auto"
          value={filterValue}
          onChange={val => {
            setFilterValue(val);
            handleFilter(val);
          }}
        />
        <Button
          disabled={fetchLoading}
          text="Add months"
          leftIcon="calendar-plus"
          size="sm"
          className="px-4 py-1! h-8!"
          onClick={() => setIsAddMonthPickerOpen(true)}
        />
      </div>

      {isAddMonthPickerOpen && (
        <AddMonthlyColumnModal
          open={isAddMonthPickerOpen}
          value={selectedAddMonthYear}
          onClose={() => setIsAddMonthPickerOpen(false)}
          onChange={handleAddMonthColum}
          disabledMonths={existingMonthYears}
        />
      )}

      <AnalyticsTable
        loading={fetchLoading}
        className="-mt-4 shadow-lg shadow-border/40 rounded-md"
        tableClassName="table-auto"
        headerColor="var(--color-primary-tint-2)"
        data={groupedMonthlyData}
        columns={monthlyValuesDataColums}
      />
      {isDataBeingEdited && (
        <div className="flex gap-4 justify-center">
          <Button onClick={cancelEdit} text="Cancel" variant="secondary" className="px-8!" />
          <Button
            text="Save Values"
            className="px-10!"
            onClick={handleSave}
            loading={updateLoading}
            disabled={hasErrors || !hasChanges}
          />
        </div>
      )}
    </React.Fragment>
  );
}

interface AddMonthlyColumnModalProps {
  open: boolean;
  value?: {month: number; year: number};
  onClose: () => void;
  onChange: (value: {month: number; year: number}) => void;
  disabledMonths?: {month: number; year: number}[];
}

function AddMonthlyColumnModal(props: AddMonthlyColumnModalProps) {
  const {open, value, onClose, onChange, disabledMonths} = props;

  const handleChange = (nextValue: {month: number; year: number}) => {
    onChange(nextValue);
    onClose();
  };

  return (
    <Modal open={open} maxWidth={300} onClose={onClose} className="min-w-fit! p-0! flex flex-col rounded-sm">
      <Text variant="h4" className="px-4 pt-4 pb-2">
        Add Monthly Column
      </Text>
      <div className="w-full px-4">
        <Divider className="px-4 bg-border" />
      </div>

      <div className="flex justify-center">
        <MonthYearSelector
          value={value}
          onChange={handleChange}
          onClose={onClose}
          cancelText="Clear"
          doneText="Add Column"
          className="shadow-none"
          disabledMonths={disabledMonths}
        />
      </div>
    </Modal>
  );
}

type MonthFilterProps = {
  value?: MonthYear[];
  onChange: (val: MonthYear[]) => void;
  className?: string;
  disabled?: boolean;
};

function MonthFilter({value = [], onChange, className, disabled}: MonthFilterProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useClickOutside<HTMLDivElement>(() => {
    setOpen(false);
  });
  const hasFilter = value.length > 0;

  const handleClear = () => {
    onChange([]);
  };
  const handleClose = (action: string) => {
    setOpen(false);
    if (action === 'forceClose') {
      onChange([]);
    }
  };
  return (
    <div className={cn('relative flex items-center gap-2', className)} ref={wrapperRef}>
      {/* Button */}
      <button
        disabled={disabled}
        className="flex gap-4  disabled:opacity-65 disabled:cursor-not-allowed items-center h-8 border-border border px-4 rounded-sm"
        onClick={() => setOpen(prev => !prev)}>
        <Text variant="14R">Filter</Text>
        <Icon name="list-filter" className="text-text-secondary/50" />
      </button>

      {/* Clear filters button */}
      {hasFilter && (
        <button
          disabled={disabled}
          onClick={handleClear}
          className="border-primary disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer hover:border-primary-hover active:border-primary-active border h-8 rounded-sm px-4 py-1 flex items-center gap-2">
          <Icon name="cross" className="text-text-secondary size-3" />
          <Text variant="caption" className="text-text-secondary!">
            Clear filters
          </Text>
        </button>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <div className={cn('absolute right-0 top-full mt-2 z-50 bg-white rounded-md shadow-lg border border-border')}>
          <MultiMonthYearSelector
            value={value}
            onChange={val => {
              onChange(val);
              setOpen(false);
            }}
            onClose={handleClose as any}
            cancelText="Clear"
            doneText="Apply"
            className="shadow-none"
          />
        </div>
      )}
    </div>
  );
}
