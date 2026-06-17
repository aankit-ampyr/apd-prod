# AMD Frontend Folder Standards Handbook

This document is a reusable coding standards handbook for `apps/AMD-frontend`.

Current coverage:
- `src/screens`
- `src/components`
- comments and in-file structure related to these folders

Future-friendly intent:
- New chapters can be added later for `redux`, `hooks`, `utils`, `services`, `navigation`, `constants`, and other folders.
- Every chapter should define:
  - folder purpose
  - ownership boundaries
  - coding patterns
  - naming rules
  - comments rules
  - do and don't guidance

Observation basis:
- Standards below are derived by observing the current implementation in `screens` and `components`.
- Placeholder or incomplete files were not used as primary reference:
  - `screens/Help`
  - `screens/Settings`
  - `screens/AuditLog`
  - empty `screens/UserManagement/index.tsx` tab entry

---

## How To Read This Document

This handbook is written for junior and mid-level developers or AI coding agents.

Use this rule while deciding where code should go:
- If it represents a page route, it belongs in `screens`.
- If it represents reusable page UI, modal, form, workflow step, or feature block, it belongs in `components`.
- If a rule is not explicitly written here, follow the nearest matching pattern already used in the same folder.

---

## Chapter 1. `src/screens`

### 1.1 Folder purpose

The `screens` folder contains route-level page containers.

A screen is responsible for page orchestration, not low-level UI implementation.

Examples:
- list pages
- dashboard pages
- workflow containers
- route-aware wrappers for feature flows

### 1.2 What belongs in `screens`

Put these things inside screens:
- route-level layout
- `ScreenWrapper` usage
- page title/description area
- top-level filter state
- pagination state
- modal open/close state
- top-level Redux selectors
- top-level API request triggers
- toast handling for page actions
- table column configuration
- route param / navigation coordination

### 1.3 What should not stay in `screens`

Do not keep these in screens unless there is a strong reason:
- large forms
- detailed modal UI
- upload widgets
- reusable section cards
- view/edit section internals
- field-level validation logic
- long repeated JSX blocks that can become feature components

If the screen becomes too large because of UI detail, move that logic into `components/<Feature>`.

### 1.4 Screen design principle

A screen should be a thin orchestration layer.

That means:
- it knows what to show
- it knows when to fetch
- it knows when to open a modal
- it does not own every visual detail

### 1.5 Standard screen structure

Follow this order in most screen files:

1. imports
2. file-level constants
3. local types
4. component declaration
5. hooks
6. selectors
7. state
8. helper functions
9. data/config
10. side effects
11. JSX return

For medium and large files, use section comments like:

```ts
// =================
// hooks
// =================
```

### 1.6 Standard screen layout pattern

Most dashboard screens should follow this shape:

```tsx
export function FeatureScreen() {
  // hooks

  // selectors

  // state

  // functions

  // data/config

  // side effects

  return (
    <ScreenWrapper>
      <div className="flex flex-col gap-6 p-4">
        {/* header */}
        {/* filters */}
        {/* content */}
        {/* modal */}
      </div>
    </ScreenWrapper>
  );
}
```

### 1.7 Screen header standard

A standard list/detail screen header should contain:
- one short page description
- one primary CTA if required

Preferred behavior:
- keep description user-facing
- keep CTA action-oriented
- place CTA on the right in desktop layouts

### 1.8 List screen standard

When building a route that manages entities like users, organizations, digests, or assets, follow this pattern:

1. define a typed `FilterType`
2. keep local `page` state
3. keep local `filter` state
4. define typed `DataTableColumn<T>[]`
5. fetch on `filter` or `page` change
6. handle success/failure side effects
7. show no-data state when needed
8. render conditional modal at the bottom

Preferred composition:
- `FilterGroup`
- `DataTable`
- feature modal

### 1.9 Table column standard

Column definitions should live in the screen that owns the table.

