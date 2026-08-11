import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ScreenWrapper,
  StepsWithUnderscore,
  AssetBasicInformation,
  OptimizationParams,
  UploadAssetReport,
  SolarScadaUpload,
  IARUpload,
  Review,
  UnsavedChangesModal,
  WithFallback,
  WithRole,
  Divider,
} from '@/components';
import {StepsWithUnderscoreType} from '@/interface';
import {Images} from '@lazarus/react-common/assets';
import {cn, ErrorCodes, formatDate, getErrorMessage, getSuccessMessage, matchesRoute, SuccessCodes} from '@/utils';
import {useRole, useToast} from '@/hooks';
import {
  assetDetailsFetchLoading,
  assetError,
  assetErrorMessage,
  assetLoading,
  assetSuccess,
  currentSelectedAsset,
  aggregatorReportUploadError,
  scadaReportUploadError,
  iarReportUploadError,
  authDataSelector,
} from '@/services/redux/selectors';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import {Routes} from '@/navigation/Routes';
import {
  getAssetDetailsRequest,
  resetAssetMessage,
  gotoIARStep,
  gotoReviewStep,
  gotoSolarReviewStep,
  getAllOrganizationsListRequest,
} from '@/services/redux/slice';
import {AssetStatus, AssetSteps, AssetType, SolarAssetSteps, UserRole} from '@/constants';
import {AlertBox, Skeleton, Text} from '@/ui-kits';

const steps: StepsWithUnderscoreType[] = [
  {
    image: Images.fileEdit,
    label: 'Basic Information',
    step: 1,
  },
  {
    image: Images.control,
    label: 'Optimization Parameters',
    step: 2,
  },
  {
    image: Images.upload,
    label: 'Upload Aggregator & SCADA',
    step: 3,
  },
  {
    image: Images.fileEdit,
    label: 'IAR Upload',
    step: 4,
  },
  {
    image: Images.fileSuccess,
    label: 'Review',
    step: 5,
  },
];

const solarSteps: StepsWithUnderscoreType[] = [
  {
    image: Images.fileEdit,
    label: 'Basic Information',
    step: 1,
  },
  {
    image: Images.upload,
    label: 'Upload Solar SCADA',
    step: 2,
  },
  {
    image: Images.fileSuccess,
    label: 'Review',
    step: 3,
  },
];

