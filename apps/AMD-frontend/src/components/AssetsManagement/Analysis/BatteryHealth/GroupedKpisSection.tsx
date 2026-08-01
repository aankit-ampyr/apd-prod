import {IconTypes} from '@/interface';
import {Icon, Skeleton, Text} from '@/ui-kits';
import {useRef} from 'react';
import {useWindowDimensions} from '@/hooks';
import {TABLET_SCREEN_BREAKPOINT} from '@lazarus/react-common';
import {cn} from '@/utils';

export interface GroupedKpiObj {
  icon: IconTypes;
  title: string;
  subtitle: string;
  subKpis: Array<{
    icon: IconTypes;
    label: string;
    value: string;
    unitLabel: string;
  }>;
  subIconBgColor: string;
  accentColor: string; // for text
  secondaryAccentColor: string; // for icons
  iconBgGradientStart: string;
  iconBgGradientEnd: string;
  borderColor: string;
  subBorderColor: string;
  backgroundGradientStart?: string;
  backgroundGradientEnd: string;
}

interface GroupKpisSectionProps extends GroupedKpiObj {
  isLoading?: boolean;
}
export function GroupedKpisSection(props: GroupKpisSectionProps) {
  const {
    accentColor,
    backgroundGradientEnd,
    borderColor,
    icon,
    iconBgGradientEnd,
    iconBgGradientStart,
    secondaryAccentColor,
    subIconBgColor,
    subKpis,
    subtitle,
    title,
    backgroundGradientStart = '#ffffff',
    subBorderColor,
    isLoading,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const {width: windowWidth} = useWindowDimensions();
  const isTablet = windowWidth <= TABLET_SCREEN_BREAKPOINT;

  if (isLoading) {
    return (
      <div className="p-4 border border-border gap-4 flex flex-col rounded-lg">
        <div className="flex gap-4">
          <Skeleton className="size-8! rounded-md!" />
          <div className="grow flex flex-col gap-3">
            <Skeleton width={'40%'} className="rounded-sm" />
            <Skeleton width={'50%'} className="rounded-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Array.from({length: 2}).map((_, index) => (
            <div className="flex gap-4 bg-white h-34 p-4 rounded-md border-border border" key={index}>
              <Skeleton className="size-8! rounded-md!" />
              <div className="grow flex flex-col gap-3">
                <Skeleton width={'40%'} className="rounded-sm" />
                <Skeleton width={'50%'} className="rounded-full mt-auto h-10!" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    // wrapper container for container queries
    <div ref={containerRef} className="@container h-full">
      <div
        style={{
          background: `linear-gradient(to bottom right, ${backgroundGradientStart}, ${backgroundGradientEnd})`,
          borderColor,
        }}
        className="px-2 @[525px]:px-4 py-1.5 @[525px]:py-3 border h-full gap-4 flex flex-col rounded-lg border-t-4">
        <div className="flex gap-4 items-center">
          <div
            className="p-2 rounded-md"
            style={{
              background: `linear-gradient(to bottom right, ${iconBgGradientStart}, ${iconBgGradientEnd})`,
            }}>
            <Icon name={icon} color={secondaryAccentColor} size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <Text variant="16SB" style={{color: accentColor}}>
              {title}
            </Text>
            <Text variant="14M" className="text-text-secondary!">
              {subtitle}
            </Text>
          </div>
        </div>

        <div className="grid-cols-2 grow grid gap-2 @[486px]:gap-4">
          {subKpis.map(({icon, label, unitLabel, value}) => (
            <div
              key={label}
              style={{
                borderColor: subBorderColor,
                boxShadow: `-1px 2px 7px -1px ${subBorderColor}`,
              }}
              className="box-border w-full border bg-white flex rounded-md p-2 @[505px]:p-4 gap-2 @[500px]:gap-4">
              <div
                style={{
                  backgroundColor: subIconBgColor,
                }}
                className="size-8 @[465px]:size-10 shrink-0 flex justify-center items-center rounded-full">
                <Icon name={icon} color={secondaryAccentColor} className="size:4 @[465px]:size-4.5" />
              </div>

              <div className="flex box-border grow flex-col gap-1 mt-1">
                <Text variant="14M" className="text-text-secondary!">
                  {label}
                </Text>
                <span className="gap-1 @[390px]:gap-2 -translate-x-4 @[395px]:-translate-x-2 @[445px]:translate-x-0 @[435px]:gap-3 items-baseline flex mt-auto">
                  <Text
                    variant="free"
                    className={cn(
                      'font-InterBold!',
                      isTablet
                        ? 'text-[14px] @[385px]:text-[20px] @[400px]:text-[24px] @[435px]:text-[28px]'
                        : 'text-[22px] @[385px]:text-h3 @[400px]:text-h2 @[435px]:text-h1',
                    )}
                    style={{
                      color: accentColor,
                    }}>
                    {value}
                  </Text>
                  <Text variant="free" className="text-text-secondary! text-caption @[435px]:text-body-1">
                    {unitLabel}
                  </Text>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
