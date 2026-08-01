import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {AssetSection, FilterGroup, ReassignAssetOwnership, ScreenWrapper, WithRole} from '@/components';
import {NoOrganizationAssetMgmt, NoAssetsAvailable} from '@/components/common/AnalyticsFallbackScreen';
import {
  ASSET_STATUS_LABELS,
  ASSET_TYPE_OPTIONS,
  AssetStatus,
  AssetType,
  Country,
  TABLET_SCREEN_BREAKPOINT,
  UserRole,
} from '@/constants';
import {useDropdownValues, useRole, useToast, useWindowDimensions} from '@/hooks';

import {allOrganizationsList, assetSuccess, assetError, assetTypeLoading, noAsset, assetErrorMessageVars} from '@/services/redux/selectors';
import {getAllOrganizationsListRequest, resetAssetMessage, getAssetDetailsRequest} from '@/services/redux/slice';
import {Button, Skeleton, Text} from '@/ui-kits';
import {Images} from '@/assets/images';
import type {SortType, Asset} from '@/interface';
import {
  capitalize,
  cn,
  enumToSelectOptions,
  getErrorMessage,
  getSuccessMessage,
  type ErrorCodes,
  type SuccessCodes,
} from '@/utils';
import {useNavigate} from 'react-router-dom';
import {Routes} from '@/navigation/Routes';
import {isEmpty} from 'ramda';

const COUNTRIES_OPTIONS = enumToSelectOptions(Country);
const ASSET_LOADING_KEYS = {
  [AssetType.Solar]: 'solar',
  [AssetType.BESS]: 'bess',
  [AssetType['Solar + BESS']]: 'solarBess',
} as const;

/**
 * Filter type for asset list filtering
 */
type FilterType = {
  search?: string;
  type?: AssetType;
  organization?: number;
  status?: number;
  country?: number;
  sort?: SortType;
};