export function OnboardAssetScreen() {
  // ==================
  // hooks
  // ==================
  const navigate = useNavigate();
  const {showToast} = useToast();
  const dispatch = useDispatch();
  const location = useLocation();
  const {id} = useParams();
  const {isAMDAdmin, isAnalyst} = useRole();

  // ==================
  // selectors
  // ==================
  const success = useSelector(assetSuccess) as SuccessCodes;
  const failure = useSelector(assetError) as ErrorCodes;
  const failureMessage = useSelector(assetErrorMessage);
  const currentAsset = useSelector(currentSelectedAsset);
  const isLoading = useSelector(assetDetailsFetchLoading);
  const currentUser = useSelector(authDataSelector);
  const isAssetNormaLoading = useSelector(assetLoading); // used to sync routes after solar asset is edited back to bess, hybrid. Used as dependancy in useEffect

  // =================
  // state
  // =================
  const [showHeaderStep, setShowHeaderSteps] = useState<boolean>(true);
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | null>(currentAsset?.type ?? null);
  const [step, setStep] = useState<number>(currentAsset?.current_step ?? 0);
  const [reviewHasUnsavedChanges, setReviewHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingStepAction, setPendingStepAction] = useState<null | (() => void)>(null);
  const [showPostApprovalAlert, setShowPostApprovalAlert] = useState(false);
  const reviewDiscardRef = useRef<null | (() => void)>(null);
  const hasFetchedAssetDetails = useRef(false);
  const currentUserID = currentUser?.id;

  const isAssetOnboarded = useMemo(() => {
    if (!currentAsset) return false;
    if (location.pathname === Routes.VIEW_ASSET) return true;
    return [AssetStatus.Active, AssetStatus.Inactive].includes(currentAsset?.status);
  }, [currentAsset?.type, currentAsset?.status]);
  const isPendingApprovalNavigationLocked =
    isAnalyst && currentAsset?.status === AssetStatus.PendingApproval && !isAssetOnboarded;
  const isSolarType = (currentAsset?.type ?? selectedAssetType) === AssetType.Solar;
  const maxStepForType = isSolarType ? SolarAssetSteps.Review : AssetSteps.Review;
  const activeStepsConfig = isSolarType ? solarSteps : steps;
  // steps beyond Basic Information aren't reachable until the asset actually exists -- the type
  // dropdown alone (before saving) can make the header show 3/5 steps, but only step 1 is clickable
  // until there's a real asset to edit.
  const headerMaxStep = currentAsset ? maxStepForType : AssetSteps.BasicInformation;

  // ==================
  // query params
  // ==================
  const mode = location.pathname === Routes.ASSET_ONBOARDING ? 'add' : 'edit';

  // ==================
  // functions
  // ==================
  function handleStepChange(nextStep: number) {
    if (nextStep === step) return;
    if (isPendingApprovalNavigationLocked) return;

    if (step === maxStepForType && reviewHasUnsavedChanges) {
      setPendingStepAction(() => () => setStep(nextStep));
      setShowUnsavedChangesModal(true);
      return;
    }

    setStep(nextStep);
  }

  function handleCloseUnsavedChangesModal() {
    setShowUnsavedChangesModal(false);
    setPendingStepAction(null);
  }

  function handleDiscardAndContinue() {
    reviewDiscardRef.current?.();
    setReviewHasUnsavedChanges(false);

    const action = pendingStepAction;
    setPendingStepAction(null);
    setShowUnsavedChangesModal(false);

    action?.();
  }

  function handleAggregatorScadaSave() {
    setStep(AssetSteps.IAR);
    dispatch(gotoIARStep());
  }

  function handleIARSave() {
    setStep(AssetSteps.Review);
    dispatch(gotoReviewStep());
  }

  function handleSolarScadaSave() {
    setStep(SolarAssetSteps.Review);
    dispatch(gotoSolarReviewStep());
  }

  const aggregatorReportError = useSelector(aggregatorReportUploadError);
  const scadaReportError = useSelector(scadaReportUploadError);
  const iarReportError = useSelector(iarReportUploadError);

  // ==================
  // side effects
  // ==================
  useEffect(() => {
    if (failure) {
      // E-10115 - IAR file validation failed
      // E-10087 - Aggregator or scada file validation failed
      // E-10090 - Invalid SCADA file name
      // E-10114 - IAR report size must be at least 1 KB
      // E-10091 - SCADA upload sheet count / file structure validation failed
      // E-10060, E-10025, E-10125 - Asset name validation errors (already exists)
      const isValidationError = ['E-10087', 'E-10115', 'E-10090', 'E-10114', 'E-10091'].includes(failure);
      const isAssetNameValidationError = ['E-10060', 'E-10025', 'E-10125'].includes(failure);
      const hasDetailedErrors =
        aggregatorReportError?.validation_errors?.length ||
        scadaReportError?.validation_errors?.length ||
        iarReportError?.validation_errors?.length;

      // Only show toast if it's not an asset name validation error and not a validation error with detailed errors
      if (!isAssetNameValidationError && (!isValidationError || !hasDetailedErrors)) {
        showToast(failureMessage || getErrorMessage(failure), 'error');
      }
      // go back when asset not found
      if (failure === 'E-10034') {
        navigate(Routes.ASSET_MANAGEMENT);
      }
    }
    if (success) {
      // S-10027 => optmization params updated successfully
      // S-10028 => asset edited successfully
      // S-10029 => file uploded/remove successfully
      // S-10030 => SCADA report uploaded successfully.
      // S-10031 => SCADA and Aggregator datasets merged successfully.
      // S-10033 => SCADA file removed successfully.
      // S-10039 => IAR file uploaded successfully.
      // S-10040 => IAR file deleted successfully.
      // S-10041 => Asset created successfully.
      // S-10052 => Optimized dataset generated successfully.
      // S-10063 => Asset submitted for approval successfully.
      // If you want to update the query param to 'edit' on success, you can use navigate here
      // if (!['S-10015', 'S-10026', 'S-10029', 'S-10047', 'S-10045'].includes(success)) {
      if (
        [
          'S-10027',
          'S-10028',
          'S-10029',
          'S-10030',
          'S-10031',
          'S-10033',
          'S-10039',
          'S-10040',
          'S-10041',
          'S-10052',
          'S-10063',
        ].includes(success)
      ) {
        showToast(getSuccessMessage(success), 'success');
      }
      if (success === 'S-10041') {
        navigate(Routes.VIEW_ASSET.replace(':id', String(currentAsset?.id)), {replace: true});
      }

      /**
       * After entring Basic information, user will navigate to diff url with dymanic ID,
       * (/asset-management/onboarding) -> (/asset-management/onboarding/:id)
       *
       * Solar assets follow the same continue-onboarding flow as BESS/Hybrid --
       * they still have a SCADA upload + Review step left to complete.
       */
      if (success === 'S-10025' && location.pathname === Routes.ASSET_ONBOARDING && currentAsset) {
        navigate(Routes.VIEW_ASSET_ONBOARDING.replace(':id', String(currentAsset?.id)), {replace: true});
      }
    }

    return () => {
      dispatch(resetAssetMessage());
    };
  }, [success, failure, failureMessage, currentAsset, location]);

  useEffect(() => {
    if (isLoading) return;
    if (mode === 'add') return;
    if (!id) return;
    if (id === 'undefined') return;
    if (hasFetchedAssetDetails.current) return; // to prevent refetching asset details when user navigate back from onboarding to view asset after editing solar asset to non-solar asset, as both onboarding and view asset share the same component and route is changing between these two routes.
    if (!currentAsset) {
      dispatch(getAssetDetailsRequest({id: Number(id)}));
      hasFetchedAssetDetails.current = true;
    }
  }, [isLoading, mode, currentAsset, id]);

  useEffect(() => {
    if (currentAsset?.current_step) {
      let newStep = (currentAsset?.current_step ?? 0) + 1;

      if (newStep > maxStepForType) {
        newStep = maxStepForType;
      }
      setStep(newStep);
    }
  }, [currentAsset?.current_step, currentAsset?.type]);

  useEffect(() => {
    if (isPendingApprovalNavigationLocked && step !== maxStepForType) {
      setStep(maxStepForType);
    }
  }, [isPendingApprovalNavigationLocked, step, maxStepForType]);

  useEffect(() => {
    if (!currentAsset?.type) return;
    setSelectedAssetType(currentAsset.type);
  }, [currentAsset?.type]);

  /**
   * This Effect will run when the user is on the view-asset screen and the asset's type is edited
   * such that it is no longer fully onboarded (e.g. type change purges optimization params/steps).
   * All asset types now follow the same Draft -> onboarding -> Active/Inactive lifecycle, so this
   * only needs to check onboarded status, not type.
   */
  useEffect(() => {
    if (!currentAsset) return;
    const isViewAssetRoute = matchesRoute(location.pathname, Routes.VIEW_ASSET);
    if (isLoading) return;
    if (isAssetNormaLoading) return;

    if (isViewAssetRoute && !isAssetOnboarded) {
      navigate(Routes.VIEW_ASSET_ONBOARDING.replace(':id', String(currentAsset?.id)), {replace: true});
    }
  }, [location.pathname, currentAsset?.type, isLoading, isAssetNormaLoading, isAssetOnboarded]);

  /**
   * This effect is used to control the visibility of post approval alert banner in review step for analyst after asset is approved by admin and asset status is active or inactive. The alert will only be shown to the analyst who submitted the asset for approval and will be hidden for other analysts and all admins. Once the alert is shown for the first time, it will keep showing for that analyst in that browser until manually dismissed, even if user navigate between diff steps or refresh the page, as long as the asset status is active or inactive. The alert will be hidden if asset status is not active or inactive, or user is not the one who submitted the asset, or user is admin.
   */
  useEffect(() => {
    if (!currentAsset?.id || !currentUserID) {
      setShowPostApprovalAlert(false);
      return;
    }

    const isSameAnalyst = currentAsset?.submitted_by?.id === currentUserID;
    const isRelevantStatus = [AssetStatus.Active, AssetStatus.Inactive].includes(currentAsset.status);
    if (!isSameAnalyst || !isRelevantStatus) {
      setShowPostApprovalAlert(false);
      return;
    }

    const alertStorageKey = `asset-post-approval-alert:${currentUserID}:${currentAsset.id}`;
    const hasLocalAlertFlag = typeof window !== 'undefined' && localStorage.getItem(alertStorageKey) !== null;

    // If the backend says this is the first time, latch the flag locally so subsequent
    // refetches in the same browser session keep showing the banner.
    if (currentAsset.is_asset_alert_seen_before === false) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(alertStorageKey, '1');
      }
      setShowPostApprovalAlert(true);
      return;
    }

    // Once a local flag exists, prefer it over the backend response.
    // If the flag is missing, the backend value controls visibility.
    if (hasLocalAlertFlag) {
      setShowPostApprovalAlert(true);
      return;
    }

    setShowPostApprovalAlert(false);
  }, [
    currentAsset?.id,
    currentAsset?.status,
    currentAsset?.submitted_by?.id,
    currentAsset?.is_asset_alert_seen_before,
    currentUserID,
  ]);

  /**
   * fetch all organizations for the dropdown.
   */
  useEffect(() => {
    // Only fetch organizations if user is AMD Admin
    if (!isAMDAdmin) return;

    // No need to fetch organizations again when asset is in review step as it is already fetched in review step.
    if (currentAsset && ![AssetSteps.BasicInformation, maxStepForType].includes(currentAsset?.current_step as any))
      return;

    dispatch(getAllOrganizationsListRequest());
  }, [currentAsset?.current_step, maxStepForType]);

  /**
   * Since we have intialized current step to 0 so on asset creation screen (/asset-management/onboarding) when asset is not even created,
   * update current step to 1
   */
  useEffect(() => {
    const isOnboardingRoute = matchesRoute(location.pathname, Routes.ASSET_ONBOARDING);
    if (isOnboardingRoute && step === 0) {
      setStep(AssetSteps.BasicInformation);
    }
  }, [step, location.pathname]);
  return (
    <ScreenWrapper
      className={cn(
        'bg-linear-to-br from-[#F3F9FF] to-[#F2F3FF] relative justify-center flex flex-col items-center rounded-3xl px-4',
        !isAssetOnboarded && 'py-30',
      )}
      wrapperClassName={cn(
        'flex flex-col rounded-[40px]!',
        ((isSolarType && step === SolarAssetSteps.ScadaUpload) ||
          [AssetSteps.AggregatorScada, AssetSteps.IAR].includes(step)) &&
          !isLoading &&
          'bg-transparent shadow-none p-0 rounded-none!',
        'max-w-280 w-full',
        isAssetOnboarded && currentAsset?.type === AssetType.Solar && 'grow-0! pt-10 pb-14',
      )}
      header={
        <WithFallback
          isLoading={isLoading}
          fallback={
            matchesRoute(location.pathname, Routes.VIEW_ASSET) ? (
              <React.Fragment />
            ) : (
              <div className="absolute top-15 -translate-y-1/2 flex items-center">
                <StepsWithUnderscore
                  className="justify-center trans"
                  loading={true}
                  maxStep={headerMaxStep}
                  gotoStep={() => {}}
                  steps={activeStepsConfig}
                  currentStep={step}
                />
              </div>
            )
          }>
          {isAssetOnboarded ? (
            <React.Fragment />
          ) : (
            <div className="absolute top-15 -translate-y-1/2 flex items-center">
              {showHeaderStep && (
                <StepsWithUnderscore
                  className={
                    isPendingApprovalNavigationLocked ? '[&>button:not(:last-child)]:cursor-not-allowed' : undefined
                  }
                  maxStep={headerMaxStep}
                  gotoStep={isPendingApprovalNavigationLocked ? () => {} : handleStepChange}
                  steps={activeStepsConfig}
                  currentStep={step}
                />
              )}
            </div>
          )}

          <WithRole
            roles={[UserRole.Admin]}
            // passing into fallback for reverse logic, that is except admin other should see the alert message
            fallback={
              <>
                {step === AssetSteps.BasicInformation && (
                  <AlertBox
                    message="Basic information was created by the admin"
                    description="You can view the details below and continue onboarding."
                    className="max-w-240 w-full mb-8"
                    infoUi={
                      <div className="ml-auto bg-white rounded-pill border border-blue-data px-4 flex items-center h-fit self-center py-1">
                        <Text variant="12M" className="text-blue-data!">
                          Read Only
                        </Text>
                      </div>
                    }
                  />
                )}
                {step === AssetSteps.Review &&
                  currentAsset?.status !== AssetStatus.PendingApproval &&
                  !isAssetOnboarded && (
                    <AlertBox
                      message="Complete review and submit for approval"
                      description="Review every section below. Once submitted, the asset moves to admin approval."
                      className="max-w-240 w-full mb-8 bg-[#F5FFFB]"
                      variant="success"
                      infoUi={
                        <div className="ml-auto bg-white rounded-pill border border-success px-4 flex items-center h-fit self-center py-1">
                          <Text variant="12M" className="text-success!">
                            Status: Draft
                          </Text>
                        </div>
                      }
                    />
                  )}
                {step === AssetSteps.Review &&
                  currentAsset?.status === AssetStatus.PendingApproval &&
                  !isAssetOnboarded && (
                    <AlertBox
                      message={'Pending approval'}
                      description={
                        <>
                          This asset has been submitted for review.{' '}
                          <span className="text-text-primary! font-InterMedium!">
                            ({`Submitted on ${formatDate(currentAsset?.submitted_at, 'dd-MM-yyyy')}`})
                          </span>
                        </>
                      }
                      className="max-w-240 w-full mb-8 bg-[#FFF8F0] border-[#DE7700]"
                      variant="warning"
                      iconClassName="text-[#DE7700]"
                      iconName="clock"
                      infoUi={
                        <div className="ml-auto bg-white rounded-pill border border-[#DE7700] px-4 flex items-center h-fit self-center py-1">
                          <Text variant="12M" className="text-[#DE7700]!">
                            Pending Approval
                          </Text>
                        </div>
                      }
                    />
                  )}
                {step === AssetSteps.Review &&
                  currentAsset?.status === AssetStatus.Active &&
                  currentAsset?.submitted_by?.id === currentUserID &&
                  showPostApprovalAlert && (
                    <AlertBox
                      message={'Approved & Active'}
                      description={
                        'This asset has been approved by the admin and is now active in your system. You can now upload monthly files, view analysis, and access benchmark insights for this active asset.'
                      }
                      className="max-w-240 w-full mb-8 py-3"
                      variant="success"
                      iconName="circle-check-big"
                      infoUi={
                        <div className="ml-auto min-w-fit flex flex-col justify-center gap-2">
                          <div className="bg-white rounded-pill border border-success px-4 flex items-center h-fit self-end py-1">
                            <Text variant="12M" className="text-success!">
                              Status: Active
                            </Text>
                          </div>
                          <Text variant="12R" className="text-text-primary!">
                            Approved on{' '}
                            {currentAsset?.activated_at ? formatDate(currentAsset.activated_at, 'dd-MM-yyyy') : ''}
                          </Text>
                        </div>
                      }
                    />
                  )}
                {step === AssetSteps.Review &&
                  currentAsset?.status === AssetStatus.Inactive &&
                  currentAsset?.submitted_by?.id === currentUserID &&
                  showPostApprovalAlert && (
                    <AlertBox
                      message={'This asset has been disabled by Admin.'}
                      description={
                        'You cannot upload monthly files, update documents, or view new analysis until the asset is enabled again.'
                      }
                      className="max-w-240 w-full mb-8 py-3"
                      variant="error"
                      infoUi={
                        <div className="rounded-pill border border-border bg-bg-card ml-auto px-4 flex items-center h-fit self-center py-1">
                          <Text variant="12M" className="">
                            Status: Inactive
                          </Text>
                        </div>
                      }
                    />
                  )}
              </>
            }>
            {/* UI for Admin */}
            {step === AssetSteps.Review && currentAsset?.status === AssetStatus.PendingApproval && (
              <AlertBox
                description={
                  <>
                    This asset was submitted by an analyst and is awaiting your review. <br />
                    Verify every section before approving.
                  </>
                }
                message={'Pending approval'}
                className="max-w-240 w-full mb-8 bg-[#FFF8F0] border-[#DE7700]"
                variant="warning"
                iconClassName="text-[#DE7700]"
                iconName="clock"
                infoUi={
                  <div className="bg-white flex ml-auto gap-4 border-border border rounded-md px-6 py-2">
                    <div className="flex-col gap-1 flex">
                      <Text variant="caption" className="text-text-secondary!">
                        Submitted by
                      </Text>
                      <Text variant="caption" className="font-InterMedium!">
                        {currentAsset?.submitted_by?.name ?? ''}
                      </Text>
                    </div>
                    <Divider orientation="vertical" />
                    <div className="flex-col gap-1 flex">
                      <Text variant="caption" className="text-text-secondary!">
                        Submitted on
                      </Text>
                      <Text variant="caption" className="font-InterMedium!">
                        {currentAsset?.submitted_at ? formatDate(currentAsset.submitted_at, 'dd-MM-yyyy') : ''}
                      </Text>
                    </div>
                  </div>
                }
              />
            )}
          </WithRole>
        </WithFallback>
      }>
      <WithFallback
        fallback={
          <div className="grow items-center flex flex-col">
            <Skeleton className="w-43 h-12! rounded-full!" />
            <Skeleton className="w-80 h-7! rounded-full!" />
            <div className="gap-4 mt-auto flex justify-center">
              <Skeleton variant="rounded" className="w-50 h-10!" />
              <Skeleton variant="rounded" className="w-50 h-10!" />
            </div>
          </div>
        }
        isLoading={isLoading}>
        {isAssetOnboarded ? (
          <Review
            mode="edit"
            onUnsavedChangesChange={setReviewHasUnsavedChanges}
            registerDiscardHandler={fn => {
              reviewDiscardRef.current = fn;
            }}
          />
        ) : (
          <React.Fragment>
            {step === AssetSteps.BasicInformation && (
              <AssetBasicInformation
                mode={mode as any}
                onBack={() => navigate(Routes.ASSET_MANAGEMENT)}
                continueOnboarding={() => setStep(Math.min((currentAsset?.current_step ?? 0) + 1, maxStepForType))}
                hideHeaderFunc={type => {
                  setSelectedAssetType(type);
                  setShowHeaderSteps(true);
                }}
              />
            )}
            {isSolarType && step === SolarAssetSteps.ScadaUpload && (
              <SolarScadaUpload onSave={handleSolarScadaSave} />
            )}
            {!isSolarType && step === AssetSteps.OptimizationConfiguration && (
              <OptimizationParams mode={mode as any} onBack={() => navigate(-1)} />
            )}
            {!isSolarType && step === AssetSteps.AggregatorScada && <UploadAssetReport onSave={handleAggregatorScadaSave} />}
            {!isSolarType && step === AssetSteps.IAR && <IARUpload onSave={handleIARSave} />}
            {((isSolarType && step === SolarAssetSteps.Review) || (!isSolarType && step === AssetSteps.Review)) && (
              <Review
                mode="create"
                onUnsavedChangesChange={setReviewHasUnsavedChanges}
                registerDiscardHandler={fn => {
                  reviewDiscardRef.current = fn;
                }}
              />
            )}
          </React.Fragment>
        )}
        <UnsavedChangesModal
          open={showUnsavedChangesModal}
          onClose={handleCloseUnsavedChangesModal}
          onDiscard={handleDiscardAndContinue}
        />
      </WithFallback>
    </ScreenWrapper>
  );
}
