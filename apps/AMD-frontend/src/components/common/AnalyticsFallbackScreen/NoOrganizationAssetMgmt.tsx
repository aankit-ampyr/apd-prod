import {Images} from '@/assets/images';
import {Text} from '@/ui-kits';

export function NoOrganizationAssetMgmt() {
  return (
    <div className="flex h-full flex-col grow items-center justify-center pb-24 mx-auto">
      <img src={Images.noAssets} alt="No assets" className="size-20" />

      <div className="w-full max-w-2xl mt-6 flex flex-col items-center gap-2">
        <Text variant="h3" className="text-text-secondary! text-center!">
          You are not currently assigned to any organization.
        </Text>
        <Text variant="16R" className="text-text-secondary! text-center!">
          Assets are displayed based on your organization access, so no assets can be shown until an Admin assigns you
          to an organization.
        </Text>
      </div>
    </div>
  );
}
