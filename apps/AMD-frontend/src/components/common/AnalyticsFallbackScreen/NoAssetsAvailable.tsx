import {Images} from '@/assets/images';
import {Text} from '@/ui-kits';

interface NoAssetsAvailableProps {
  organizationName?: string;
  children?: React.ReactNode;
}

export function NoAssetsAvailable({organizationName = 'your organization', children}: NoAssetsAvailableProps) {
  return (
    <div className="flex h-full flex-col grow items-center justify-center pb-24 mx-auto">
      <img src={Images.noAssets} alt="No assets" className="size-20" />

      <div className="w-full max-w-2xl mt-6 flex flex-col items-center gap-2">
        <Text variant="h3" className="text-text-primary! text-center!">
          No Assets Available
        </Text>
        <Text variant="16R" className="text-text-secondary! text-center!">
          You have access to <span className="font-semibold">{organizationName}</span>, but no assets have been added
          yet.
          <br />
          Analysis will become available once an asset is Onboarded and the required data is uploaded.
        </Text>
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
