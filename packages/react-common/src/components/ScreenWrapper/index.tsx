import { JSX, PropsWithChildren } from "react";
import { cn } from "../../utils";
import { SCREEN_WRAPPER_ID } from "../../constants";
import { useScreenOverride } from "../../hooks";

interface ScreenWrapperProps extends PropsWithChildren {
  header?: JSX.Element;
  className?: string;
  wrapperClassName?: string;
  nestedWrapperClassName?: string;
  style?:React.CSSProperties;
  wrapperStyle?:React.CSSProperties;
  nestedWrapperStyle?: React.CSSProperties
}
export const ScreenWrapper = (props: ScreenWrapperProps) => {
  const { children, header, wrapperClassName, className, style, wrapperStyle, nestedWrapperClassName } = props;
  const { override } = useScreenOverride();
  return (
    <div style={style} className={cn("bg-bg-card p-8 grow screen-wrapper flex flex-col", className)}>
      {header}
      <div
        style={wrapperStyle}
        id={SCREEN_WRAPPER_ID}
        className={cn("bg-white flex flex-col rounded-lg shadow p-6 grow", wrapperClassName)}
      >
        {/* always render both children and override, just hidde them one by one */}
        {/* Children */}
        <div className={cn(override ? "hidden" : "flex", "grow flex-col", nestedWrapperClassName)}>
          {children}
        </div>

        {/* Override */}
        {override && <div className={cn(override ? "flex" : "hidden", "flex-col grow")}>{override}</div>}
      </div>
    </div>
  );
};