export function AssetManagement() {
  // =================
  // hooks
  // =================
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {showToast} = useToast();
  const {isAMDAdmin} = useRole();
  const allOrgs = useDropdownValues({
    fetchAction: getAllOrganizationsListRequest,
    selector: allOrganizationsList,
    allowFetch: isAMDAdmin, // Only fetch organizations if user is AMD Admin
  });
  const {width} = useWindowDimensions();
  const alwaysShrink = width <= TABLET_SCREEN_BREAKPOINT;

  // =================
  // selectors
  // =================
  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetError) as ErrorCodes;
  const failureData = useSelector(assetErrorMessageVars) as Record<string, string>;
  const noAssetFound = useSelector(noAsset);
  const solarLoading = useSelector(assetTypeLoading(ASSET_LOADING_KEYS[AssetType.Solar]));
  const bessLoading = useSelector(assetTypeLoading(ASSET_LOADING_KEYS[AssetType.BESS]));
  const solarBessLoading = useSelector(assetTypeLoading(ASSET_LOADING_KEYS[AssetType['Solar + BESS']]));

  // =================
  // state
  // =================
  const [filter, setFilter] = useState<FilterType>({});
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_noData, setNoData] = useState<boolean>(false);
  const [showNoOrganizationAssign, setShowNoOrganizationAssign] = useState<boolean>(false);
  const [invalidOrgSearch, setInvalidOrgSearch] = useState(false);
  const [invalidCountrySearch, setInvalidCountrySearch] = useState(false);
  const invalidFilters = invalidOrgSearch || invalidCountrySearch;

  // =================
  // computed UI
  // =================
  const AddAssetCTA = (
    <WithRole roles={[UserRole.Admin]}>
      <Button onClick={handleAdd} leftIcon="plus">
        Add Asset
      </Button>
    </WithRole>
  );
  const EmptyScreen = ({message, children}: {message: string; children?: React.ReactNode}) => (
    <div className="flex h-full flex-col grow items-center justify-center gap-4 py-20">
      <img src={Images.noAssets} alt="No assets" className="size-20" />
      <Text variant="h3" className="text-text-secondary!">
        {message}
      </Text>
      {children}
    </div>
  );
  const LoadingScreen = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Skeleton variant="rounded" width={280} height={24} />
        <Skeleton variant="rounded" width={132} height={40} className="rounded-xl!" />
      </div>
      <div className="flex flex-wrap gap-4">
        <Skeleton variant="rounded" width={320} height={44} className="rounded-xl!" />
        <Skeleton variant="rounded" width={150} height={44} className="rounded-xl!" />
        <Skeleton variant="rounded" width={160} height={44} className="rounded-xl!" />
        <Skeleton variant="rounded" width={140} height={44} className="rounded-xl!" />
        <Skeleton variant="rounded" width={160} height={44} className="rounded-xl!" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({length: 6}).map((_, index) => (
          <div key={index} className="rounded-3xl border border-border bg-white p-6">
            <Skeleton variant="rounded" width="40%" height={18} className="rounded-md!" />
            <Skeleton variant="rounded" width="70%" height={28} className="mt-4 rounded-md!" />
            <Skeleton variant="rounded" width="55%" height={18} className="mt-3 rounded-md!" />
            <Skeleton variant="rounded" width="100%" height={160} className="mt-6 rounded-2xl!" />
          </div>
        ))}
      </div>
    </div>
  );

  const activeAssetLoading = filter.type
    ? {
        [AssetType.Solar]: solarLoading,
        [AssetType.BESS]: bessLoading,
        [AssetType['Solar + BESS']]: solarBessLoading,
      }[filter.type]
    : solarLoading || bessLoading || solarBessLoading;
  const isInitialAssetLoading = noAssetFound && activeAssetLoading;
  const showEmptyScreen = noAssetFound && isEmpty(filter) && !isInitialAssetLoading;

  // =================
  // function
  // =================
  const handleReassign = (asset: Asset) => {
    if (!isAMDAdmin) return;
    setSelectedAsset(asset);
    setReassignModalOpen(true);
  };

  const isAssetOnboarded = (currentAsset: Asset) => {
    return [AssetStatus.Active, AssetStatus.Inactive].includes(currentAsset?.status);
  };

  function handleAdd() {
    if (!isAMDAdmin) return;
    navigate({pathname: Routes.ASSET_ONBOARDING});
  }

  const handleViewDetails = (asset: Asset) => {
    if (!asset.id) return;
    dispatch(getAssetDetailsRequest({id: asset.id}));




    if (isAssetOnboarded(asset)) {
      navigate(Routes.VIEW_ASSET.replace(':id', String(asset.id)));
    } else {
      navigate(Routes.VIEW_ASSET_ONBOARDING.replace(':id', String(asset.id)));
    }
  };

  const closeReassignModal = () => {
    setReassignModalOpen(false);
    setSelectedAsset(null);
  };

  // Handle success/error messages
  useEffect(() => {
    if (success) {
      const message = getSuccessMessage(success);
      if (message && success === 'S-10016') {
        // Reassign success
        showToast(message, 'success');
        setReassignModalOpen(false);
        setSelectedAsset(null);
      }
    }

    if (failure) {
      if ('E-10014' === failure) {
        setNoData(true);
      }
      if ('E-10272' === failure) {
        setShowNoOrganizationAssign(true);
      }
      if (!['E-10014', 'E-10015', 'E-10033', 'E-10239', 'E-10272'].includes(failure)) {
        showToast(getErrorMessage(failure), 'error');
      }
    }
    return () => {
      dispatch(resetAssetMessage());
    };
  }, [failure, success]);

  if (showNoOrganizationAssign) {
    return (
      <ScreenWrapper 
        className={width >= TABLET_SCREEN_BREAKPOINT ? "p-8" : "p-3"} 
        wrapperClassName={width >= TABLET_SCREEN_BREAKPOINT ? "p-6" : "p-3"}
      >
        <NoOrganizationAssetMgmt />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper 
      className={
        showEmptyScreen
          ? width >= TABLET_SCREEN_BREAKPOINT ? "px-14 py-16" : "p-4"
          : width >= TABLET_SCREEN_BREAKPOINT ? "p-8" : "p-3"
      } 
      wrapperClassName={width >= TABLET_SCREEN_BREAKPOINT ? "p-8" : "p-4"}
    >
      {isInitialAssetLoading && <LoadingScreen />}

      <div
        className={cn(
          'flex-col h-full gap-6 px-0 py-4 xl:p-4',
          showEmptyScreen || isInitialAssetLoading ? 'hidden' : 'flex',
        )}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Text variant="subtitle1" className="text-text-primary">
            Manage and monitor all energy assets
          </Text>
          {AddAssetCTA}
        </div>

        {/* Search & Filters */}
        <FilterGroup
          debounceMs={0}
          config={
            [
              {
                key: 'search',
                placeholder: 'Search by ID, name or location...',
                type: 'search',
                props: {
                  className: alwaysShrink ? 'w-full' : 'min-w-[300px]',
                },
                wrapperClassName: alwaysShrink ? 'w-[calc(66.666%-8px)] shrink-0' : '',
              },
              {
                key: 'organization',
                placeholder: 'All Organizations',
                type: 'searchable-select',
                options: allOrgs,
                props: {
                  className: alwaysShrink ? 'w-full' : 'min-w-40 max-w-50',
                  onInvalidSearchChange: (invalid: boolean) => setInvalidOrgSearch(invalid),
                },
                hideFilter: !isAMDAdmin, // Only show organization filter for AMD Admins
                wrapperClassName: alwaysShrink ? 'w-[calc(33.333%-8px)] shrink-0' : '',
              },
              {
                key: 'status',
                placeholder: 'All status',
                type: 'select',
                options: enumToSelectOptions(AssetStatus, ASSET_STATUS_LABELS),
                props: {
                  className: alwaysShrink ? 'w-full' : 'min-w-40',
                },
                wrapperClassName: alwaysShrink ? 'flex-1' : '',
              },
              {
                key: 'country',
                placeholder: 'All Countries',
                type: 'searchable-select',
                options: COUNTRIES_OPTIONS.map(option => ({...option, label: capitalize(option.label)})),
                props: {
                  className: alwaysShrink ? 'w-full' : 'max-w-50',
                  onInvalidSearchChange: (invalid: boolean) => setInvalidCountrySearch(invalid),
                },
                wrapperClassName: alwaysShrink ? 'flex-1' : '',
              },
              {
                key: 'type',
                placeholder: 'All Types',
                type: 'select',
                options: ASSET_TYPE_OPTIONS,
                props: {
                  className: alwaysShrink ? 'w-full' : 'min-w-[150px]',
                },
                wrapperClassName: alwaysShrink ? 'flex-1' : '',
              },
            ] as any
          }
          onChange={setFilter}
        />
        {(noAssetFound || invalidFilters) && <EmptyScreen message={getErrorMessage('E-10033')} />}
        {!invalidFilters && (
          <div className="flex flex-col gap-12">
            {/* Solar Section */}
            <AssetSection
              key={AssetType.Solar}
              filter={filter}
              assetType={AssetType.Solar}
              onReassign={handleReassign}
              onView={handleViewDetails}
            />

            {/* Battery Section */}
            <AssetSection
              key={AssetType.BESS}
              filter={filter}
              assetType={AssetType.BESS}
              onReassign={handleReassign}
              onView={handleViewDetails}
            />

            {/* Solar + Battery Section */}
            <AssetSection
              key={AssetType['Solar + BESS']}
              filter={filter}
              assetType={AssetType['Solar + BESS']}
              onReassign={handleReassign}
              onView={handleViewDetails}
            />
          </div>
        )}

        {/* Reassign Asset Ownership Modal */}
        {selectedAsset && (
          <ReassignAssetOwnership open={reassignModalOpen} onClose={closeReassignModal} asset={selectedAsset} />
        )}
      </div>

      <div className={cn('grow', showEmptyScreen ? 'block' : 'hidden')}>
        <NoAssetsAvailable organizationName={failureData?.organization_name}>{AddAssetCTA}</NoAssetsAvailable>
      </div>
    </ScreenWrapper>
  );
}
