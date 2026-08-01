import {RootState} from '../rootReducer';

export const analyticsFilterAssetId = (state: RootState) => state.analyticsFilter.assetId;
export const analyticsFilterMonth = (state: RootState) => state.analyticsFilter.month;
export const analyticsFilterYear = (state: RootState) => state.analyticsFilter.year;
export const analyticsFilterAssetType = (state: RootState) => state.analyticsFilter.assetType;
