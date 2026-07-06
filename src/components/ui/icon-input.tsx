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
  icon: AnimatedIcon;
}

/** Standart input — etiketin yanında animasyonlu ikon (odak/hover'da oynar). */
export const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  ({ id, label, icon: Icon, className, onFocus, onBlur, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;
    const iconRef = React.useRef<AnimatedIconHandle>(null);

    return (
      <div
        className="grid gap-0.5"
        onMouseEnter={() => iconRef.current?.startAnimation()}
        onMouseLeave={() => iconRef.current?.stopAnimation()}
      >
        <label
          htmlFor={inputId}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Icon ref={iconRef} size={15} className="text-muted-foreground" />
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          onFocus={(e) => {
            iconRef.current?.startAnimation();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            iconRef.current?.stopAnimation();
            onBlur?.(e);
          }}
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
