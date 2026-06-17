import {Text, Icon, Button, Badge} from '@/ui-kits';
import type {Asset} from '@/interface';
import {Divider} from '@lazarus/react-common/components';
import {WithRole} from '../../common';
import React from 'react';
import {cn, formatDate} from '@/utils';
import {ASSET_STATUS_LABELS, AssetStatusBadgeVariant, AssetType, UserRole} from '@/constants';

interface AssetCardProp {
  asset: Asset;
  onReassign: (asset: Asset) => void;
  onView?: (asset: Asset) => void;
}
export const AssetCard: React.FC<AssetCardProp> = props => {
  const {asset, onReassign, onView} = props;

  const formattedDate = formatDate(asset.created_at, 'dd-MMM-yyyy,');
  const formattedTime = formatDate(asset.created_at, 'hh:mm a');

  return (
    <div
      className={cn(
        'border border-bg-card shadow-lg rounded-lg p-4 border-l-4 flex flex-col w-full gap-3 cursor-pointer',
        asset.type === AssetType.Solar && 'border-l-accent-yellow',
        asset.type === AssetType.BESS && 'border-l-blue-tint',
        asset.type === AssetType['Solar + BESS'] && 'border-l-violet-tint',
      )}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <Text variant="h4" className="leading-tight break-words">
          {asset.name}
        </Text>
        <Badge
          className="-mt-0.5 shrink-0"
          message={ASSET_STATUS_LABELS[asset.status]}
          color={AssetStatusBadgeVariant[asset.status] as any}
        />
      </div>
      <Text variant="small" className="text-text-secondary!">
        {asset.asset_id}
      </Text>
      <div className="grid grid-cols-2 mt-1 gap-x-4 gap-y-4">
        <div className="flex items-start gap-2">
          <Icon name="charge-circle" className="mt-0.5 text-text-secondary/70" />
          <Text variant="caption" className="text-secondary! font-InterMedium!">
            {asset.capacity} MW
          </Text>
        </div>
        <div className="flex items-start gap-2">
          <Icon name="calendar" className="mt-0.5 shrink-0 text-text-secondary/70" />
          <div className="flex min-w-0 flex-col leading-[1.2]">
            <Text variant="small" className="text-text-secondary! whitespace-nowrap">
              {formattedDate}
            </Text>
            <Text variant="small" className="text-text-secondary! whitespace-nowrap">
              {formattedTime}
            </Text>
          </div>
        </div>
        <div className="flex items-start gap-2 col-span-2">
          <Icon name="organization" className="mt-0.5 shrink-0 text-text-secondary/70" />
          <Text variant="caption" className="text-text-secondary! break-words">
            {asset.organization.name}
          </Text>
        </div>
        <div className="flex items-start gap-2 col-span-2">
          <Icon name="location-pin" className="mt-0.5 shrink-0 text-text-secondary/70" />
          <Text variant="caption" className="text-text-secondary! break-words">
            {asset?.location}, {asset?.country?.name}
          </Text>
        </div>
      </div>

      <Divider className="my-2 mt-auto" />

      <div className="grid grid-cols-2 gap-2">
        <WithRole roles={[UserRole.Admin]} fallback={<div />}>
          <Button variant="secondary" className="w-full justify-center" onClick={() => onReassign(asset)}>
            Reassign
          </Button>
        </WithRole>
        <Button variant="primary" className="w-full justify-center" onClick={() => onView?.(asset)}>
          View Details
        </Button>
      </div>
    </div>
  );
};
