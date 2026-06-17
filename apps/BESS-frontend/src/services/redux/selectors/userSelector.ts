import { createSelector } from '@reduxjs/toolkit';
import { type RootState } from '../rootReducer';
import { SelectInputItem } from '@/interface';
import { Platform, UserRole } from '@/constants';
import { authDataSelector } from './authSelector';

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

export const getAllUsers = createSelector(
  [(state: RootState) => state.user.allUsers],
  (allUsers) =>
    allUsers
      .filter(item => item.status)
      .map(user => ({
        id: user.id,
        label: user.name,
        subLabel: user.email,
      })),
);

export const getAdminUsers = createSelector(
  [(state: RootState) => state.user.allUsers],
  (allUsers) =>
    allUsers
      .filter(user => user.status &&
        (user.role === UserRole.Admin || user.role === UserRole.SuperAdmin)
      )
      .map(user => ({
        id: user.id,
        label: user.name,
        subLabel: user.email,
      })),
);

export const getAnalystUsers = createSelector(
  [(state: RootState) => state.user.allUsers],
  (allUsers) =>
    allUsers
      .filter(user => user.status && user.role === UserRole.Analyst)
      .map(user => ({
        id: user.id,
        label: user.name,
        subLabel: user.email,
      })),
);

export const getViewerUsers = createSelector(
  [(state: RootState) => state.user.allUsers],
  (allUsers) =>
    allUsers
      .filter(user => user.status && user.role === UserRole.Viewer)
      .map(user => ({
        id: user.id,
        label: user.name,
        subLabel: user.email,
      })),
);

export const getManagementUsers = createSelector(
  [(state: RootState) => state.user.allUsers],
  (allUsers) =>
    allUsers
      .filter(user => user.status && user.role === UserRole.Management)
      .map(user => ({
        id: user.id,
        label: user.name,
        subLabel: user.email,
      })),
);


export const getResponsibleUsers = createSelector(
  [(state: RootState) => state.user.allUsers],
  (allUsers) =>
    allUsers
      .filter(user =>
        user.status &&
        [UserRole.Admin, UserRole.Analyst].includes(user.role) &&
        user.platform?.includes(Platform.PSP)
      )
      .map(user => ({
        id: user.id,
        label: user.name,
        subLabel: user.email,
      })),
);
