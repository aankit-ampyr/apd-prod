import {RootState} from '@/services/redux/rootReducer';
import {
  generatorData,
  generatorFuelCurveData,
  generatorSuccess,
  initiateSimulationData,
  projectSimulationData,
} from '@/services/redux/selectors/simulationWizardSelector';
import {authDataSelector, allProjectsData} from '@/services/redux/selectors';
import {generatorDgFuelCurveRequest, generatorDgRequest, getGeneratorDgRequest} from '@/services/redux/slice/simulationWizardSlice';
import {Alert, Button, Checkbox, Icon, Radio, Text, Toggle, Tooltip} from '@/ui-kits';
import {downloadElementAsImage} from '@/utils';
import {Accordion, IOSProgressSlider, NumberStepperInput} from '@lazarus/react-common/components';
import {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useChangeConfigurationConfirmation} from '../../ChangeConfigurationContext';

interface GeneratorProps {
  onNextToDispatchRules?: () => void;
  readOnly?: boolean;
}

export const Generator = ({onNextToDispatchRules, readOnly}: GeneratorProps) => {
  const dispatch = useDispatch();
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();

  const [status, setStatus] = useState(false);
  const [value, setValue] = useState(30);
  const [advancedFuelCurve, setAdvancedFuelCurve] = useState(false);
  const [isBinary, setIsBinary] = useState(true);

  const [flatFuelRate, setFlatFuelRate] = useState('0.25');
  const [fuelPrice, setFuelPrice] = useState('1.50');
  const [noLoadCoeff, setNoLoadCoeff] = useState('0.03');
  const [loadCoeff, setLoadCoeff] = useState('0.22');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;

  // Check if user is an assigned user (view-only access)
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find(project => Number(project?.id) === projectId);
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isAssignedUser = Boolean(
    authData?.id && allProjData?.some(project => Number(project?.id) === projectId && project?.assigned_users?.some(user => user.id === authData.id)),
  );

  const isReadOnly = readOnly || isAssignedUser || isProjectAssignmentPending;
  const dgData = useSelector(generatorData);
  const fuelCurveData = useSelector(generatorFuelCurveData);
  const success = useSelector(generatorSuccess);
  const saveLoading = useSelector((state: RootState) => state.simulationWizard.generatorDgLoading);
  const saveError = useSelector((state: RootState) => state.simulationWizard.generatorDgError);
  const tableRef = useRef<HTMLDivElement>(null);
  const generatorSectionRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);

  const NO_LOAD_COEFF_MIN = 0.01;
  const NO_LOAD_COEFF_MAX = 0.1;
  const NO_LOAD_COEFF_STEP = 0.005;

  const LOAD_COEFF_MIN = 0.15;
  const LOAD_COEFF_MAX = 0.35;
  const LOAD_COEFF_STEP = 0.01;

  const FUEL_PRICE_MIN = 0.5;
  const FUEL_PRICE_MAX = 5.0;
  const FUEL_PRICE_STEP = 0.1;

  const FLAT_FUEL_MIN = 0.15;
  const FLAT_FUEL_MAX = 0.4;
  const FLAT_FUEL_STEP = 0.01;

  const guardLocalChange = (restore: () => void) => {
    requestChangeConfigurationConfirmation({onStay: restore});
  };

  const setGuardedStatus = (nextStatus: boolean) => {
    const previous = {status, isBinary};
    setStatus(nextStatus);
    if (nextStatus) {
      setIsBinary(true); // Always default to binary when turning ON
    }
    guardLocalChange(() => {
      setStatus(previous.status);
      setIsBinary(previous.isBinary);
    });
  };

  const setGuardedIsBinary = (nextIsBinary: boolean) => {
    const previous = {isBinary, flatFuelRate, fuelPrice, advancedFuelCurve};
    setIsBinary(nextIsBinary);
    guardLocalChange(() => {
      setIsBinary(previous.isBinary);
      setFlatFuelRate(previous.flatFuelRate);
      setFuelPrice(previous.fuelPrice);
      setAdvancedFuelCurve(previous.advancedFuelCurve);
    });
  };

  const setGuardedValue = (nextValue: number) => {
    const previous = value;
    setValue(nextValue);
    guardLocalChange(() => setValue(previous));
  };

  const setGuardedAdvancedFuelCurve = (nextValue: boolean) => {
    const previous = advancedFuelCurve;
    setAdvancedFuelCurve(nextValue);
    guardLocalChange(() => setAdvancedFuelCurve(previous));
  };

  const setGuardedFlatFuelRate = (nextValue: string) => {
    const previous = flatFuelRate;
    setFlatFuelRate(nextValue);
    guardLocalChange(() => setFlatFuelRate(previous));
  };

  const setGuardedFuelPrice = (nextValue: string) => {
    const previous = fuelPrice;
    setFuelPrice(nextValue);
    guardLocalChange(() => setFuelPrice(previous));
  };

  const setGuardedNoLoadCoeff = (nextValue: string) => {
    const previous = noLoadCoeff;
    setNoLoadCoeff(nextValue);
    guardLocalChange(() => setNoLoadCoeff(previous));
  };

  const setGuardedLoadCoeff = (nextValue: string) => {
    const previous = loadCoeff;
    setLoadCoeff(nextValue);
    guardLocalChange(() => setLoadCoeff(previous));
  };

  useEffect(() => {
    // On mount, fetch existing DG config if it exists to pre-populate form
    if (simulation_id) {
      dispatch(getGeneratorDgRequest({simulation_id}));
    }
  }, [simulation_id]);

  // After successful save, sync local state with saved data to reset isChanged
  useEffect(() => {
    if (!saveLoading && isSavingRef.current && !saveError && success === 'S-20019' && dgData) {
      setStatus(dgData.is_included);
      setIsBinary(dgData.is_binary);
      setValue(dgData.min_stable_load ?? 30);
      setFuelPrice(dgData.fuel_price ? dgData.fuel_price.toString() : '1.50');
      if (dgData.is_binary === false) {
        setIsBinary(false);
      } else {
        setIsBinary(true);
      }
      if (dgData.advanced_fuel_curve) {
        setAdvancedFuelCurve(true);
        setNoLoadCoeff(dgData.no_load_coeff ? dgData.no_load_coeff.toString() : '0.03');
        setLoadCoeff(dgData.load_coeff ? dgData.load_coeff.toString() : '0.22');
      } else {
        setAdvancedFuelCurve(false);
        setFlatFuelRate(dgData.flat_fuel_rate ? dgData.flat_fuel_rate.toString() : '0.25');
      }
      isSavingRef.current = false;
    }
  }, [saveLoading, saveError, success, dgData]);

  useEffect(() => {
    // When dgData is loaded from server, populate form fields
    if (dgData) {
      setStatus(dgData.is_included);
      setIsBinary(dgData.is_binary);
      setValue(dgData.min_stable_load ?? 30);
      setFuelPrice(dgData.fuel_price ? dgData.fuel_price.toString() : '1.50');
      if (dgData.is_binary === false) {
        setIsBinary(false);
      } else {
        setIsBinary(true);
      }
      if (dgData.advanced_fuel_curve) {
        setAdvancedFuelCurve(true);
        setNoLoadCoeff(dgData.no_load_coeff ? dgData.no_load_coeff.toString() : '0.03');
        setLoadCoeff(dgData.load_coeff ? dgData.load_coeff.toString() : '0.22');
      } else {
        setAdvancedFuelCurve(false);
        setFlatFuelRate(dgData.flat_fuel_rate ? dgData.flat_fuel_rate.toString() : '0.25');
      }
    }
  }, [dgData]);

  // Reset Flat Fuel and Fuel Price to defaults and hide advanced fuel curve when switching to Binary
  useEffect(() => {
    if (isBinary) {
      setFlatFuelRate('0.25');
      setFuelPrice('1.50');
      setAdvancedFuelCurve(false);
    }
  }, [isBinary]);

  useEffect(() => {
    if (!simulation_id) return;

    const payload = {
      simulation_id: simulation_id,
      no_load_coeff: noLoadCoeff === '' ? null : Number(noLoadCoeff),
      load_coeff: loadCoeff === '' ? null : Number(loadCoeff),
    };
    dispatch(generatorDgFuelCurveRequest(payload));
  }, [noLoadCoeff, loadCoeff]);

  const getPayload = () => {
    if (!simulation_id) return;
    return {
      simulation_id: simulation_id,

      is_included: status,

      is_binary: status ? isBinary : false,

      min_stable_load: status && !isBinary ? value : null,

      fuel_price: status ? Number(fuelPrice) : null,

      advanced_fuel_curve: status ? advancedFuelCurve : false,

      flat_fuel_rate: status && !advancedFuelCurve ? Number(flatFuelRate) : null,

      no_load_coeff: status && advancedFuelCurve ? Number(noLoadCoeff) : null,

      load_coeff: status && advancedFuelCurve ? Number(loadCoeff) : null,
    };
  };

  const handleSave = () => {
    const payload = getPayload();
    if (!payload) return;
    isSavingRef.current = true;
    dispatch(generatorDgRequest(payload));
  };

  const handleDownloadTable = async () => {
    const elements = tableRef.current?.querySelectorAll('.no-export');

    elements?.forEach((el: any) => {
      (el as HTMLElement).style.visibility = 'visible';
    });

    await downloadElementAsImage(tableRef.current, 'monthly_generation.png');

    elements?.forEach((el: any) => {
      (el as HTMLElement).style.display = '';
    });
  };

  const handleMinimizeFullscreen = () => {
    setIsFullscreen(false);

    setTimeout(() => {
      const el = generatorSectionRef.current;
      if (!el) return;

      let scrollContainer: HTMLElement | null = el.parentElement;
      while (scrollContainer) {
        const {overflow, overflowY} = window.getComputedStyle(scrollContainer);
        if (/(auto|scroll)/.test(overflow + overflowY) && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
          const cardTop = el.getBoundingClientRect().top;
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const offset = cardTop - containerTop + scrollContainer.scrollTop;
          const targetScroll = offset - scrollContainer.clientHeight * -0.5;
          scrollContainer.scrollTo({top: targetScroll, behavior: 'auto'});
          break;
        }
        scrollContainer = scrollContainer.parentElement;
      }
    }, 50);
  };

  const isChanged = () => {
    if (!dgData) return true;

    const payload = getPayload();
    if (!payload) return false;

    const numCompare = (a: any, b: any) => {
      if (a === null && b === null) return true;
      if (a === null || b === null) return false;
      return Number(a) === Number(b);
    };

    if (payload.is_included !== dgData.is_included) return true;
    if (payload.is_binary !== dgData.is_binary) return true;
    if (payload.advanced_fuel_curve !== dgData.advanced_fuel_curve) return true;
    if (!numCompare(payload.min_stable_load, dgData.min_stable_load)) return true;
    if (!numCompare(payload.fuel_price, dgData.fuel_price)) return true;
    if (!numCompare(payload.flat_fuel_rate, dgData.flat_fuel_rate)) return true;
    if (!numCompare(payload.no_load_coeff, dgData.no_load_coeff)) return true;
    if (!numCompare(payload.load_coeff, dgData.load_coeff)) return true;

    return false;
  };

  const isAlreadySaved = success === 'S-20019';
  const disableSaveButton = isReadOnly || (isAlreadySaved && !isChanged());
  // For assigned users, always enable the Next button
  const disableNextButton = isAssignedUser ? false : isChanged() || !isAlreadySaved;

  useEffect(() => {
    if (!saveLoading && success === 'S-20019' && isSavingRef.current && onNextToDispatchRules) {
      isSavingRef.current = false;
      onNextToDispatchRules();
    }
  }, [saveLoading, success, onNextToDispatchRules]);

  const loadData =
    fuelCurveData?.fuel_curve_points?.map((item: any) => ({
      load: `${item?.load_percentage}%`,
      output: `${item?.output_mw.toFixed(1)} MW`,
      fuelRate: `${item?.fuel_rate_l_hr} L/hr`,
      specific: `${item?.specific_fuel_rate_l_kwh} L/kWh`,
    })) || [];

  return (
    <>
      {!isFullscreen && (
        <>
          <div ref={generatorSectionRef} className="bg-primary-tint-2/40 p-4 mt-5 border-[1.4px] border-border rounded-md w-full relative">
            {isReadOnly && <div className="absolute inset-0 z-40 cursor-not-allowed" />}
            <div className="flex items-center gap-3">
              <Icon name="gear-drop" className="text-black! size-6.75!" />
              <Text variant={'h4'} className="font-SpaceGroteskBold">
                Generator (DG)
              </Text>
            </div>
            <div className="bg-white p-4 mt-5 border-[1.4px] border-border rounded-md w-full">
              <div className="flex items-center gap-3.5">
                <Toggle size="sm" value={status} onToggle={setGuardedStatus} disabled={isReadOnly} />
                <Text variant="body2" className="text-text-primary! font-InterMedium!">
                  Include diesel/gas generator in system
                </Text>
              </div>
            </div>
            <div className="mt-3">
              {status ? (
                <Alert
                  iconClassName="text-violet!"
                  message="DG capacity will be configured in Step 3 (Sizing)"
                  textClassName="text-violet! font-InterNormal! text-[12px]! mt-0.5"
                  className="bg-white! border-violet p-2!"
                />
              ) : (
                <Alert
                  iconName="infoCircle"
                  iconClassName="text-primary!"
                  message="No generator in this configuration. System will be Solar + BESS only."
                  textClassName="text-text-secondary! font-InterMedium! text-[15px]! mt-0.5"
                  className="bg-[#E6F3F2]! border-none p-3!"
                />
              )}
            </div>
            {status && (
              <>
                <div className="flex items-center gap-3.5 mt-4">
                  <Text variant="caption2" className="text-text-primary! font-InterRegular!">
                    DG Operating Mode
                  </Text>
                  <span className="relative group">
                    <Tooltip
                      message="Binary: DG runs at full capacity only. Variable: DG can run at any load above minimum."
                      position="right"
                      className="absolute"
                    />
                    <Icon name="questionCircle" className="text-text-secondary! size-4" />
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className="bg-white border-border border flex items-center gap-3 rounded-md p-3 mt-3 w-[50%]">
                    <Radio
                      size="sm"
                      checked={isBinary === true}
                      onCheckedChange={() => {
                        setGuardedIsBinary(true);
                      }}
                      disabled={isReadOnly}
                    />
                    <Text variant="caption2" className="text-text-primary! font-InterMedium!">
                      Binary (100% capacity or OFF){' '}
                    </Text>
                  </div>

                  <div className="bg-white border-border border flex items-center gap-3 rounded-md p-3 mt-3 w-[50%]">
                    <Radio
                      size="sm"
                      checked={isBinary === false}
                      onCheckedChange={() => {
                        setGuardedIsBinary(false);
                      }}
                      disabled={isReadOnly}
                    />
                    <Text variant="caption2" className="text-text-primary! font-InterMedium!">
                      Variable (above minimum load)
                    </Text>
                  </div>
                </div>
                {isBinary && (
                  <Alert
                    iconClassName="text-primary!"
                    message="In binary mode, DG will only run at 100% capacity when needed."
                    textClassName="text-text-primary! font-InterRegular! text-[12px]! mt-0.5"
                    className="bg-white! border-primary p-2! mt-3"
                  />
                )}
                {!isBinary && (
                  <div className="w-full p-4">
                    <div className={isReadOnly ? 'pointer-events-none opacity-70' : ''}>
                      <IOSProgressSlider
                        min={10}
                        max={100}
                        value={value}
                        onChange={v => {
                          setGuardedValue(v);
                        }}
                        step={5}
                        markStep={5}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  <Accordion heading="Advanced DG Fuel Model" icon="database" className="bg-bg-card!">
                    {!isBinary && (
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={advancedFuelCurve}
                          label="Use advanced fuel curve model"
                          onCheckedChange={checked => {
                            setGuardedAdvancedFuelCurve(checked);
                          }}
                          disabled={isReadOnly}
                          labelClassName="text-text-placeholder! font-InterMedium!"
                        />
                        <span className="relative group">
                          <Tooltip message="Uses Willans line model: Fuel = F0 × P_rated + F1 × P_actual" position="right" className="absolute" />
                          <Icon name="questionCircle" className="text-text-placeholder! size-4" />
                        </span>
                      </div>
                    )}

                    {/* Only show advanced fuel curve table and fields if Variable mode and advancedFuelCurve is true */}
                    {!isBinary && advancedFuelCurve ? (
                      <>
                        <div className="flex items-center gap-86">
                          <NumberStepperInput
                            label="F0 (No-load coeff, L/hr/kW)"
                            value={noLoadCoeff}
                            setValue={v => {
                              setGuardedNoLoadCoeff(v);
                            }}
                            min={NO_LOAD_COEFF_MIN}
                            max={NO_LOAD_COEFF_MAX}
                            step={NO_LOAD_COEFF_STEP}
                            defaultValue="0.03"
                            showTooltip
                            toolTipMessage="Fuel consumption per kW of rated capacity at zero load"
                            disabled={isReadOnly}
                          />

                          <NumberStepperInput
                            label="F1 (Load coeff, L/kWh)"
                            value={loadCoeff}
                            setValue={v => {
                              setGuardedLoadCoeff(v);
                            }}
                            min={LOAD_COEFF_MIN}
                            max={LOAD_COEFF_MAX}
                            step={LOAD_COEFF_STEP}
                            defaultValue="0.22"
                            showTooltip
                            toolTipMessage="Fuel consumption per kWh of actual output"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div ref={tableRef} className="bg-white">
                          <div className="flex justify-between self-center items-center">
                            <Text variant="caption2" className="text-text-primary! font-InterRegular! mt-6">
                              Efficiency at Different Load Levels (25 MW DG):
                            </Text>
                            <div className="flex gap-3 items-center mt-6 mr-3 no-export">
                              <Icon name="download" size={20} className="text-primary-tint-1! cursor-pointer" onClick={handleDownloadTable} />
                              <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={() => setIsFullscreen(true)} />
                            </div>
                          </div>
                          <div className="w-full overflow-hidden rounded-md border border-gray-300 mt-3">
                            <table className="w-full table-fixed border-collapse">
                              <colgroup>
                                <col className="w-[35%]" />
                                <col className="w-[35%]" />
                                <col className="w-[35%]" />
                                <col className="w-[15%]" />
                              </colgroup>

                              <thead className="bg-[#EEF0F5]">
                                <tr>
                                  <th className="px-4 py-2 text-left font-medium! text-small">Load</th>
                                  <th className="px-4 py-2 text-left font-medium! text-small">Output</th>
                                  <th className="px-4 py-2 text-left font-medium! text-small">Fuel Rate</th>
                                  <th className="px-4 py-2 text-left font-medium! text-small">Specific</th>
                                </tr>
                              </thead>

                              <tbody>
                                {loadData.map((item, index) => (
                                  <tr key={index} className="border-t border-gray-300">
                                    <td className="px-4 py-2 text-small">{item.load}</td>
                                    <td className="px-4 py-2 font-medium! text-small">{item.output}</td>
                                    <td className="px-4 py-2 text-small">{item.fuelRate}</td>
                                    <td className="px-4 py-2 text-small">{item.specific}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <Text variant="small" className="text-text-placeholder! font-InterRegular! mt-2 italic">
                          Lower load = higher specific fuel consumption (less efficient)
                        </Text>
                        <NumberStepperInput
                          label="Fuel price ($/L)"
                          value={fuelPrice}
                          setValue={v => {
                            setGuardedFuelPrice(v);
                          }}
                          min={FUEL_PRICE_MIN}
                          max={FUEL_PRICE_MAX}
                          step={FUEL_PRICE_STEP}
                          defaultValue="1.50"
                          disabled={isReadOnly}
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-96">
                        <NumberStepperInput
                          label="Flat fuel rate (L/kWh)"
                          value={flatFuelRate}
                          setValue={v => {
                            setGuardedFlatFuelRate(v);
                          }}
                          min={FLAT_FUEL_MIN}
                          max={FLAT_FUEL_MAX}
                          step={FLAT_FUEL_STEP}
                          defaultValue="0.25"
                          disabled={isReadOnly}
                        />

                        <NumberStepperInput
                          label="Fuel price ($/L)"
                          value={fuelPrice}
                          setValue={v => {
                            setGuardedFuelPrice(v);
                          }}
                          min={FUEL_PRICE_MIN}
                          max={FUEL_PRICE_MAX}
                          step={FUEL_PRICE_STEP}
                          defaultValue="1.50"
                          disabled={isReadOnly}
                        />
                      </div>
                    )}
                  </Accordion>
                </div>
              </>
            )}
          </div>
          <div className="mt-6 flex justify-center gap-5">
            {!isReadOnly && (
              <Button
                variant="secondary"
                size="md"
                disabled={disableSaveButton}
                onClick={handleSave}
                className={`self-center w-40 flex justify-center ${disableSaveButton ? 'cursor-not-allowed' : ''}`}>
                Save
              </Button>
            )}

            <Button size="md" className="w-50 my-6 flex justify-center" disabled={disableNextButton} onClick={onNextToDispatchRules}>
              Next → Dispatch Rules
            </Button>
          </div>
        </>
      )}

      {isFullscreen && (
        <div ref={tableRef} className="bg-white p-6 flex flex-col">
          {/* TOP BAR */}
          <div className="flex justify-between items-center mb-4">
            <Text variant="h4">Efficiency at Different Load Levels (25 MW DG)</Text>

            <div className="flex gap-3 no-export">
              <Icon name="download" size={20} className="cursor-pointer text-primary-tint-1!" onClick={handleDownloadTable} />

              <Icon name="minimize" size={20} className="cursor-pointer text-primary-tint-1!" onClick={handleMinimizeFullscreen} />
            </div>
          </div>

          {/* TABLE ONLY */}
          <div className="flex-1 overflow-auto border border-gray-300 rounded-md">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[35%]" />
                <col className="w-[35%]" />
                <col className="w-[35%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead className="bg-[#EEF0F5] sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Load</th>
                  <th className="px-4 py-2 text-left">Output</th>
                  <th className="px-4 py-2 text-left">Fuel Rate</th>
                  <th className="px-4 py-2 text-left">Specific</th>
                </tr>
              </thead>

              <tbody>
                {loadData.map((item, index) => (
                  <tr key={index} className="border-t border-gray-300">
                    <td className="px-4 py-2">{item.load}</td>
                    <td className="px-4 py-2 font-medium">{item.output}</td>
                    <td className="px-4 py-2">{item.fuelRate}</td>
                    <td className="px-4 py-2">{item.specific}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};
