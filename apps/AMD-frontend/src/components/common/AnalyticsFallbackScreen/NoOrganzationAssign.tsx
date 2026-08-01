import React from 'react';
import {Images} from '@/assets/images';
import {Text} from '@/ui-kits';;

export function NoOrganzationAssign() {
  return (
    <div className="grow m-10 bg-white flex flex-col items-center justify-center border-border border rounded-4xl shadow-[0_79px_32px_0_rgba(190,207,213,0.01),0_44px_27px_0_rgba(190,207,213,0.05),0_20px_20px_0_rgba(190,207,213,0.09),0_5px_11px_0_rgba(190,207,213,0.10)]">
      <img src={Images.AssetAnalysisNoData} alt="No Data" />
      <Text variant="h4" className="mt-2">
        No Organization Access Assigned
      </Text>
      <Text variant="16R" className="text-text-secondary! w-[60%] text-center mt-2">
        Your account has been created, but you have not yet been assigned access to an organization. Asset and analysis
        data will become available once organization access is provided.
      </Text>
    </div>
  );
}
