import React from "react";
import { Text } from "../../ui-kit";
import { Divider } from "../Divider";
import { StepsWithUnderscoreType } from "../../interface";
import { cn } from "../../utils";

interface StepsWithUnderscroreProps {
  steps: StepsWithUnderscoreType[];
  currentStep: number;
  gotoStep: (step: number) => void;
  loading?: boolean;
  className?: string;
  maxStep?: number;
}

export function StepsWithUnderscore(props: StepsWithUnderscroreProps) {
  const { currentStep, steps, gotoStep, className, maxStep=999, loading } = props;
  return (
    <div className={cn("flex gap-4 items-start max-w-200 w-full mx-auto", className)}>
      {steps.map((item) => (
        <StepDisplay
          gotoStep={gotoStep}
          {...item}
          key={item.step}
          isActive={item.step === currentStep}
          maxStep={maxStep}
          loading={loading}
        />
      ))}
    </div>
  );
}

interface StepDisplayProps extends StepsWithUnderscoreType {
  isActive: boolean;
  gotoStep: (step: number) => void;
  maxStep: number
  loading?: boolean;
}
function StepDisplay(props: StepDisplayProps) {
  const { step, image, label, isActive = false,gotoStep, maxStep, loading } = props;

  function navigateToStep (){
    if (step > maxStep){
      return
    }
    gotoStep(step)
  }

  return (
    <button
      onClick={navigateToStep}
      className={cn(
        "flex items-center gap-4",
        !loading && isActive ? "grow" : "w-15",
        step > maxStep ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      )}
    >
      {!loading && isActive && (
        <div className="shadow bg-white p-1 rounded-md size-12">
          <img src={image} />
        </div>
      )}
      <div className={cn("flex flex-col grow items-start",)}>
        <Text
          className={cn(
            "font-SpaceGroteskMedium!",
            !loading && isActive ? "text-text-primary!" : "text-[#717880]!",
          )}
        >
          {step}.
        </Text>
        <Divider
          className={cn(!loading && isActive ? "bg-text-primary w-100" : "bg-[#717880]")}
        />
        {!loading && isActive && (
          <Text
            className={cn(
              "font-SpaceGroteskMedium!",
              (!loading && isActive) ? "text-text-primary!" : "text-[#717880]!",
            )}
          >
            {label}
          </Text>
        )}
      </div>
    </button>
  );
}
