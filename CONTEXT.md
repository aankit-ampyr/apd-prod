# Lazarus monorepo context

## What this repo is
- Lazarus is a multi-app monorepo with shared packages under `packages/` and applications under `apps/`.
- There are **two user-facing platforms**: **AMD** and **BESS**.
- **Users are shared/common** across AMD and BESS.

## Apps (high level)
- `apps/admin-backend`: super-admin backend (cross-platform administration)
- `apps/AMD-backend`: backend for AMD platform users
- `apps/BESS-backend`: backend for BESS platform users
- `apps/admin-frontend`: super-admin UI
- `apps/AMD-frontend`: AMD platform UI
- `apps/BESS-frontend`: BESS platform UI

## Databases
- **users DB**: stores common user data
- **amd DB**: stores AMD platform data
- **bess DB**: stores BESS platform data

Notes:
- In AMD backend, organization-related tables live in the AMD DB (e.g. `organization`, `UserOrganization`).
- User lookups should use the users DB session when available (often exposed as `user_db` in code).

## Shared packages
- Shared libraries live under `packages/` (e.g. common code used by multiple apps).

