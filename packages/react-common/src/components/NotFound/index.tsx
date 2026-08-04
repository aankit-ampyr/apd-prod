import { Button, Text } from "../../ui-kit";
import { Images } from "../../assets/images";
import { ScreenWrapper } from "../ScreenWrapper";

interface NotFoundProps {
  fallbackRoute: string;
  ctaLabel: string;
  navigate: (route: string) => void;
  title?: string;
  description?: string;
}
export function NotFound(props: NotFoundProps) {
  const {
    fallbackRoute,
    ctaLabel,
    navigate,
    title = "404 - Page Not Found",
    description = "The page you are looking for does not exist or may have been moved. Use the button below to continue.",
  } = props;

  return (
    <ScreenWrapper className="min-h-screen h-fit">
      <div className="flex grow items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
            <img
              src={Images.noAssets}
              alt="Page not found"
              className="size-20 opacity-70"
            />

            <div className="space-y-2">
              <Text variant="h2" className="text-text-primary!">
                {title}
              </Text>
              <Text
                variant="subtitle2"
                className="text-text-secondary! max-w-xl"
              >
                {description}
              </Text>
            </div>

            <Button onClick={() => navigate(fallbackRoute)}>{ctaLabel}</Button>
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}
