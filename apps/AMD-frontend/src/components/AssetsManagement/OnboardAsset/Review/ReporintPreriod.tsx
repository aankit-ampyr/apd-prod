import {MonthYear} from '@/interface';
import {Text, Icon, Tooltip, MonthYearPicker} from '@/ui-kits';

interface ReportingPeriodProps {
  value: MonthYear | null;
  onChange: (value: MonthYear | null) => void;
  onDone: (value: MonthYear) => void;
  availablePeriods?: MonthYear[];
  label?: string;
  toolTipMessage?: string | React.ReactNode;
}

export function ReportingPeriod(props: ReportingPeriodProps) {
  const {
    value,
    onChange,
    onDone,
    availablePeriods,
    label = 'Select Reporting Period',
    toolTipMessage = 'Select month and year to upload data for a new reporting period.',
  } = props;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:justify-end">
      <div className="flex items-center gap-2">
        <Text variant="14R" className="text-text-primary! whitespace-nowrap">
          {label}
        </Text>

        <span className="relative group z-60!">
          <Tooltip
            message={toolTipMessage}
            position="top"
            className="z-70! -translate-y-2"
            arrowClassName="w-4 h-4 -mt-2"
          />
          <Icon name="questionCircle" className="text-text-secondary! size-4" />
        </span>
        <Text variant="16M" className="text-text-primary!">
          :
        </Text>
      </div>
      <div className="relative z-50">
        <MonthYearPicker
          value={value}
          onChange={onChange}
          handleDone={onDone}
          placeholder="Select month & year"
          wrapperClassName="w-50 bg-white"
          iconClassName="text-text-placeholder!"
          allowedMonths={availablePeriods && availablePeriods.length > 0 ? availablePeriods : undefined}
        />
      </div>
    </div>
  );
}
