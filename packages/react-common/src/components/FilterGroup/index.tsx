import type {SelectInputItem} from '../../interface';
import React, {ButtonHTMLAttributes, HTMLProps, useMemo, useReducer, useRef} from 'react';
import {
  TextInput,
  SelectInput,
  Icon,
  Text,
  DatePicker,
  SearchableSelectInput,
  DateRangePicker,
  MultiSelectInput,
  SearchableMultiSelectInput,
} from '../../ui-kit';
import {cn} from '../../utils';

/**
 * Filter Types
 *  - search: text input
 *  - select: dropdown
 *  - date: date picker
 */
type FilterType =
  | 'search'
  | 'select'
  | 'date'
  | 'searchable-select'
  | 'multi-select'
  | 'searchable-multi-select'
  | 'date-range';

interface FilterConfig {
  type: FilterType;
  key: string;
  placeholder: string;
  label?: string;
  options?: SelectInputItem[];
  props?: any;
  hideFilter?: boolean; // if true, filter will not be rendered but its value will still be managed and emitted onChange
  wrapperClassName?: string;
}

interface FilterGroupProps {
  config: FilterConfig[];
  onChange?: (values: Record<string, any>) => void;
  onReset?: () => void;
  disabled?: boolean;
  /**
   * Debounce delay for emitting onChange, in milliseconds.
   * Defaults to 500ms to reduce API spam. Set to 0 for instant updates.
   */
  debounceMs?: number;
  filterGroupClassName?: any;
  clearButtonClassName?: any;
  showSelectAll?: boolean;
}

type FilterReducerActionType =
  | {type: 'SET'; key: string; value: any}
  | {type: 'RESET'; initialState: Record<string, any>};

function reducer(state: Record<string, any>, action: FilterReducerActionType) {
  switch (action.type) {
    case 'SET':
      return {
        ...state,
        [action.key]: action.value,
      };

    case 'RESET':
      return action.initialState;

    default:
      return state;
  }
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  config,
  onChange,
  disabled = false,
  debounceMs = 500,
  filterGroupClassName,
  clearButtonClassName,
  showSelectAll = false,
  onReset,
}) => {
  // create initial state from config
  const initialState = config.reduce(
    (acc, item) => {
      acc[item.key] = item.type === 'search' ? '' : null;
      return acc;
    },
    {} as Record<string, any>,
  );

  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFilter = useMemo(() => {
    for (const key in state) {
      if (state[key]) {
        return true;
      }
    }
    return false;
  }, [state]);

  const handleChange = (key: string, value: any) => {
    dispatch({type: 'SET', key, value});
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const newState = {...state, [key]: value};
    if (debounceMs <= 0) {
      onChange?.(newState);
      return;
    }
    timerRef.current = setTimeout(() => {
      onChange?.(newState);
    }, debounceMs);
  };

  const handleReset = () => {
    dispatch({type: 'RESET', initialState});
    onChange?.(initialState);
    onReset?.();
  };

  return (
    <div className={cn('flex flex-wrap items-end gap-4 z-99', filterGroupClassName)}>
      {config
        .filter(filter => !filter.hideFilter)
        .map(filter => (
          <FilterItem
            {...filter}
            key={filter.key}
            value={state[filter.key]}
            disabled={disabled}
            onChange={value => handleChange(filter.key, value)}
          />
        ))}

      {hasFilter && <ClearFilterButton onClick={handleReset} disabled={disabled} className={clearButtonClassName} />}
    </div>
  );
};

export function ClearFilterButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const {onClick, className, disabled, ...rest} = props;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'border-primary cursor-pointer hover:border-primary-hover active:border-primary-active border self-stretch rounded-sm px-4 py-1 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}>
      <Icon name="cross" className="text-text-secondary size-3" />
      <Text variant="caption" className="text-text-secondary! hidden xl:block">
        Clear filters
      </Text>
    </button>
  );
}

interface FilterItemProps extends FilterConfig {
  value: any;
  disabled?: boolean;
  onChange: (value: any) => void;
  showSelectAll?: boolean;
}

const FilterItem: React.FC<FilterItemProps> = props => {
  const {
    type,
    placeholder,
    value,
    onChange,
    options,
    label,
    disabled = false,
    props: filterProps,
    showSelectAll = false,
    wrapperClassName,
  } = props;

  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      {type === 'search' && (
        <TextInput
          isFilter
          label={label}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          leftIcon="search"
          disabled={disabled}
          {...filterProps}
        />
      )}

      {type === 'select' && (
        <SelectInput
          value={value}
          isFilter
          label={label}
          onChange={item => onChange(item.id)}
          placeholder={placeholder}
          options={options ?? []}
          disabled={disabled}
          {...filterProps}
        />
      )}

      {type === 'date' && (
        <DatePicker
          isFilter
          label={label}
          placeholder={placeholder}
          value={value}
          onDateChange={onChange}
          disabled={disabled}
          {...filterProps}
        />
      )}

      {type === 'searchable-select' && (
        <SearchableSelectInput
          isFilter
          value={value}
          options={options ?? []}
          onChange={(item: any) => onChange(item?.id)}
          placeholder={placeholder}
          label={label}
          disabled={disabled}
          {...filterProps}
        />
      )}

      {type === 'multi-select' && (
        <MultiSelectInput
          isFilter
          values={value}
          options={options ?? []}
          onChange={(items: any) => onChange(items.map((item: any) => item.id))}
          placeholder={placeholder}
          label={label}
          disabled={disabled}
          {...filterProps}
        />
      )}

      {type === 'searchable-multi-select' && (
        <SearchableMultiSelectInput
          isFilter
          values={value}
          options={options ?? []}
          onChange={(items: any) => onChange(items.map((item: any) => item.id))}
          placeholder={placeholder}
          label={label}
          disabled={disabled}
          showSelectAll={showSelectAll}
          {...filterProps}
        />
      )}
      {type === 'date-range' && (
        <DateRangePicker
          isFilter
          values={value || {start: null, end: null}}
          onDateChange={onChange}
          placeholder={placeholder}
          label={label}
          disabled={disabled}
          {...filterProps}
        />
      )}
    </div>
  );
};
