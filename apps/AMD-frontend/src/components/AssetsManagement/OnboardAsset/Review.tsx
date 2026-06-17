import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_OPTIONS,
  AssetFileBadgeVariants,
  AssetFileLabel,
  AssetFileType,
  AssetStatus,
  AssetSteps,
  AssetType,
  Country,
  CountryLabel,
  UserRole,
} from '@/constants';
import {useConfirm, useRole, useUnsavedChangesNavigationBlocker} from '@/hooks';
import {Routes} from '@/navigation/Routes';
import {
  allOrganizationsList,
  assetLoading,
  assetSuccess,
  assetError,
  currentAssetFilesLoading,
  currentSelectedAsset,
  currentSelectedAssetFiles,
  optimizedDatasetGenerationLoading,
  assetErrorMessageVars,
} from '@/services/redux/selectors';
import {
  assetOptimizationParamRequest,
  createAssetRequest,
  currentAssetFilesRequest,
  editAssetRequest,
  filterAggregatorScadaFilesRequest,
  submitAssetForApprovalRequest,
  updateAssetReportingPeriodRequest,
} from '@/services/redux/slice';
import {
  Toggle,
  Text,
  Alert,
  Icon,
  TextInput,
  SelectInput,
  SearchableSelectInput,
  Button,
  Modal,
  Badge,
  MonthYearPicker,
  MultiMonthYearSelector,
  Tooltip,
} from '@/ui-kits';
import {
  AssetOnboardingSchema,
  AssetOptmizationParamsSchema,
  cn,
  createCapitalizeFormattedBlurHandler,
  enumToSelectOptions,
  formatDate,
  formatMegaWatt,
  getErrorMessage,
  handleFloatBlurWithTrailingDotFormat,
  SuccessCodes,
  ErrorCodes,
} from '@/utils';
import {useFormik} from 'formik';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AggregatorFileUpload, ScadaFileUpload, DownloadFileButton} from './UploadReport';
import {downloadAssetFile} from '@/services/api';
import {IARReportUpload} from './IAR';
import {AnalyticsTable, ClearFilterButton, WithRole} from '@/components';
import {AssetReportFile, DataTableColumn, MonthYear} from '@/interface';

// =======================
// constants and Type
// =======================
enum AssetSection {
  BasicInformation = 'Basic Information',
  OptimizationParameters = 'Optimization Parameters',
  UploadAggragatorScadaReport = 'Upload Aggregator Scada Report',
  IARReport = 'IAR Report',
}

type PendingAction = {
  run: () => void;
} | null;

const isAggregatorScadaSectionValid = (currentAsset: ReturnType<typeof currentSelectedAsset>) =>
  Boolean(currentAsset?.aggregator_report_file && currentAsset?.scada_report_file && currentAsset?.merged_dataset_file);

const isIARScadaSectionValid = (currentAsset: ReturnType<typeof currentSelectedAsset>) =>
  Boolean(currentAsset?.iar_report_file);

/**
 * ===============================================================
 * Asset Review Component
 * ===============================================================
 * Displays and manages the review process for assets, including optimization parameters and report uploads.
 *
 * @param onUnsavedChangesChange - Callback to notify when there are unsaved changes
 * @param registerDiscardHandler - Callback to register a handler for discarding changes
 * @param mode - indicator for whether the component is in 'create' or 'edit' mode, can be used to conditionally render certain sections or actions
 */

interface ReviewProps {
  onUnsavedChangesChange?: (value: boolean) => void;
  registerDiscardHandler?: (fn: () => void) => void;
  mode?: 'create' | 'edit';
}

