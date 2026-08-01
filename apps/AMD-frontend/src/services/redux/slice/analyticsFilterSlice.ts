import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {AnalyticsFilterSliceInitialState} from '@/interface';

const initialState: AnalyticsFilterSliceInitialState = {
  assetId: null,
  month: null,
  year: null,
  assetType: null,
};

const analyticsFilterSlice = createSlice({
  name: 'analyticsFilter',
  initialState,
  reducers: {
    updateAnalyticsFilter: (state, action: PayloadAction<Partial<AnalyticsFilterSliceInitialState>>) => {
      if (action.payload.assetId !== undefined) {
        state.assetId = action.payload.assetId;
      }
      if (action.payload.month !== undefined) {
        state.month = action.payload.month;
      }
      if (action.payload.year !== undefined) {
        state.year = action.payload.year;
      }
      if (action.payload.assetType !== undefined) {
        state.assetType = action.payload.assetType;
      }
    },
    resetAnalyticsFilter: state => {
      state.assetId = null;
      state.month = null;
      state.year = null;
      state.assetType = null;
    },
  },
});

export const {updateAnalyticsFilter, resetAnalyticsFilter} = analyticsFilterSlice.actions;
export default analyticsFilterSlice.reducer;
