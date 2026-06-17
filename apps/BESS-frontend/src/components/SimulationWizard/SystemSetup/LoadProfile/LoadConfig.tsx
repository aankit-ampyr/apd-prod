import {LoadProfilePattern, Months} from '@/constants';
import {RootState} from '@/services/redux/rootReducer';
import {initiateSimulationData, projectSimulationData} from '@/services/redux/selectors/simulationWizardSelector';
import {getLoadProfileRequest, loadProfileRequest, clearLoadProfileData, resetLoadProfileMessage} from '@/services/redux/slice/simulationWizardSlice';
import {HourlySelectInput, Icon, SelectInput, Text, TextInput} from '@/ui-kits';
import {enumToSelectOptions, LoadProfileSchema} from '@/utils';
import {useFormik} from 'formik';
import {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useChangeConfigurationConfirmation} from '../../ChangeConfigurationContext';

type Props = {
  readonly onChangeConfig: (data: {pattern: number; config: any}) => void;
  readonly onFormStateChange?: (state: {isValid: boolean; isFormDirty: boolean}) => void;
  readonly readOnly?: boolean;
};

type FormValues = {
  pattern: number | null;
  load_mw: string;

  start_time: string;
  end_time: string;

  start_month: number | null;
  end_month: number | null;

  windows: {
    start_time: string;
    end_time: string;
    load_mw: string;
  }[];
};

/** Map legacy/invalid hour 24 to 23 so saved configs still match the dropdown (00–23 only). */
const normalizeHourField = (raw: string | number | null | undefined): string => {
  if (raw === '' || raw === null || raw === undefined) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  if (n === 24) return '23';
  if (n < 0 || n > 23) return '';
  return String(n);
};

const formatLoadMwInitial = (val: any): string => {
  if (val === '' || val === null || val === undefined) return '';
  const n = Number(val);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2);
};

const formInitialValues: FormValues = {
  pattern: LoadProfilePattern['Constant(24/7)'], // Default to Constant 24/7
  load_mw: '25.00',

  start_time: '',
  end_time: '',

  start_month: null,
  end_month: null,

  windows: [
    {start_time: '', end_time: '', load_mw: '25.00'},
    {start_time: '', end_time: '', load_mw: '25.00'},
  ],
};

/**
 * Helper to categorize pattern types for smarter field preservation
 */
const getPatternType = (pattern: number): 'constant' | 'hourly' | 'seasonal' | 'custom' => {
  switch (pattern) {
    case LoadProfilePattern['Constant(24/7)']:
      return 'constant';
    case LoadProfilePattern['Day Only']:
    case LoadProfilePattern['Night Only']:
      return 'hourly';
    case LoadProfilePattern['Seasonal Pattern']:
      return 'seasonal';
    case LoadProfilePattern['Custom Window']:
      return 'custom';
    default:
      return 'constant';
  }
};