export function Review(props: ReviewProps) {
  const {onUnsavedChangesChange, registerDiscardHandler, mode = 'create'} = props;
  // ===============================================================
  // hooks
  // ===============================================================
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const statusChangeConfirm = useConfirm();
  const activateAssetConfirm = useConfirm();
  const {isAMDAdmin} = useRole();

  // ===============================================================
  // selector
  // ===============================================================
  const currentAsset = useSelector(currentSelectedAsset);
  const isAssetLoading = useSelector(assetLoading);

  // ===============================================================
  // states
  // ===============================================================
  /**
   * local state to maintain the status for asset status at the bottom
   */
  const [status, setStatus] = useState<boolean>(true);
  const [statusTouched, setStatusTouched] = useState<boolean>(false);

  /**
   * state to track which section is currently being edited, only allow one section to be edited at a time
   */
  const [activeEditSection, setActiveEditSection] = useState<AssetSection | null>(null);

  /**
   * state to toggle visiblity for unsaved changes modal, which prompts user to confirm before discarding unsaved changes when navigating away or switching sections
   */
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState<boolean>(false);

  /**
   * state to toggle visiblity for confirmation modal for asset creation, which prompts user to confirm before creating asset
   */
  const [showCreateAssetModal, setShowCreateAssetModal] = useState<boolean>(false);

  /**
   * state to track whether there are unsaved changes in the form or not, used to trigger visiblity of unsaved changes modal and to warn user before navigating away or switching sections
   */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * state to track user intent to be carried out after discarding changes in unsaved changes modal.
   */
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  /**
   * state to track the selected reporting period for aggregator/scada file uploads
   */
  const [reportingPeriod, setReportingPeriod] = useState<MonthYear | null>(null);

  // ===============================================================
  // Derived states
  // ===============================================================
  /**
   * state to track the current step of the asset review process.
   */
  const currentStep = currentAsset?.current_step ?? 0;

  /**
   * this a utility variable to store the boolean value, can be used to conditionally render section for solar asset
   */
  const isNonSolarAsset = currentAsset?.type !== AssetType.Solar;

  /**
   * state to whether this step is locked or not (i.e. user cannot proceed to create asset until completing previous steps and unlocking this step)
   */
  const isStepLocked = (() => {
    if (currentAsset?.status === AssetStatus.PendingApproval) return true;
    // solar asset will be editable as usual
    if (!isNonSolarAsset) {
      return false;
    }
    return currentStep < AssetSteps.IAR;
  })();
  const canEditOptimizationParameters = !isStepLocked && (isAMDAdmin || currentAsset?.status !== AssetStatus.Inactive);

  /**
   * A derevied flag to check whether the file upload section (aggregator-&-scada and IAR report) has file uploaded or not, if not disable the create asset button.
   */
  const isFileUploadSectionValid = isAggregatorScadaSectionValid(currentAsset) && isIARScadaSectionValid(currentAsset);

  /**
   * ref to reset the form values after changes inside them are discarded via discard CTA in unsaved changes modal.
   */
  const resetHandlers = useRef<Record<string, () => void>>({});

  /**
   * ref to track if reporting period has been initialized from asset data
   */
  const reportingPeriodInitialized = useRef(false);

  /**
   * variable to know if we have onboarded the asset or not
   */
  const isAssetOnboarded = [AssetStatus.Active, AssetStatus.Inactive].includes(currentAsset?.status as any);

  /**
   * blocker object for navigation blocking when there are unsaved changes
   */
  const blocker = useUnsavedChangesNavigationBlocker(hasUnsavedChanges, nextBlocker => {
    if (!nextBlocker?.proceed) return;
    setPendingAction({
      run: () => nextBlocker.proceed(),
    });
    setShowUnsavedChangesModal(true);
  });

  /**
   * Memoize the AggregateScadaSection render prop to prevent recreating the component on every render
   */
  const aggregateScadaSectionMemo = useMemo(
    () => <AggregateScadaSection monthYearValidation={reportingPeriod ?? undefined} />,
    [reportingPeriod],
  );

  // ===============================================================
  // function
  // ===============================================================
  function handleCreateAsset() {
    setShowCreateAssetModal(true);
  }

  function handleCloseCreateAssetModal() {
    setShowCreateAssetModal(false);
  }

  function handleConfirmCreateAsset() {
    if (!currentAsset?.id) return;
    dispatch(
      createAssetRequest({
        assetId: currentAsset.id,
        status,
      }),
    );
    setShowCreateAssetModal(false);
  }

  function handleSubmitAssetForApproval() {
    if (!currentAsset?.id) return;
    dispatch(submitAssetForApprovalRequest({assetId: currentAsset.id}));
    setShowCreateAssetModal(false);
  }

  function handleBack() {
    navigate(Routes.ASSET_MANAGEMENT);
  }

  function runOrBlockAction(action: () => void) {
    if (hasUnsavedChanges) {
      setPendingAction({run: action});
      setShowUnsavedChangesModal(true);
      return;
    }

    action();
  }

  async function addSectionEdit(section: AssetSection) {
    // In edit mode, check if asset is inactive and show activate confirmation
    if (mode === 'edit' && !status) {
      const result = await activateAssetConfirm({
        title: 'Activate Asset to Continue',
        message: 'To make any changes, please activate the asset first.',
        confirmText: 'Activate Now',
        cancelText: 'Cancel',
      });

      if (result && currentAsset?.id) {
        // Activate the asset
        dispatch(editAssetRequest({id: currentAsset.id, status: true}));
        setStatus(true);
        // Proceed with editing
        runOrBlockAction(() => {
          setActiveEditSection(section);
        });
      }
      return;
    }

    runOrBlockAction(() => {
      setActiveEditSection(section);
    });
  }

  function handleCancelSectionEdit() {
    setActiveEditSection(null);
  }

  function discardCurrentChanges() {
    if (activeEditSection) {
      resetHandlers.current[activeEditSection]?.();
    }

    setHasUnsavedChanges(false);
  }

  function handleDiscard() {
    setShowUnsavedChangesModal(false);
    discardCurrentChanges();

    const action = pendingAction;
    setPendingAction(null);

    action?.run();
  }

  function handleCloseUnsavedChangesModal() {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }

    setShowUnsavedChangesModal(false);
    setPendingAction(null);
  }

  async function handleStatusToggle(value: boolean) {
    if (mode === 'edit') {
      const result = await statusChangeConfirm({
        title: `${value ? 'Activate' : 'Deactivate'} Asset`,
        message: `Are you sure you want to ${value ? 'activate' : 'deactivate'} this asset?`,
      });

      if (result && currentAsset) {
        dispatch(editAssetRequest({id: currentAsset.id, status: value}));
        setStatus(value);
        setStatusTouched(true);
      }
    } else {
      setStatus(value);
      setStatusTouched(true);
    }
  }

  function handleReportingPeriodDone(value: MonthYear) {
    if (!currentAsset?.id) return;
    dispatch(
      filterAggregatorScadaFilesRequest({
        assetId: currentAsset.id,
        month: [value.month],
        year: [value.year],
      }),
    );
  }

  // ===============================================================
  // side effects
  // ===============================================================
  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  useEffect(() => {
    registerDiscardHandler?.(() => {
      if (activeEditSection) {
        resetHandlers.current[activeEditSection]?.();
      }

      setHasUnsavedChanges(false);
    });
  }, [registerDiscardHandler, activeEditSection]);

  useEffect(() => {
    if (!currentAsset) return;

    if (mode === 'edit') {
      setStatus(currentAsset.status === AssetStatus.Active);
      setStatusTouched(false);
    }
  }, [currentAsset]);

  useEffect(() => {
    // Only initialize once from asset data, don't override user selection
    if (reportingPeriodInitialized.current) return;

    // Priority 1: Use active_period from current asset if available
    if (currentAsset?.active_period) {
      reportingPeriodInitialized.current = true;
      setReportingPeriod(currentAsset.active_period);
      return;
    }

    // Fallback: Calculate from file timestamps
    const startTimestamp =
      currentAsset?.aggregator_report_file?.projection_summary?.start_timestamp ||
      currentAsset?.scada_report_file?.projection_summary?.start_timestamp;

    if (!startTimestamp) {
      return;
    }

    const date = new Date(startTimestamp);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    reportingPeriodInitialized.current = true;
    setReportingPeriod({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
  }, [
    currentAsset?.active_period,
    currentAsset?.aggregator_report_file?.projection_summary?.start_timestamp,
    currentAsset?.scada_report_file?.projection_summary?.start_timestamp,
  ]);

  /**
   * update the active period of the asset when merged file is generated and active period mismatches with reporting period, which means the user has changed the reporting period and merged files has been generated but report period is not updated
   */
  useEffect(() => {
    if (blocker.state === 'blocked') return;
    if (!currentAsset?.id) return;
    if (!currentAsset?.merged_dataset_file) return;
    
    const mergedFileMonth = currentAsset.merged_dataset_file?.month;
    const mergedFileYear = currentAsset.merged_dataset_file?.year;
    
    const currentAsserReportingMonth = currentAsset?.active_period?.month;
    const currentAsserReportingYear = currentAsset?.active_period?.year;
    
    if (currentAsserReportingMonth === mergedFileMonth && currentAsserReportingYear === mergedFileYear) return;
    
    dispatch(updateAssetReportingPeriodRequest({
      assetId: currentAsset.id,
      month: mergedFileMonth,
      year: mergedFileYear,
    }));
  }, [blocker.state, reportingPeriod, currentAsset?.active_period, currentAsset?.merged_dataset_file, currentAsset?.id]);

  return (
    <div className="flex-col flex gap-2 mx-5 items-center">
      <Text variant="h3" className="">
        {mode === 'create'
          ? currentAsset?.status === AssetStatus.PendingApproval
            ? 'Review Submitted Asset'
            : 'Review'
          : 'Asset Details'}
      </Text>
      {mode === 'create' && (
        <Text variant="14R" className="text-text-secondary!">
          {currentAsset?.status === AssetStatus.PendingApproval
            ? 'The asset is currently pending approval. You can review the submitted configuration below.'
            : isAMDAdmin
              ? 'Review all asset configuration before saving.'
              : 'Review all asset configuration before submission.'}
        </Text>
      )}

      <div className="w-full flex flex-col gap-6 mt-6">
        <SectionFrame
          title="Asset Basic Information"
          editable={isAMDAdmin && !isStepLocked}
          isEditing={activeEditSection === AssetSection.BasicInformation}
          onEdit={() => addSectionEdit(AssetSection.BasicInformation)}
          onCancel={handleCancelSectionEdit}
          children={props => (
            <BasicInformationSection
              {...props}
              setHasUnsavedChanges={setHasUnsavedChanges}
              registerReset={fn => {
                resetHandlers.current[AssetSection.BasicInformation] = fn;
              }}
            />
          )}
        />
        {isNonSolarAsset && (
          <>
            <SectionFrame
              title="Optimization Parameters"
              editable={canEditOptimizationParameters}
              showEditAction={canEditOptimizationParameters}
              isEditing={activeEditSection === AssetSection.OptimizationParameters}
              onEdit={() => addSectionEdit(AssetSection.OptimizationParameters)}
              onCancel={handleCancelSectionEdit}
              children={props => (
                <OptimizationParamsSection
                  {...props}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                  registerReset={fn => {
                    resetHandlers.current[AssetSection.OptimizationParameters] = fn;
                  }}
                />
              )}
            />

            <SectionFrame
              title="Upload Aggregator & SCADA"
              headerContent={
                isAssetOnboarded ? (
                  <AggregatorScadaReportingPeriod
                    value={reportingPeriod}
                    onChange={setReportingPeriod}
                    onDone={handleReportingPeriodDone}
                  />
                ) : null
              }
              children={() => aggregateScadaSectionMemo}
            />
            <SectionFrame title="IAR Upload" children={() => <IARReportSection />} />

            {isAssetOnboarded && <UploadFileHistory />}
          </>
        )}

        <WithRole roles={[UserRole.Admin]}>
          {currentAsset?.status !== AssetStatus.PendingApproval && (
            <div className="p-4 bg-white border-border shadow-lg shadow-border/50 border flex flex-col gap-4 rounded-lg w-full ">
              <span className="flex justify-between">
                <Text variant="free" className="font-SpaceGroteskBold text-lg">
                  Status
                </Text>
                <Toggle
                  disabled={isStepLocked}
                  value={status}
                  onToggle={handleStatusToggle}
                  label={status ? 'Active' : 'Inactive'}
                />
              </span>
              {statusTouched && status === false && !isAssetOnboarded && (
                <Alert
                  variant="warning"
                  message="Disabling this asset will pause all data processing, analysis, and reporting. You can re-enable it anytime."
                />
              )}
            </div>
          )}
        </WithRole>
      </div>

      {mode === 'create' && currentAsset?.status !== AssetStatus.PendingApproval && (
        <div className="flex gap-3 mt-5 mb-2">
          <Button variant="secondary" text="Cancel" onClick={handleBack} disabled={isStepLocked} className="px-8" />
          <Button
            text={isAMDAdmin ? 'Create Asset' : 'Submit for Approval'}
            disabled={isStepLocked || hasUnsavedChanges || !isFileUploadSectionValid}
            onClick={handleCreateAsset}
            className="px-12"
          />
        </div>
      )}

      {/* render specialist button when asset is pending approval and user is an AMD admin */}
      {mode === 'create' && currentAsset?.status === AssetStatus.PendingApproval && isAMDAdmin && (
        <div className="flex gap-3 mt-5 mb-2">
          <Button variant="secondary" text="Cancel" onClick={handleBack} className="px-8" />
          <Button
            text={'Approve & Create Asset'}
            disabled={hasUnsavedChanges || !isFileUploadSectionValid}
            onClick={handleCreateAsset}
            className="px-12"
          />
        </div>
      )}

      {blocker.state === 'blocked' || showUnsavedChangesModal ? (
        <UnsavedChangesModal
          open={showUnsavedChangesModal}
          onClose={handleCloseUnsavedChangesModal}
          onDiscard={handleDiscard}
        />
      ) : null}

      {showCreateAssetModal && (
        <CreateAssetConfirmationModal
          open={showCreateAssetModal}
          assetStatus={currentAsset?.status}
          loading={isAssetLoading}
          onClose={handleCloseCreateAssetModal}
          onConfirm={isAMDAdmin ? handleConfirmCreateAsset : handleSubmitAssetForApproval}
        />
      )}
    </div>
  );
}

/**
 * ===============================================================
 * Section Frame component
 * ===============================================================
 * Wrapper component for displaying a section with optional edit mode
 *
 * @param title - Title displayed at the top of the section
 * @param editable - Enables edit functionality and shows edit button when true
 * @param children - Render function that receives editing state and actions
 *
 * children params:
 * @param isEditing - Indicates whether the section is currently in edit mode
 * @param onCancelEdit - Callback to exit edit mode and switch back to view mode
 */

interface EditableSectionChildrenProps {
  isEditing: boolean;
  onCancelEdit?: () => void;
}

interface EditableSectionProps {
  title: string;
  isEditing?: boolean; // whether the section is in edit mode, default is false (view mode)
  onEdit?: () => void; // callback when edit button is clicked
  onCancel?: () => void; // callback when cancel button is clicked
  editable?: boolean;
  showEditAction?: boolean;
  editDisabledReason?: string;
  headerContent?: React.ReactNode;
  children: (props: EditableSectionChildrenProps) => React.ReactNode;
}

function SectionFrame(props: EditableSectionProps) {
  const {
    title,
    editable = false,
    showEditAction = editable,
    editDisabledReason,
    children,
    isEditing = false,
    onCancel,
    onEdit,
    headerContent,
  } = props;

  return (
    <div className="w-full rounded-lg  border border-border shadow-md shadow-border/40">
      <div className="rounded-t-lg bg-linear-to-r py-4 pl-6 pr-4 flex justify-between from-primary-tint-2 to-[#C6ECE8]">
        <Text variant="free" className="font-SpaceGroteskBold text-[22px]">
          {title}
        </Text>
        {showEditAction && !isEditing && (
          <span className="relative group z-10 translate-x-1 overflow-visible">
            {editDisabledReason ? (
              <Tooltip
                message={editDisabledReason}
                position="top"
                className="-translate-y-1 left-1/2 max-w-52 whitespace-normal wrap-break-word px-2 -translate-x-[56%]"
                arrowClassName="w-3 h-3 -mt-1.5 left-1/2 -translate-x-1/2"
              />
            ) : null}
            <button
              disabled={!editable}
              onClick={() => onEdit?.()}
              className={cn(
                'bg-white size-8 flex justify-center items-center rounded-sm',
                editable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
              )}>
              <Icon name="pencil" />
            </button>
          </span>
        )}
        {headerContent}
      </div>
      <div className="px-6 py-6">{children({isEditing, onCancelEdit: onCancel})}</div>
    </div>
  );
}

/**
 * ===============================================================
 * Key Value Display
 * ===============================================================
 * Renders a label-value pair in a horizontal layout.
 *
 * @param label - The label or key (e.g. "Name", "Capacity")
 * @param value - The formatted value to display
 */
interface KeyValueDisplayProps {
  label: string;
  value: string;
  className?: string;
}
function KeyValueDisplay(props: KeyValueDisplayProps) {
  const {label, value, className} = props;
  return (
    <div className={cn('flex min-w-0 items-start gap-2', className)}>
      <Text variant="14R" className="shrink-0 text-text-primary! text-nowrap">
        {label} :
      </Text>
      <Text
        variant="free"
        className="min-w-0 flex-1 wrap-break-word whitespace-normal font-InterSemiBold text-caption text-text-primary">
        {value}
      </Text>
    </div>
  );
}

/**
 * ===============================================================
 * Basic Information Section
 * ===============================================================
 * Displays and edits basic asset information inside SectionFrame
 *
 * @param isEditing - Indicates whether the section is currently in edit mode
 * @param onCancelEdit - Callback to exit edit mode and revert to view state
 */
interface BasicInformationProps extends EditableSectionChildrenProps {
  registerReset?: (fn: () => void) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
}

const BasicInformationSection = (props: BasicInformationProps) => {
  const {isEditing, onCancelEdit, registerReset, setHasUnsavedChanges} = props;

  // ===============
  // constants
  // ===============
  type BasicInformationFormValues = {
    name: string;
    type: AssetType | null;
    capacity: string;
    location: string;
    country_id: number | null;
    organization_id: number | null;
  };
  const COUNTRIES_OPTIONS = enumToSelectOptions(Country, CountryLabel);
  const NAME_VALIDATION_ERROR_CODES: ErrorCodes[] = ['E-10060', 'E-10125'];

  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();
  const {isAMDAdmin} = useRole();

  // ===============
  // selector
  // ===============
  const allOrgs = useSelector(allOrganizationsList);
  const currentAsset = useSelector(currentSelectedAsset);
  const failureMessageVars = useSelector(assetErrorMessageVars);
  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetError) as ErrorCodes;
  const formValues: BasicInformationFormValues = {
    name: currentAsset?.name || '',
    type: currentAsset?.type || null,
    capacity: currentAsset ? String(currentAsset.capacity) : '',
    location: currentAsset?.location || '',
    country_id: currentAsset?.country?.id || null,
    organization_id: currentAsset?.organization?.id || null,
  };

  const {
    dirty,
    isValid,
    values,
    errors,
    touched,
    handleSubmit,
    handleBlur,
    handleChange,
    setFieldValue,
    resetForm,
    setFieldError,
  } = useFormik({
    initialValues: formValues,
    onSubmit: handleSubmitForm,
    validationSchema: AssetOnboardingSchema,
    enableReinitialize: true,
  });

  // ===============
  // functions
  // ===============
  function handleSubmitForm(values: BasicInformationFormValues) {
    if (!currentAsset?.id) return;
    if (!values.country_id) return;
    if (!values.organization_id) return;
    if (!values.type) return;

    dispatch(
      editAssetRequest({
        id: currentAsset.id,
        capacity: Number(values.capacity),
        country_id: values.country_id,
        location: values.location,
        name: values.name,
        organization_id: values.organization_id,
        type: values.type,
      }),
    );
  }

  function handleCancelEdit() {
    resetForm();
    onCancelEdit?.();
  }

  // ===============
  // side effects
  // ===============
  useEffect(() => {
    if (success && success === 'S-10028') {
      onCancelEdit?.();
    }
    if (failure && NAME_VALIDATION_ERROR_CODES.includes(failure)) {
      let message = getErrorMessage(failure);
      // for E-10125 we need to pass the asset name in the error message
      if (failure === 'E-10125') {
        message = getErrorMessage(failure, failureMessageVars);
      }
      setFieldError('name', message);
    }
  }, [failure, success]);

  useEffect(() => {
    registerReset?.(() => {
      resetForm();
      onCancelEdit?.(); // exit edit mode
    });
  }, [resetForm, onCancelEdit]);

  useEffect(() => {
    setHasUnsavedChanges?.(dirty);
  }, [dirty]);

  if (!isAMDAdmin || !isEditing) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Name', currentAsset?.name || ''],
          ['Type', currentAsset && currentAsset?.type ? ASSET_TYPE_LABELS[currentAsset.type] : ''],
          ['Capacity', formatMegaWatt(currentAsset?.capacity || 0)],
          ['Location', currentAsset?.location || ''],
          ['Country', currentAsset?.country?.name || ''],
          ['Org', currentAsset?.organization?.name || ''],
        ].map(([label, value], index) => (
          <KeyValueDisplay label={label} value={value} key={index} className="min-w-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-4">
      <div className="grid grid-cols-2 w-full gap-4 gap-x-20 gap-y-4">
        <TextInput
          value={values.name}
          error={errors.name}
          wrapperClassName="bg-white! pl-3.5"
          maxLength={150}
          touched={touched.name}
          onChange={handleChange('name')}
          onBlur={createCapitalizeFormattedBlurHandler(handleBlur('name'), setFieldValue, 'name')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., solar farm alpha"
          label="Asset Name"
          required
        />
        <SelectInput
          value={values.type}
          iconClassName="text-text-secondary!"
          error={errors.type}
          wrapperClassName="bg-white!"
          touched={touched.type}
          options={ASSET_TYPE_OPTIONS}
          onChange={item => setFieldValue('type', item.id)}
          onBlur={handleBlur('type')}
          placeholder="Select asset type"
          label="Asset Type"
          required
        />
        <TextInput
          value={values.capacity}
          allowFloat
          wrapperClassName="bg-white! pl-3.5"
          error={errors.capacity}
          touched={touched.capacity || Boolean(values.capacity)}
          preventLeadingSpace
          preventTrailingSpace
          onChange={handleChange('capacity')}
          onBlur={handleBlur('capacity')}
          placeholder="e.g., 150.55"
          label="Capacity MW"
          required
        />
        <TextInput
          value={values.location}
          error={errors.location}
          touched={touched.location}
          wrapperClassName="bg-white! pl-3.5"
          maxLength={150}
          preventLeadingSpace
          preventTrailingSpace
          onChange={handleChange('location')}
          onBlur={createCapitalizeFormattedBlurHandler(handleBlur('location'), setFieldValue, 'location')}
          placeholder="e.g., Chennai, TN"
          label="Location"
          required
        />
        <SearchableSelectInput
          value={values.country_id}
          wrapperClassName="bg-white!"
          error={errors.country_id}
          touched={touched.country_id}
          options={COUNTRIES_OPTIONS}
          onChange={item => setFieldValue('country_id', item.id)}
          onBlur={handleBlur('country_id')}
          placeholder="Select Country"
          label="Country"
          required
          invalidSearchError={getErrorMessage('E-10108')}
        />

        <SearchableSelectInput
          value={values.organization_id}
          wrapperClassName="bg-white!"
          error={errors.organization_id}
          touched={touched.organization_id}
          options={allOrgs}
          onChange={item => setFieldValue('organization_id', item.id)}
          onBlur={handleBlur('organization_id')}
          placeholder="Select Owner Organization"
          label="Owner Organization"
          required
          invalidSearchError={getErrorMessage('E-10109')}
        />
      </div>

      <div className="gap-3 self-center flex items-center">
        <Button variant="secondary" className="w-full px-8" onClick={handleCancelEdit}>
          Cancel
        </Button>
        <Button className="w-full px-8" disabled={!dirty || !isValid} onClick={() => handleSubmit()}>
          {values.type !== AssetType.Solar ? 'Save & Continue' : 'Save'}
        </Button>
      </div>
    </div>
  );
};

/**
 * ===============================================================
 * Optimization Parameters Section
 * ===============================================================
 * Displays and edits optimization parameters inside SectionFrame
 *
 * @param isEditing - Indicates whether the section is currently in edit mode
 * @param onCancelEdit - Callback to exit edit mode and revert to view state
 */
interface OptimizationParamsProps extends EditableSectionChildrenProps {
  registerReset?: (fn: () => void) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
}
const OptimizationParamsSection = (props: OptimizationParamsProps) => {
  const {isEditing, onCancelEdit, registerReset, setHasUnsavedChanges} = props;
  // ===============
  // constants
  // ===============
  type OptimizationParamsFormValues = {
    max_charge_rate: string;
    max_discharge_rate: string;
    usable_capacity: string;
    min_soc: string;
    max_soc: string;
    round_trip_efficiency: string;
    max_daily_cycles: string;
  };

  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();

  // ===============
  // selector
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);
  const success = useSelector(assetSuccess) as SuccessCodes;
  const formValues: OptimizationParamsFormValues = {
    max_charge_rate: currentAsset?.max_charging_rate ? String(currentAsset.max_charging_rate) : '',
    max_discharge_rate: currentAsset?.max_discharging_rate ? String(currentAsset.max_discharging_rate) : '',
    usable_capacity: currentAsset?.usable_capacity ? String(currentAsset.usable_capacity) : '',
    min_soc: currentAsset?.soc_min ? String(currentAsset.soc_min) : '',
    max_soc: currentAsset?.soc_max ? String(currentAsset.soc_max) : '',
    round_trip_efficiency: currentAsset?.round_trip_efficiency ? String(currentAsset.round_trip_efficiency) : '',
    max_daily_cycles: currentAsset?.max_daily_cycles ? String(currentAsset.max_daily_cycles) : '',
  };

  const {isValid, values, errors, resetForm, touched, handleSubmit, handleBlur, handleChange, dirty, setFieldValue} =
    useFormik({
      initialValues: formValues,
      onSubmit: handleOnboardAsset,
      validationSchema: AssetOptmizationParamsSchema,
      enableReinitialize: true,
    });

  // ===============
  // function
  // ===============
  const powerAsymmetryRatio = (() => {
    if (!values.max_charge_rate || !values.max_discharge_rate) {
      return null;
    }

    const ratio = Number.parseFloat(values.max_discharge_rate) / Number.parseFloat(values.max_charge_rate);
    if (!isFinite(ratio)) return null;
    return ratio.toPrecision(2);
  })();

  function handleOnboardAsset(values: OptimizationParamsFormValues) {
    if (!currentAsset) return;
    dispatch(
      assetOptimizationParamRequest({
        id: currentAsset?.id,
        max_charging_rate: Number(values.max_charge_rate),
        max_daily_cycles: Number(values.max_daily_cycles),
        max_discharging_rate: Number(values.max_discharge_rate),
        round_trip_efficiency: Number(values.round_trip_efficiency),
        soc_max: Number(values.max_soc),
        soc_min: Number(values.min_soc),
        usable_capacity: Number(values.usable_capacity),
      }),
    );
  }

  function handleCancelEdit() {
    resetForm();
    onCancelEdit?.();
  }

  // ===============
  // side effects
  // ===============
  useEffect(() => {
    if (success && success === 'S-10027') {
      onCancelEdit?.();
    }
  }, [success]);

  useEffect(() => {
    registerReset?.(() => {
      resetForm();
      onCancelEdit?.(); // exit edit mode
    });
  }, [resetForm, onCancelEdit]);

  useEffect(() => {
    setHasUnsavedChanges?.(dirty);
  }, [dirty]);

  if (!isEditing) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Maximum Charging Rate', formatMegaWatt(currentAsset?.max_charging_rate || 0)],
          ['Power Asymmetry Ratio', powerAsymmetryRatio ? `${Number(powerAsymmetryRatio)}` : ''],
          ['Minimum SOC', `${currentAsset?.soc_min || 0}%`],
          ['Maximum Discharging Rate', formatMegaWatt(currentAsset?.max_discharging_rate || 0)],
          ['Usable Capacity', formatMegaWatt(currentAsset?.usable_capacity || 0) + 'h'],
          ['Maximum SOC', `${currentAsset?.soc_max || 0}%`],
          ['Round-Trip Efficiency', `${currentAsset?.round_trip_efficiency || 0}%`],
          ['Maximum Daily Cycles', `${currentAsset?.max_daily_cycles || 0}`],
        ].map(([label, value], index) => (
          <KeyValueDisplay label={label} value={value} key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-4">
      <div className="grid grid-cols-2 w-full gap-4 gap-x-20 gap-y-4">
        <TextInput
          value={values.max_charge_rate}
          error={errors.max_charge_rate}
          allowFloat
          touched={touched.max_charge_rate}
          onChange={handleChange('max_charge_rate')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_charge_rate', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_charge_rate')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 4.2"
          wrapperClassName="bg-white!"
          label="Maximum Charging Rate (MW)"
          required
        />
        <TextInput
          value={values.max_discharge_rate}
          error={errors.max_discharge_rate}
          allowFloat
          touched={touched.max_discharge_rate}
          onChange={handleChange('max_discharge_rate')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_discharge_rate', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_discharge_rate')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 7.5"
          wrapperClassName="bg-white!"
          label="Maximum Discharging Rate (MW)"
          required
        />
        <TextInput
          value={powerAsymmetryRatio ?? ''}
          allowFloat
          placeholder="Auto calculated"
          label="Power Asymmetry Ratio"
          wrapperClassName="min-h-10"
          info
          infoMessage={
            'Power asymmetry ratio cannot \nbe edited manually. It is\nautomatically calculated from\nMaximum Discharging Rate (MW)\nand Maximum Charging Rate (MW)'
          }
          readonly
        />
        <TextInput
          value={values.usable_capacity}
          error={errors.usable_capacity}
          allowFloat
          touched={touched.usable_capacity}
          onChange={handleChange('usable_capacity')}
          onBlur={handleFloatBlurWithTrailingDotFormat('usable_capacity', handleBlur, setFieldValue)}
          onFocus={handleBlur('usable_capacity')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 8.4"
          label="Usable Capacity (MWh)"
          wrapperClassName="bg-white!"
          required
        />
        <TextInput
          value={values.min_soc}
          error={errors.min_soc}
          integer
          touched={touched.min_soc}
          onChange={handleChange('min_soc')}
          onBlur={handleFloatBlurWithTrailingDotFormat('min_soc', handleBlur, setFieldValue)}
          onFocus={handleBlur('min_soc')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 5"
          label="Minimum SOC (%)"
          wrapperClassName="bg-white!"
          required
        />
        <TextInput
          value={values.max_soc}
          error={errors.max_soc}
          integer
          touched={touched.max_soc}
          onChange={handleChange('max_soc')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_soc', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_soc')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 95"
          label="Maximum SOC (%)"
          wrapperClassName="bg-white!"
          required
        />
        <TextInput
          value={values.round_trip_efficiency}
          error={errors.round_trip_efficiency}
          allowFloat
          touched={touched.round_trip_efficiency}
          onChange={handleChange('round_trip_efficiency')}
          onBlur={handleFloatBlurWithTrailingDotFormat('round_trip_efficiency', handleBlur, setFieldValue)}
          onFocus={handleBlur('round_trip_efficiency')}
          preventLeadingSpace
          preventTrailingSpace
          placeholder="e.g., 88"
          wrapperClassName="bg-white!"
          label="Round-Trip Efficiency (%)"
          required
        />
        <TextInput
          value={values.max_daily_cycles}
          error={errors.max_daily_cycles}
          allowFloat
          touched={touched.max_daily_cycles}
          onChange={handleChange('max_daily_cycles')}
          onBlur={handleFloatBlurWithTrailingDotFormat('max_daily_cycles', handleBlur, setFieldValue)}
          onFocus={handleBlur('max_daily_cycles')}
          preventLeadingSpace
          preventTrailingSpace
          wrapperClassName="bg-white!"
          placeholder="e.g., 1.5"
          label="Maximum Daily Cycles"
          required
        />
      </div>
      <div className="flex gap-3 self-center">
        <Button variant="secondary" className="px-8" onClick={handleCancelEdit}>
          Cancel
        </Button>
        <Button disabled={!isValid || !dirty} className="px-8" onClick={() => handleSubmit()}>
          Save & Continue
        </Button>
      </div>
    </div>
  );
};

interface CreateAssetConfirmationModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assetStatus?: AssetStatus;
}

function CreateAssetConfirmationModal(props: CreateAssetConfirmationModalProps) {
  const {open, loading = false, onClose, onConfirm, assetStatus} = props;
  const {isAMDAdmin} = useRole();

  if (!isAMDAdmin) {
    return (
      <Modal open={open} onClose={onClose} maxWidth={625} className="flex flex-col gap-3">
        <Text variant="free" className="font-InterSemiBold text-2xl text-text-primary">
          Submit Asset for Approval
        </Text>
        <Text variant="free" className="font-InterRegular text-body-1 text-text-secondary! leading-7">
          Once submitted, this asset <span className="text-text-primary font-InterMedium!">cannot be changed</span>{' '}
          until the admin completes their review. Please make sure everything is correct before continuing.
        </Text>
        <div className="flex gap-4 mt-4 justify-end">
          <Button
            variant="secondary"
            className="px-8"
            onClick={onClose}
            text="Cancel"
            disabled={loading}
            textClassName="text-[#1B988B]!"
          />
          <Button variant="primary" className="px-8" onClick={onConfirm} text="Confirm & Submit" loading={loading} />
        </div>
      </Modal>
    );
  }
  // for AMD admin, if asset is pending approval, show different message and button text
  if (isAMDAdmin && assetStatus === AssetStatus.PendingApproval) {
    return (
      <Modal open={open} onClose={onClose} maxWidth={625} className="flex flex-col gap-3">
        <Text variant="free" className="font-InterSemiBold text-2xl text-text-primary">
          Approve & create asset?
        </Text>
        <Text variant="free" className="font-InterRegular text-body-1 text-text-secondary! leading-7">
          Once approved, this asset will become Active and will be available for monthly uploads and analysis.
        </Text>
        <div className="flex gap-4 mt-4 justify-end">
          <Button
            variant="secondary"
            className="px-8"
            onClick={onClose}
            text="Cancel"
            disabled={loading}
            textClassName="text-[#1B988B]!"
          />
          <Button
            variant="primary"
            className="px-8"
            onClick={onConfirm}
            text="Approve & Create Asset"
            loading={loading}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={625} className="flex flex-col gap-3">
      <Text variant="h3">Confirm Asset Creation</Text>
      <Text variant="18M">Are you sure you want to create this asset?</Text>
      <Text variant="14R" className="text-text-secondary!">
        Please ensure all details are correct.
      </Text>

      <div className="flex gap-4 mt-4 justify-end">
        <Button
          variant="secondary"
          className="px-8"
          onClick={onClose}
          text="Cancel"
          disabled={loading}
          textClassName="text-[#1B988B]!"
        />
        <Button variant="primary" className="px-8" onClick={onConfirm} text="Confirm" loading={loading} />
      </div>
    </Modal>
  );
}

// function SubmitAssetForApprovalConfirmationModal(props: CreateAssetConfirmationModalProps) {

interface UnsavedChangesModalProps {
  open: boolean;
  onClose: () => void;
  onDiscard: () => void;
}
export function UnsavedChangesModal(props: UnsavedChangesModalProps) {
  const {open, onClose, onDiscard} = props;
  return (
    <Modal maxWidth={625} open={open} className="flex flex-col gap-3">
      <Text variant="h3">Unsaved Changes</Text>
      <Text variant="18M">You have unsaved changes. Do you want to discard them and continue?</Text>

      <div className="flex gap-4 mt-4 justify-end">
        <Button variant="secondary" className="px-8" onClick={onClose} text="Stay" />
        <Button variant="primary" className="px-8" onClick={onDiscard} text="Discard & Continue" />
      </div>
    </Modal>
  );
}

interface AggregatorScadaSectionProps {
  monthYearValidation?: MonthYear;
}

function AggregateScadaSection(props: AggregatorScadaSectionProps) {
  const {monthYearValidation} = props;
  // ===============
  // hooks
  // ===============
  const navigate = useNavigate();

  // ===============
  // selector
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);
  const isOptimizedDatasetLoading = useSelector(optimizedDatasetGenerationLoading);

  // ===============
  // states
  // ===============
  const currentStep = currentAsset?.current_step ?? 0;
  const isStepLocked = currentStep < AssetSteps.IAR;
  const isAssetInactive = currentAsset?.status === AssetStatus.Inactive;
  const isAssetPendingApproval = currentAsset?.status === AssetStatus.PendingApproval;

  // ===============
  // states
  // ===============
  const bothFilePresent = Boolean(
    currentAsset?.aggregator_report_file && currentAsset?.scada_report_file && currentAsset?.merged_dataset_file,
  );

  const optimizedDatasetPresent = Boolean(
    currentAsset?.aggregator_report_file && currentAsset?.scada_report_file && currentAsset?.optimized_dataset_file,
  );

  // ===============
  // function
  // ===============
  function viewAnalysis() {
    if (!currentAsset?.id) return;
    navigate(Routes.VIEW_ASSET_ANALYSIS.replace(':id', String(currentAsset.id)));
  }

  function handleDownloadFile(id: number, name: string) {
    if (!currentAsset?.id) return;
    downloadAssetFile({
      assetId: currentAsset?.id,
      fileId: id,
      fileName: name,
    });
  }

  return (
    <div className="gap-10 flex-col flex">
      <AggregatorFileUpload
        disabled={isStepLocked || isAssetInactive || isAssetPendingApproval}
        variant="inline"
        className="border-none! p-0! z-10"
        monthYearValidation={monthYearValidation}
      />
      <ScadaFileUpload
        disabled={isStepLocked || isAssetInactive || isAssetPendingApproval}
        variant="inline"
        className="border-none! p-0!"
        monthYearValidation={monthYearValidation}
      />

      <div className="grid grid-cols-3 gap-6 -mt-4">
        <button
          disabled={isStepLocked || !bothFilePresent}
          onClick={viewAnalysis}
          className="flex cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed items-center gap-3 rounded-md bg-white shadow-sm justify-between border-border border px-6 py-4">
          <Text variant="18M" className={`text-primary!`}>
            View Analysis
          </Text>

          <Icon name="link" className="text-primary! size-5" />
        </button>

        {bothFilePresent && (
          <DownloadFileButton
            className="pl-6"
            disabled={isStepLocked || !bothFilePresent || isAssetInactive}
            text="Merged Data"
            onClick={() => {
              if (!currentAsset?.merged_dataset_file) return;
              handleDownloadFile(currentAsset?.merged_dataset_file?.id, currentAsset?.merged_dataset_file?.name);
            }}
          />
        )}

        {optimizedDatasetPresent && (
          <DownloadFileButton
            className="pl-6"
            disabled={isStepLocked || isOptimizedDatasetLoading || isAssetInactive}
            text="Optimized Result"
            onClick={() => {
              if (!currentAsset?.optimized_dataset_file) return;
              handleDownloadFile(currentAsset?.optimized_dataset_file.id, currentAsset?.optimized_dataset_file.name);
            }}
          />
        )}
      </div>
    </div>
  );
}

interface AggregatorScadaReportingPeriodProps {
  value: MonthYear | null;
  onChange: (value: MonthYear | null) => void;
  onDone: (value: MonthYear) => void;
  availablePeriods?: MonthYear[];
}

function AggregatorScadaReportingPeriod(props: AggregatorScadaReportingPeriodProps) {
  const {value, onChange, onDone, availablePeriods} = props;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:justify-end">
      <div className="flex items-center gap-2">
        <Text variant="14R" className="text-text-primary! whitespace-nowrap">
          Select Reporting Period
        </Text>

        <span className="relative group z-60!">
          <Tooltip
            message="Select month and year to upload data for a new reporting period."
            position="top"
            className="z-70! -translate-y-2"
            arrowClassName="w-4 h-4 -mt-2"
          />
          <Icon name="questionCircle" className="text-text-secondary! size-4" />
        </span>
        <Text variant="16M" className="text-text-primary!">
          :
        </Text>
      </div>
      <div className="relative z-50">
        <MonthYearPicker
          value={value}
          onChange={onChange}
          handleDone={onDone}
          placeholder="Select month & year"
          wrapperClassName="w-50 bg-white"
          iconClassName="text-text-placeholder!"
          allowedMonths={availablePeriods && availablePeriods.length > 0 ? availablePeriods : undefined}
        />
      </div>
    </div>
  );
}