Rules:
- always type columns as `DataTableColumn<T>[]`
- use domain model types like `User`, `Organization`, `Digest`
- use `render` for formatting, badges, actions, or multi-line display
- put sort controls only in sortable header cells

### 1.10 Filter standard

Screens should prefer declarative filter definitions through `FilterGroup`.

Rules:
- define filters with `config`
- keep placeholder text user-friendly
- keep width control in `props.className`
- reset page to `1` when filter meaning changes
- convert filter values into request payload in one place only

### 1.11 Redux standard inside screens

Redux usage in screens should remain page-focused.

Screens should:
- read data from selectors
- dispatch page-level fetch actions
- respond to success/error codes
- reset message state on cleanup

Screens should avoid:
- deep field validation logic
- complex form initialization logic
- reusable UI concerns

### 1.12 Side effects standard for screens

Each `useEffect` in a screen should have one clear responsibility.

Valid responsibilities:
- fetch list/detail data
- react to success codes
- react to error codes
- reset Redux message state
- sync no-data state
- sync route params or navigation rules

Bad pattern:
- one giant `useEffect` that fetches, cleans up, formats data, toggles UI, and handles toasts together

### 1.13 Empty state standard

When no data exists:
- show a clear empty state
- use illustration if available
- show a short sentence that explains what is missing
- show a CTA if the user can fix the state directly

Do not show:
- raw backend messages
- blank tables with no explanation
- placeholder developer text

### 1.14 Workflow screen standard

For multi-step flows like onboarding:
- the screen controls step flow
- step-specific forms belong in components
- screen manages navigation rules
- screen manages route-aware add/edit behavior
- screen manages global unsaved-change flow

### 1.15 Naming standard for screens

Rules:
- use PascalCase for exported screen components
- use folder names that match business domain
- prefer `index.tsx` inside folder-based screens
- use descriptive names like `AssetAnalysis`, `DigestManagement`, `Organizations`

### 1.16 Do and don't for screens

Do:
- keep screens orchestration-focused
- use typed filters and columns
- keep side effects separated by purpose
- render page-level modals conditionally from the screen

Do not:
- turn screens into giant form files unless the route itself is the workflow shell
- duplicate reusable view blocks across screens
- mix field validation and page orchestration in one place

---

## Chapter 2. `src/components`

### 2.1 Folder purpose

The `components` folder contains reusable UI building blocks used by screens and feature flows.

This includes:
- feature-specific components
- modals
- forms
- upload widgets
- workflow steps
- layout primitives
- smaller cross-feature utilities in `common`

### 2.2 Component-first organization rule

Organize components feature-first, not by generic technical buckets.

Preferred examples:
- `components/OrganizationManagement`
- `components/DigestManagement`
- `components/AssetsManagement`
- `components/common`

Only move something into `common` when it is truly reusable across multiple features.

### 2.3 Standard sub-folder strategy

Inside `components`, structure by feature first and by sub-domain second.

Examples already followed:
- `AssetsManagement/Actions`
- `AssetsManagement/Analysis`
- `AssetsManagement/AssetList`
- `AssetsManagement/OnboardAsset`
- `common/layout`

This is the preferred pattern going forward.

### 2.4 Barrel export standard

Each component folder should expose public items through `index.ts`.

Benefits:
- cleaner imports
- clear public surface
- easier future refactor

Preferred rule:
- every feature folder has a barrel
- every nested reusable sub-folder has a barrel if it exports more than one thing

### 2.5 What belongs in components

Put these things in components:
- reusable feature sections
- modals
- forms
- upload UIs
- cards
- table row helper visuals
- layout wrappers
- workflow step implementations
- editable section blocks

### 2.6 Component design principle

A component should have one clear job.

Examples:
- `OrganizationEntry` handles add/edit organization modal
- `AssignOrgaznizationModal` handles assign/reassign organization to user
- `AssetSection` handles one asset-type list block
- `DragAndDrop` handles upload interaction
- `Review` handles asset review UI flow

