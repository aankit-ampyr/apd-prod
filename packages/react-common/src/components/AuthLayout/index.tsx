import React, { type PropsWithChildren } from "react";
import { Images } from "../../assets/images";

export const AuthLayout: React.FC<PropsWithChildren> = (props) => {
  const { children } = props;
  return (
    <div className="w-dvw h-dvh flex justify-center items-center">
      <img src={Images.authBg} className="size-full absolute object-cover" />
      <div className="bg-text-primary/70 size-full absolute object-cover" />
      <div className="bg-white py-8 px-8 min-w-125 max-w-125 rounded-3xl z-99">{children}</div>
    </div>
  );
};
