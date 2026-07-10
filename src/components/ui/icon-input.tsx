"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
export type AnimatedIcon = React.ForwardRefExoticComponent<
  { size?: number; className?: string } & React.RefAttributes<AnimatedIconHandle>
>;

export interface IconInputProps extends React.ComponentProps<"input"> {
  label: string;
  /** Geriye uyumluluk için tutuluyor; başlıkta artık gösterilmiyor. */
  icon?: AnimatedIcon;
}

/** Standart input — sade etiket (ikon gösterilmez). */
export const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  ({ id, label, icon: _icon, className, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;

    return (
      <div className="grid gap-0.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-md border-0 bg-white bg-clip-padding px-3 text-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)] outline-none transition-all duration-200 placeholder:text-[#8f8f8f] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.16),0_0_0_4px_rgba(0,0,0,0.16)] [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
IconInput.displayName = "IconInput";