### 2.7 Props standard

Every non-trivial component should define an explicit props interface near the top of the file.

Preferred prop names:
- `open`
- `onClose`
- `onSave`
- `variant`
- `mode`
- `asset`
- `currentSelectUser`
- `currentSelectDigest`
- `currentSelectOrganization`

Rules:
- use clear domain names
- avoid unnamed `any`
- avoid giant generic prop bags
- pass only what the component actually needs

### 2.8 Form component standard

For add/edit modals and form-heavy components, the default pattern is:
- `useFormik`
- shared validation schema
- controlled `ui-kit` inputs
- submit dispatch through Redux action
- field-level error display

Standard shape:

```tsx
type FormValues = {
  name: string;
};

export function FeatureModal(props: FeatureModalProps) {
  const {values, errors, touched, dirty, isValid, handleBlur, handleChange, setFieldValue, handleSubmit} =
    useFormik({
      initialValues,
      validationSchema: FeatureSchema,
      onSubmit: handleFormSubmit,
      enableReinitialize: true,
      validateOnMount: true,
    });

  return (
    <Modal open={props.open}>
      <TextInput
        value={values.name}
        onChange={handleChange('name')}
        onBlur={handleBlur('name')}
        touched={touched.name}
        error={errors.name}
      />
      <Button disabled={!dirty || !isValid} onClick={() => handleSubmit()}>
        Save
      </Button>
    </Modal>
  );
}
```

### 2.9 Validation standard

Validation should come from shared schemas/utilities when possible.

Preferred sources:
- `@/utils`
- shared schema helpers

Use inline `Yup` only when:
- no shared schema exists
- validation is extremely local
- reusability is not expected

### 2.10 Input wiring standard

Inputs should be fully controlled.

For form inputs, wire:
- `value`
- `onChange`
- `onBlur`
- `touched`
- `error`

Also use shared input options when needed:
- `required`
- `preventLeadingSpace`
- `preventTrailingSpace`
- `allowFloat`
- `integer`
- `maxLength`

### 2.11 Data formatting standard

Normalization and formatting should happen close to the input or display where it matters.

Preferred shared helpers:
- `createCapitalizeFormattedBlurHandler`
- `handleFloatBlurWithTrailingDotFormat`
- `formatDate`
- `capitalize`
- `cn`

Do not rewrite the same formatting logic again and again inside components.

### 2.12 Modal standard

Modal components should own:
- form state
- field rendering
- local submit behavior
- close guard logic if needed

Screens should own:
- whether the modal is open
- which record is selected

### 2.13 Edit/view mode standard

When a component supports both display and editing, use one of these patterns:
- `canEdit`
- `isEditing`
- `activeEditSection`

Expected behavior:
- render summary mode when not editing
- render form mode when editing
- provide `Cancel`
- provide `Save`
- reset local form state when discarding

### 2.14 Upload component standard

Upload flows should be split into focused parts:
- upload interaction component
- preview component
- validation error component
- confirm-remove modal

Benefits:
- easier testing
- easier reuse
- easier maintenance

### 2.15 Layout component standard

Cross-feature layout components should live in `components/common/layout`.

Layout components should focus on:
- page frame
- navigation shell
- route header
- top-level visual structure

They should not become feature-specific containers.

### 2.16 Redux standard inside components

Heavier feature components may use Redux when they directly own form submits, uploads, or section-level data.

This is acceptable for:
- modals
- upload widgets
- workflow steps
- review/edit sections

But keep the Redux usage focused on the component’s responsibility only.

### 2.17 Side effects standard inside components

Component `useEffect` blocks should be short and purpose-specific.

Typical valid uses:
- initialize form values from selected entity
- react to success/failure codes
- reset message state on unmount
- refetch dependent dropdown data
- sync edit mode or dirty state

### 2.18 Naming standard for components

Rules:
- file names use PascalCase for component files
- exported component names use PascalCase
- names should explain purpose, not just appearance