function IARReportSection() {
  // ===============
  // hooks
  // ===============
  const navigate = useNavigate();

  // ===============
  // selector
  // ===============
  const currentAsset = useSelector(currentSelectedAsset);

  // ===============
  // states
  // ===============
  const currentStep = currentAsset?.current_step ?? 0;
  const isStepLocked = (() => {
    // first priority is asset onboarded, if not onboarded then do the remaining logic
    // asset is onboarded
    if ([AssetStatus.Active, AssetStatus.Inactive].includes(currentAsset?.status as any)) {
      return false;
    }

    return currentStep <= AssetSteps.AggregatorScada;
  })();
  const isAssetInactive = currentAsset?.status === AssetStatus.Inactive;
  const isAssetPendingApproval = currentAsset?.status === AssetStatus.PendingApproval;

  // ===============
  // function
  // ===============
  function viewBenchmark() {
    if (!currentAsset?.id) return;
    navigate(Routes.VIEW_ASSET_BENCHMARK.replace(':id', String(currentAsset.id)));
  }

  return (
    <div className="gap-6 flex-col flex">
      <IARReportUpload
        disabled={isStepLocked || isAssetInactive || isAssetPendingApproval}
        variant={'inline'}
        className="mt-0!"
      />
      <div className="grid grid-cols-2 gap-6">
        {currentAsset?.iar_report_file && (
          <button
            disabled={!currentAsset?.iar_report_file || isStepLocked}
            onClick={viewBenchmark}
            className="flex cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed items-center gap-3 rounded-md bg-white shadow-sm justify-between border-border border px-6 py-4">
            <Text variant="18M" className={`text-primary!`}>
              View Benchmark
            </Text>

            <Icon name="link" className="text-primary! size-5" />
          </button>
        )}

        {/* empty div for layout purposes */}
        <div />
      </div>
    </div>
  );
}

