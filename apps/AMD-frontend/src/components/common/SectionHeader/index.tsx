import {PropsWithChildren} from 'react';
import {IconWrapper} from '../IconWrapper';
import {IconTypes, Text} from '@/ui-kits';
import {cn} from '@/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon: IconTypes;
  className?: string;
  iconClassName?: string;
  action?: React.ReactNode;
}
export function SectionHeader(props: SectionHeaderProps) {
  const {title, icon, subtitle, className, iconClassName, action} = props;
  return (
    <div className={cn('flex items-center justify-between w-full', className)}>
      <div className="flex items-center gap-3">
        <IconWrapper icon={icon} className={iconClassName} />
        <div>
          <Text variant="h4" className="text-text-primary! font-InterBold!">
            {title}
          </Text>
          {subtitle && (
            <Text variant="14R" className="text-text-secondary!">
              {subtitle}
            </Text>
          )}
        </div>
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-3 flex-nowrap">
          {action}
        </div>
      )}
    </div>
  );
}

interface SectionProps extends SectionHeaderProps, PropsWithChildren {}
export function Section(props: SectionProps) {
  const {title, icon, subtitle, children, className, action, iconClassName} = props;
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <SectionHeader title={title} icon={icon} subtitle={subtitle} action={action} iconClassName={iconClassName} />
      {children}
    </div>
  );
}
