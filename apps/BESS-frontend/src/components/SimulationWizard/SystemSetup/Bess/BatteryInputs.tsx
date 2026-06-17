import {Checkbox, Icon, Text, Tooltip} from '@/ui-kits';
import {IOSDoubleSlider, IOSSingleSlider, Accordion} from '@/components';
import {cn} from '@/utils';
import React from 'react';

type Props = {
  readonly efficiency: number;
  readonly setEfficiency: (val: number) => void;
  readonly initialSOC: number;
  readonly setInitialSOC: (val: number) => void;
  readonly cycleLimit: number;
  readonly setCycleLimit: (val: number | ((prev: number) => number)) => void;
  readonly enforceCycleLimit: boolean;
  readonly setEnforceCycleLimit: (val: boolean) => void;
  readonly minSoc: number;
  readonly setMinSoc: (val: number) => void;
  readonly maxSoc: number;
  readonly setMaxSoc: (val: number) => void;
  readonly readOnly?: boolean;
};

export const BatteryInputs = ({
  efficiency,
  setEfficiency,
  initialSOC,
  setInitialSOC,
  cycleLimit,
  setCycleLimit,
  enforceCycleLimit,
  setEnforceCycleLimit,
  minSoc,
  setMinSoc,
  maxSoc,
  setMaxSoc,
  readOnly,
}: Props) => {
  const MIN = 0.5;
  const MAX = 3.0;
  const STEP = 0.1;

  const handleIncrement: () => void = () => {
    setCycleLimit((prev: number) => {
      const next = +(prev + STEP).toFixed(1);
      return next <= MAX ? next : prev;
    });
  };

  const handleDecrement: () => void = () => {
    setCycleLimit((prev: number) => {
      const next = +(prev - STEP).toFixed(1);
      return next >= MIN ? next : prev;
    });
  };

  // Handle typing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // allow empty while typing (so backspace works)
    if (val === '') {
      setCycleLimit('' as any);
      return;
    }

    // allow only numbers with 1 decimal
    if (!/^\d*\.?\d{0,1}$/.test(val)) return;

    // allow typing decimal point (e.g. "1.")
    if (val[val.length - 1] === '.') {
      setCycleLimit(val as any);
      return;
    }

    let num = Number.parseFloat(val);

    // if it's a valid number → clamp immediately
    if (!Number.isNaN(num)) {
      if (num < MIN) num = MIN;
      if (num > MAX) num = MAX;

      setCycleLimit(+num.toFixed(1));
    } else {
      setCycleLimit(val as any);
    }
  };

  // Validate on blur
  const handleBlur = () => {
    let num = Number.parseFloat(cycleLimit as any);

    if (Number.isNaN(num)) num = MIN;

    if (num < MIN) num = MIN;
    if (num > MAX) num = MAX;

    setCycleLimit(+num.toFixed(1));
  };

  return (
    <div className="mt-5 bg-primary-tint-2/40 p-4 border-[1.4px] border-border rounded-md w-full flex flex-col gap-3">
      <div className="border-[1.4px] border-border bg-white p-4 rounded-md">
        <div className="flex items-center gap-4 w-full">
          <div className="w-[50%]">
            <Text variant={'body1'} className="text-text-primary! font-InterMedium! my-4">
              Round-trip Efficiency <span className="text-teal!">({efficiency}%)</span>
            </Text>
          </div>
          <div className="w-[50%] mt-3">
            <IOSSingleSlider
              min={70}
              max={95}
              value={efficiency}
              onChange={val => {
                setEfficiency(val);
              }}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>

      <div className="border-[1.4px] border-border bg-white p-4 rounded-md">
        <div className="flex items-center gap-4 w-full">
          <div className="w-[50%]">
            <Text variant={'body1'} className="text-text-primary! font-InterMedium! my-4">
              Min State of Charge <span className="text-teal!">({minSoc}%)</span>
            </Text>
          </div>
          <div className="w-[50%] mt-3">
            <IOSSingleSlider
              min={5}
              step={5}
              max={50}
              value={minSoc}
              onChange={val => {
                // Ensure minSoc never exceeds (maxSoc - step)
                const newMin = Math.min(val, maxSoc - 5);
                setMinSoc(newMin);
              }}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>

      <div className="border-[1.4px] border-border bg-white p-4 rounded-md">
        <div className="flex items-center gap-4 w-full">
          <div className="w-[50%]">
            <Text variant={'body1'} className="text-text-primary! font-InterMedium! my-4">
              Max State of Charge <span className="text-teal!">({maxSoc}%)</span>
            </Text>
          </div>
          <div className="w-[50%] mt-3">
            <IOSSingleSlider
              min={50}
              step={5}
              max={100}
              value={maxSoc}
              onChange={val => {
                // Ensure maxSoc never goes below (minSoc + 5)
                const newMax = Math.max(val, minSoc + 5);
                setMaxSoc(newMax);
              }}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>

      <div className="border-[1.4px] border-border bg-white p-4 rounded-md">
        <div className="flex items-center gap-4 w-full">
          <div className="w-[50%]">
            <Text variant={'body1'} className="text-text-primary! font-InterMedium! my-4">
              Initial State of Charge <span className="text-teal!">({initialSOC}%)</span>
            </Text>
          </div>
          <div className="w-[50%] mt-3">
            <IOSSingleSlider
              min={minSoc}
              max={maxSoc}
              step={5}
              value={initialSOC}
              onChange={val => {
                setInitialSOC(val);
              }}
              readOnly={readOnly}
            />{' '}
          </div>
        </div>
      </div>
      <Accordion heading="Advanced BESS Settings">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Text variant="caption" className="text-text-primary! font-InterMedium! mb-2">
                Daily Cycle Limit
              </Text>

              <span className="relative group mb-2">
                <Tooltip message="BESS will stop discharging when daily cycle limit is reached" position="right" className="absolute -top-2" />
                <Icon name="circle-info" className="text-text-secondary! size-4" />
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Minus */}
              <button
                onClick={handleDecrement}
                disabled={cycleLimit <= MIN || readOnly}
                className={`w-10 h-10 border cursor-pointer flex items-center justify-center text-xl  border-border rounded ${cycleLimit <= MIN || readOnly ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <Icon name="minus" size={12} />
              </button>

              {/* Value */}
              <input
                type="text"
                value={cycleLimit}
                readOnly={readOnly}
                onChange={!readOnly ? handleChange : undefined}
                onBlur={!readOnly ? handleBlur : undefined}
                className={cn(
                  'w-20 px-3 py-2 border border-border rounded text-center outline-none',
                  readOnly && 'bg-gray-50 text-gray-500 cursor-not-allowed',
                )}
              />

              {/* Plus */}
              <button
                onClick={handleIncrement}
                disabled={cycleLimit >= MAX || readOnly}
                className={`w-10 h-10 border py-2 cursor-pointer flex items-center justify-center text-xl border-border rounded ${cycleLimit >= MAX || readOnly ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <Icon name="plus" size={12} />
              </button>
            </div>
          </div>
        </div>
      </Accordion>
    </div>
  );
};