interface UploadFileHistoryProps {}

function UploadFileHistory(_props: UploadFileHistoryProps) {
  const dispatch = useDispatch();
  // ===============
  // selector
  // ===============
  const files = useSelector(currentSelectedAssetFiles);
  const isLoading = useSelector(currentAssetFilesLoading);
  const currentAsset = useSelector(currentSelectedAsset);

  // ===============
  // states
  // ===============
  const [open, setOpen] = useState<boolean>(false);
  const [monthYear, setMonthYear] = useState<MonthYear[]>([]);
  const [monthYearPickerOpen, setMonthYearPickerOpen] = useState<boolean>(false);

  function toMonthYearArray(months: MonthYear[]) {
    return {
      month: months?.map(item => item?.month),
      year: [...new Set(months?.map(item => item?.year))],
    };
  }

  useEffect(() => {
    if (open) {
      if (!currentAsset?.id) return;
      const payload = monthYear.length ? toMonthYearArray(monthYear) : {month: [], year: []};
      dispatch(
        currentAssetFilesRequest({
          assetId: currentAsset?.id,
          month: payload.month,
          year: payload.year,
        }),
      );
    }
  }, [currentAsset?.id, open, monthYear]);

  // ===============
  // table data
  // ===============
  const columns: DataTableColumn<AssetReportFile>[] = [
    {
      name: 'month-year',
      title: (
        <div className="relative inline-flex items-center gap-2">
          <button
            className="flex items-center gap-2 cursor-pointer"
            onClick={e => {
              e.stopPropagation();
              setMonthYearPickerOpen(true);
            }}>
            <Text variant="14R">Month & Year </Text>
            <span>
              <Icon name="list-filter" />
            </span>
          </button>
          {monthYearPickerOpen && (
            <MultiMonthYearSelector
              className="absolute top-full translate-y-4 z-100! left-0 -translate-x-4 rounded-sm"
              onClose={(action, e) => {
                e?.stopPropagation();
                if (action == 'forceClose') {
                  setMonthYear([]);
                }
                setMonthYearPickerOpen(false);
              }}
              onChange={val => {
                setMonthYear(val);
              }}
              value={monthYear ?? undefined}
            />
          )}
        </div>
      ),
      width: {minWidth: '100px', maxWidth: '150px'},
      align: 'left',
      render: row => {
        if (row.type === AssetFileType.IAR) {
          return '-';
        }
        return (
          <Text variant="14M" className="text-text-primary!">
            {formatProjectionRange(row.month, row.year)}
          </Text>
        );
      },
    },
    {
      name: 'file-name',
      title: <Text variant="14R">File Name</Text>,
      width: {minWidth: '400px', maxWidth: '1500px'},
      align: 'left',
      render: (row, _, ishovered) => (
        <div className="flex items-start gap-2 w-full relative">
          <Icon name="file-grid" className="text-text-placeholder mt-1" />
          <Text variant="14R" className="text-text-primary! inline gap-4 grow! break-all whitespace-normal">
            {row.name}
          </Text>
          {ishovered && (
            <button
              className="cursor-pointer absolute right-0 translate-x-[150%]"
              onClick={() => handleFileDownload(row.asset_id, row.id, row.name)}>
              <Icon name="download" className="text-text-placeholder" />
            </button>
          )}
        </div>
      ),
    },
    {
      name: 'type',
      title: (
        <Text variant="14R" className="">
          Type
        </Text>
      ),
      width: {minWidth: '90px', maxWidth: '200px'},
      align: 'center',
      render: row =>
        row.type ? (
          <Badge
            textClassName="font-InterSemibold!"
            message={AssetFileLabel[row.type]}
            color={AssetFileBadgeVariants[row.type] as any}
            className="text-text-secondary! min-w-26 mx-auto"
          />
        ) : null,
    },
    {
      name: 'last-updated',
      title: <Text variant="14R">Last Updated</Text>,
      width: {minWidth: '90px', maxWidth: '200px'},
      align: 'center',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {formatDate(row.uploaded_at, 'dd MMM yyyy')}
        </Text>
      ),
    },
  ];

  // ===============
  // function
  // ===============
  function handleToggleOpen() {
    setOpen(p => !p);
  }

  function formatProjectionRange(month?: number, year?: number) {
    if (!month || !year) {
      return '-';
    }

    return formatDate(new Date(year, month - 1), 'MMMM yyyy');
  }

  function handleFileDownload(assetId?: number, fileId?: number, fileName?: string) {
    if (!fileId) return;
    if (!assetId) return;
    downloadAssetFile({fileId, assetId, fileName});
  }

  return (
    <div className="flex flex-col bg-white rounded-md border overflow-x-auto border-border shadow-lg shadow-border/50">
      <div className="flex items-center p-4 gap-4">
        <Icon name="clock-arrow" className="size-5" />
        <Text variant="free" className="font-SpaceGroteskBold grow text-lg">
          File History
        </Text>

        {monthYear.length > 0 && (
          <ClearFilterButton
            onClick={() => {
              setMonthYearPickerOpen(false);
              setMonthYear([]);
            }}
          />
        )}
        <button className="cursor-pointer" onClick={handleToggleOpen}>
          <Icon name={open ? 'cheveron-up' : 'cheveron-down'} className="size-3" />
        </button>
      </div>
      <div className="flex flex-col bg-white rounded-md border overflow-x-auto border-border shadow-lg shadow-border/50">
        {open && (
          <AnalyticsTable
            rowHover
            rowAlign="items-start"
            loading={isLoading}
            tableClassName="table-auto! min-w-[1200px] shrink-0"
            wrapperClassName="border-none rounded-none! overflow-x-auto"
            data={files}
            columns={columns}
          />
        )}
      </div>
    </div>
  );
}
