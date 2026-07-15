import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Vercel (Geist) buton stili — vercel.com "Add New..." butonundan söküldü:
// h-10, rounded-md, 14px/500, px-2.5, transition 150ms; primary #171717→hover #383838.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 ease-in-out outline-none select-none focus-visible:shadow-[0_0_0_2px_white,0_0_0_4px_rgba(0,0,0,0.24)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-[#f2f2f2] disabled:text-[#8f8f8f] disabled:opacity-100",
        outline:
          "border-0 bg-white text-[#171717] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] hover:bg-[#f2f2f2] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] aria-expanded:bg-[#f2f2f2]",
        secondary:
          "bg-[#ebebeb] text-[#171717] hover:bg-[#e0e0e0] aria-expanded:bg-[#ebebeb]",
        ghost:
          "hover:bg-[#f2f2f2] hover:text-[#171717] aria-expanded:bg-[#f2f2f2] aria-expanded:text-[#171717]",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:shadow-[0_0_0_2px_white,0_0_0_4px_var(--destructive)] dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-md px-2.5 text-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-10",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