Good examples:
- `OrganizationEntry`
- `ReassignAssetOwnership`
- `AssetBasicInformation`
- `AssetOperations`

Naming should answer:
- what does this component do?
- where is it used?

### 2.19 Do and don't for components

Do:
- keep components feature-scoped
- define typed props
- use shared UI-kit primitives
- use shared helpers and schemas
- break large UI into subcomponents

Do not:
- dump unrelated feature logic into one giant component
- create generic abstractions too early
- leave repeated code unextracted when the pattern is obvious
- push reusable UI into screens

---

## Chapter 3. Comments and In-file Documentation Standard

### 3.1 Why comments exist

Comments are for explaining intent, business rules, non-obvious flow, and edge cases.

Comments are not for narrating obvious code.

Bad comment:

```ts
// set loading true
setLoading(true);
```

Good comment:

```ts
// Ignore passive list-fetch success codes to avoid noisy success toasts on first page load.
```

### 3.2 Standard comment categories

Use comments for these cases:
- business rules
- workflow step restrictions
- ignored success/error codes
- non-obvious resets
- fallback behavior
- route-specific exceptions
- file upload assumptions
- temporary technical constraints

### 3.3 Section comments standard

For medium and large files, use section comments to create reading rhythm.

Preferred pattern:

```ts
// =================
// hooks
// =================
```

Recommended sections:
- hooks
- selectors
- state
- functions
- data
- side effects
- derived values
- query params

Not every file needs every section. Use only the ones that help readability.

### 3.4 Inline comment standard

Use inline comments only when the reason is not obvious from code.

Good uses:
- why a code path is skipped
- why a toast is intentionally suppressed
- why a modal should not close
- why a field is auto-calculated

Avoid:
- comments for simple JSX
- comments that repeat variable names
- outdated comments that do not match behavior

### 3.5 Block comment standard

Use block comments only for:
- high-value component descriptions
- multi-step workflow explanation
- complex utility explanation

Do not add large banner comments to every small component.

### 3.6 Comment quality rules

A comment should be:
- short
- accurate
- domain-aware
- still useful after six months

If a comment becomes wrong, update or remove it immediately.

### 3.7 Dead comment rule

Do not keep large commented-out code blocks in production files unless they are temporary and still actively relevant.

If something is not being used:
- remove it
- or move the experiment to a separate note/task

### 3.8 Junior developer rule for comments

When writing code, ask:
- would a new team member understand why this exists?
- is the tricky part the logic or the intent?
- if the intent is tricky, add a comment

---

## Chapter 4. Shared Rules Across All Folders

These rules apply to both `screens` and `components`, and should be reused in future chapters too.

### 4.1 Naming

- use business-oriented names
- avoid vague names like `Data`, `Info`, `Helper`, `Manager` unless truly justified
- keep types, props, and state names descriptive

### 4.2 Type safety

- prefer typed props and typed local aliases
- use domain model types from `@/interface`
- avoid `any` unless absolutely unavoidable

### 4.3 Shared imports

Prefer these shared sources before writing custom replacements:
- `@/ui-kits`
- `@/utils`
- `@/hooks`
- `@/services/redux/selectors`
- `@/services/redux/slice`

### 4.4 Styling

- Tailwind utility classes are the default styling system
- use `cn()` when composing conditional classes
- use shared UI-kit components before raw HTML controls

### 4.5 Reuse before duplication

If a pattern appears in multiple places:
- first check `components/common`
- then check feature folder subcomponents
- then check existing hooks/utilities

Only create something new when an existing pattern truly does not fit.

---

## Chapter 5. `src/services`

### 5.1 Folder purpose

The `services` folder contains application-facing integration layers.

Current structure:
- `services/api`
- `services/redux`

This folder is responsible for:
- external API communication
- Redux state management
- async side effects through sagas
- store configuration

### 5.2 What belongs in `services`

