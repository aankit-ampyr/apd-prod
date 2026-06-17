import React, {useEffect, useRef, useState} from 'react';
import {AnalyticsTable, SectionHeader} from '../common';
import {Button, Text} from '@/ui-kits';
import {BenchmarkMetric, DataTableColumn} from '@/interface';
import {useDispatch, useSelector} from 'react-redux';
import {benchmarkLoading, benchmarkMetrics, benchmarkUpdateLoading, settingsSuccess} from '@/services/redux/selectors';
import {getBenchmarkMetricsRequest, updateBenchmarkMetricsRequest} from '@/services/redux/slice/settingsSlice';
import {cn, ErrorCodes, getErrorMessage, SuccessCodes} from '@/utils';
import {useToast} from '@/hooks';
import {AssetMetrics} from '@/constants';

type FieldErrorMap = Record<string, boolean>;

type ValidationError = {
  id: number;
  field: string;
  code: ErrorCodes;
};

type EditableBenchmarkField = keyof Pick<BenchmarkMetric, 'industry_low' | 'industry_mid' | 'industry_high'>;

export function Benchmark() {
  // ======================
  // hooks
  // ======================
  const dispatch = useDispatch();
  const {showToast} = useToast();

  // ======================
  // selector
  // ======================
  const benchmarks = useSelector(benchmarkMetrics);
  const isLoading = useSelector(benchmarkLoading);
  const isUpdateLoading = useSelector(benchmarkUpdateLoading);
  const success = useSelector(settingsSuccess) as SuccessCodes;

  // ======================
  // states
  // ======================
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tableData, setTableData] = useState<BenchmarkMetric[]>(benchmarks);
  const [errors, setErrors] = useState<{id: number; field: string}[]>([]);
  const fieldErrors = getFieldErrors(errors);

  // Ref to prevent duplicate API calls
  const benchmarkRequestMade = useRef(false);

  const valueToShow = ((): BenchmarkMetric[] => {
    // build ghost data to show for ghost loader
    if (isLoading) {
      const ghost_data = Array.from({length: 1}).map(
        (_, index): BenchmarkMetric => ({
          id: index,
          metric_name: index.toString(),
          industry_high: null,
          industry_low: null,
          industry_mid: null,
          metric_id: 0,
        }),
      );
      return ghost_data;
    }

    // actual data to be shown
    if (isEditing) return tableData;
    return benchmarks;
  })();

  // ======================
  // table data
  // ======================
  const benchmarkColumns: DataTableColumn<BenchmarkMetric>[] = [
    {
      name: 'metric',
      align: 'left',
      render: row => <Text variant="14M">{row.metric_name}</Text>,
      title: <Text variant="14M">Metric Name</Text>,
      width: {minWidth: '100px', maxWidth: '190px'},
    },
    {
      name: 'industry_low',
      align: 'left',
      render: row => renderRow(row, 'industry_low'),
      title: <Text variant="14M">Industry Low</Text>,
      width: {minWidth: 'auto'},
    },
    {
      name: 'industry_mid',
      align: 'left',
      render: row => renderRow(row, 'industry_mid'),
      title: <Text variant="14R">Industry Mid</Text>,
      width: {minWidth: 'auto'},
    },
    {
      name: 'industry_high',
      align: 'left',
      render: row => renderRow(row, 'industry_high'),
      title: <Text variant="14R">Industry High</Text>,
      width: {minWidth: 'auto'},
    },
    // {
    //   name: 'status',
    //   align: 'right',
    //   render: row => {
    //     return (
    //       <div className="flex justify-end mr-16">
    //         {isEditing ? (
    //           <Toggle
    //             className={'mr-9'}
    //             size="sm"
    //             value={row.is_active}
    //             onToggle={val => handleToggleStatus(row.id, val)}
    //           />
    //         ) : (
    //           <StatusBadge className={cn(row.is_active ? 'mr-5' : 'mr-3')} status={row.is_active} />
    //         )}
    //       </div>
    //     );
    //   },
    //   title: (
    //     <Text variant="14R" className="mr-24">
    //       Status
    //     </Text>
    //   ),
    //   width: {minWidth: '100px', maxWidth: '60px'},
    // },
  ];

  // ======================
  // function
  // ======================
  function renderRow(row: BenchmarkMetric, key: keyof BenchmarkMetric) {
    if (!isEditing) {
      return <Text variant="14M">{row[key] ?? '-'}</Text>;
    }

    const hasError = fieldErrors[`${row.id}-${key}`];
    return (
      <input
        className={cn(
          'max-w-30 border px-3 py-1 rounded text-caption input-without-number-spinner',
          hasError ? 'border-error' : 'border-border',
        )}
        value={String(row[key] ?? '')}
        placeholder="-"
        onChange={e => handleValueChange(row.id, key as any, e.target.value)}
      />
    );
  }
  const validateBenchmarks = (data: BenchmarkMetric[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    data.forEach(row => {
      const {id, industry_low, industry_mid, industry_high, metric_id} = row;

      const values = [
        {key: 'industry_low', value: industry_low},
        {key: 'industry_mid', value: industry_mid},
        {key: 'industry_high', value: industry_high},
      ];

      // 🔹 numeric check (convert string to number if valid)
      values.forEach(({key, value}) => {
        if (value !== null) {
          const numValue = typeof value === 'string' ? Number(value) : value;
          if (typeof value !== 'number' && (typeof value !== 'string' || isNaN(numValue))) {
            errors.push({id, field: key, code: 'E-10201'});
          }
        }
      });

      values.forEach(({key, value}) => {
        if (value == null) return;

        // Convert string to number for validation
        const numValue = typeof value === 'string' ? Number(value) : value;
        if (isNaN(numValue)) return;

        // ✅ Round Trip Efficiency
        if (metric_id === AssetMetrics.RoundTripEfficiency) {
          if (numValue < 80 || numValue > 90) {
            errors.push({id, field: key, code: 'E-10203'});
          }
        }

        // ✅ Daily Cycles
        if (metric_id === AssetMetrics.DailyCycles) {
          if (numValue < 0.5 || numValue > 3.0) {
            errors.push({id, field: key, code: 'E-10204'});
          }
        }

        // 🔹 decimal NOT allowed (integer only)
        if (metric_id === AssetMetrics.TotalRevenue || metric_id === AssetMetrics.RevenuePerMwPerYear) {
          if (numValue % 1 !== 0) {
            errors.push({id, field: key, code: 'E-10209'});
          }
        }

        // 🔹 at most 2 decimal places (for metrics that allow decimals)
        if (![AssetMetrics.TotalRevenue, AssetMetrics.RevenuePerMwPerYear].includes(metric_id)) {
          const valueStr = typeof value === 'string' ? value : value.toString();
          const decimalPart = valueStr.split('.')[1];
          if (decimalPart && decimalPart.length > 2) {
            errors.push({id, field: key, code: 'E-10211'});
          }
        }

        // ✅ negative allowed only for below
        if (metric_id !== AssetMetrics.DuosFixedCharges && metric_id !== AssetMetrics.DuosCredit && numValue < 0) {
          errors.push({id, field: key, code: 'E-10202'});
        }
      });

      // 🔹 cross-field
      const lowNum =
        industry_low != null ? (typeof industry_low === 'string' ? Number(industry_low) : industry_low) : null;
      const midNum =
        industry_mid != null ? (typeof industry_mid === 'string' ? Number(industry_mid) : industry_mid) : null;
      const highNum =
        industry_high != null ? (typeof industry_high === 'string' ? Number(industry_high) : industry_high) : null;

      if (lowNum != null && midNum != null && lowNum > midNum) {
        errors.push({id, field: 'industry_mid', code: 'E-10205'});
      }

      if (midNum != null && highNum != null && midNum > highNum) {
        errors.push({id, field: 'industry_high', code: 'E-10206'});
      }

      if (midNum == null && lowNum != null && highNum != null && lowNum > highNum) {
        errors.push({id, field: 'industry_high', code: 'E-10207'});
      }
    });

    return errors;
  };

  function handleEdit() {
    setIsEditing(true);
  }

  function getFieldErrors(errors: {id: number; field: string}[]): FieldErrorMap {
    const map: FieldErrorMap = {};

    errors.forEach(err => {
      map[`${err.id}-${err.field}`] = true;
    });

    return map;
  }

  function handleCancel() {
    setTableData(benchmarks);
    setIsEditing(false);
    setErrors([]);
  }

  function handleSubmit() {
    const validationErrors = validateBenchmarks(tableData);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);

      const latestError = validationErrors[validationErrors.length - 1];
      showToast(getErrorMessage(latestError.code), 'error');

      return;
    }

    setErrors([]);
    const payload = tableData.map(item => ({
      id: item.id,
      industry_low: item.industry_low != null ? Number(item.industry_low) : undefined,
      industry_mid: item.industry_mid != null ? Number(item.industry_mid) : undefined,
      industry_high: item.industry_high != null ? Number(item.industry_high) : undefined,
    }));

    dispatch(updateBenchmarkMetricsRequest(payload));
  }

  function handleValueChange(id: number, key: EditableBenchmarkField, value: string) {
    const normalizedValue = value.trim();

    setTableData(prev => {
      const nextData = prev.map(item => {
        if (item.id !== id) return item;

        // treat whitespace-only values as empty
        if (normalizedValue === '') {
          return {...item, [key]: null};
        }

        // allow typing states
        if (
          normalizedValue === '-' || // "-"
          normalizedValue === '.' || // "."
          normalizedValue === '-.' || // "-."
          normalizedValue.endsWith('.') || // "1."
          (normalizedValue.includes('.') && normalizedValue.endsWith('0')) // "3.0", "3.00", "1.10"
        ) {
          return {...item, [key]: normalizedValue as any};
        }

        const num = Number(normalizedValue);

        if (isNaN(num)) {
          return item;
        }

        return {
          ...item,
          [key]: num,
        };
      });

      setErrors(prevErrors => {
        const hasRowErrors = prevErrors.some(err => err.id === id);
        if (!hasRowErrors) return prevErrors;

        const nextRowErrors = validateBenchmarks(nextData).filter(err => err.id === id);
        const otherErrors = prevErrors.filter(err => err.id !== id);
        return [...otherErrors, ...nextRowErrors];
      });

      return nextData;
    });
  }

  // ======================
  // side effects
  // ======================
  useEffect(() => {
    if (!isEditing) {
      setTableData(benchmarks);
    }
  }, [benchmarks, isEditing]);

  /**
   * when api return success only then revert to edit mode
   */
  useEffect(() => {
    if (success && success === 'S-10043') {
      setIsEditing(false);
    }
  }, [success]);

  useEffect(() => {
    // Prevent duplicate API calls using ref
    if (benchmarkRequestMade.current) return;
    benchmarkRequestMade.current = true;
    
    dispatch(getBenchmarkMetricsRequest());
  }, [dispatch]);

  return (
    <React.Fragment>
      <div className="flex gap-4 items-center justify-between">
        <SectionHeader
          title="Benchmark Industry Configuration Management"
          subtitle="Configure benchmark metrics and industry threshold values."
          icon="document-sync"
        />
        {!isEditing && (
          <Button disabled={isLoading} onClick={handleEdit} text="Edit" leftIcon="box-pencil" className="px-4" />
        )}
      </div>
      <AnalyticsTable
        loading={isLoading}
        tableClassName="table-auto"
        className="shadow-lg shadow-border/40 rounded-md"
        headerColor="var(--color-primary-tint-2)"
        data={valueToShow}
        columns={benchmarkColumns}
      />
      {isEditing && (
        <div className="flex gap-4 justify-center w-full">
          <Button onClick={handleCancel} variant="secondary" text="Cancel" className="px-8" />
          <Button loading={isUpdateLoading} onClick={handleSubmit} text="Save Changes" className="px-6" />
        </div>
      )}
    </React.Fragment>
  );
}