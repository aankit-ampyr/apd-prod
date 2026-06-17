import { createSelector } from '@reduxjs/toolkit';
import { type RootState } from '../rootReducer';
import { SelectInputItem } from '@/interface';
import { ProjectStatus } from '@/constants';

/** error/success selector */
export const projectSuccess = (state: RootState) => state.project.projectSuccess;
export const projectFailure = (state: RootState) => state.project.projectError;
export const projectLoading = (state: RootState) => state.project.isloading;

/** reassign project owner selectors */
export const reassignSuccess = (state: RootState) => state.project.reassignSuccess;
export const reassignError = (state: RootState) => state.project.reassignError;
export const reassignLoading = (state: RootState) => state.project.reassignLoading;

/** project management selector */
export const projects = (state: RootState) => state.project.projects;
export const projectTotalPages = (state: RootState) => state.project.totalPages;
export const projectNextPage = (state: RootState) => state.project.nextPage;
export const projectCurrentPage = (state: RootState) => state.project.currentPage;
export const totalProjectResults = (state: RootState) => state.project.totalResults;

export const allProjectsData = (state: RootState) => state.project.allProjects;


export const allProjectsList = createSelector(
  [(state: RootState) => state.project.allProjects],
  (projects) =>
    projects
      // Filter for active projects only (exclude inactive, archived, deleted)
      .filter(project => project.status === ProjectStatus.Active)
      .map(
        (project): SelectInputItem => ({
          label: project.name,
          id: project.id,
        })
      )
);