Put these things in `services`:
- API request functions
- Axios/fetch setup
- auth header setup
- Redux slices
- Redux selectors
- sagas
- store configuration
- root reducer wiring

Do not put these here:
- page UI logic
- visual formatting logic
- JSX
- route rendering
- large domain-specific display helpers

### 5.3 `services/api` standard

`services/api` should be the only place where raw HTTP request configuration is written.

Rules:
- one central request layer should exist
- all feature request functions should go through that request layer
- request functions should stay thin
- prefer one function per endpoint/action
- keep request functions named by domain intent

Examples of correct intent-based naming:
- `getUsers`
- `addOrganization`
- `verifyOtp`
- `reassignAssetOwnership`
- `uploadAggregatorReport`

### 5.4 API config standard

Base URL and endpoint configuration should stay in constants, not hardcoded across files.

Observed pattern to preserve:
- `API.baseUrls`
- `API.noAuthUrls`
- `API.authUrls`

Rules:
- endpoint strings should be centralized
- dynamic routes should be functions
- no duplicate endpoint strings across service files

### 5.5 Axios wrapper standard

The shared axios wrapper should own:
- base URL selection
- request encryption
- response decryption
- cancel handling
- generic fallback error mapping
- auth/session reset behavior

Feature API functions should not reimplement this behavior.

### 5.6 Auth header standard

Auth token wiring should be centralized.

Rules:
- maintain a single auth header source of truth
- update token after login/verify flow in one place
- persist token in storage through a controlled utility path
- do not manually attach bearer tokens inside screens/components

### 5.7 `services/redux` standard

Redux is organized by responsibility:
- `slice`
- `selectors`
- `saga`
- `store`
- `rootReducer`

This folder should stay domain-driven and consistent across features.

### 5.8 Slice standard

Each feature slice should:
- define initial state
- define request/success/failure reducers
- define reset reducers where needed
- export actions and reducer

Preferred reducer lifecycle pattern:
- `somethingRequest`
- `somethingSuccess`
- `somethingFailure`

Examples:
- `loginOtpRequest / loginOtpSuccess / loginOtpFailure`
- `assetListRequest / assetListSuccess / assetListFailure`

### 5.9 Slice state design rules

Slice state should clearly separate:
- loading flags
- success/error status codes
- core data
- UI-supporting derived server data
- entity-specific sub-state

Rules:
- use predictable names like `isLoading`, `...Success`, `...Error`
- keep feature-specific nested state grouped
- do not mix unrelated domains inside one slice

### 5.10 Selector standard

Selectors should live in `services/redux/selectors`.

Rules:
- selectors should be read-only
- keep selectors small and composable
- use `createSelector` for derived values
- selector names should describe return value, not implementation

Good patterns:
- `authDataSelector`
- `assetSuccess`
- `allAssetsList`
- `allNonSolarAssetsList`

### 5.11 Saga standard

Sagas handle async workflows between Redux actions and API functions.

Rules:
- saga file should stay feature-specific
- each request action should have one matching worker saga
- use `call` for API
- use `put` for success/failure actions
- compare against shared success key
- map API result into Redux actions, not directly into UI

Preferred flow:
1. screen/component dispatches request action
2. saga calls API function
3. saga dispatches success or failure action
4. screen/component reacts through selectors

### 5.12 Store standard

Store setup should remain centralized in `store.ts`.

It should own:
- middleware setup
- persistence setup
- saga startup
- root reducer registration

Do not configure store behavior inside feature files.

### 5.13 Barrel export standard in Redux

Keep barrel exports for:
- `slice/index.ts`
- `selectors/index.ts`
- `saga/index.ts`

This improves:
- import consistency
- scalability
- easier onboarding

### 5.14 Comments standard for services

Comments are useful in services when explaining:
- why an error code maps to a fallback code
- why auto logout is triggered
- why an endpoint uses auth vs no-auth
- why a state shape is nested in a certain way
- why a request uses `takeLatest` vs `takeEvery`

Avoid comments that only repeat the function name.