export const LoadConfig = ({onChangeConfig, onFormStateChange, readOnly = false}: Props) => {
  const dispatch = useDispatch();
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();

  // Get saved data from Redux - if it exists, use it for initial form values
  const savedData = useSelector((state: RootState) => state.simulationWizard.loadProfileData);
  const loadProfileLoading = useSelector((state: RootState) => state.simulationWizard.loadProfileLoading);
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  // Initialize form with saved data if available, otherwise use defaults
  const getInitialFormValues = (): FormValues => {
    if (savedData?.pattern && savedData?.config) {
      const {pattern, config} = savedData;
      return {
        pattern: pattern.id,
        load_mw: config.load_mw !== undefined ? formatLoadMwInitial(config.load_mw) : '25.00',
        start_time: normalizeHourField(config.start_time),
        end_time: normalizeHourField(config.end_time),
        start_month: config.start_month || null,
        end_month: config.end_month || null,
        windows: config.windows?.map((w: any) => ({
          start_time: normalizeHourField(w.start_time),
          end_time: normalizeHourField(w.end_time),
          load_mw: formatLoadMwInitial(w.load_mw),
        })) || [
          {start_time: '', end_time: '', load_mw: '25.00'},
          {start_time: '', end_time: '', load_mw: '25.00'},
        ],
      };
    }
    return formInitialValues;
  };

  const [initialValues, setInitialValues] = useState<FormValues>(getInitialFormValues);
  const [prevPattern, setPrevPattern] = useState<number | null>(null);
  const {
    dirty,
    isValid,
    values,
    errors,
    initialValues: initialState,
    setFieldTouched,
    touched,
    setFieldValue,
    resetForm,
    handleSubmit,
    handleBlur,
    handleChange,
  } = useFormik<FormValues>({
    initialValues: initialValues,
    validationSchema: LoadProfileSchema,
    enableReinitialize: true,
    onSubmit: () => {},
  });

  const LOAD_PROFILE_LABELS: Record<string, string> = {
    '5': 'Custom Windows',
  };
  const LOAD_PROFILE_OPTIONS = enumToSelectOptions(LoadProfilePattern, LOAD_PROFILE_LABELS);
  const MONTHS = enumToSelectOptions(Months);
  const simulation_id = simulData?.id ?? proSimulData?.id;

  const [isInitialized, setIsInitialized] = useState(false);
  const prevSimulationIdRef = useRef<number | undefined>(undefined);
  // Track if we just loaded saved data to prevent pattern change effect from clearing values
  const justLoadedSavedDataRef = useRef(false);
  // Track if initial GET was dispatched - prevents new project effect from running before GET completes
  const hasDispatchedGetRef = useRef(false);
  // Track if loading has ever been true (means GET actually started, not just dispatched)
  const wasLoadingRef = useRef(false);

  // Debounce ref for API calls
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce ref for auto-formatting load_mw values
  const formatDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Note: We don't clear the saved flag (tick mark) when editing
  // The tick mark indicates the data was previously saved to server
  // It remains visible even when user makes edits

  const guardedSetFieldValue = async (field: string, value: any, shouldValidate?: boolean) => {
    const previousValues = values;
    const previousPattern = prevPattern;

    await setFieldValue(field, value, shouldValidate);
    requestChangeConfigurationConfirmation({
      onStay: () => {
        resetForm({values: previousValues});
        setPrevPattern(previousPattern);
      },
    });
  };

  // Fetch saved data on mount or when project changes
  useEffect(() => {
    if (simulation_id) {
      const isDifferentProject = prevSimulationIdRef.current !== undefined && prevSimulationIdRef.current !== simulation_id;
      const isFirstMount = prevSimulationIdRef.current === undefined;

      if (isDifferentProject) {
        // Switching to a different project - clear old data and fetch new
        dispatch(clearLoadProfileData());
        dispatch(resetLoadProfileMessage());
        setIsInitialized(false);
        setPrevPattern(null);
        justLoadedSavedDataRef.current = false;
        hasDispatchedGetRef.current = true; // Mark that we're dispatching GET
        wasLoadingRef.current = false; // Reset so we wait for loading to complete

        prevSimulationIdRef.current = simulation_id;

        dispatch(
          getLoadProfileRequest({
            simulation_id,
          }),
        );
      } else if (isFirstMount) {
        // First mount (tab switch, page refresh, login) - always fetch fresh data from server
        // Clear any cached data first (might be from preview API with unsaved edits)
        dispatch(clearLoadProfileData());
        dispatch(resetLoadProfileMessage());

        prevSimulationIdRef.current = simulation_id;
        setIsInitialized(false);
        setPrevPattern(null);
        justLoadedSavedDataRef.current = false;
        hasDispatchedGetRef.current = true; // Mark that we're dispatching GET
        wasLoadingRef.current = false; // Reset so we wait for loading to complete
        dispatch(
          getLoadProfileRequest({
            simulation_id,
          }),
        );
      }
      // If same project and not first mount, do nothing - data is already there
    }

    // Cleanup: only clear data when actually switching to a different project
    return () => {
      // Clear debounce on unmount
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [simulation_id, dispatch, savedData]);

  // Update wasLoadingRef when loading state changes
  if (loadProfileLoading) {
    wasLoadingRef.current = true;
  }

  // For new projects: trigger default preview immediately when no saved data
  useEffect(() => {
    if (!simulation_id) return;

    // Don't run while API is still loading
    if (loadProfileLoading) return;

    // If GET was dispatched but loading hasn't started yet (same render cycle), wait
    // We need to see loadProfileLoading transition from true to false
    if (hasDispatchedGetRef.current && !wasLoadingRef.current) return;

    // Only run for NEW project or existing project without saved data
    if (!savedData) {
      // Set form to defaults and mark as initialized
      setInitialValues(formInitialValues);
      setIsInitialized(true);

      // Trigger preview API immediately - shows graph for new project
      dispatch(
        loadProfileRequest({
          simulation_id,
          payload: {
            pattern: LoadProfilePattern['Constant(24/7)'],
            config: {
              load_mw: 25,
            },
          },
        }),
      );
    }
  }, [simulation_id, savedData, loadProfileLoading, dispatch]);

  useEffect(() => {
    if (onFormStateChange) {
      onFormStateChange({
        isValid: isValid,
        isFormDirty: dirty,
      });
    }
  }, [isValid, dirty, onFormStateChange]);

  // Auto-format load_mw to 2 decimal places after user stops typing (800ms), and trigger API call after formatting
  useEffect(() => {
    if (formatDebounceRef.current) {
      clearTimeout(formatDebounceRef.current);
    }

    const formatLoadMw = (value: string): string => {
      if (!value || value === '') return '';
      const num = Number(value);
      if (isNaN(num)) return value;
      return num.toFixed(2);
    };

    formatDebounceRef.current = setTimeout(() => {
      let formattedChanged = false;
      // Format main load_mw field (for non-custom patterns)
      if (values.pattern !== LoadProfilePattern['Custom Window']) {
        if (values.load_mw && values.load_mw !== '' && !values.load_mw.includes('.00')) {
          const formatted = formatLoadMw(values.load_mw);
          if (formatted && formatted !== values.load_mw) {
            setFieldValue('load_mw', formatted);
            formattedChanged = true;
          }
        }
      } else {
        // Format custom window load_mw fields
        values.windows.forEach((window, idx) => {
          if (window.load_mw && window.load_mw !== '' && !window.load_mw.endsWith('.00')) {
            const formatted = formatLoadMw(window.load_mw);
            if (formatted && formatted !== window.load_mw) {
              setFieldValue(`windows[${idx}].load_mw`, formatted);
              formattedChanged = true;
            }
          }
        });
      }

      // Only trigger API call if formatting did not change (to avoid double call)
      if (!formattedChanged) {
        // --- API call logic (moved from preview effect) ---
        if (!isInitialized) return;
        if (!simulation_id || !values.pattern) return;

        const toNumber = (val: string) => (val === '' || val === null ? undefined : Number(val));

        let config: any = {};
        let isPreviewReady = false;

        // Clean config helper - removes undefined/null values
        const getCleanConfig = (raw: Record<string, any>) => {
          const clean: Record<string, any> = {};
          Object.keys(raw).forEach(key => {
            if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') {
              clean[key] = raw[key];
            }
          });
          return clean;
        };

        switch (values.pattern) {
          case LoadProfilePattern['Constant(24/7)']:
            if (values.load_mw) {
              config = {
                load_mw: toNumber(values.load_mw),
              };
              isPreviewReady = true;
            }
            break;

          case LoadProfilePattern['Day Only']:
          case LoadProfilePattern['Night Only']:
            if (values.load_mw && values.start_time !== '' && values.end_time !== '') {
              config = {
                load_mw: toNumber(values.load_mw),
                start_time: toNumber(values.start_time),
                end_time: toNumber(values.end_time),
              };
              if (config.start_time !== config.end_time) {
                isPreviewReady = true;
              }
            }
            break;

          case LoadProfilePattern['Seasonal Pattern']:
            if (values.load_mw && values.start_time !== '' && values.end_time !== '' && values.start_month !== null && values.end_month !== null) {
              config = {
                load_mw: toNumber(values.load_mw),
                start_time: toNumber(values.start_time),
                end_time: toNumber(values.end_time),
                start_month: values.start_month,
                end_month: values.end_month,
              };
              if (config.start_time !== config.end_time) {
                isPreviewReady = true;
              }
            }
            break;

          case LoadProfilePattern['Custom Window']: {
            const validWindows = values.windows.filter(w => w.start_time !== '' && w.end_time !== '' && w.load_mw !== '');
            if (validWindows.length > 0) {
              config = {
                windows: validWindows.map(w => ({
                  start_time: toNumber(w.start_time),
                  end_time: toNumber(w.end_time),
                  load_mw: toNumber(w.load_mw),
                })),
              };
              isPreviewReady = true;
            }
            break;
          }

          default:
            return;
        }

        const cleanConfig = getCleanConfig(config);

        // Always notify parent of current state for saving logic
        onChangeConfig({
          pattern: values.pattern,
          config: cleanConfig,
        });

        // Skip API call if we just loaded saved data
        if (justLoadedSavedDataRef.current) {
          justLoadedSavedDataRef.current = false;
          return;
        }

        if (!isPreviewReady) return;

        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          dispatch(
            loadProfileRequest({
              simulation_id,
              payload: {
                pattern: values.pattern!,
                config: cleanConfig,
              },
            }),
          );
        }, 250);
      }
    }, 800);

    return () => {
      if (formatDebounceRef.current) {
        clearTimeout(formatDebounceRef.current);
      }
    };
  }, [
    values.load_mw,
    values?.start_time,
    values?.end_time,
    values?.start_month,
    values?.end_month,
    values.windows,
    values.pattern,
    setFieldValue,
    isInitialized,
    simulation_id,
    dispatch,
    onChangeConfig,
  ]);

  // Handle saved data from API - override defaults with saved values for existing projects
  useEffect(() => {
    // No saved data yet
    if (!savedData) return;

    // Prevent re-running unnecessarily (already processed this data)
    if (justLoadedSavedDataRef.current) return;

    // If GET was dispatched but loading hasn't started/completed yet, wait for fresh server data
    // This prevents processing stale preview data that was in Redux before the GET
    if (hasDispatchedGetRef.current && !wasLoadingRef.current) return;
    if (loadProfileLoading) return;

    // Saved data exists and we've confirmed it's fresh from server - use it
    const {pattern, config} = savedData;

    // Mark that we're loading saved data - prevents pattern change effect from clearing values
    justLoadedSavedDataRef.current = true;

    setInitialValues({
      pattern: pattern.id,

      load_mw: config.load_mw !== undefined ? formatLoadMwInitial(config.load_mw) : '25.00',

      start_time: normalizeHourField(config.start_time),
      end_time: normalizeHourField(config.end_time),

      start_month: config.start_month || null,
      end_month: config.end_month || null,

      windows: config.windows?.map((w: any) => ({
        start_time: normalizeHourField(w.start_time),
        end_time: normalizeHourField(w.end_time),
        load_mw: formatLoadMwInitial(w.load_mw),
      })) || [
        {start_time: '', end_time: '', load_mw: '25.00'},
        {start_time: '', end_time: '', load_mw: '25.00'},
      ],
    });
    setIsInitialized(true);
  }, [savedData, loadProfileLoading]);

  useEffect(() => {
    if (!values.pattern) return;

    // skip first initialization (API load or saved data load)
    if (prevPattern === null) {
      setPrevPattern(values.pattern);
      return;
    }

    // Skip if we just loaded saved data - the pattern change is from loading, not user action
    // Don't reset the flag here - let the preview effect handle it
    if (justLoadedSavedDataRef.current) {
      setPrevPattern(values.pattern);
      return;
    }

    // only reset when user actually changes pattern (not during data load)
    if (prevPattern !== values.pattern) {
      // NOTE: Do NOT call dispatch(clearLoadProfileData()) here!
      // Clearing load profile data causes the form to reset to defaults when savedData becomes null.
      // We only want to reset fields that aren't needed for the new pattern, not refresh everything.
      // The preview API will update the graph when user fills in new values.

      // Determine which field resets are needed based on pattern type
      const prevPatternType = getPatternType(prevPattern);
      const newPatternType = getPatternType(values.pattern);

      // Reset fields based on what the new pattern needs
      if (newPatternType === 'constant') {
        // 24/7 only needs load_mw, keep existing value
        setFieldValue('start_time', '');
        setFieldValue('end_time', '');
        setFieldValue('start_month', null);
        setFieldValue('end_month', null);
        setFieldValue('windows', [
          {start_time: '', end_time: '', load_mw: '25.00'},
          {start_time: '', end_time: '', load_mw: '25.00'},
        ]);
      } else if (newPatternType === 'hourly') {
        // Day/Night patterns - keep start/end times if coming from similar pattern
        if (prevPatternType !== 'hourly' && prevPatternType !== 'seasonal') {
          setFieldValue('start_time', '');
          setFieldValue('end_time', '');
        }
        setFieldValue('start_month', null);
        setFieldValue('end_month', null);
        setFieldValue('windows', [
          {start_time: '', end_time: '', load_mw: '25.00'},
          {start_time: '', end_time: '', load_mw: '25.00'},
        ]);
      } else if (newPatternType === 'seasonal') {
        // Seasonal needs hours + months - keep hours if coming from hourly pattern
        if (prevPatternType !== 'hourly' && prevPatternType !== 'seasonal') {
          setFieldValue('start_time', '');
          setFieldValue('end_time', '');
        }
        if (prevPatternType !== 'seasonal') {
          setFieldValue('start_month', null);
          setFieldValue('end_month', null);
        }
        setFieldValue('windows', [
          {start_time: '', end_time: '', load_mw: '25.00'},
          {start_time: '', end_time: '', load_mw: '25.00'},
        ]);
      } else if (newPatternType === 'custom') {
        // Custom windows - reset everything
        setFieldValue('start_time', '');
        setFieldValue('end_time', '');
        setFieldValue('start_month', null);
        setFieldValue('end_month', null);
        setFieldValue('windows', [
          {start_time: '', end_time: '', load_mw: '25.00'},
          {start_time: '', end_time: '', load_mw: '25.00'},
        ]);
      }
    }

    setPrevPattern(values.pattern);
  }, [values.pattern]);

  // --- Removed separate preview API effect; now handled in formatting effect above ---

  const HoursFields = (index?: number, isStartHourRequired: boolean = true, isEndHourRequired: boolean = true) => {
    const isCustom = values.pattern === LoadProfilePattern['Custom Window'];

    // Get error and touched status for end_time validation
    const endTimeError = isCustom ? (errors.windows as any)?.[index!]?.end_time : errors.end_time;
    const endTimeTouched = isCustom ? (touched.windows as any)?.[index!]?.end_time : touched.end_time;

    // Helper to safely convert string hour value to number for HourlySelectInput
    // Handles edge case where hour is "0" (which should display as 0, not null)
    const getHourValue = (hourStr: string | undefined): number | null => {
      if (hourStr === '' || hourStr === undefined || hourStr === null) return null;
      const num = Number(hourStr);
      return Number.isFinite(num) ? num : null;
    };

    // Get start time and end time values
    const startTimeValue = isCustom ? getHourValue(values.windows[index!]?.start_time) : getHourValue(values.start_time);

    const endTimeValue = isCustom ? getHourValue(values.windows[index!]?.end_time) : getHourValue(values.end_time);

    return (
      <div className="flex gap-4 w-full">
        <HourlySelectInput
          label="Start Hour"
          placeholder="Start Hour"
          required={isStartHourRequired}
          value={startTimeValue}
          onChange={async hour => {
            if (isCustom) {
              await guardedSetFieldValue(`windows[${index}].start_time`, String(hour), true);
              // Re-validate end_time when start_time changes (for same-hour check)
              setFieldTouched(`windows[${index}].end_time`, true, true);
            } else {
              await guardedSetFieldValue('start_time', String(hour), true);
              // Re-validate end_time when start_time changes (for same-hour check)
              setFieldTouched('end_time', true, true);
            }
          }}
          className="w-[50%]"
          disabled={readOnly}
        />

        <HourlySelectInput
          label="End Hour"
          placeholder="End Hour"
          required={isEndHourRequired}
          value={endTimeValue}
          onChange={async hour => {
            if (isCustom) {
              // Set value and validate - this clears the error if value is valid
              await guardedSetFieldValue(`windows[${index}].end_time`, String(hour), true);
              // Touch the field to show validation errors
              setFieldTouched(`windows[${index}].end_time`, true, true);
            } else {
              // Set value and validate - this clears the error if value is valid
              await guardedSetFieldValue('end_time', String(hour), true);
              // Touch the field to show validation errors
              setFieldTouched('end_time', true, true);
            }
          }}
          error={endTimeError}
          touched={endTimeTouched}
          className="w-[50%]"
          disabled={readOnly}
        />
      </div>
    );
  };

  const LoadField = (label?: string, index?: number) => {
    const isCustom = values.pattern === LoadProfilePattern['Custom Window'];
    const sanitizeLoadMw = (raw: string) => {
      const cleaned = raw.replace(/[^0-9.]/g, '');
      const [intPart = '', ...fractionParts] = cleaned.split('.');
      const fraction = fractionParts.join('').slice(0, 2);
      return fractionParts.length ? `${intPart}.${fraction}` : intPart;
    };
    const isConstant = values.pattern === LoadProfilePattern['Constant(24/7)'];
    const step = isCustom || isConstant ? 5 : 1;

    // Format load_mw to always have 2 decimal places
    const formatLoadMw = (value: string) => {
      if (!value || value === '') return '';
      const num = Number(value);
      if (isNaN(num)) return value;
      return num.toFixed(2);
    };

    // Get error and touched status based on whether it's custom windows or regular field
    const fieldError = isCustom ? (errors.windows as any)?.[index!]?.load_mw : errors.load_mw;
    const fieldTouched = isCustom ? (touched.windows as any)?.[index!]?.load_mw : touched.load_mw;

    return (
      <TextInput
        value={isCustom ? (isNaN(Number(values.windows[index!]?.load_mw)) ? '' : values.windows[index!]?.load_mw) : (values.load_mw ?? '')}
        onChange={val => {
          const sanitized = sanitizeLoadMw(val.toString());
          const numValue = Number(sanitized);
          // Block typing above 1000000
          if (!isNaN(numValue) && numValue > 1000000) {
            return;
          }
          if (isCustom) {
            guardedSetFieldValue(`windows[${index}].load_mw`, sanitized, true);
            setFieldTouched(`windows[${index}].load_mw`, true, true);
          } else {
            guardedSetFieldValue('load_mw', sanitized, true);
            setFieldTouched('load_mw', true, true);
          }
        }}
        onBlur={() => {
          // Format to 2 decimal places on blur
          if (isCustom) {
            const currentValue = values.windows[index!]?.load_mw;
            const formatted = formatLoadMw(currentValue);
          if (formatted) guardedSetFieldValue(`windows[${index}].load_mw`, formatted);
            setFieldTouched(`windows[${index}].load_mw`, true);
          } else {
            const formatted = formatLoadMw(values.load_mw);
          if (formatted) guardedSetFieldValue('load_mw', formatted);
            setFieldTouched('load_mw', true);
          }
        }}
        label={label}
        allowFloat
        showStepper
        className="w-full!"
        min={1}
        max={1000000}
        error={fieldError}
        touched={fieldTouched}
        onIncrement={() => {
          const current = Number(isCustom ? values.windows[index!].load_mw : values.load_mw || 0);
          let newValue = current + step;
          const finalValue = Number.parseFloat(newValue.toFixed(2));
          if (isCustom) {
            guardedSetFieldValue(`windows[${index}].load_mw`, finalValue.toFixed(2));
          } else {
            guardedSetFieldValue('load_mw', finalValue.toFixed(2));
          }
        }}
        onDecrement={() => {
          const current = Number(isCustom ? values.windows[index!].load_mw : values.load_mw || 0);
          let newValue = current - step;
          const minValue = isConstant ? 5 : 1;
          if (newValue < minValue) newValue = minValue;
          const finalValue = Number.parseFloat(newValue.toFixed(2));
          if (isCustom) {
            guardedSetFieldValue(`windows[${index}].load_mw`, finalValue.toFixed(2));
          } else {
            guardedSetFieldValue('load_mw', finalValue.toFixed(2));
          }
        }}
        disabled={readOnly || !values.pattern}
        decrementDisabled={readOnly || Number(isCustom ? values.windows[index!]?.load_mw : values.load_mw) <= (isConstant ? 5 : 1)}
        incrementDisabled={readOnly}
      />
    );
  };

  const calculateSelectedMonthsCount = (startMonth: number, endMonth: number) => {
    if (startMonth <= endMonth) {
      return endMonth - startMonth + 1;
    }
    return 12 - startMonth + 1 + endMonth;
  };

  const calculateSelectedMonthDays = (startMonth: number, endMonth: number, year: number) => {
    let totalDays = 0;
    let currentMonth = startMonth;

    while (true) {
      totalDays += new Date(Date.UTC(year, currentMonth, 0)).getUTCDate();
      if (currentMonth === endMonth) break;
      currentMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    }

    return totalDays;
  };

  const calculateHoursPerDay = (startHour: string, endHour: string) => {
    if (startHour === '' || endHour === '') return 0;

    const start = Number(startHour);
    const end = Number(endHour);

    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;

    return Math.max(end - start, 0);
  };

  const currentYear = new Date().getUTCFullYear();
  const months = values.start_month !== null && values.end_month !== null ? calculateSelectedMonthsCount(values.start_month, values.end_month) : 0;
  const selectedDays = values.start_month !== null && values.end_month !== null ? calculateSelectedMonthDays(values.start_month, values.end_month, currentYear) : 0;
  const hoursPerDay = calculateHoursPerDay(values.start_time, values.end_time);
  const yearlyHours = selectedDays * hoursPerDay;
  return (
    <div className="mt-6">
      <Text variant="largeBody" className="font-InterSemiBold!">
        Load Configuration
      </Text>
      <div className="border-primary mt-5 border-[1.4px] rounded-sm p-4 bg-white flex flex-col gap-4">
        {values.pattern !== LoadProfilePattern['Custom Window'] && LoadField('Select Load (MW)')}
        <SelectInput
          label="Choose Load Pattern"
          placeholder="Select Load Pattern"
          required
          options={LOAD_PROFILE_OPTIONS}
          value={values.pattern}
          onChange={item => guardedSetFieldValue('pattern', item.id)}
          onBlur={handleBlur('pattern')}
          touched={touched.pattern}
          error={errors.pattern}
          labelClassName="text-text-primary! font-InterSemiBold!"
          disabled={readOnly}
        />
        {values.pattern === LoadProfilePattern['Custom Window'] && (
          <div className="bg-primary-tint-2 border-[1.4px] border-teal p-2 rounded-sm flex items-center gap-2">
            <Icon name="infoCircle" className="text-teal!" />
            <Text variant="caption" className="text-teal! font-InterMedium!">
              Define custom time windows below{' '}
            </Text>
          </div>
        )}
        {[LoadProfilePattern['Day Only'], LoadProfilePattern['Night Only']].includes(Number(values.pattern)) && HoursFields(0)}
        {values.pattern === LoadProfilePattern['Seasonal Pattern'] && (
          <>
            <div className="flex gap-4 w-full">
              <SelectInput
                label="Start Month"
                placeholder="Start Month"
                required
                options={MONTHS}
                value={values.start_month}
                onChange={item => guardedSetFieldValue('start_month', item.id)}
                onBlur={handleBlur('start_month')}
                touched={touched.start_month}
                error={errors.start_month}
                labelClassName="text-text-primary! font-InterSemiBold!"
                className="w-[50%]"
                disabled={readOnly}
              />

              <SelectInput
                label="End Month"
                placeholder="End Month"
                required
                options={MONTHS}
                value={values.end_month}
                onChange={item => guardedSetFieldValue('end_month', item.id)}
                onBlur={handleBlur('end_month')}
                touched={touched.end_month}
                error={errors.end_month}
                labelClassName="text-text-primary! font-InterSemiBold!"
                className="w-[50%]"
                disabled={readOnly}
              />
            </div>
            {HoursFields(0)}
            <div className="bg-primary-tint-2 border-[1.4px] border-teal p-2 rounded-sm">
              <Text variant="caption" className="text-teal! font-InterMedium!">
                {months} months, {hoursPerDay} hrs/day ({yearlyHours.toLocaleString()} hrs/yr)
              </Text>
            </div>
          </>
        )}
        {values.pattern === LoadProfilePattern['Custom Window'] && (
          <>
            <>
              <Text variant="body1" className="text-teal! font-InterSemiBold!">
                Window 1
              </Text>
              {HoursFields(0)}
              {LoadField('Power (MW)', 0)}
            </>
            <>
              <Text variant="body1" className="text-teal! font-InterSemiBold!">
                Window 2
              </Text>

              {HoursFields(1, false, false)}
              {LoadField('Power (MW)', 1)}
            </>
          </>
        )}
      </div>
    </div>
  );
};
