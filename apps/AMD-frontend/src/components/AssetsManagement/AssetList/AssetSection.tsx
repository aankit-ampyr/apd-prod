import {AssetType} from '@/constants';
import {Asset, AssetListRequest, SortType} from '@/interface';
import {AssetCard} from './AssetCard';
import {Icon, Text} from '@/ui-kits';
import {cn} from '@/utils';
import {useDispatch, useSelector} from 'react-redux';
import {useCallback, useEffect, useState} from 'react';
import {assetListRequest} from '@/services/redux/slice';
import {
  assetCurrentPage,
  assets,
  assetTotalPages,
  assetTypeLoading,
  totalAssetResults,
} from '@/services/redux/selectors';
import {useInfiniteScroll, useWindowDimensions} from '@/hooks';

type FilterType = {
  search?: string;
  type?: AssetType;
  organization?: number;
  status?: number;
  country?: number;
  sort?: SortType;
};

interface AssetSectionProps {
  assetType: AssetType;
  onView: (asset: Asset) => void;
  filter?: FilterType;
  onReassign: (assetId: Asset) => void; // Callback function for reassigning an asset
}

const assetTypeMap = {
  [AssetType.Solar]: 'solar',
  [AssetType.BESS]: 'bess',
  [AssetType['Solar + BESS']]: 'solarBess',
} as const;

/**
 * Page size for pagination
 */
const PAGE_SIZE = 6;

export function AssetSection(props: AssetSectionProps) {
  const {assetType, onReassign, onView, filter} = props;

  // =================
  // hooks
  // =================
  const dispatch = useDispatch();
  const {width} = useWindowDimensions();

  // =================
  // selector
  // =================
  const assetsData = useSelector(assets(assetTypeMap[assetType]));
  const totalPages = useSelector(assetTotalPages(assetTypeMap[assetType]));
  const totalAssets = useSelector(totalAssetResults(assetTypeMap[assetType]));
  const currentPage = useSelector(assetCurrentPage(assetTypeMap[assetType]));
  const isLoading = useSelector(assetTypeLoading(assetTypeMap[assetType]));

  const hasMore = totalPages > currentPage || assetsData.length > getGridColSize();
  // =================
  // state
  // =================
  const [page, setPage] = useState(1);
  const [viewAll, setViewAll] = useState<boolean>(false);
  const slicedAssets = (() => {
    if (viewAll) return assetsData;
    return assetsData.slice(0, getGridColSize());
  })();

  const observerRef = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMoreAssets,
    fetchDelay: 2000,
    deps: [viewAll],
  });

  // =================
  // function
  // =================
  function loadMoreAssets() {
    if (!viewAll) return;
    if (currentPage >= totalPages) return;
    setPage(p => p + 1);
  }

  function getGridColSize() {
    let gridCols = 6;
    if (width < 2080) {
      gridCols = 5;
    }
    if (width < 1796) {
      gridCols = 4;
    }
    if (width < 1480) {
      gridCols = 3;
    }
    if (width < 1024) {
      gridCols = 2;
    }
    if (width < 768) {
      gridCols = 1;
    }
    return gridCols;
  }

  const fetchAssets = useCallback(() => {
    if (!filter) return;
    if (filter?.type && filter.type !== assetType) return;

    const payload: AssetListRequest['params'] = {page, limit: PAGE_SIZE, type: assetType};
    if (filter.search) {
      payload.search = filter.search;
    }
    if (filter.organization) {
      payload.organization = filter.organization;
    }
    if (filter.status) {
      payload.status = filter.status;
    }
    if (filter.country) {
      payload.country = filter.country;
    }
    dispatch(assetListRequest(payload));
  }, [filter, page]);

  // =================
  // effects
  // =================
  // Fetch assets on mount and when filter changes
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset page and viewAll when filter changes
  useEffect(() => {
    setPage(1);
    setViewAll(false);
  }, [filter]);

  // do not return if asset type mismatched based on filter
  if (filter?.type && filter.type !== assetType) return;

  if (assetsData.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center ">
        <div
          className={cn(
            'size-8 p-2 flex justify-center items-center rounded-sm',
            assetType === AssetType.Solar && 'bg-accent-yellow/20',
            assetType === AssetType.BESS && 'bg-blue-tint/20',
            assetType === AssetType['Solar + BESS'] && 'bg-violet-tint/20',
          )}>
          {assetType === AssetType.Solar && <Icon name="sun" className="text-accent-yellow size-5" />}
          {assetType === AssetType.BESS && <Icon name="battery" className="text-blue-tint size-5" />}
          {assetType === AssetType['Solar + BESS'] && <Icon name="solar-battery" className="text-violet-tint size-5" />}
        </div>
        <Text variant="h3" className="text-base font-bold text-secondary!">
          {AssetType[assetType]} ({totalAssets})
        </Text>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${getGridColSize()}, 1fr)`,
        }}
        className="gap-2 lg:gap-6">
        {slicedAssets.map(asset => (
          <AssetCard onView={onView} key={asset.id} asset={asset} onReassign={() => onReassign(asset)} />
        ))}
      </div>
      {!viewAll && hasMore && (
        <button
          onClick={() => {
            setViewAll(true);
            setPage(p => p + 1);
          }}
          className="cursor-pointer self-end">
          <Text className="underline text-[18px]! font-SpaceGroteskMedium">View All</Text>
        </button>
      )}
      {viewAll && (
        <button
          onClick={() => {
            setViewAll(false);
            setPage(1);
          }}
          className="cursor-pointer self-end">
          <Text className="underline text-[18px]! font-SpaceGroteskMedium">View Less</Text>
        </button>
      )}

      <div ref={observerRef} />
    </div>
  );
}
