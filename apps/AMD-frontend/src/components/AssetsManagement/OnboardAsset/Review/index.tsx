import {AssetStatus, AssetSteps, AssetType, UserRole} from '@/constants';
import {useConfirm, useRole, useUnsavedChangesNavigationBlocker} from '@/hooks';
import {Routes} from '@/navigation/Routes';
import {assetLoading, currentSelectedAsset} from '@/services/redux/selectors';
import {
  createAssetRequest,
  editAssetRequest,
  filterAggregatorScadaFilesRequest,
  filterInvoiceFilesRequest,
  filterInvoiceSettlementFilesRequest,
  submitAssetForApprovalRequest,
  updateAssetInvoiceReportingPeriodRequest,
  updateAssetReportingPeriodRequest,
} from '@/services/redux/slice';
import {Toggle, Text, Alert, Button} from '@/ui-kits';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {WithRole} from '@/components';
import {MonthYear} from '@/interface';
import {UploadFileHistory} from './FileUploadHistory';
import {IARReportSection} from './IARReportSection';
import {AggregateScadaSection} from './AggregateScadaSection';
import {ReportingPeriod} from './ReporintPreriod';
import {UnsavedChangesModal} from './UnsavedChangesModal';
import {CreateAssetConfirmationModal} from './CreateAssetConfirmationModal';
import {SectionFrame} from './common';
import {OptimizationParamsSection} from './OptimizationParamsSection';
import {BasicInformationSection} from './BasicSteps';
import {InvoiceUploadSection} from './InvoiceUploadSection';

// =======================
// constants and Type
// =======================
enum AssetSection {
  BasicInformation = 'Basic Information',
  OptimizationParameters = 'Optimization Parameters',
  UploadAggregatorScadaReport = 'Upload Aggregator Scada Report',
  IARReport = 'IAR Report',
  InvoiceUpload = 'Invoice Upload',
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
  const [invoiceReportingPeriod, setInvoiceReportingPeriod] = useState<MonthYear | null>(null);

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

  const invoiceUploadSectionMemo = useMemo(
    () => <InvoiceUploadSection monthYearReportingPeriod={invoiceReportingPeriod ?? undefined} />,
    [invoiceReportingPeriod],
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

  function handleInvoiceReportingPeriodDone(value: MonthYear) {
    if (!currentAsset?.id) return;

    dispatch(
      filterInvoiceFilesRequest({
        assetId: currentAsset.id,
        month: [value.month],
        year: [value.year],
        limit: -1,
      }),
    );

    dispatch(
      filterInvoiceSettlementFilesRequest({
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

    dispatch(
      updateAssetReportingPeriodRequest({
        assetId: currentAsset.id,
        month: mergedFileMonth,
        year: mergedFileYear,
      }),
    );
  }, [
    blocker.state,
    reportingPeriod,
    currentAsset?.active_period,
    currentAsset?.merged_dataset_file,
    currentAsset?.id,
  ]);

  /**
   * update the invoice active period of the asset when the invoice file and invoice settlement period is generated and invoice active period mismatched with the invoice reporting period, which means the user has changed the invoice reporting period and invoice files has buploaded but invoice report period is not updated
   */
  useEffect(() => {
    if (blocker.state === 'blocked') return;
    if (!currentAsset?.id) return;
    if (!currentAsset?.invoice_file) return;
    if (!currentAsset?.invoice_settlement_file) return;
    const invoiceFileMonth = currentAsset.invoice_file?.month;
    const invoiceFileYear = currentAsset.invoice_file?.year;
    if (!invoiceFileMonth || !invoiceFileYear) return;

    const currentAsserReportingMonth = currentAsset?.invoice_active_period?.month;
    const currentAsserReportingYear = currentAsset?.invoice_active_period?.year;

    if (currentAsserReportingMonth === invoiceFileMonth && currentAsserReportingYear === invoiceFileYear) return;

    dispatch(
      updateAssetInvoiceReportingPeriodRequest({
        assetId: currentAsset.id,
        month: invoiceFileMonth,
        year: invoiceFileYear,
      }),
    );
  }, [
    blocker.state,
    invoiceReportingPeriod,
    currentAsset?.invoice_active_period,
    currentAsset?.invoice_settlement_file,
    currentAsset?.invoice_file,
    currentAsset?.id,
  ]);
  /**
   * Set the invoice reporting period to the oldest month and year avaiabla for the current asset as default value, if no invoice reporting period is selected by the user yet.
   * Else set the reporting period to the invoice selected period set in the backend for the current asset, if no invoice reporting period is selected by the user yet.
   */
  useEffect(() => {
    // if invoice reporting period is already set by the user, don't override it
    if (invoiceReportingPeriod) return;

    // no invoice reporting period from backend
    if (!currentAsset?.invoice_active_period) {
      const oldestReprtingPeriod = currentAsset?.available_periods?.[0];
      if (oldestReprtingPeriod && !invoiceReportingPeriod) {
        setInvoiceReportingPeriod(oldestReprtingPeriod);
        return;
      }
    }

    setInvoiceReportingPeriod(currentAsset?.invoice_active_period ?? null);
  }, [currentAsset?.invoice_active_period, invoiceReportingPeriod, currentAsset?.available_periods]);

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
                  <ReportingPeriod
                    value={reportingPeriod}
                    onChange={setReportingPeriod}
                    onDone={handleReportingPeriodDone}
                  />
                ) : null
              }
              children={() => aggregateScadaSectionMemo}
            />
            <SectionFrame title="IAR Upload" children={() => <IARReportSection />} />

            {isAssetOnboarded && (
              <SectionFrame
                title="Invoice Upload"
                headerContent={
                  isAssetOnboarded ? (
                    <ReportingPeriod
                      value={invoiceReportingPeriod}
                      onChange={setInvoiceReportingPeriod}
                      onDone={handleInvoiceReportingPeriodDone}
                    />
                  ) : null
                }
                children={() => invoiceUploadSectionMemo}
              />
            )}

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
