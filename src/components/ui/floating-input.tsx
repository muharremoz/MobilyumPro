"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FloatingInputProps extends React.ComponentProps<"input"> {
  label: string;
  icon?: LucideIcon;
  wrapperClassName?: string;
}

/** Yüzen etiketli input: boşken etiket ortada, odak/değer olunca yukarı kayar. */
export const FloatingInput = React.forwardRef<
  HTMLInputElement,
  FloatingInputProps
>(
  (
    { id, label, icon: Icon, className, wrapperClassName, placeholder = " ", ...props },
    ref,
  ) => {
    const generated = React.useId();
    const inputId = id ?? generated;

    return (
      <div className={cn("relative", wrapperClassName)}>
        <input
          id={inputId}
          ref={ref}
          placeholder={placeholder}
          className={cn(
            "peer h-12 w-full rounded-md border border-input bg-transparent pt-5 pb-1 text-sm outline-none transition-colors placeholder:text-transparent focus:placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
            Icon ? "pr-3 pl-9" : "px-3",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute top-0 origin-left translate-y-[14px] text-sm text-muted-foreground transition-transform duration-150 ease-out will-change-transform peer-focus:translate-y-[6px] peer-focus:scale-[0.78] peer-focus:font-medium peer-[:not(:placeholder-shown)]:translate-y-[6px] peer-[:not(:placeholder-shown)]:scale-[0.78] peer-[:not(:placeholder-shown)]:font-medium",
            Icon ? "left-9" : "left-3",
          )}
        >
          {label}
        </label>
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-foreground" />
        )}
      </div>
    );
  },
);
FloatingInput.displayName = "FloatingInput";
