import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Vercel form kontrolü: border yok, 1px ring gölgeyle; hover koyulaşır,
        // focus'ta 4px dış halka. (vercel.com deployments filtrelerinden söküldü)
        "h-10 w-full min-w-0 rounded-md border-0 bg-white bg-clip-padding px-2.5 text-base shadow-[0_0_0_1px_rgba(0,0,0,0.08)] transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#8f8f8f] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.16),0_0_0_4px_rgba(0,0,0,0.16)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:shadow-[0_0_0_1px_var(--destructive)] aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
