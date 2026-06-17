import React from "react";
import { Text } from "../../ui-kit";

interface SkeletonWrapperProps {
    isLoading: boolean,
    children: React.ReactNode,
    fallback?: React.ReactNode,
}
export function WithFallback({ isLoading, children, fallback }: SkeletonWrapperProps) {
  if (isLoading) {
    if (fallback){
        return fallback
    }
    return (
      <Text>Loading...</Text>
    );
  }

  return children;
}