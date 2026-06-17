import { Skeleton as UISkeleton, SkeletonProps } from "@mui/material";

export function Skeleton(props: SkeletonProps) {
  const { style, animation, ...rest } = props;
  return (
    <UISkeleton
      variant="rectangular"
      style={{ backgroundColor: "#ECEDF2", ...style }}
      {...rest}
      animation={animation || "wave"}
    />
  );
}
