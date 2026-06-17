import type { SelectInputItem } from '@/interface';
import {type RootState} from '../rootReducer';
import {createSelector} from '@reduxjs/toolkit';

export const organizationSuccess = (state: RootState) => state.organization.organizationSuccess;
export const organizationError = (state: RootState) => state.organization.organizationError;

export const organizationLoading = (state: RootState) => state.organization.isLoading;

export const organizationList = (state: RootState) => state.organization.organizations;
export const organizationTotalPages = (state: RootState) => state.organization.totalPages;
export const organizationNextPage = (state: RootState) => state.organization.nextPage;
export const organizationCurrentPage = (state: RootState) => state.organization.currentPage;
export const organizationTotalResults = (state: RootState) => state.organization.totalResults;

export const allOrganizationsList = createSelector(
    [(state: RootState) => state.organization.allOrganizations],
    (allOrganizations) => allOrganizations.filter(item => item.status).map((organization): SelectInputItem => ({label: organization.name, id: organization.id})),
);
export const organizationMultipleUsers = (state: RootState) => state.organization.users;