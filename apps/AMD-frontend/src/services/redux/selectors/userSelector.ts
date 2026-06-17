import {type RootState} from '../rootReducer';

/** error/success selector */
export const userSuccess = (state: RootState) => state.user.userSuccess;
export const userFailure = (state: RootState) => state.user.userError;

/** loading selector */
export const userLoading = (state: RootState) => state.user.isloading;

/** user management selector */
export const users = (state: RootState) => state.user.users;
export const totalPages = (state: RootState) => state.user.totalPages;
export const nextPage = (state: RootState) => state.user.nextPage;
export const currentUserPage = (state: RootState) => state.user.currentPage;
export const totalUserResults = (state: RootState) => state.user.totalResults;
