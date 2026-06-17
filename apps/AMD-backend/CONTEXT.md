# AMD-backend context

- **Role**: Backend for AMD platform users.
- **Databases**:
  - `db`: AMD platform DB (e.g. `organization`, `UserOrganization`)
  - `user_db`: users DB session for fetching common user data
- **Rule of thumb**:
  - Query platform tables from **AMD `db`**
  - Query user records from **`user_db`**

