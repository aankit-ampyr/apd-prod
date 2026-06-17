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
}
export function SectionHeader(props: SectionHeaderProps) {
  const {title, icon, subtitle, className, iconClassName} = props;
  return (
    <span className={cn('flex items-center gap-3', className)}>
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
    </span>
  );
}

interface SectionProps extends SectionHeaderProps, PropsWithChildren {}
export function Section(props: SectionProps) {
  const {title, icon, subtitle, children, className} = props;
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <SectionHeader title={title} icon={icon} subtitle={subtitle} />
      {children}
    </div>
  );
}
