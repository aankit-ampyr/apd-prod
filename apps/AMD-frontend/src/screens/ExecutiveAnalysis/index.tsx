import React, {useEffect, useState} from 'react';
import {ScreenWrapper, ExecutiveAnalysis} from '@/components';
import {SearchableSelectInput, SelectInput, Text} from '@/ui-kits';
import {Images} from '@/assets/images';
import {enumToSelectOptions, ErrorCodes, getErrorMessage, getUniqueYearsFromAsset, SuccessCodes} from '@/utils';
import {AssetType} from '@/constants';
import {useDispatch, useSelector} from 'react-redux';
import {assetError, assetSuccess, currentSelectedAsset, executiveAnalysisAssetsList} from '@/services/redux/selectors';
import {getAllAssetsListRequest, getAssetDetailsRequest, resetAssetMessage} from '@/services/redux/slice';
import {useToast} from '@/hooks';

/**
 * ==============================
 * Types & constants
 * ==============================
 */
const ASSET_TYPES = enumToSelectOptions(AssetType).filter(item => item.id !== AssetType.Solar);

export function ExecutiveAnalysisScreen() {
  // ================================
  // hooks
  // ================================
  const dispatch = useDispatch();
  const {showToast, dismissToast} = useToast();

  // ================================
  // selector
  // ================================

  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetError) as ErrorCodes;
  const currentAsset = useSelector(currentSelectedAsset);

  // ================================
  // states
  // ================================
  const [currentSelectedAssetID, setCurrentSelectedAssetID] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [assetType, setAssetType] = useState<AssetType | null>(null);

  const allAssets = useSelector(executiveAnalysisAssetsList(assetType ?? AssetType.BESS));

  // ================================
  // Derived States
  // ================================
  const availableYears = getUniqueYearsFromAsset(currentAsset);
  const yearOptions = availableYears.map(year => ({
    id: year,
    label: `Year ${year}`,
  }));

  // ================================
  // side effects
  // ================================
  /**
   * handle toast message
   */
  useEffect(() => {
    if (failure) {
      showToast(getErrorMessage(failure), 'error');
    }
    return () => {
      dismissToast();
      dispatch(resetAssetMessage());
    };
  }, [dispatch, dismissToast, failure, showToast, success]);
  /**
   * Fetch all asset list
   */
  useEffect(() => {
    if (!currentSelectedAssetID) return;
    dispatch(getAssetDetailsRequest({id: Number(currentSelectedAssetID)}));
  }, [currentSelectedAssetID]);

  /**
   * Fetch all asset list
   */
  useEffect(() => {
    dispatch(getAllAssetsListRequest());
  }, []);

  return (
    <ScreenWrapper className="bg-linear-to-br from-[#F8FAFC] to-[#F2F3FF]" wrapperClassName="p-0! bg-transparent shadow-none! rounded-none! flex flex-col">
      {/* header */}
      <div className="border mb-3 relative border-[#D8ECF2] rounded-lg p-4 bg-linear-to-br! from-[#F4F9FF] to-[#E0EDFA]  flex flex-col gap-6">
        {/* backgound images */}
        <div className="absolute w-60 h-full top-0 right-0">
          <img src={Images.sun} alt="Auth Background" />
          <img src={Images.zap} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <img src={Images.lightBulb} className="absolute top-0 right-0" />
          <img src={Images.battery2} className="absolute bottom-0 left-0" />
          <img src={Images.windmills} className="absolute bottom-0 right-0" />
        </div>

        <Text variant="free" className="font-InterBold! text-[22px] z-10">
          Multi-Month Performance Overview <span className="text-primary z-10">for Management</span>
        </Text>

        <Text variant="14M" className="z-10">
          Select an asset and year for a 12-month performance overview.
        </Text>

        <div className="grid grid-cols-3 max-w-180 w-full gap-4">
          <SelectInput
            isFilter
            label="ASSET TYPE"
            options={ASSET_TYPES}
            value={assetType}
            onChange={({id}) => setAssetType(id as AssetType)}
            wrapperClassName="bg-white!"
          />
          <SearchableSelectInput
            isFilter
            value={currentSelectedAssetID}
            onChange={({id}) => setCurrentSelectedAssetID(id as number)}
            label="ASSET NAME"
            dropdownItemRenderer={item => (
              <Text variant="caption">
                {item.label} <span className="text-text-secondary! text-small!">({item.subLabel})</span>
              </Text>
            )}
            options={allAssets}
            wrapperClassName="bg-white!"
            disabled={!assetType}
          />
          <SelectInput
            isFilter
            value={selectedYear}
            onChange={({id}) => setSelectedYear(id as number)}
            label="YEAR"
            options={yearOptions}
            wrapperClassName="bg-white!"
            disabled={!currentSelectedAssetID}
          />
        </div>
      </div>

      <ExecutiveAnalysis
        asset_id={currentSelectedAssetID ?? undefined}
        assetSystemGenerationId={currentAsset?.asset_id}
        year={selectedYear ?? undefined}
      />
    </ScreenWrapper>
  );
}
