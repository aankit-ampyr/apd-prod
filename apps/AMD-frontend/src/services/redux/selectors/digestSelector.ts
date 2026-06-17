import type {RootState} from '../rootReducer';

export const digestLoading = (state: RootState) => state.digest.isLoading;
export const digestList = (state: RootState) => state.digest.digests;
export const digestError = (state: RootState) => state.digest.digestError;
export const digestSuccess = (state: RootState) => state.digest.digestSuccess;

export const digestTotalPages = (state: RootState) => state.digest.totalPages;
export const digestCurrentPage = (state: RootState) => state.digest.currentPage;
export const digestTotalResults = (state: RootState) => state.digest.totalResults;
export const digestNextPage = (state: RootState) => state.digest.nextPage;

