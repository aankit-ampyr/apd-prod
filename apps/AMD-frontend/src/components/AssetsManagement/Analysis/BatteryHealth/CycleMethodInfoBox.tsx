import {Text} from '@/ui-kits';

interface BatteryFormulaKpiProps {
  methodName: string;
  formula: string;
  formulaCodeName: string;
  bgColor: string;
  accentColor: string;
}
export function BatteryFormulaKpi(props: BatteryFormulaKpiProps) {
  const {accentColor, bgColor, formula, formulaCodeName, methodName} = props;
  return (
    <div className="border flex gap-2 items-start border-border bg-white p-4 rounded-md">
      <div className="size-12 flex justify-center shrink-0! items-center rounded-full" style={{backgroundColor: bgColor}}>
        <Text variant='h2' style={{color: accentColor}}>{formulaCodeName}</Text>
      </div>

      <div className='flex flex-col gap-1'>
        <Text variant='14B'>{methodName}</Text>
        <Text variant='12M' className='text-text-secondary!'>{formula}</Text>
      </div>
    </div>
  );
}