### 5.15 Do and don't for services

Do:
- centralize HTTP behavior
- keep slices predictable
- keep selectors focused
- keep sagas thin and action-driven
- use shared constants for status keys and endpoints

Do not:
- call axios directly from screens/components
- put JSX-related logic into services
- duplicate endpoint strings
- put formatting/UI concerns inside selectors or sagas

---

## Chapter 6. `src/constants`

### 6.1 Folder purpose

The `constants` folder is the central source of static application configuration and shared fixed values.

Current structure includes:
- API config
- enums
- defaults
- keys
- regex
- encryption config
- error/success message JSON

### 6.2 What belongs in `constants`

Put these things in `constants`:
- enums
- environment-based API configuration
- local storage keys
- reusable dropdown option constants
- status labels
- badge/color mapping
- regex patterns
- feature-independent static values

Do not put these here:
- computed business logic
- UI rendering logic
- feature state
- request side effects

### 6.3 Constant file split standard

Split constants by responsibility.

Preferred structure:
- `api.ts` for endpoints and env config
- `enums.ts` for enums
- `defaults.ts` for static shared values and dropdown arrays
- `keys.ts` for storage and system keys
- `regex.ts` for validation regex

Do not dump every constant into one giant file.

### 6.4 Enum standard

Use enums for controlled domain values that are meaningful across the app.

Examples:
- `AssetType`
- `AssetStatus`
- `AssetSteps`

Rules:
- enum names should be singular domain nouns
- enum members should match backend/business meaning
- add comments when numeric meaning is important

### 6.5 Label and option mapping standard

When an enum is used in UI, define related mappings in constants instead of rebuilding them in screens/components.

Examples:
- dropdown options
- labels
- badge variants

Preferred patterns:
- `ASSET_TYPE_OPTIONS`
- `ASSET_STATUS_LABELS`
- `AssetStatusBadgeVariant`

### 6.6 API constant standard

All endpoint paths and base URLs should stay in `api.ts`.

Rules:
- use grouped objects like `authUrls` and `noAuthUrls`
- dynamic URLs should be functions
- env values should be read once and mapped into a stable object

### 6.7 Key standard

Storage keys and shared system keys should live in `keys.ts`.

Rules:
- use descriptive names
- avoid repeating raw storage strings in feature code
- prefer exporting from one place

### 6.8 Regex standard

Regex values should live in `regex.ts`.

Rules:
- name regex by business intent
- add short comments explaining validation rule
- do not inline large regex in form files when shared reuse is expected

### 6.9 Defaults standard

Use `defaults.ts` for reusable static values such as:
- fallback display values like `NA`
- timers
- dropdown arrays
- feature-independent status arrays
- reusable error code lists like auto logout codes

### 6.10 Barrel export standard for constants

Use `constants/index.ts` as the public import surface.

Rules:
- re-export internal constant files from there
- allow features to import from `@/constants`
- keep the public constant API predictable

### 6.11 Comments standard for constants

Comments in constants should explain:
- domain meaning of enum values
- why a constant exists
- when a static mapping is tied to backend behavior

Avoid:
- over-commenting obvious names
- comments that merely restate the variable name

### 6.12 Do and don't for constants

Do:
- centralize shared static values
- keep naming domain-based
- group constants by file responsibility
- define UI mapping constants once

Do not:
- redefine the same options in multiple components
- mix static values with runtime logic
- hardcode endpoint strings outside `api.ts`

---

## Chapter 7. `src/hooks`

### 7.1 Folder purpose

The `hooks` folder contains reusable custom React hooks that encapsulate shared application behavior.

Current examples include:
- route awareness
- role detection
- route leave detection
- unsaved changes blocking
- global event listening

### 7.2 What belongs in `hooks`

Put these things in hooks:
- reusable React behavior
- route-derived logic
- shared subscription logic
- reusable Redux-derived helper logic
- navigation guard logic

