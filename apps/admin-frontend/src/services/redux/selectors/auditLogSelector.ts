import {type RootState} from '../rootReducer';

/** error/success selector */
export const auditLogSuccess = (state: RootState) => state.auditLog.auditLogSuccess;
export const auditLogFailure = (state: RootState) => state.auditLog.auditLogError;

/** loading selector */
export const auditLogLoading = (state: RootState) => state.auditLog.isLoading;

/** audit log management selector */
export const auditLogs = (state: RootState) => state.auditLog.auditLogs;
export const auditLogTotalPages = (state: RootState) => state.auditLog.totalPages;
export const auditLogNextPage = (state: RootState) => state.auditLog.nextPage;
export const auditLogCurrentPage = (state: RootState) => state.auditLog.currentPage;
export const totalAuditLogResults = (state: RootState) => state.auditLog.totalResults;
