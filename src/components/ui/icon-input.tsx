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
            "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
IconInput.displayName = "IconInput";