Do not put these here:
- raw service calls with no hook behavior
- pure utility functions with no hook usage
- JSX rendering
- feature-specific one-off screen logic unless reused or clearly hook-shaped

### 7.3 Hook design principle

A custom hook should hide repeated React wiring and expose a clean interface.

Good hook outcomes:
- simpler screens/components
- centralized behavior
- less duplicated `useEffect` logic

### 7.4 Hook naming standard

Rules:
- every hook starts with `use`
- helper functions colocated in hook files may be non-hook names only if clearly supporting the hook
- name hooks by the behavior they provide, not by where they are used

Good examples:
- `useRole`
- `useAppRoute`
- `useRouteLeave`
- `useUnsavedChangesNavigationBlocker`

### 7.5 Hook return standard

Hooks should return the minimum useful API.

Prefer returning:
- a clear object for multiple values
- a single primitive when only one value matters
- stable meaning over clever compactness

Example:
- `useRole()` returns multiple explicit booleans
- `useAppRoute()` returns route info object

### 7.6 Hook file structure standard

A hook file should usually follow:
1. imports
2. local interfaces/types
3. hook declaration
4. internal helper logic
5. return value

If the file contains both a hook and a helper function, keep the helper small and directly relevant.

### 7.7 Side effects standard for hooks

Hooks often wrap side effects.

Rules:
- keep each effect focused
- always clean up listeners/subscriptions
- keep dependency arrays intentional
- prefer refs when callback freshness is needed without resubscribing

Observed examples:
- event listener cleanup in `useGlobalEvent`
- callback ref pattern in `useUnsavedChangesNavigationBlocker`

### 7.8 Route hook standard

Hooks dealing with routes should:
- use router primitives internally
- return user-friendly route state
- normalize route matching logic in one place

Do not spread route matching conditions across many screens if a hook can own that behavior.

### 7.9 Redux usage standard in hooks

Hooks may use Redux selectors when they provide reusable app-level behavior.

Examples:
- `useRole`

Rules:
- selector usage inside hooks should remain lightweight
- hooks should not become hidden business workflows
- avoid triggering complex async processes unless the hook’s purpose clearly requires it

### 7.10 Barrel export standard for hooks

Use `hooks/index.ts` as the public surface.

Rules:
- export local hooks from the barrel
- also re-export approved shared hooks from external packages if that is team convention
- keep imports in screens/components clean through `@/hooks`

### 7.11 Comments standard for hooks

Comments are useful in hooks when explaining:
- why a ref is used instead of direct callback dependency
- why a route transition is being watched in a custom way
- why cleanup is necessary
- what event contract is expected

Hooks should not need excessive comments if naming and return shape are clear.

### 7.12 Do and don't for hooks

Do:
- extract repeated React behavior into hooks
- keep hook APIs simple
- clean up listeners properly
- use hooks to reduce duplication in screens/components

Do not:
- put visual rendering logic into hooks
- hide too much business logic behind vague hook names
- create hooks for one-off trivial code that is clearer inline

---

## Chapter 8. Current Deviations and Cleanup Notes

These are not standards. These are cleanup opportunities seen in current code.

- fix spelling inconsistencies over time:
  - `UserManagent`
  - `AssignOrgaznization`
  - `AddEditDigestion`
  - `Aggragator`
  - `recievedAt`
- avoid placeholder files as reference material
- avoid inconsistent quote/spacing styles between files
- avoid dead imports and commented-out legacy blocks
- if a custom `handleClose` exists for guarded modal behavior, wire it properly instead of bypassing it

---

## Chapter 9. Future Expansion Format

When adding standards for a new folder later, use this chapter template:

```md
## Chapter X. `src/<folder>`

### X.1 Folder purpose
### X.2 What belongs here
### X.3 What should not belong here
### X.4 Standard file structure
### X.5 Naming standard
### X.6 State management standard
### X.7 Comments standard
### X.8 Do and don't
### X.9 Example template
```

This will keep the handbook scalable and consistent.
